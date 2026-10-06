import type { ComponentType, SVGProps } from "react";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { socialProfiles, type SocialNetwork } from "@/config/business";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** X (formerly Twitter) mark — not in lucide. */
function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** TikTok mark — not in lucide. */
function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const ICONS: Record<SocialNetwork, ComponentType<IconProps>> = {
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  x: XIcon,
  tiktok: TikTokIcon,
};

/**
 * Official social profiles from .env (see socialProfiles). Plain icons, no tiles; renders nothing
 * when no profile is configured.
 */
export function SocialLinks({ className }: { className?: string }) {
  if (!socialProfiles.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-1", className)} aria-label="Follow us">
      {socialProfiles.map(({ network, label, url }) => {
        const Icon = ICONS[network];
        return (
          <li key={network}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`${label} (opens in a new tab)`}
              title={label}
              className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors hover:text-brand-accent"
            >
              <Icon className="h-5 w-5" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
