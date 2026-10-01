import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "muted";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-brand-muted text-brand-dark",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "muted" && "bg-slate-100 text-slate-600",
        className
      )}
      {...props}
    />
  );
}
