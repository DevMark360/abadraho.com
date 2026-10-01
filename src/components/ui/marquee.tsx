"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite horizontal auto-scroll (marquee). Renders `children` twice back-to-back
 * and animates the track from translateX(0) to translateX(-50%) — since both
 * halves are identical, the loop point is invisible (no gap/jump on reset).
 */
export function Marquee({
  children,
  className,
  trackClassName,
  gap = "1rem",
  durationSeconds,
  pauseOnHover = true,
  fadeEdges = false,
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
}) {
  const itemCount = Children.count(children);
  const duration = durationSeconds ?? Math.max(itemCount * 3, 15);

  return (
    <div className={cn("marquee-viewport", fadeEdges && "marquee-viewport--fade", className)}>
      <div
        className={cn("marquee-track", pauseOnHover && "marquee-track--pausable", trackClassName)}
        style={
          {
            "--marquee-duration": `${duration}s`,
            "--marquee-gap": gap,
          } as CSSProperties
        }
      >
        <div className="marquee-group">{children}</div>
        {/* Exact duplicate, hidden from assistive tech and tab order — it exists purely so the loop is seamless. */}
        <div className="marquee-group" aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  );
}
