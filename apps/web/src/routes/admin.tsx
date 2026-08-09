import { useEffect, useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { AdminForm } from "../components/AdminForm";
import { AuthStatus } from "../components/AuthStatus";
import { CoverManager } from "../components/CoverManager";
import { PagesList } from "../components/PagesList";
import { auth, isAdminEmail, onAuthStateChanged, signInWithGoogle, signOut } from "../lib/firebase";
import type { User } from "firebase/auth";

type Tab = "create" | "pages" | "covers";

function LoginScreen() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Couldn't sign in with Google. Please try again.");
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
          Only authorized family Google accounts can access the admin panel.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-8 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? "Signing in…" : "Login with Google"}
        </button>

        {error && <p className="mt-4 text-center text-sm font-medium text-rose-500">{error}</p>}

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="underline decoration-dotted underline-offset-4 hover:text-slate-600">
            ← Back to the storybooks
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
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
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash;
    if (h === "#covers") return "covers";
    if (h === "#pages") return "pages";
    return "create";
  });
  const [selectedChild, setSelectedChild] = useState("");
  const [customChild, setCustomChild] = useState("");

  function switchTab(t: Tab) {
    setTab(t);
    window.location.hash = t === "create" ? "" : `#${t}`;
  }

  const childProps = {
    selectedChild,
    onSelectChild: setSelectedChild,
    customChild,
    onCustomChildChange: setCustomChild,
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => switchTab(t)}
      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        tab === t
          ? "bg-sky-500 text-white shadow-md shadow-sky-200"
          : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

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

      {/* Menu buttons */}
      <div className="mt-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabBtn("create", "✏️ Create post")}
        {tabBtn("pages", "📄 Pages")}
        {tabBtn("covers", "📚 Covers")}
      </div>

      <div className="mt-8">
        {tab === "create" && <AdminForm {...childProps} />}
        {tab === "pages" && <PagesList {...childProps} />}
        {tab === "covers" && <CoverManager />}
      </div>
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
