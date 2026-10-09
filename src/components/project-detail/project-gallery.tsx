"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { FittedImage } from "@/components/ui/fitted-image";

export function ProjectGallery({
  images,
  projectName,
}: {
  images: string[];
  /** Used for image alt text, e.g. "Roomi Towers — photo 2 of 9". */
  projectName: string;
}) {
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
        <FittedImage
          key={active}
          src={safe[active] ?? safe[0]}
          alt={`${projectName}, photo ${active + 1} of ${safe.length}`}
          sizes="(max-width: 1024px) 100vw, 66vw"
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
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-zinc-900" : "border-transparent opacity-70"
              }`}
            >
              <Image
                src={src}
                alt={`${projectName}, thumbnail ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
