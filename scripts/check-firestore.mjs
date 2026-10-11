// Read-only connectivity check: `node scripts/check-firestore.mjs`
import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCYvOnwT2fE11FSap4Iy23v8iJqlYgoSlc",
  projectId: "bhoomi-navaratri-2026",
  appId: "1:13296712547:web:99cdaff0805c7cf0b1b156",
});
const db = getFirestore(app);

const timer = setTimeout(() => {
  console.log("No answer from Firestore after 20s — is the Firestore database created for this project?");
  process.exit(1);
}, 20000);

try {
  // gaades are public; participants are admin-only, so this check reads gaades.
  const s = await getDocs(collection(db, "gaades"));
  console.log(`Firestore OK — rules published. Gaades in Firestore: ${s.size} of 16${s.size < 16 ? " (click Seed in the admin panel)" : ""}`);
  clearTimeout(timer);
  process.exit(0);
} catch (e) {
  console.log("Firestore error:", e.code, e.message);
  process.exit(1);
}
