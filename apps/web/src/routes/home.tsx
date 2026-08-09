import { createRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rootRoute } from "./__root";
import { fetchChildren } from "../api/client";

const AVATAR_STYLES = [
  "from-rose-400 to-pink-500",
  "from-sky-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
];

function HomePage() {
  const { data: children, isLoading, isError } = useQuery({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-sky-500">
        A living book, growing with you
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-slate-900 sm:text-6xl">
        Our Family Storybook
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
        Choose a child to open their book. New pages appear as we write them together.
      </p>

      {isLoading && (
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-3xl border border-white bg-white/60 shadow"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-16 text-rose-500">
          Couldn't load the books — please check that the worker is running and try again.
        </p>
      )}

      {children && children.length === 0 && (
        <div className="mt-16">
          <p className="text-lg text-slate-500">No books yet. Add the first page to start a story!</p>
          <Link
            to="/admin"
            className="mt-6 inline-block rounded-full bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
          >
            Add the first page
          </Link>
        </div>
      )}

      {children && children.length > 0 && (
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child, i) => (
            <Link
              key={child.name}
              to="/book/$childId"
              params={{ childId: child.name.toLowerCase() }}
              className="group"
            >
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-white bg-white/70 p-8 shadow-lg shadow-rose-100/60 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_STYLES[i % AVATAR_STYLES.length]} text-4xl font-bold text-white shadow-md`}
                >
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-slate-800">
                    {child.name}'s Book
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {child.pageCount} page{child.pageCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-sky-500 opacity-0 transition group-hover:opacity-100">
                  Open the book →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-20 text-sm text-slate-400">
        <Link to="/admin" className="underline decoration-dotted underline-offset-4 hover:text-slate-600">
          Add a new page
        </Link>
      </footer>
    </main>
  );
}

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
