"use client";

import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Direction = -1 | 1;

type Edges = { start: boolean; end: boolean };

function readEdges(el: HTMLElement): Edges {
  return {
    start: el.scrollLeft <= 1,
    end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
  };
}

function scrollStep(el: HTMLElement, dir: Direction) {
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
}

/** Current position inside one loop of the running animation, in px. */
function loopOffset(track: HTMLElement): number {
  const transform = getComputedStyle(track).transform;
  const x = transform && transform !== "none" ? new DOMMatrixReadOnly(transform).m41 : 0;
  const period = track.offsetWidth / 2;
  return period > 0 ? ((-x % period) + period) % period : 0;
}

/**
 * Infinite horizontal auto-scroll. Renders `children` twice back-to-back and animates the
 * track by -50%, so the loop point is seamless. Arrows, a swipe or a sideways wheel stop the
 * animation and hand over to normal scrolling from the same position.
 */
export function Marquee({
  children,
  className,
  trackClassName,
  gap = "1rem",
  durationSeconds,
  pauseOnHover = true,
  fadeEdges = false,
  controls = true,
}: {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  /** Space between items, and between the two duplicated groups. */
  gap?: string;
  /** Seconds for one full loop. Defaults to ~3s/item so speed feels consistent as item count changes. */
  durationSeconds?: number;
  pauseOnHover?: boolean;
  /** Fade items in/out at the left/right edges instead of a hard clip. */
  fadeEdges?: boolean;
  /** Show previous/next arrows. */
  controls?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handoff = useRef<{ offset: number; dir: Direction | null } | null>(null);
  const [manual, setManual] = useState(false);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });

  const itemCount = Children.count(children);
  const duration = durationSeconds ?? Math.max(itemCount * 3, 15);

  function takeOver(dir: Direction | null) {
    if (manual) {
      if (dir && viewportRef.current) scrollStep(viewportRef.current, dir);
      return;
    }
    const track = trackRef.current;
    if (!track) return;
    handoff.current = { offset: loopOffset(track), dir };
    setManual(true);
  }

  useLayoutEffect(() => {
    const el = viewportRef.current;
    const pending = handoff.current;
    if (!manual || !el || !pending) return;
    handoff.current = null;
    el.scrollLeft = pending.offset;
    setEdges(readEdges(el));
    if (pending.dir) scrollStep(el, pending.dir);
  }, [manual]);

  const arrowClass =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-clay ring-1 ring-zinc-200/80 transition hover:bg-white hover:text-brand-accent disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className={cn(
          "marquee-viewport",
          fadeEdges && "marquee-viewport--fade",
          manual && "marquee-viewport--manual",
          className
        )}
        onTouchStart={manual ? undefined : () => takeOver(null)}
        onWheel={
          manual
            ? undefined
            : (e) => {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) takeOver(null);
              }
        }
        onScroll={manual ? (e) => setEdges(readEdges(e.currentTarget)) : undefined}
      >
        <div
          ref={trackRef}
          className={cn(
            "marquee-track",
            pauseOnHover && "marquee-track--pausable",
            trackClassName
          )}
          style={
            {
              "--marquee-duration": `${duration}s`,
              "--marquee-gap": gap,
            } as CSSProperties
          }
        >
          <div className="marquee-group">{children}</div>
          {/* Exact duplicate for the seamless loop; dropped once the visitor scrolls by hand. */}
          {manual ? null : (
            <div className="marquee-group" aria-hidden="true" inert>
              {children}
            </div>
          )}
        </div>
      </div>

      {controls ? (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            className={cn(arrowClass, "left-1 sm:left-2")}
            disabled={manual && edges.start}
            onClick={() => takeOver(-1)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            className={cn(arrowClass, "right-1 sm:right-2")}
            disabled={manual && edges.end}
            onClick={() => takeOver(1)}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
