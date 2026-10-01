"use client";

import { LoadingDots, type LoadingDotsSize } from "@/components/ui/loading-dots";
import { cn } from "@/lib/utils";

export function LoadingState({
  size = "md",
  label,
  inline = false,
  fullHeight = false,
  className,
}: {
  size?: LoadingDotsSize;
  /** Visible helper text below the animation */
  label?: string;
  /** Compact row / table cell layout */
  inline?: boolean;
  /** Stretch to fill parent (listings, compare, etc.) */
  fullHeight?: boolean;
  className?: string;
}) {
  const message = label ?? "Loading";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        inline
          ? "inline-flex items-center justify-center gap-2"
          : "flex flex-col items-center justify-center gap-2",
        fullHeight && "min-h-[min(40vh,320px)] flex-1",
        className
      )}
    >
      <LoadingDots size={size} />
      {label ? <p className="text-sm text-zinc-500">{label}</p> : null}
      <span className="sr-only">{message}</span>
    </div>
  );
}
