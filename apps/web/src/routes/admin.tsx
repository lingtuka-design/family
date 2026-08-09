import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { AdminForm } from "../components/AdminForm";
import { AuthStatus } from "../components/AuthStatus";
import { CoverManager } from "../components/CoverManager";
import { auth, isAdminEmail, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "../lib/firebase";
import type { User } from "firebase/auth";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-white bg-white/80 p-8 shadow-xl shadow-rose-100/50 backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-widest text-sky-500">Family Storybook</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Only authorized family emails can access the admin panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-600" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="underline decoration-dotted underline-offset-4 hover:text-slate-600">
            ← Back to the storybooks
          </Link>
        </p>
      </div>
    </main>
  );
}

function DeniedScreen({ user }: { user: User }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-white bg-white/80 p-8 text-center shadow-xl shadow-rose-100/50 backdrop-blur">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          Signed in as <span className="font-semibold text-slate-700">{user.email}</span> — this
          email is not on the authorized list.
        </p>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="mt-6 rounded-full bg-rose-500 px-8 py-2.5 font-semibold text-white transition hover:bg-rose-600"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function AdminContent() {
  /* When arriving via the home page's "Add a book cover" button (#covers). */
  useEffect(() => {
    if (window.location.hash === "#covers") {
      document.getElementById("covers-section")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Link to="/" className="text-sm font-bold text-slate-600 hover:text-sky-600">
          ← Back to Home
        </Link>
        <AuthStatus />
      </header>

      <h1 className="mt-8 font-serif text-4xl font-semibold text-slate-900">Storybook admin</h1>
      <p className="mt-2 text-sm text-slate-500">
        Add or edit pages and book covers for your children.
      </p>

      <AdminForm />

      <CoverManager />
    </main>
  );
}

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <div className="py-32 text-center text-slate-400">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isAdminEmail(user.email)) {
    return <DeniedScreen user={user} />;
  }

  return <AdminContent />;
}

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
