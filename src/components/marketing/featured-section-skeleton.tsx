/** SSR-safe placeholder while the interactive featured section loads client-side. */
export function FeaturedSectionSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-zinc-200" />
          <div className="h-8 w-64 max-w-full rounded bg-zinc-200 md:h-9" />
          <div className="h-4 w-full max-w-xl rounded bg-zinc-100" />
        </div>
        <div className="hidden h-4 w-16 rounded bg-zinc-200 sm:block" />
      </div>
      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-[min(78vw,280px)] shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:w-[300px] md:w-[320px]"
          >
            <div className="mx-auto h-28 w-28 rounded-full bg-zinc-200" />
            <div className="mx-auto mt-5 h-5 w-3/4 rounded bg-zinc-200" />
            <div className="mx-auto mt-2 h-3 w-2/3 rounded bg-zinc-100" />
            <div className="mx-auto mt-4 h-4 w-1/2 rounded bg-zinc-200" />
            <div className="mt-6 space-y-2">
              <div className="h-9 rounded bg-zinc-100" />
              <div className="h-9 rounded bg-zinc-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
