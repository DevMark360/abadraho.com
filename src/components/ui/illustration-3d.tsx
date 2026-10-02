import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Free 3D clay icons from IconScout ("Essentials" pack by Dicky Prayudawanto), stored in
 * public/icons/3d. Decorative only — always pair with visible text. Used as illustrations
 * (empty states, panels), never inside small tiles or buttons.
 */
export type Illustration3DName =
  | "home"
  | "calendar"
  | "bookmark"
  | "chat"
  | "search"
  | "location-pin";

export function Illustration3D({
  name,
  size = 96,
  className,
  priority = false,
}: {
  name: Illustration3DName;
  /** Rendered width/height in CSS pixels (the source PNG is 500×500). */
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/icons/3d/${name}.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={cn("pointer-events-none select-none drop-shadow-[0_10px_14px_rgba(100,116,139,0.25)]", className)}
    />
  );
}
