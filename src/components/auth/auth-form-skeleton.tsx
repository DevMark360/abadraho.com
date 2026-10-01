import { cn } from "@/lib/utils";

/** Placeholder while auth forms hydrate (matches AuthFormCard size). */
export function AuthFormSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-md animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm",
        className
      )}
      aria-hidden
    >
      <div className="mb-6 h-8 w-36 rounded-md bg-zinc-100" />
      <div className="h-7 w-40 rounded-md bg-zinc-200" />
      <div className="mt-2 h-4 w-56 rounded-md bg-zinc-100" />
      <div className="mt-6 space-y-4">
        <div className="h-10 rounded-lg bg-zinc-100" />
        <div className="h-10 rounded-lg bg-zinc-100" />
        <div className="h-10 rounded-lg bg-zinc-200" />
      </div>
      <div className="mt-6 h-4 w-full rounded-md bg-zinc-100" />
    </div>
  );
}
