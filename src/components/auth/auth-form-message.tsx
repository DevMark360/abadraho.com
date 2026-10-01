import { cn } from "@/lib/utils";

const variants = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

export function AuthFormMessage({
  variant,
  children,
  className,
}: {
  variant: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-3 py-2 text-sm", variants[variant], className)}
    >
      {children}
    </p>
  );
}
