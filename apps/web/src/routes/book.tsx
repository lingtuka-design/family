import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { Flipbook } from "../components/Flipbook";

function BookPage() {
  const { childId } = bookRoute.useParams();

  return (
    <main className="mx-auto flex min-h-screen flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:text-sky-600"
        >
          ← All books
        </Link>
        <span className="truncate font-serif text-xl italic text-slate-400">{childId}'s story</span>
      </header>
      <Flipbook childId={childId} />
    </main>
  );
}

export const bookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/book/$childId",
  component: BookPage,
});
