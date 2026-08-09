import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { auth, onAuthStateChanged, signOut } from "../lib/firebase";
import type { User } from "firebase/auth";

/**
 * Shows the current Firebase session: signed-in email + logout button,
 * or a quiet link to /admin (the login form only lives on the admin page).
 */
export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  if (user) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="hidden sm:inline">Signed in as {user.email}</span>
        <span className="sm:hidden">Signed in</span>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-bold text-white transition hover:bg-emerald-700"
        >
          Log out
        </button>
      </span>
    );
  }

  return (
    <Link
      to="/admin"
      className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
    >
      Admin
    </Link>
  );
}
