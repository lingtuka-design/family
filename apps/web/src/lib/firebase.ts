import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

/** The only emails allowed to sign in (both Firebase side and app side). */
export const ALLOWED_ADMIN_EMAILS: string[] = [
  "lingtuka@gmail.com",
  "lani1990tluangi@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ALLOWED_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export { onAuthStateChanged, signInWithEmailAndPassword, signOut };
export type { User };
