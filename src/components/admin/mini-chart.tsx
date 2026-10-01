"use client";

import { useState } from "react";

/** Shared SVG chart primitives — hand-rolled (no charting dependency). */

const COLOR_HEX: Record<string, string> = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  zinc: "#3f3f46",
  blue: "#3b82f6",
  amber: "#f59e0b",
  red: "#ef4444",
};

export function Sparkline({
  values,
  color = "indigo",
  width = 96,
  height = 32,
}: {
  values: number[];
  color?: keyof typeof COLOR_HEX;
  width?: number;
  height?: number;
}) {
  const hex = COLOR_HEX[color] ?? COLOR_HEX.indigo;
  const max = Math.max(1, ...values);
  const n = values.length;
  if (n === 0) return <svg width={width} height={height} aria-hidden />;

  const gap = 1.5;
  const barWidth = Math.max(1, (width - gap * (n - 1)) / n);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {values.map((v, i) => {
        const barHeight = v <= 0 ? 1 : Math.max(2, (v / max) * height);
        const x = i * (barWidth + gap);
        return (
          <rect
            key={i}
            x={x}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={Math.min(1, barWidth / 2)}
            fill={hex}
            opacity={v <= 0 ? 0.12 : i === n - 1 ? 1 : 0.55}
          />
        );
      })}
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 120,
  thickness = 16,
}: {
  segments: { label: string; value: number; color: keyof typeof COLOR_HEX }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth={thickness} />
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * circumference;
            const offset = -cumulative * circumference;
            cumulative += frac;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={COLOR_HEX[seg.color]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              >
                <title>
                  {seg.label}: {seg.value}
                </title>
              </circle>
            );
          })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill="#18181b">
        {total}
      </text>
    </svg>
  );
}

export function SpendGauge({
  current,
  goal,
  size = 160,
  formatValue = (v: number) => String(v),
}: {
  current: number;
  goal: number;
  size?: number;
  formatValue?: (v: number) => string;
}) {
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;

  function arcPoint(t: number) {
    const angle = 180 - t * 180;
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  const start = arcPoint(0);
  const end = arcPoint(1);
  const fgEnd = arcPoint(pct);
  const bgPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
  const fgPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${fgEnd.x} ${fgEnd.y}`;

  return (
    <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
      <path d={bgPath} fill="none" stroke="#f4f4f5" strokeWidth={12} strokeLinecap="round" />
      {pct > 0 && <path d={fgPath} fill="none" stroke={COLOR_HEX.indigo} strokeWidth={12} strokeLinecap="round" />}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="#18181b">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} fill="#a1a1aa">
        {formatValue(current)} of {formatValue(goal)}
      </text>
    </svg>
  );
}

/** Catmull-Rom-to-Bezier smoothing — a natural curve through every real data point (no
 * overshoot-prone approximation), used where a smooth trend line was explicitly requested. */
function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function smoothAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (!points.length) return "";
  const line = smoothLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x},${baseline} L${first.x},${baseline} Z`;
}

function nearestIndex(points: { x: number }[], mouseX: number): number {
  let best = 0;
  let bestDist = Infinity;
  points.forEach((p, i) => {
    const d = Math.abs(p.x - mouseX);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** Full-width smooth area chart with a hover tooltip — for a genuinely continuous trend
 * (explicitly requested), as opposed to BarChart's discrete-day treatment. */
export function SmoothAreaChart({
  points,
  color = "indigo",
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  points: { label: string; value: number }[];
  color?: keyof typeof COLOR_HEX;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = 900;
  const padLeft = 36;
  const padBottom = 24;
  const padTop = 16;
  const chartWidth = width - padLeft;
  const chartHeight = height - padBottom - padTop;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const hex = COLOR_HEX[color] ?? COLOR_HEX.indigo;
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values) * 1.15;
  const n = points.length;

  if (n === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No data for this range yet
      </div>
    );
  }

  const plotted = points.map((p, i) => ({
    x: padLeft + (n === 1 ? chartWidth / 2 : (i / (n - 1)) * chartWidth),
    y: padTop + chartHeight - (p.value / max) * chartHeight,
  }));

  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const gridLines = [0, 0.5, 1].filter((g, i, arr) => {
    if (i === 0) return true;
    const label = Math.round(max * g);
    return arr.slice(0, i).every((prev) => Math.round(max * prev) !== label);
  });

  const gradientId = `smootharea-${color}`;
  const hovered = hoverIdx != null ? { point: plotted[hoverIdx], data: points[hoverIdx] } : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
      role="img"
      aria-label="Trend chart"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        setHoverIdx(nearestIndex(plotted, mouseX));
      }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity={0.25} />
          <stop offset="100%" stopColor={hex} stopOpacity={0} />
        </linearGradient>
      </defs>

      {gridLines.map((g) => {
        const y = padTop + chartHeight * (1 - g);
        return (
          <g key={g}>
            <line x1={padLeft} x2={width} y1={y} y2={y} stroke="#f1f1f4" strokeWidth={1} />
            <text x={0} y={y + 4} fontSize={10} fill="#a1a1aa">
              {formatValue(Math.round(max * g))}
            </text>
          </g>
        );
      })}

      <path d={smoothAreaPath(plotted, padTop + chartHeight)} fill={`url(#${gradientId})`} stroke="none" />
      <path d={smoothLinePath(plotted)} fill="none" stroke={hex} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

      {plotted.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 4}
          fontSize={10}
          fill="#a1a1aa"
          textAnchor="middle"
          opacity={i % labelEvery === 0 ? 1 : 0}
        >
          {points[i].label}
        </text>
      ))}

      {hovered && (
        <g>
          <line x1={hovered.point.x} x2={hovered.point.x} y1={padTop} y2={padTop + chartHeight} stroke="#e4e4e7" strokeWidth={1} />
          <circle cx={hovered.point.x} cy={hovered.point.y} r={4} fill="white" stroke={hex} strokeWidth={2} />
          <TooltipBox
            x={hovered.point.x}
            y={hovered.point.y}
            width={width}
            lines={[
              { text: hovered.data.label, bold: true },
              { text: formatValue(hovered.data.value), color: "#a1a1aa" },
            ]}
          />
        </g>
      )}
    </svg>
  );
}

