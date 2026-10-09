import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Shows the whole uploaded photo (object-contain, never cropped) inside a fixed-ratio box.
 * The leftover space is filled with a blurred, zoomed copy of the same photo, so a tall image in a
 * wide frame gets soft matching sides instead of grey bars. Same src, so no extra download.
 * The parent must be `relative` with a size (e.g. `aspect-video`) and `overflow-hidden`.
 */
export function FittedImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  /** Extra classes for the sharp (foreground) image, e.g. a hover zoom. */
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        className="scale-110 object-cover opacity-80 blur-xl"
        unoptimized
        priority={priority}
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-contain", className)}
        unoptimized
        priority={priority}
      />
    </>
  );
}
