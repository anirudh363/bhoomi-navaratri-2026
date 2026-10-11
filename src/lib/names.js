// Player names can be anything non-empty (a first name is fine) but must be unique; if a name is
// already taken the game asks for a fuller name. Uniqueness ignores case, spacing and punctuation.

export const NAME_MAX = 40;

/** Trim and collapse inner whitespace — this is the name as stored and shown. */
export const cleanName = (s) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/** Registry key: lowercase words joined by single spaces, punctuation dropped. */
export const nameKey = (s) =>
  cleanName(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();

/** null when the name is acceptable, otherwise "empty". */
export const nameProblem = (name) => (nameKey(name) ? null : "empty");
