import { popularPlaces } from "@/config/marketing";
import { homeCardClass } from "@/components/marketing/home-ui";

export function HomeAreaChart({
  areaCounts,
}: {
  areaCounts: Record<string, number>;
}) {
  const data = popularPlaces
    .map((place) => ({
      name: place.name,
      count: areaCounts[place.name] ?? 0,
    }))
    .filter((d) => d.count > 0);

  const max = Math.max(...data.map((d) => d.count), 1);

  if (!data.length) {
    return (
      <div className={`${homeCardClass} p-6 text-center text-sm text-zinc-500`}>
        Area statistics will appear when listings are available.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className={`${homeCardClass} p-6`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Listings by area</h3>
          <p className="mt-1 text-sm text-zinc-500">Distribution across popular Karachi zones</p>
        </div>
        <p className="text-right text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{total}</span> total
        </p>
      </div>

      <div className="space-y-4">
        {data.map((row) => {
          const pct = Math.round((row.count / max) * 100);
          const share = Math.round((row.count / total) * 100);
          return (
            <div key={row.name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800">{row.name}</span>
                <span className="text-zinc-500">
                  {row.count} · {share}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-brand-accent transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3 rounded-xl bg-zinc-50 p-4 text-xs">
        <div className="flex flex-1 flex-col items-center rounded-lg bg-white py-2 shadow-sm">
          <span className="font-semibold text-emerald-700">{total}</span>
          <span className="text-zinc-500">Listed</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-lg bg-white py-2 shadow-sm">
          <span className="font-semibold text-zinc-900">{data.length}</span>
          <span className="text-zinc-500">Areas</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-lg bg-white py-2 shadow-sm">
          <span className="font-semibold text-brand-accent">
            {Math.round(total / data.length)}
          </span>
          <span className="text-zinc-500">Avg / area</span>
        </div>
      </div>
    </div>
  );
}
