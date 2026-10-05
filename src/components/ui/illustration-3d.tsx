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
  | "location-pin"
  | "memo"
  | "check"
  | "eye"
  | "padlock"
  | "upload";

/** Short descriptions for alt text (the icons are decorative, so screen readers still skip them). */
const ALT: Record<Illustration3DName, string> = {
  home: "3D house illustration",
  calendar: "3D calendar illustration",
  bookmark: "3D bookmark illustration",
  chat: "3D chat bubble illustration",
  search: "3D magnifying glass illustration",
  "location-pin": "3D location pin illustration",
  memo: "3D notepad illustration",
  check: "3D check mark illustration",
  eye: "3D eye illustration",
  padlock: "3D padlock illustration",
  upload: "3D upload illustration",
};

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
      // Descriptive alt for image indexing / SEO checkers; aria-hidden keeps assistive tech
      // from announcing a purely decorative image next to its visible text.
      alt={ALT[name]}
      aria-hidden
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={cn("pointer-events-none select-none drop-shadow-[0_10px_14px_rgba(100,116,139,0.25)]", className)}
    />
  );
}
