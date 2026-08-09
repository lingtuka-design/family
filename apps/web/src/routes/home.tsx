import { createRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rootRoute } from "./__root";
import { AuthStatus } from "../components/AuthStatus";
import { fetchChildren, fetchCovers } from "../api/client";
import type { BookCover } from "../types";

const COVER_ASPECT = "aspect-[2/3]"; // standard portrait book cover (6"x9")

const PLACEHOLDER_STYLES = [
  "from-rose-300 via-rose-100 to-pink-200",
  "from-sky-300 via-sky-100 to-indigo-200",
  "from-amber-300 via-amber-100 to-orange-200",
  "from-emerald-300 via-emerald-100 to-teal-200",
  "from-violet-300 via-violet-100 to-purple-200",
];

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

function CoverCard({ cover, name, index }: { cover?: BookCover; name: string; index: number }) {
  return (
    <Link
      to="/book/$childId"
      params={{ childId: slug(name) }}
      className="group flex flex-col items-center"
    >
      {/* book cover in standard portrait size */}
      <div
        className={`${COVER_ASPECT} w-full max-w-[240px] overflow-hidden rounded-lg shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/10 transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-slate-900/25`}
      >
        {cover ? (
          <img
            src={cover.image_url}
            alt={`${name}'s book cover`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${PLACEHOLDER_STYLES[index % PLACEHOLDER_STYLES.length]}`}
          >
            <span className="font-serif text-6xl font-bold text-white/90 drop-shadow-md">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <h3 className="mt-3 font-serif text-xl font-semibold text-slate-800">
        {name}'s Book
      </h3>
      <p className="text-sm text-slate-500">
        {cover?.pageCount ?? 0} page{(cover?.pageCount ?? 0) === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

function HomePage() {
  const { data: children, isLoading, isError } = useQuery({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });
  const { data: covers } = useQuery({
    queryKey: ["covers"],
    queryFn: fetchCovers,
  });

  /* Every child that has pages OR a cover gets a book on the shelf. */
  const names = Array.from(
    new Set([
      ...(children ?? []).map((c) => c.name),
      ...(covers ?? []).map((c) => c.child_name),
    ])
  );
  const coverByChild = new Map((covers ?? []).map((c) => [c.child_name.toLowerCase(), c]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-sky-500">
        A living book, growing with you
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-slate-900 sm:text-6xl">
        Our Family Storybook
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
        Choose a book to open it. New pages appear as we write them together.
      </p>

      {isLoading && (
        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mx-auto w-full max-w-[240px]">
              <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-white/60 shadow" />
              <div className="mx-auto mt-3 h-5 w-24 animate-pulse rounded bg-white/60" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-16 text-rose-500">
          Couldn't load the books — please check that the worker is running and try again.
        </p>
      )}

      {!isLoading && !isError && names.length === 0 && (
        <div className="mt-16">
          <p className="text-lg text-slate-500">No books yet. Add the first one to start!</p>
          <Link
            to="/admin"
            hash="covers"
            className="mt-6 inline-block rounded-full bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
          >
            Add a book cover
          </Link>
        </div>
      )}

      {!isLoading && !isError && names.length > 0 && (
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
          {names.map((name, i) => (
            <CoverCard
              key={name}
              cover={coverByChild.get(name.toLowerCase())}
              name={name}
              index={i}
            />
          ))}

          {/* add a book cover right from the home page */}
          <Link
            to="/admin"
            hash="covers"
            className="group flex flex-col items-center"
          >
            <div className="flex aspect-[2/3] w-full max-w-[240px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white/40 text-slate-400 transition group-hover:border-sky-400 group-hover:bg-sky-50/60 group-hover:text-sky-500">
              <span className="text-4xl font-light">＋</span>
            </div>
            <h3 className="mt-3 font-serif text-xl font-semibold text-slate-500 transition group-hover:text-sky-600">
              Add a book cover
            </h3>
          </Link>
        </div>
      )}

      <footer className="mt-20 flex flex-col items-center gap-3 text-sm text-slate-400">
        <AuthStatus />
        <Link to="/admin" className="underline decoration-dotted underline-offset-4 hover:text-slate-600">
          Admin — add pages or covers
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
