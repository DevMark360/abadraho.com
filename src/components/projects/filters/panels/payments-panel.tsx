"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

export function PaymentsPanel({
  preMax,
  postMin,
  onlyPostHandover,
  onApply,
  onReset,
}: {
  preMax: number;
  postMin: number;
  onlyPostHandover: boolean;
  onApply: (pre: number, post: number, onlyPost: boolean) => void;
  onReset: () => void;
}) {
  const [pre, setPre] = useState(preMax);
  const [post, setPost] = useState(postMin);
  const [onlyPost, setOnlyPost] = useState(onlyPostHandover);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Projects payment plan</h3>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          Reset
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300">
            <X className="h-3 w-3" />
          </span>
        </button>
      </div>

      <div className="relative pt-6">
        <input
          type="range"
          min={0}
          max={100}
          value={pre}
          onChange={(e) => {
            const v = Number(e.target.value);
            setPre(v);
            setPost(100 - v);
          }}
          className="reelly-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-900"
        />
        <span className="absolute -top-1 left-0 text-xs text-zinc-500">0%</span>
        <span
          className="absolute -top-8 rounded bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white"
          style={{ left: `calc(${pre}% - 12px)` }}
        >
          {pre}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700">
            Maximum pre-handover
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={pre}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, Number(e.target.value)));
                setPre(v);
                setPost(100 - v);
              }}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-3 pr-8 text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              %
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700">
            After handover (on &amp; post)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={post}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, Number(e.target.value)));
                setPost(v);
                setPre(100 - v);
              }}
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-3 pr-8 text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              %
            </span>
          </div>
        </div>
      </div>

      <Toggle
        label="Search projects only with post handover payment plans"
        checked={onlyPost}
        onChange={setOnlyPost}
      />

      <button
        type="button"
        onClick={() => onApply(pre, post, onlyPost)}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white"
      >
        Apply filter
      </button>
    </div>
  );
}