/** Dual-series smooth chart (e.g. Customers vs Projects) with a shared hover tooltip showing
 * both values at the nearest date — for comparing two related trends at once. */
export function DualLineChart({
  points,
  seriesA,
  seriesB,
  height = 220,
}: {
  points: { label: string; a: number; b: number }[];
  seriesA: { label: string; color: keyof typeof COLOR_HEX };
  seriesB: { label: string; color: keyof typeof COLOR_HEX };
  height?: number;
}) {
  const width = 900;
  const padLeft = 30;
  const padBottom = 24;
  const padTop = 16;
  const chartWidth = width - padLeft;
  const chartHeight = height - padBottom - padTop;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const n = points.length;
  const max = Math.max(1, ...points.map((p) => Math.max(p.a, p.b))) * 1.15;

  if (n === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No data for this range yet
      </div>
    );
  }

  const xAt = (i: number) => padLeft + (n === 1 ? chartWidth / 2 : (i / (n - 1)) * chartWidth);
  const plottedA = points.map((p, i) => ({ x: xAt(i), y: padTop + chartHeight - (p.a / max) * chartHeight }));
  const plottedB = points.map((p, i) => ({ x: xAt(i), y: padTop + chartHeight - (p.b / max) * chartHeight }));

  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const hexA = COLOR_HEX[seriesA.color];
  const hexB = COLOR_HEX[seriesB.color];
  const hovered = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
      role="img"
      aria-label="Customers vs projects trend"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        setHoverIdx(nearestIndex(plottedA, mouseX));
      }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <line x1={padLeft} x2={width} y1={padTop + chartHeight} y2={padTop + chartHeight} stroke="#f1f1f4" strokeWidth={1} />

      <path d={smoothLinePath(plottedB)} fill="none" stroke={hexB} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={smoothLinePath(plottedA)} fill="none" stroke={hexA} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <text
          key={i}
          x={xAt(i)}
          y={height - 4}
          fontSize={10}
          fill="#a1a1aa"
          textAnchor="middle"
          opacity={i % labelEvery === 0 ? 1 : 0}
        >
          {p.label}
        </text>
      ))}

      {hoverIdx != null && hovered && (
        <g>
          <line
            x1={xAt(hoverIdx)}
            x2={xAt(hoverIdx)}
            y1={padTop}
            y2={padTop + chartHeight}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
          <circle cx={plottedA[hoverIdx].x} cy={plottedA[hoverIdx].y} r={4} fill="white" stroke={hexA} strokeWidth={2} />
          <circle cx={plottedB[hoverIdx].x} cy={plottedB[hoverIdx].y} r={4} fill="white" stroke={hexB} strokeWidth={2} />
          <TooltipBox
            x={xAt(hoverIdx)}
            y={Math.min(plottedA[hoverIdx].y, plottedB[hoverIdx].y)}
            width={width}
            lines={[
              { text: hovered.label, bold: true },
              { text: `${seriesA.label}: ${hovered.a}`, color: hexA },
              { text: `${seriesB.label}: ${hovered.b}`, color: hexB },
            ]}
          />
        </g>
      )}
    </svg>
  );
}

