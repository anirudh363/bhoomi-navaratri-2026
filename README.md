# ದಸರಾ ಗಾದೆ ಗೊಂಬೆ ಆಟ — Dasara Gaade Golu game

Vite + React version of the Golu gaade (proverb) guessing game, with Firestore storage and an admin panel.

- **Game:** `/` — home → name → 16 guesses → answers page with score and ✓/✗ per gaade
- **Admin:** `/admin` — Google sign-in, limited to `bhoomiarun5@gmail.com` and `anirudhsandilya363@gmail.com`

## Run it

```bash
npm install
npm run dev          # local dev server
npm run build        # production build into dist/
npm run test:grading # sanity-check the answer grader
```

## One-time Firebase setup

1. **Google sign-in:** Firebase console → Authentication → Sign-in method → enable **Google**. `localhost` is allowed by
   default; if you host the game elsewhere, add that domain under Authentication → Settings → Authorized domains.
2. **Rules:** Firebase console → Firestore Database → Rules → paste `firestore.rules` → Publish
   (or `firebase deploy --only firestore:rules` with the Firebase CLI). Check with `node scripts/check-firestore.mjs`.
3. **Seed:** open `/admin`, sign in, go to **Gaades & photos** and click **Seed Firestore**. This writes the 16 gaades
   and default grading settings. Until then the game falls back to its built-in copy of the gaades.

## Who can do what (enforced by `firestore.rules`)

| | Players (not signed in) | Admins (the two Google accounts) | Anyone else signed in |
|---|---|---|---|
| Participants | create their own entry, update it while playing, reset it to play again | read, edit, delete all | nothing |
| Name registry | look up one exact name, claim a new one | list, edit, delete | look up one exact name |
| Gaades, photos, grading settings | read | read and edit | read |

Any Google account can complete the sign-in step, but only the two listed emails get past it. Everyone else sees
"not allowed" and Firestore refuses them anything beyond what players can do. To change the admins, edit **both**
`src/lib/admins.js` and `isAdmin()` in `firestore.rules`, then republish the rules.

To host it on Firebase: `npm run build` then `firebase deploy --only hosting` (config is in `firebase.json`).

## What is stored (Firestore)

| Path | Contents |
|---|---|
| `participants/{autoId}` | `name`, `status` (`started` / `completed` / `skipped`), `answers[16]` = `{guess, auto, sim, override}`, `score`, `answered`, `attempt` (times played), `createdAt`, `completedAt` |
| `names/{name key}` | `name` — registry that keeps player names unique (key = lowercase name, punctuation and extra spaces removed) |
| `gaades/{1..16}` | `answer` (Kannada), `iast` (transliteration), `order` — loaded by the Seed button, editable in admin |
| `gaadeImages/{1..16}` | `image` — the photo for that gaade as a compressed JPEG data URL |
| `config/grading` | `threshold` (pass mark) and `alternates` (extra accepted answers per gaade) |

Players can enter any name; a first name alone is fine. Names are unique: only if someone has already played under that
name (ignoring case, spacing and punctuation) does the game ask for their full name to tell them apart. Deleting a participant in the admin panel frees their name again.

**One record per name, holding the newest game.** The phone that created an entry remembers it (in the browser's local
storage). **Play again** on the answers page resets that entry (answers and score cleared, `attempt` +1) and goes
straight back into the quiz. Typing the same name again on the same phone later does the same. Skip to answers with your
own name also replaces the entry (it becomes "skipped") — the newest action is always what is on record. Entry ids are never stored anywhere public, so only that
phone (and admins) can reset an entry.

A participant document is created as soon as someone presses **Start guessing** (name required), updated after every
answer (so people who stop halfway still show up as "in progress"), and marked `completed` with the final score on
**Finish**. Someone who enters a name and presses **Skip to answers** is recorded as `skipped`. Each play is its own
document.

Photos are stored in Firestore rather than Cloud Storage because new Storage buckets need the paid Blaze plan.
The admin page resizes each photo in the browser so it fits Firestore's 1 MB document limit.

## How answers are graded

Players won't type the gaade exactly, so each guess gets a **similarity score from 0–100 %**:

1. **Script detection.** A guess in Kannada script is compared with the Kannada gaade. A guess in English letters
   ("Kanglish") is compared with the transliteration. Admin-added alternate versions are compared too.
2. **Forgiving normalisation**, applied to both sides before comparing:
   - punctuation, zero-width characters and extra spaces are ignored
   - Kannada: long/short vowels (ೀ/ಿ, ೂ/ು, ೇ/ೆ, ೋ/ೊ), ಳ/ಲ, ಣ/ನ, ಶ/ಷ/ಸ, aspirated/plain consonants (ಧ/ದ, ಭ/ಬ …), and
     ಂ vs ನ್/ಮ್ before a consonant count as the same
   - English letters: accents dropped, doubled letters collapsed, `th/dh/ch/bh…` → `t/d/c/b…`, `ee`→`i`, `oo`→`u`,
     `m`/`n` before a consonant treated the same
3. **Similarity** is the better of two measures:
   - whole-sentence edit distance (spaces ignored, so joined words are fine)
   - word-level matching that tolerates swapped word order
4. **Pass mark** (default **75 %**, adjustable in Admin → Gaades & photos) decides correct or wrong.
5. **Close calls.** Wrong answers within 20 points of the pass mark appear in **Admin → Review answers**. There the
   admin marks them ✓ or ✗ with one click, and the person's score updates immediately. Any answer can be overridden
   from the participant's row too.
6. **Alternate answers.** If people keep writing a valid regional version of a gaade, add it under that gaade
   ("Also accept") and everyone is regraded automatically. Manual ✓/✗ decisions are kept.

## Admin panel

- **Dashboard:** totals, average/median/top score, participation donut (finished / in progress / skipped), score
  distribution, % correct per gaade, top-10 leaderboard, sign-ups over time. Updates live.
- **Participants:** sortable, searchable table of everyone. Click a row to see all 16 guesses with match % and
  override buttons. Includes CSV download (opens in Excel, Kannada intact) and delete.
- **Review answers:** close calls queue, plus filters for all wrong, all correct or manually graded answers.
- **Gaades & photos:** seed or reset the Firestore data, upload, replace or remove the photo shown on the answers page
  for each gaade, edit the gaade text, edit accepted alternate answers, adjust the pass mark, and regrade everyone.

## Editing the gaades

Edit them in the admin panel (Gaades & photos → Edit text). `src/data/gaades.js` holds only the original copy used by
the Seed button and as a fallback.
