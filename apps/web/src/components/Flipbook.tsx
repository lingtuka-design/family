import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import HTMLFlipBook from "react-pageflip";
import { fetchPages } from "../api/client";
import type { StoryPage } from "../types";

/** Portrait page aspect (width : height). */
const ASPECT = 1.41;
/** Tailwind `md` breakpoint - below this we show one page per sheet. */
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
/*  the current spread, so opening a long book never freezes the UI    */
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
/*  Page layouts                                                       */
/* ------------------------------------------------------------------ */

/** Desktop left page: portrait PNG (transparent) on the bg_color. */
function ImagePage({ page, eager }: { page: StoryPage; eager: boolean }) {
  return (
    <div className="flex h-full w-full flex-col" style={{ backgroundColor: page.bg_color }}>
      <div className="flex flex-1 items-center justify-center p-4">
        <LazyPortrait
          src={page.image_url}
          alt={`${page.child_name} - page ${page.page_number}`}
          eager={eager}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="flex items-center justify-between px-5 pb-3 text-xs font-semibold uppercase tracking-widest opacity-60">
        <span>{page.child_name}</span>
        <span>{page.page_number}</span>
      </div>
    </div>
  );
}

/** Desktop right page: the story text on the bg_color. */
function TextPage({ page }: { page: StoryPage }) {
  return (
    <div className="flex h-full w-full flex-col px-7 py-8" style={{ backgroundColor: page.bg_color }}>
      <span className="font-serif text-4xl font-bold opacity-15">{page.page_number}</span>
      <p className="mt-3 whitespace-pre-wrap font-serif text-[15px] leading-7 text-slate-800">
        {page.story_text}
      </p>
      <span className="mt-auto pt-6 text-xs italic opacity-50">
        The end of page {page.page_number}
      </span>
    </div>
  );
}

/** Mobile/tablet single page: portrait on top, story text below. */
function MobilePage({ page, eager }: { page: StoryPage; eager: boolean }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="relative flex h-[48%] items-center justify-center p-3"
        style={{ backgroundColor: page.bg_color }}
      >
        <LazyPortrait
          src={page.image_url}
          alt={`${page.child_name} - page ${page.page_number}`}
          eager={eager}
          className="max-h-full max-w-full object-contain"
        />
        <span className="absolute right-3 top-3 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-slate-600 backdrop-blur">
          {page.page_number}
        </span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto bg-white px-5 py-4">
        <h2 className="font-serif text-lg font-semibold text-slate-800">{page.child_name}</h2>
        <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-6 text-slate-700">
          {page.story_text}
        </p>
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

  const isMobile = view.width > 0 && view.width < MOBILE_BREAKPOINT;
  const gutter = isMobile ? 0 : 24;

  const pageWidth = view.width > 0 ? Math.max(300, (view.width - gutter) / (isMobile ? 1 : 2)) : 0;
  const pageHeight =
    pageWidth > 0 ? Math.min(pageWidth * ASPECT, Math.max(320, view.height - 180)) : 0;

  /* Remount the book when the layout changes, so pageflip recalculates sizes. */
  const bookKey = `${childId}-${isMobile ? "m" : "d"}-${Math.round(pageWidth / 24)}`;

  const children = useMemo(() => {
    if (!pages || pageWidth === 0) return [];

    const out: ReactNode[] = [];

    pages.forEach((page, i) => {
      /* Index of the page in the book (2 per row on desktop, 1 on mobile). */
      const index = isMobile ? i : i * 2;
      const eager = Math.abs(index - currentPage) <= 3;

      if (isMobile) {
        out.push(
          <FlipPage key={page.id} style={{ width: pageWidth, height: pageHeight }}>
            <MobilePage page={page} eager={eager} />
          </FlipPage>
        );
      } else {
        /* A story "spread": left = image, right = text. */
        out.push(
          <FlipPage key={`${page.id}-image`} style={{ width: pageWidth, height: pageHeight }}>
            <ImagePage page={page} eager={eager} />
          </FlipPage>,
          <FlipPage key={`${page.id}-text`} style={{ width: pageWidth, height: pageHeight }}>
            <TextPage page={page} />
          </FlipPage>
        );
      }
    });

    return out;
  }, [pages, isMobile, pageWidth, pageHeight, currentPage]);

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
        <Link
          to="/admin"
          className="mt-4 inline-block text-sky-500 underline underline-offset-4"
        >
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
