import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase web config is public by design; access is governed by firestore.rules.
const firebaseConfig = {
  apiKey: "AIzaSyCYvOnwT2fE11FSap4Iy23v8iJqlYgoSlc",
  authDomain: "bhoomi-navaratri-2026.firebaseapp.com",
  projectId: "bhoomi-navaratri-2026",
  storageBucket: "bhoomi-navaratri-2026.firebasestorage.app",
  messagingSenderId: "13296712547",
  appId: "1:13296712547:web:99cdaff0805c7cf0b1b156",
  measurementId: "G-8LY9TEQNSN",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {});
