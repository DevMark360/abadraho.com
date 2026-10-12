"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Builder logo in the round profile frame. Square logos fill the circle (their own background
 * becomes the avatar, like the map pins); a wide logo (wordmark) is shown whole on white.
 */
export function BuilderLogoAvatar({ src, alt }: { src: string; alt: string }) {
  const [wide, setWide] = useState(false);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      sizes="112px"
      // Small files; uploaded logos carry ?v= which the optimizer rejects.
      unoptimized
      className={cn(wide ? "object-contain p-2" : "object-cover")}
      onLoad={(e) => {
        const img = e.currentTarget;
        setWide(img.naturalWidth > img.naturalHeight * 1.15);
      }}
    />
  );
}
