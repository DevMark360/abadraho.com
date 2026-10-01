"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import { useState } from "react";

export function ProjectGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  const safe = images.filter(Boolean);

  if (!safe.length) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-zinc-100">
        <Building2 className="h-12 w-12 text-zinc-300" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={safe[active] ?? safe[0]}
          alt=""
          fill
          className="object-cover"
          unoptimized
          priority
        />
      </div>
      {safe.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safe.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-zinc-900" : "border-transparent opacity-70"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
