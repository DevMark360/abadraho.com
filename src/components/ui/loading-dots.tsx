"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { LottieComponentProps } from "lottie-react";
import { loadingDotsAnimation } from "@/assets/lottie/loading-dots-data";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: 28,
  sm: 48,
  md: 72,
  lg: 96,
} as const;

export type LoadingDotsSize = keyof typeof SIZES;

type LottieComponent = ComponentType<LottieComponentProps>;

export function LoadingDots({
  size = "md",
  className,
}: {
  size?: LoadingDotsSize;
  className?: string;
}) {
  const px = SIZES[size];
  const [Lottie, setLottie] = useState<LottieComponent | null>(null);

  useEffect(() => {
    let active = true;
    void import("lottie-react").then((mod) => {
      if (active) setLottie(() => mod.default);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Lottie) {
    return (
      <span
        className={cn("inline-block animate-pulse rounded-full bg-zinc-200", className)}
        style={{ width: px, height: px }}
        aria-hidden
      />
    );
  }

  return (
    <Lottie
      animationData={loadingDotsAnimation}
      loop
      className={cn("pointer-events-none", className)}
      style={{ width: px, height: px }}
      aria-hidden
    />
  );
}
