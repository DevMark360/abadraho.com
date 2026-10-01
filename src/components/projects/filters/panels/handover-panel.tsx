"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";

const QUARTERS = [
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
  "Q1 2027",
  "Q2 2027",
  "Q3 2027",
  "Q4 2027",
  "Q1 2028",
  "Q2 2028",
  "Q3 2028",
  "Q4 2028",
];

export function HandoverPanel({
  from,
  to,
  onApply,
  onReset,
}: {
  from: string;
  to: string;
  onApply: (from: string | null, to: string | null) => void;
  onReset: () => void;
}) {
  const [fromVal, setFromVal] = useState(from);
  const [toVal, setToVal] = useState(to);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Project handover by</h3>
        <button
          type="button"
          onClick={() => {
            setFromVal("");
            setToVal("");
            onReset();
          }}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          Reset
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300">
            <X className="h-3 w-3" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <QuarterSelect label="From" value={fromVal} onChange={setFromVal} />
        <QuarterSelect label="To" value={toVal} onChange={setToVal} />
      </div>

      <button
        type="button"
        onClick={() => onApply(fromVal || null, toVal || null)}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white"
      >
        Apply filter
      </button>
    </div>
  );
}

function QuarterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-zinc-900">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2.5 pl-3 pr-8 text-sm text-zinc-600"
        >
          <option value="">Not selected</option>
          {QUARTERS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  );
}
