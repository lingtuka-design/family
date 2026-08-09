import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { StoryPage } from "../types";

type Corner = "top" | "bottom" | null;
type Dir = 1 | -1;

type Turn =
  | { mode: "idle" }
  | { mode: "drag"; dir: Dir; corner: Corner }
  | { mode: "auto"; dir: Dir; from: number; to: number; corner: Corner };

/* ------------------------------------------------------------------ */
/*  Lazy portrait - images only mount when the page is near the front  */
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
/*  Page front - 3:2 cover photo, heading title, content, page number  */
/* ------------------------------------------------------------------ */

function StoryPage({ page, eager }: { page: StoryPage; eager: boolean }) {
  return (
    <div className="flex h-full w-full flex-col" style={{ backgroundColor: page.bg_color }}>
      <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden">
        <LazyPortrait
          src={page.image_url}
          alt={page.title || `${page.child_name} - page ${page.page_number}`}
          eager={eager}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white/70 px-5 py-4 backdrop-blur-[1px]">
        {page.title && (
          <h2 className="font-serif text-lg font-semibold leading-snug text-slate-900">
            {page.title}
          </h2>
        )}
        <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-6 text-slate-700">
          {page.story_text}
        </p>
      </div>
      <div className="shrink-0 px-5 py-2 text-center text-xs font-bold text-slate-500">
        {page.page_number}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Paper back - the plain underside of a page                         */
/* ------------------------------------------------------------------ */

function PaperBack() {
  return (
    <div
      className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
      style={{
        transform: "rotateY(180deg)",
        background: "linear-gradient(155deg, #f7f5f0 0%, #e9e5de 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0 26px, rgba(0,0,0,0.028) 26px 27px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(0,0,0,0.06) 0%, transparent 45%, rgba(255,255,255,0.4) 100%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Corner curl triangle - the grabbed corner folds up like paper      */
/* ------------------------------------------------------------------ */

function curlStyle(corner: Corner, r: number, dir: Dir, pageWidth: number): CSSProperties {
  const size = { width: r, height: r } as CSSProperties;
  const shadow = { filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))" } as CSSProperties;

  if (dir === 1) {
    // curling from the right page (top-right / bottom-right corner)
    if (corner === "top") {
      return {
        ...size,
        ...shadow,
        top: 0,
        left: pageWidth - r,
        clipPath: "polygon(100% 0, 100% 100%, 0 0)",
        background: "linear-gradient(225deg, rgba(0,0,0,0.42), rgba(255,255,255,0.35) 62%, transparent)",
      };
    }
    return {
      ...size,
      ...shadow,
      bottom: 0,
      left: pageWidth - r,
      clipPath: "polygon(100% 100%, 0 100%, 100% 0)",
      background: "linear-gradient(135deg, rgba(0,0,0,0.42), rgba(255,255,255,0.35) 62%, transparent)",
    };
  }

  // curling from the left page (top-left / bottom-left corner)
  if (corner === "top") {
    return {
      ...size,
      ...shadow,
      top: 0,
      left: 0,
      clipPath: "polygon(0 0, 100% 0, 0 100%)",
      background: "linear-gradient(315deg, rgba(0,0,0,0.42), rgba(255,255,255,0.35) 62%, transparent)",
    };
  }
  return {
    ...size,
    ...shadow,
    bottom: 0,
    left: 0,
    clipPath: "polygon(0 100%, 0 0, 100% 100%)",
    background: "linear-gradient(45deg, rgba(0,0,0,0.42), rgba(255,255,255,0.35) 62%, transparent)",
  };
}

/* ------------------------------------------------------------------ */
/*  PageTurnBook - a CSS 3D book: pages turn around the spine,         */
/*  corners can be grabbed and curl up like real paper                 */
/* ------------------------------------------------------------------ */

export function PageTurnBook({
  pages,
  pageWidth,
  pageHeight,
  isMobile,
}: {
  pages: StoryPage[];
  pageWidth: number;
  pageHeight: number;
  isMobile: boolean;
}) {
  const maxIndex = pages.length - 1;

  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn>({ mode: "idle" });
  const [progress, setProgress] = useState(0);
  const [corner, setCorner] = useState<Corner>(null);

  const bookRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const dirRef = useRef<Dir>(1);
  const dragRef = useRef({ active: false, startX: 0, dir: 1 as Dir, corner: null as Corner });

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const canTurn = useCallback(
    (dir: Dir) => (dir === 1 ? index < maxIndex : index > 0),
    [index, maxIndex]
  );

  /* Auto (completed or snapped-back) turn animation */
  useEffect(() => {
    if (turn.mode !== "auto") return;
    const { from, to, dir } = turn;
    dirRef.current = dir;
    const start = performance.now();
    const duration = 500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setProgress(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTurn({ mode: "idle" });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [turn]);

  /* Commit the turn (or reset a snap-back) once the animation rests */
  useEffect(() => {
    if (turn.mode !== "idle") return;
    if (progress >= 0.995) {
      setIndex((i) => Math.min(maxIndex, Math.max(0, i + dirRef.current)));
      setProgress(0);
    } else if (progress > 0.005) {
      setProgress(0);
    }
  }, [turn, progress, maxIndex]);

  const flip = useCallback(
    (dir: Dir) => {
      if (!canTurn(dir)) return;
      dirRef.current = dir;
      setCorner(null);
      setProgress(0);
      setTurn({ mode: "auto", dir, from: 0, to: 1, corner: null });
    },
    [canTurn]
  );

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flip(1);
      if (e.key === "ArrowLeft") flip(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip]);

  /* Pointer interaction: grab a corner (curl) or swipe the page */
  function onPointerDown(e: ReactPointerEvent, dir: Dir, grabbedCorner: Corner) {
    if (!canTurn(dir)) return;
    dragRef.current = { active: true, startX: e.clientX, dir, corner: grabbedCorner };
    dirRef.current = dir;
    setCorner(grabbedCorner);
    setProgress(0);
    setTurn({ mode: "drag", dir, corner: grabbedCorner });
    bookRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const p = d.dir === 1 ? -dx / pageWidth : dx / pageWidth;
    setProgress(Math.min(1, Math.max(0, p)));
  }

  function onPointerUp() {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    const p = progressRef.current;
    setTurn({ mode: "auto", dir: d.dir, from: p, to: p > 0.45 ? 1 : 0, corner: null });
    setCorner(null);
  }

  /* ---------- derived geometry ---------- */

  const turning = turn.mode !== "idle";
  const dir = turning ? turn.dir : dirRef.current;
  const theta =
    !turning
      ? 0
      : dir === 1
        ? -180 * progress
        : isMobile
          ? 180 * progress
          : -180 + 180 * progress;

  const sheetIndex = dir === 1 ? index : index - 1;
  const showSheet = turning && sheetIndex >= 0 && sheetIndex <= maxIndex;

  const rightIndex = turning
    ? dir === 1
      ? progress > 0.5
        ? index + 1
        : index
      : index - 1
    : index;
  const rightVisible = rightIndex >= 0 && rightIndex <= maxIndex ? rightIndex : index;

  const curlR = Math.min(0.3, progress) * pageWidth;
  const sweepOpacity = turning ? Math.sin(Math.PI * Math.min(1, progress)) * 0.45 : 0;
  const hingeOpacity = turning ? Math.sin(Math.PI * Math.min(1, progress)) * 0.5 : 0;
  const mobileFade =
    isMobile && turning && progress > 0.55 ? 1 - (progress - 0.55) / 0.45 : 1;

  const bookWidth = pageWidth * (isMobile ? 1 : 2);

  return (
    <div>
      <div
        ref={bookRef}
        className="relative mx-auto select-none [perspective:2400px]"
        style={{ width: bookWidth, height: pageHeight, touchAction: "pan-y" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Left half: paper back of the previous sheet (real books have blank backs) */}
        {!isMobile && (
          <div
            className="absolute left-0 top-0 z-10 overflow-hidden rounded-l-md"
            style={{ width: pageWidth, height: pageHeight }}
          >
            <PaperBack />
          </div>
        )}

        {/* Right half: the current page (or the next one while turning) */}
        <div
          className={`absolute top-0 z-20 overflow-hidden rounded-sm ${
            isMobile ? "left-0" : "left-1/2"
          }`}
          style={{ width: pageWidth, height: pageHeight }}
        >
          <StoryPage page={pages[rightVisible]} eager />
        </div>

        {/* Spine / hinge shadow that deepens mid-flip */}
        {!isMobile && turning && (
          <div
            className="absolute left-1/2 top-0 z-[25] h-full w-[12%] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.12) 60%, transparent)",
              opacity: hingeOpacity,
            }}
          />
        )}

        {/* The turning sheet: front content + paper back, rotating in 3D */}
        {showSheet && (
          <div
            className="absolute top-0 z-30 [transform-style:preserve-3d]"
            style={{
              left: dir === 1 ? (isMobile ? 0 : "50%") : 0,
              width: pageWidth,
              height: pageHeight,
              transform: `rotateY(${theta}deg)`,
              transformOrigin: dir === 1 ? "left center" : "right center",
              opacity: mobileFade,
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-sm [backface-visibility:hidden]">
              <StoryPage page={pages[sheetIndex]} eager />
            </div>
            <PaperBack />
            {/* shading that sweeps across the page as it lifts */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(90deg, rgba(0,0,0,0.30), transparent 55%)",
                opacity: sweepOpacity,
              }}
            />
          </div>
        )}

        {/* Corner curl - only while dragging a corner */}
        {turn.mode === "drag" && corner && (
          <div
            className="pointer-events-none absolute z-40"
            style={curlStyle(corner, curlR, dir, pageWidth)}
          />
        )}

        {/* Grab hotspots + subtle fold marks on the corners (desktop) */}
        {!isMobile && (
          <>
            {canTurn(1) && (
              <>
                <div
                  className="absolute right-0 top-0 z-[45] h-3 w-3"
                  style={{
                    background: "linear-gradient(225deg, rgba(0,0,0,0.20), transparent 70%)",
                  }}
                />
                <div
                  className="absolute bottom-0 right-0 z-[45] h-3 w-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,0,0,0.20), transparent 70%)",
                  }}
                />
                <div
                  className="absolute right-0 top-0 z-40 h-20 w-20 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onPointerDown(e, 1, "top")}
                />
                <div
                  className="absolute bottom-0 right-0 z-40 h-20 w-20 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onPointerDown(e, 1, "bottom")}
                />
              </>
            )}
            {canTurn(-1) && (
              <>
                <div
                  className="absolute left-0 top-0 z-[45] h-3 w-3"
                  style={{
                    background: "linear-gradient(315deg, rgba(0,0,0,0.20), transparent 70%)",
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 z-[45] h-3 w-3"
                  style={{
                    background: "linear-gradient(45deg, rgba(0,0,0,0.20), transparent 70%)",
                  }}
                />
                <div
                  className="absolute left-0 top-0 z-40 h-20 w-20 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onPointerDown(e, -1, "top")}
                />
                <div
                  className="absolute bottom-0 left-0 z-40 h-20 w-20 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onPointerDown(e, -1, "bottom")}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => flip(-1)}
          disabled={index === 0}
          className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-sm font-bold text-slate-500">
          {index + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => flip(1)}
          disabled={index === maxIndex}
          className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