function TooltipBox({
  x,
  y,
  width,
  lines,
}: {
  x: number;
  y: number;
  width: number;
  lines: { text: string; color?: string; bold?: boolean }[];
}) {
  const boxWidth = 120;
  const lineHeight = 15;
  const boxHeight = 12 + lines.length * lineHeight;
  const flip = x + 12 + boxWidth > width;
  const bx = flip ? x - 12 - boxWidth : x + 12;
  const by = Math.max(4, y - boxHeight / 2);
  const textX = bx + 10;

  return (
    <g pointerEvents="none">
      <rect x={bx} y={by} width={boxWidth} height={boxHeight} rx={6} fill="#18181b" opacity={0.92} />
      {lines.map((line, i) => (
        <text
          key={i}
          x={textX}
          y={by + 16 + i * lineHeight}
          fontSize={11}
          fontWeight={line.bold ? 600 : 400}
          fill={line.color ?? "white"}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}

export function BarChart({
  points,
  color = "indigo",
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  points: { label: string; value: number }[];
  color?: keyof typeof COLOR_HEX;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = 900;
  const padLeft = 36;
  const padBottom = 24;
  const padTop = 16;
  const chartWidth = width - padLeft;
  const chartHeight = height - padBottom - padTop;

  const hex = COLOR_HEX[color] ?? COLOR_HEX.indigo;
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values) * 1.15;
  const n = points.length;

  if (n === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No data for this range yet
      </div>
    );
  }

  const slot = chartWidth / n;
  const barWidth = Math.max(2, Math.min(28, slot * 0.55));

  // Thin out x-axis labels so they don't collide when there are many points (e.g. 30 days).
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  // Dedupe gridlines whose rounded label would collide (e.g. a max of 1 rounds 50%/100% to the same "1").
  const gridLines = [0, 0.5, 1].filter((g, i, arr) => {
    if (i === 0) return true;
    const label = Math.round(max * g);
    return arr.slice(0, i).every((prev) => Math.round(max * prev) !== label);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
      role="img"
      aria-label="Trend chart"
    >
      {gridLines.map((g) => {
        const y = padTop + chartHeight * (1 - g);
        return (
          <g key={g}>
            <line x1={padLeft} x2={width} y1={y} y2={y} stroke="#f1f1f4" strokeWidth={1} />
            <text x={0} y={y + 4} fontSize={10} fill="#a1a1aa">
              {formatValue(Math.round(max * g))}
            </text>
          </g>
        );
      })}

      {points.map((p, i) => {
        const cx = padLeft + slot * (i + 0.5);
        const barHeight = p.value <= 0 ? 0 : Math.max(3, (p.value / max) * chartHeight);
        const y = padTop + chartHeight - barHeight;
        return (
          <g key={i}>
            <rect
              x={cx - barWidth / 2}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={hex}
              opacity={i === n - 1 && p.value > 0 ? 1 : 0.65}
            />
            <title>
              {p.label}: {formatValue(p.value)}
            </title>
            {i % labelEvery === 0 && (
              <text x={cx} y={height - 4} fontSize={10} fill="#a1a1aa" textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
