import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import HTMLFlipBook from "react-pageflip";
import { fetchPages } from "../api/client";
import type { StoryPage } from "../types";

/** Portrait page aspect (width : height). */
const ASPECT = 1.41;
/** Tailwind `md` breakpoint - below this the book shows one page per screen. */
const MOBILE_BREAKPOINT = 768;

/* ------------------------------------------------------------------ */
/*  Page shell - every child of HTMLFlipBook must forward a ref        */
/* ------------------------------------------------------------------ */

const FlipPage = forwardRef<HTMLDivElement, { children: ReactNode; style?: CSSProperties }>(
  function FlipPage({ children, style }, ref) {
    return (
      <div
        ref={ref}
        style={style}
        className="relative overflow-hidden rounded-sm bg-white shadow-[0_0_16px_rgba(0,0,0,0.10)]"
      >
        {children}
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Lazy portrait - the browser only downloads the PNG for pages near  */
/*  the current page, so opening a long book never freezes the UI      */
/* ------------------------------------------------------------------ */

function LazyPortrait({
  src,
  alt,
  eager,
  className,
}: {
  src: string;
  alt: string;
  eager: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (eager) {
      setShow(true);
    } else {
      setShow(false);
      setLoaded(false);
    }
  }, [eager]);

  if (!show) return <div className={className} aria-hidden="true" />;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-500 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Story page - the portrait PNG and the story text on ONE page.      */
/*  Desktop: picture on the left, text on the right.                   */
/*  Mobile:  picture on top, text directly below.                      */
/* ------------------------------------------------------------------ */

function StoryPage({ page, eager }: { page: StoryPage; eager: boolean; isMobile?: boolean }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-between overflow-hidden p-6 sm:p-8"
      style={{ backgroundColor: page.bg_color || "#FFFFFF" }}
    >
      {/* Top Fixed Image Frame */}
      <div className="relative flex h-[48%] w-full items-center justify-center overflow-hidden rounded-md bg-slate-100/60 border border-slate-200/50 shadow-inner">
        <LazyPortrait
          src={page.image_url}
          alt={page.title || `${page.child_name} - page ${page.page_number}`}
          eager={eager}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Middle Section: Title & Story Text */}
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto px-2 pt-4 pb-2 text-center">
        {page.title ? (
          <h2 className="font-serif text-xl sm:text-2xl font-black italic uppercase tracking-wider text-slate-900">
            {page.title}
          </h2>
        ) : (
          <h2 className="font-serif text-lg font-bold italic uppercase tracking-wider text-slate-700">
            {page.child_name}
          </h2>
        )}

        <p className="mt-4 font-serif text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-wrap text-left sm:text-center">
          {page.story_text}
        </p>
      </div>

      {/* Bottom Section: Page Number */}
      <div className="pt-2 text-center font-serif text-xs sm:text-sm font-medium text-slate-500">
        Page {page.page_number}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flipbook                                                           */
/* ------------------------------------------------------------------ */

export function Flipbook({ childId }: { childId: string }) {
  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["pages", childId],
    queryFn: () => fetchPages(childId),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);

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

  /* One story page per flipbook page. On desktop the book shows two
     pages per spread; on mobile a single page fills the width. */
  const isMobile = view.width > 0 && view.width < MOBILE_BREAKPOINT;
  const gutter = isMobile ? 0 : 24;

  const pageWidth = view.width > 0 ? Math.max(300, (view.width - gutter) / (isMobile ? 1 : 2)) : 0;
  const pageHeight =
    pageWidth > 0 ? Math.min(pageWidth * ASPECT, Math.max(320, view.height - 180)) : 0;

  /* Remount the book when the layout changes, so pageflip recalculates sizes. */
  const bookKey = `${childId}-${isMobile ? "m" : "d"}-${Math.round(pageWidth / 24)}`;

  const children = useMemo(() => {
    if (!pages || pageWidth === 0) return [];

    return pages.map((page, i) => (
      <FlipPage key={page.id} style={{ width: pageWidth, height: pageHeight }}>
        <StoryPage page={page} eager={Math.abs(i - currentPage) <= 2} isMobile={isMobile} />
      </FlipPage>
    ));
  }, [pages, pageWidth, pageHeight, currentPage]);

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
    <div className="flex justify-center py-8">
      <div ref={containerRef} className="w-full max-w-5xl">
        {pageWidth > 0 && (
          <HTMLFlipBook
            key={bookKey}
            width={pageWidth}
            height={pageHeight}
            size="fixed"
            minWidth={280}
            maxWidth={pageWidth}
            minHeight={280}
            maxHeight={pageHeight}
            drawShadow
            flippingTime={700}
            usePortrait={false}
            startZIndex={0}
            autoSize={false}
            maxShadowOpacity={0.2}
            showCover={false}
            mobileScrollSupport
            clickEventForward={false}
            useMouseEvents
            swipeDistance={30}
            showPageCorners
            disableFlipByClick={false}
            startPage={0}
            className=""
            style={{ margin: "0 auto" }}
            onFlip={(e) => setCurrentPage((e as { data: number }).data)}
          >
            {children}
          </HTMLFlipBook>
        )}
      </div>
    </div>
  );
}
