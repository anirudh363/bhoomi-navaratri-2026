import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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

/*
 * Firestore layout
 *   participants/{autoId}  name, nameLower, status ("started" | "completed" | "skipped"),
 *                          answers[16] {guess, auto, sim, override}, score, answered, total,
 *                          createdAt, updatedAt, completedAt
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

export async function createParticipant(data) {
  const ref = await addDoc(participants, {
    ...data,
    nameLower: (data.name || "").toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateParticipant(id, data) {
  const extra = data.status === "completed" ? { completedAt: serverTimestamp() } : {};
  return updateDoc(doc(db, "participants", id), { ...data, ...extra, updatedAt: serverTimestamp() });
}

export const deleteParticipant = (id) => deleteDoc(doc(db, "participants", id));

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

export const watchImages = (onData, onError) => onSnapshot(images, (s) => onData(toImageMap(s)), onError);

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
