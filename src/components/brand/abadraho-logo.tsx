import Link from "next/link";
import { BRAND_LOGO, brandLogoWidthForHeight } from "@/config/brand";
import { cn } from "@/lib/utils";

export type AbadrahoLogoProps = {
  /** Link target; pass `null` for static logo only */
  href?: string | null;
  height?: number;
  className?: string;
  imgClassName?: string;
  /** Light background chip so full-color logo reads on dark admin sidebar */
  onDark?: boolean;
};

export function AbadrahoLogo({
  href = "/",
  height = 48,
  className,
  imgClassName,
  onDark = false,
}: AbadrahoLogoProps) {
  const maxWidth = brandLogoWidthForHeight(height);

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      src={BRAND_LOGO.src}
      alt="AbadRaho"
      width={maxWidth}
      height={height}
      className={cn("brand-logo block object-contain object-left", imgClassName)}
      style={{ height, width: "auto", maxWidth: "100%" }}
    />
  );

  const wrapped = (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center",
        onDark && "rounded-md bg-white px-2.5 py-1.5 shadow-sm",
        href == null ? className : undefined
      )}
    >
      {image}
    </span>
  );

  if (href == null) return wrapped;

  return (
    <Link
      href={href as "/"}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center focus:outline-none",
        className
      )}
    >
      {wrapped}
    </Link>
  );
}
