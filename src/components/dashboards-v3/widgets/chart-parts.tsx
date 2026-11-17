"use client";

import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { AXIS_TEXT, LABEL_TEXT } from "@/lib/dashboards-v3/palette";
import { fmtCompact, fmtValue } from "@/lib/dashboards-v3/format";
import type { Bucket } from "@/lib/dashboards-v3/series";

/** Shared Recharts settings so every v3 chart reads the same: light grid, slate-500 axis text, no axis lines. */
export const AXIS_TICK = { fontSize: 11, fill: AXIS_TEXT };

export const TOOLTIP_PROPS = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  labelStyle: { fontWeight: 600, color: "#0f172a", marginBottom: 4 },
};

export const axisFormatter = (metric: Metric) => (v: number) => fmtCompact(v, metric);
export const tooltipFormatter = (metric: Metric) => (v: unknown) => (typeof v === "number" ? fmtValue(v, metric) : String(v ?? "–"));

/**
 * A series' name at the end of its line, so the chart reads without a
 * legend: a short stroke in the series colour (dashed if the line is), then
 * the name in slate-700, since some series colours are too light for text.
 */
export function EndLabel({ x, y, index, last, name, color, dashed }: { x?: number | string; y?: number | string; index?: number; last: number; name: string; color: string; dashed?: boolean }) {
  if (index !== last || x === undefined || y === undefined) return null;
  const px = Number(x);
  const py = Number(y);
  return (
    <g>
      <line x1={px + 4} x2={px + 14} y1={py} y2={py} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? "3 2" : undefined} />
      <text x={px + 18} y={py} dy={4} fontSize={11} fontWeight={600} fill={LABEL_TEXT}>{name}</text>
    </g>
  );
}

/** Rough width of a direct label and its stroke, for the chart's right margin. */
export function labelRoom(names: string[]): number {
  return Math.min(136, Math.max(0, ...names.map((n) => n.length * 6.5)) + 26);
}

/** Legend text in slate-700 rather than the series colour, for the same reason. */
export const legendText = (value: string) => <span style={{ color: LABEL_TEXT }}>{value}</span>;

/** Legends, where lines aren't named at their ends, sit below the chart, centred, with square swatches. */
export const LEGEND_PROPS = {
  verticalAlign: "bottom" as const,
  align: "center" as const,
  iconType: "square" as const,
  iconSize: 10,
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  formatter: legendText,
};

/** Light dashed horizontal gridlines only, drawn behind the data. */
export const GRID_PROPS = { strokeDasharray: "3 3", vertical: false } as const;

interface TooltipRow {
  name?: unknown;
  value?: unknown;
  color?: string;
  payload?: Record<string, unknown>;
}

/**
 * The tooltip for time charts: the period in full (with its year), "so far"
 * when it isn't over, and each series once with its colour. Each series is
 * drawn as a solid line plus a dashed "so far" piece, so names are deduped.
 */
export function ChartTooltip({ active, payload, metric, buckets }: { active?: boolean; payload?: readonly TooltipRow[]; metric: Metric; buckets: Bucket[] }) {
  if (!active || !payload?.length) return null;
  const bucket = buckets[Number(payload[0].payload?.i)];
  if (!bucket) return null;
  const seen = new Set<string>();
  const rows = payload.filter((p) => {
    const name = String(p.name);
    if (typeof p.value !== "number" || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-900">
        {bucket.fullLabel}
        {bucket.partial && <span className="font-normal text-slate-600"> · so far</span>}
      </p>
      {rows.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2 text-slate-700">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
          <span className="flex-1">{String(p.name)}</span>
          <span className="font-medium tabular-nums">{fmtValue(p.value as number, metric)}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Splits a series so its last, incomplete period can be drawn dashed: the
 * solid key stops at the last complete point, the "so far" key joins that
 * point to the incomplete one. With no partial period, only the solid key
 * has values.
 */
export function splitPartial(values: number[], partial: boolean): { solid: (number | undefined)[]; soFar: (number | undefined)[] } {
  const last = values.length - 1;
  if (!partial || last < 1) return { solid: values, soFar: values.map(() => undefined) };
  return {
    solid: values.map((v, i) => (i === last ? undefined : v)),
    soFar: values.map((v, i) => (i >= last - 1 ? v : undefined)),
  };
}
