"use client";

import Image from "next/image";
import { ZoomIn } from "lucide-react";

export function PlanImageViewer({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen?: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-zinc-50">
      <div className="relative w-full">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          className="h-auto w-full object-contain"
          unoptimized
        />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="pointer-events-auto flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-white/95 text-zinc-800 opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100"
          aria-label={`View full ${alt}`}
        >
          <ZoomIn className="h-7 w-7" />
        </a>
      </div>
    </div>
  );
}
