import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { AdminForm } from "../components/AdminForm";

function AdminPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-sky-600">
          ← Home
        </Link>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
          Admin
        </span>
      </header>

      <h1 className="mt-8 font-serif text-4xl font-semibold text-slate-900">Add a new page</h1>
      <p className="mt-2 text-sm text-slate-500">
        This route is protected at the network level by Cloudflare Access (Zero Trust) — only
        authorized Google accounts can reach it.
      </p>

      <AdminForm />
    </main>
  );
}

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
