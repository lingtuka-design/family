import { createRootRoute, Outlet } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-full bg-gradient-to-b from-sky-50 via-white to-rose-50 font-sans text-slate-800">
      <Outlet />
    </div>
  ),
});
