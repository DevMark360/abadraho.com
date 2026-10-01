export default function HomeLoading() {
  return (
    <div className="animate-pulse bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="h-8 w-32 rounded-lg bg-zinc-200" />
          <div className="hidden gap-2 md:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-16 rounded-lg bg-zinc-100" />
            ))}
          </div>
          <div className="h-9 w-20 rounded-lg bg-zinc-200" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-6 w-40 rounded-full bg-zinc-200" />
            <div className="h-12 w-full max-w-lg rounded-xl bg-zinc-200" />
            <div className="h-5 w-full max-w-md rounded bg-zinc-100" />
            <div className="h-14 w-full rounded-xl bg-zinc-200" />
          </div>
          <div className="aspect-[4/3] rounded-2xl bg-zinc-200" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 h-8 w-48 rounded bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-zinc-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
