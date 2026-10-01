import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminStarRating({ rating, className }: { rating: number; className?: string }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <ul className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${n} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i}>
          <Star
            className={cn(
              "h-4 w-4",
              i < n ? "fill-amber-400 text-amber-400" : "text-zinc-300"
            )}
          />
        </li>
      ))}
    </ul>
  );
}
