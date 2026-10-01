import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export function SectionHeadline({
  before,
  highlight,
  after = "",
  subtitle,
  align = "center",
  className = "",
}: {
  before: string;
  highlight: string;
  after?: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
  eyebrow?: string;
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
        {before}{" "}
        <span className="text-brand-accent">{highlight}</span>
        {after ? ` ${after}` : ""}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-2 max-w-2xl text-base leading-relaxed text-zinc-600",
            align === "center" && "mx-auto"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
