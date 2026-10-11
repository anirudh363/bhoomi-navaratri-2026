import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { DEFAULT_GAADES, N } from "../data/gaades.js";
import { DEFAULT_THRESHOLD } from "./grading.js";
import { nameKey } from "./names.js";

/*
 * Firestore layout
 *   participants/{autoId}  name, nameLower, status ("started" | "completed" | "skipped"),
 *                          answers[16] {guess, auto, sim, override}, score, answered, total,
 *                          attempt (how many times they have played), createdAt, updatedAt, completedAt
 *                          One record per name: "Play again" resets it, so it holds the newest game.
 *                          The doc id is known only to the player's phone and to admins.
 *   names/{nameKey}        name, createdAt — registry that keeps player names unique (no doc ids,
 *                          because anyone may look a name up)
 *   gaades/{1..16}         answer (Kannada), iast (transliteration), order — seeded from the admin panel
 *   gaadeImages/{1..16}    image (compressed JPEG data URL), updatedAt
 *   config/grading         threshold, alternates { "0": [..], "1": [..] }
 */

const participants = collection(db, "participants");
const images = collection(db, "gaadeImages");
const gradingRef = doc(db, "config", "grading");

const withDates = (snap) => {
  const d = snap.data({ serverTimestamps: "estimate" });
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? null,
    updatedAt: d.updatedAt?.toDate?.() ?? null,
    completedAt: d.completedAt?.toDate?.() ?? null,
  };
};

export class NameTakenError extends Error {
  constructor(name) {
    super(`The name "${name}" is already taken`);
    this.code = "name-taken";
  }
}

const nameRef = (name) => doc(db, "names", nameKey(name));

/** Players may look up one exact name, but cannot list the registry. */
export const isNameTaken = async (name) => (await getDoc(nameRef(name))).exists();

/**
 * Creates the participant and claims the name in one atomic write. If the name was claimed in the
 * meantime the rules reject the whole batch (a second write to an existing name counts as an update).
 */
export async function createParticipant(data) {
  const pRef = doc(participants);
  const batch = writeBatch(db);
  batch.set(nameRef(data.name), { name: data.name, createdAt: serverTimestamp() });
  batch.set(pRef, {
    ...data,
    attempt: 1,
    nameLower: data.name.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (e) {
    if (e.code === "permission-denied" && (await isNameTaken(data.name).catch(() => false))) {
      throw new NameTakenError(data.name);
    }
    throw e;
  }
  return pRef.id;
}

/** Play again / Skip with their own name: replace the player's previous game with the newest one. */
export const restartParticipant = (id, data) =>
  updateDoc(doc(db, "participants", id), {
    ...data,
    attempt: increment(1),
    completedAt: deleteField(),
    updatedAt: serverTimestamp(),
  });

export function updateParticipant(id, data) {
  const extra = data.status === "completed" ? { completedAt: serverTimestamp() } : {};
  return updateDoc(doc(db, "participants", id), { ...data, ...extra, updatedAt: serverTimestamp() });
}

/** Deletes the participant and frees their name (unless an older duplicate entry still uses it). */
export async function deleteParticipant(p, people = []) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "participants", p.id));
  const key = p.name ? nameKey(p.name) : "";
  if (key && !people.some((o) => o.id !== p.id && o.name && nameKey(o.name) === key)) batch.delete(nameRef(p.name));
  await batch.commit();
}

export const watchNames = (onData, onError) =>
  onSnapshot(collection(db, "names"), (s) => onData(new Set(s.docs.map((d) => d.id))), onError);

/** Adds registry entries for participants who played before the registry existed (oldest entry wins). */
export async function registerExistingNames(people, registered) {
  const seen = new Set(registered);
  const missing = [];
  [...people]
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .forEach((p) => {
      const key = p.name ? nameKey(p.name) : "";
      if (!key || seen.has(key)) return;
      seen.add(key);
      missing.push(p);
    });
  for (let k = 0; k < missing.length; k += 450) {
    const batch = writeBatch(db);
    missing.slice(k, k + 450).forEach((p) =>
      batch.set(nameRef(p.name), { name: p.name, createdAt: serverTimestamp() })
    );
    await batch.commit();
  }
  return missing.length;
}

export function watchParticipants(onData, onError) {
  return onSnapshot(
    query(participants, orderBy("createdAt", "desc")),
    (s) => onData(s.docs.map(withDates)),
    onError
  );
}

/** Write many participant updates at once (Firestore batches max out at 500 writes). */
export async function updateParticipantsBulk(updates) {
  for (let k = 0; k < updates.length; k += 450) {
    const batch = writeBatch(db);
    for (const { id, data } of updates.slice(k, k + 450)) {
      batch.update(doc(db, "participants", id), { ...data, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

export async function fetchGrading() {
  const s = await getDoc(gradingRef);
  return s.exists() ? s.data() : {};
}

export const watchGrading = (onData, onError) =>
  onSnapshot(gradingRef, (s) => onData(s.exists() ? s.data() : {}), onError);

export const saveGrading = (data) => setDoc(gradingRef, data, { merge: true });

const toImageMap = (s) => {
  const out = {};
  s.docs.forEach((d) => {
    const k = Number(d.id) - 1;
    if (d.data().image) out[k] = d.data().image;
  });
  return out;
};

export const fetchImages = async () => toImageMap(await getDocs(images));

/**
 * Live photos for the admin panel. `pending` holds the gaade indexes whose shown photo exists only in
 * this browser so far (not yet confirmed saved by the server).
 */
export const watchImages = (onData, onError) =>
  onSnapshot(
    images,
    { includeMetadataChanges: true },
    (s) => onData(toImageMap(s), new Set(s.docs.filter((d) => d.metadata.hasPendingWrites).map((d) => Number(d.id) - 1))),
    onError
  );

export const saveImage = (k, image) =>
  setDoc(doc(db, "gaadeImages", String(k + 1)), { image, updatedAt: serverTimestamp() });

export const deleteImage = (k) => deleteDoc(doc(db, "gaadeImages", String(k + 1)));

const gaadesCol = collection(db, "gaades");

/** Firestore gaades merged over the bundled defaults; `seeded` = how many exist in Firestore. */
const toGaades = (s) => {
  const list = DEFAULT_GAADES.map((g) => ({ ...g }));
  let seeded = 0;
  s.docs.forEach((d) => {
    const k = Number(d.id) - 1;
    if (k < 0 || k >= N) return;
    const { answer, iast } = d.data();
    if (answer) list[k].answer = answer;
    if (iast) list[k].iast = iast;
    seeded++;
  });
  return { list, seeded };
};

export const fetchGaades = async () => toGaades(await getDocs(gaadesCol));

export const watchGaades = (onData, onError) => onSnapshot(gaadesCol, (s) => onData(toGaades(s)), onError);

export const saveGaade = (k, { answer, iast }) =>
  setDoc(doc(db, "gaades", String(k + 1)), { order: k + 1, answer, iast, updatedAt: serverTimestamp() });

/** Writes the 16 bundled gaades and the default grading settings (existing settings are kept). */
export async function seedDefaults() {
  const batch = writeBatch(db);
  DEFAULT_GAADES.forEach((g, k) =>
    batch.set(doc(db, "gaades", String(k + 1)), { order: k + 1, ...g, updatedAt: serverTimestamp() })
  );
  const current = await getDoc(gradingRef);
  const data = current.exists() ? current.data() : {};
  batch.set(
    gradingRef,
    { threshold: data.threshold ?? DEFAULT_THRESHOLD, alternates: data.alternates ?? {} },
    { merge: true }
  );
  await batch.commit();
}
