import { DEFAULT_GAADES, N } from "../data/gaades.js";

/*
 * How a guess is graded
 * ---------------------
 * 1. Detect the script: Kannada letters → compare against the Kannada answer;
 *    Latin letters ("Kanglish") → compare against the transliteration.
 *    Admin-added alternate answers are compared too (in whichever script they are).
 * 2. Fold both strings so common spelling variations don't count as mistakes:
 *    - punctuation, zero-width joiners and extra spaces are ignored
 *    - Kannada: long/short vowel signs (ೀ/ಿ, ೂ/ು, ೇ/ೆ, ೋ/ೊ), ಳ/ಲ, ಣ/ನ, ಶ/ಷ/ಸ,
 *      aspirated/unaspirated consonants (ಧ/ದ, ಭ/ಬ …), and ಂ vs ನ್/ಮ್ before a consonant
 *    - Latin: diacritics dropped, doubled letters collapsed, aspirate "h" dropped
 *      (dh→d, ch→c …), ee→i, oo→u, m/n before a consonant treated the same
 * 3. Similarity = the better of
 *    - whole-sentence similarity (edit distance, spaces ignored), and
 *    - word-level F1 (each answer word matched to a guess word that is ≥ 80 % similar),
 *      which tolerates swapped word order and small extra words.
 * 4. similarity ≥ threshold (default 0.75) → correct.
 *    Wrong answers within REVIEW_MARGIN below the threshold are flagged for the admin
 *    to review, and the admin can override any answer as correct or wrong.
 */

export const DEFAULT_THRESHOLD = 0.75;
export const REVIEW_MARGIN = 0.2;

const KN_CHAR = /[ಀ-೿]/;
const ZERO_WIDTH = /[​-‍⁠﻿]/g;
const NON_TEXT = /[^\p{L}\p{M}\p{N}\s]/gu;

const KN_FOLD = {
  "ೀ": "ಿ", "ೂ": "ು", "ೇ": "ೆ", "ೋ": "ೊ",
  "ಈ": "ಇ", "ಊ": "ಉ", "ಏ": "ಎ", "ಓ": "ಒ",
  "ಳ": "ಲ", "ೞ": "ಲ", "ಣ": "ನ", "ಶ": "ಸ", "ಷ": "ಸ", "ಱ": "ರ",
  "ಖ": "ಕ", "ಘ": "ಗ", "ಛ": "ಚ", "ಝ": "ಜ", "ಠ": "ಟ",
  "ಢ": "ಡ", "ಥ": "ತ", "ಧ": "ದ", "ಫ": "ಪ", "ಭ": "ಬ",
  "ಃ": "",
};

export const isKannada = (s) => KN_CHAR.test(s);

export function foldKannada(s) {
  return s
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(NON_TEXT, " ")
    // nasal + virama before a consonant is the same sound as anusvara (ಂ)
    .replace(/[ಙಞಣನಮ]್(?=[ಕ-ಹ])/g, "ಂ")
    .replace(/./gu, (c) => (c in KN_FOLD ? KN_FOLD[c] : c))
    .replace(/\s+/g, " ")
    .trim();
}

export function foldLatin(s) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/sh/g, "s")
    .replace(/([kgcjtdpb])h/g, "$1")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/f/g, "p")
    .replace(/x/g, "ks")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/[mn](?=[bcdfgjklpqrstvy])/g, "n")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const x = Array.from(a);
  const y = Array.from(b);
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[y.length];
}

function ratio(a, b) {
  const len = Math.max(Array.from(a).length, Array.from(b).length);
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len;
}

function wordF1(guess, answer) {
  const gw = guess.split(" ").filter(Boolean);
  const aw = answer.split(" ").filter(Boolean);
  if (!gw.length || !aw.length) return 0;
  const used = new Set();
  let hits = 0;
  for (const w of aw) {
    let best = -1;
    let bestSim = 0;
    gw.forEach((g, k) => {
      if (used.has(k)) return;
      const s = ratio(w, g);
      if (s > bestSim) {
        bestSim = s;
        best = k;
      }
    });
    if (bestSim >= 0.8) {
      used.add(best);
      hits++;
    }
  }
  const recall = hits / aw.length;
  const precision = hits / gw.length;
  return hits ? (2 * recall * precision) / (recall + precision) : 0;
}

export function similarity(foldedGuess, foldedAnswer) {
  const whole = ratio(foldedGuess.replace(/ /g, ""), foldedAnswer.replace(/ /g, ""));
  return Math.max(whole, wordF1(foldedGuess, foldedAnswer));
}

/**
 * Grade one guess for gaade `k` (0-based). Returns the stored answer record.
 * `gaades` is the list of { answer, iast } (from Firestore, or the bundled defaults).
 */
export function gradeOne(guess, k, config = {}, gaades = DEFAULT_GAADES) {
  const g = (guess || "").trim();
  if (!g) return { guess: "", auto: false, sim: 0 };
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const kannada = isKannada(g);
  const fold = kannada ? foldKannada : foldLatin;
  const g0 = gaades[k] || DEFAULT_GAADES[k];
  const candidates = [g0.answer, g0.iast, ...(config.alternates?.[k] || [])].filter(
    (t) => t && isKannada(t) === kannada
  );
  const fg = fold(g);
  let best = 0;
  for (const t of candidates) best = Math.max(best, similarity(fg, fold(t)));
  const sim = Math.round(best * 100) / 100;
  return { guess: g, auto: sim >= threshold, sim };
}

/** Grade all guesses, keeping any admin overrides from `previous`. */
export function gradeAll(guesses, config = {}, previous = [], gaades = DEFAULT_GAADES) {
  return Array.from({ length: N }, (_, k) => ({
    ...gradeOne(guesses[k], k, config, gaades),
    override: previous[k]?.override ?? null,
  }));
}

export const isCorrect = (a) => (a?.override == null ? !!a?.auto : a.override === true);

export const scoreOf = (answers = []) => answers.filter(isCorrect).length;

export const answeredOf = (answers = []) => answers.filter((a) => a?.guess).length;

export const needsReview = (a, threshold = DEFAULT_THRESHOLD) =>
  !!a?.guess && a.override == null && !a.auto && a.sim >= threshold - REVIEW_MARGIN;
