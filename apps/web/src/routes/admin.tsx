import { useEffect } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { AdminForm } from "../components/AdminForm";
import { CoverManager } from "../components/CoverManager";

function AdminPage() {
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
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
            ✓ Admin Active
          </span>
          <a
            href="/cdn-cgi/access/logout"
            className="flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-rose-600"
          >
            🔒 Log Out
          </a>
        </div>
      </header>

      <h1 className="mt-8 font-serif text-4xl font-semibold text-slate-900">Storybook admin</h1>
      <p className="mt-2 text-sm text-slate-500">
        This route is protected at the network level by Cloudflare Access (Zero Trust) — only
        authorized Google accounts can reach it.
      </p>

      <AdminForm />

      <CoverManager />
    </main>
  );
}

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
