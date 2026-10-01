import { ROOM_TYPE_FA_ICONS } from "@/data/room-type-fa-icons";
import { cn } from "@/lib/utils";

/** DB stores `fa-bed` (legacy). */
export function normalizeFaIconClass(icon?: string | null): string | null {
  if (!icon?.trim()) return null;
  const raw = icon.trim();
  if (raw.includes("<")) return null;
  if (raw.startsWith("fa-")) return raw;
  if (raw.startsWith("fa ")) {
    const part = raw.split(/\s+/).find((p) => p.startsWith("fa-"));
    return part ?? null;
  }
  return `fa-${raw.replace(/^fa-?/, "")}`;
}

export function RoomTypeIcon({
  icon,
  className,
  title,
}: {
  icon?: string | null;
  className?: string;
  title?: string;
}) {
  const faClass = normalizeFaIconClass(icon);
  if (!faClass) return null;

  const codePoint = ROOM_TYPE_FA_ICONS[faClass];
  if (!codePoint) {
    return (
      <span className={cn("text-xs text-zinc-400", className)} title={title ?? faClass}>
        {faClass}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-block leading-none", className)}
      style={{
        fontFamily: "FontAwesome",
        fontStyle: "normal",
        fontWeight: "normal",
        fontVariant: "normal",
        textTransform: "none",
      }}
      title={title ?? faClass}
      aria-hidden={title ? undefined : true}
    >
      {String.fromCodePoint(codePoint)}
    </span>
  );
}
