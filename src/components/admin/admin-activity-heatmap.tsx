"use client";

import { useEffect, useState } from "react";

type HeatmapDay = { date: string; count: number };

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function intensity(count: number, max: number): string {
  if (count <= 0) return "bg-zinc-100";
  const ratio = count / max;
  if (ratio > 0.75) return "bg-indigo-600";
  if (ratio > 0.5) return "bg-indigo-400";
  if (ratio > 0.25) return "bg-indigo-300";
  return "bg-indigo-200";
}

export function AdminActivityHeatmap() {
  const [days, setDays] = useState<HeatmapDay[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/activity-heatmap")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDays(json.days);
      })
      .catch(() => setDays([]));
  }, []);

  if (days === null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-400">Loading activity…</p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Yearly activity</h2>
        <p className="mt-2 text-sm text-zinc-400">No activity data yet.</p>
      </div>
    );
  }

  // Pad the front so the first day lands in its real weekday row (Sun=0 .. Sat=6), GitHub-style.
  const firstWeekday = new Date(days[0].date).getDay();
  const padded: (HeatmapDay | null)[] = [...Array(firstWeekday).fill(null), ...days];

  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);

  // Month label above the first week column that starts a new month.
  let lastMonth = -1;
  const monthLabels = weeks.map((week) => {
    const firstReal = week.find((d) => d !== null);
    if (!firstReal) return "";
    const month = new Date(firstReal.date).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return MONTH_NAMES[month];
    }
    return "";
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Yearly activity</h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">Signups, inquiries, reviews and new projects</p>
        </div>
        <p className="text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-700">{total}</span> events in the last year
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="inline-flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              <div className="h-2.5 text-[8px] leading-[10px] text-zinc-400">{monthLabels[wi]}</div>
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`h-2.5 w-2.5 rounded-sm ${day ? intensity(day.count, max) : "bg-transparent"}`}
                  title={day ? `${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}` : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
