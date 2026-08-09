import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PageTurnBook } from "./PageTurnBook";
import { fetchPages } from "../api/client";

/** Portrait page aspect (width : height). */
const ASPECT = 1.41;
/** Tailwind `md` breakpoint - below this the book shows a single page per screen. */
const MOBILE_BREAKPOINT = 768;

export function Flipbook({ childId }: { childId: string }) {
  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["pages", childId],
    queryFn: () => fetchPages(childId),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ width: 0, height: 0 });

  /* Measure the container (and viewport height) responsively. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setView({ width: el.clientWidth, height: window.innerHeight });
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const isMobile = view.width > 0 && view.width < MOBILE_BREAKPOINT;
  const gutter = isMobile ? 0 : 24;

  const pageWidth = view.width > 0 ? Math.max(300, (view.width - gutter) / (isMobile ? 1 : 2)) : 0;
  const pageHeight =
    pageWidth > 0 ? Math.min(pageWidth * ASPECT, Math.max(320, view.height - 180)) : 0;

  if (isLoading) {
    return <div className="py-32 text-center text-slate-400">Opening the book…</div>;
  }

  if (isError) {
    return <div className="py-32 text-center text-rose-500">Couldn't open this book.</div>;
  }

  if (pages && pages.length === 0) {
    return (
      <div className="py-32 text-center">
        <p className="text-lg text-slate-500">This book is still empty.</p>
        <Link to="/admin" className="mt-4 inline-block text-sky-500 underline underline-offset-4">
          Write the first page
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      <div ref={containerRef} className="w-full max-w-5xl">
        {pageWidth > 0 && pages && pages.length > 0 && (
          <PageTurnBook
            key={`${isMobile ? "m" : "d"}-${Math.round(pageWidth / 24)}`}
            pages={pages}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            isMobile={isMobile}
          />
        )}
      </div>
      {/* soft shadow under the book, like it is lying on a table */}
      <div className="mt-5 h-5 w-3/5 rounded-[100%] bg-slate-900/20 blur-md" aria-hidden="true" />
    </div>
  );
}
