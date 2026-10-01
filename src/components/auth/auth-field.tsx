import { cn } from "@/lib/utils";

export function AuthField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}
