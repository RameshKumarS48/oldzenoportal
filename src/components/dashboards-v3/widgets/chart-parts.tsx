"use client";

import { usePlotArea, useYAxisScale } from "recharts";
import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { AXIS_TEXT, GOAL, LABEL_TEXT } from "@/lib/dashboards-v3/palette";
import { fmtValue } from "@/lib/dashboards-v3/format";
import type { Bucket } from "@/lib/dashboards-v3/series";

/** Shared Recharts settings so every v3 chart reads the same: light grid, slate-500 axis text, no axis lines. */
export const AXIS_TICK = { fontSize: 11, fill: AXIS_TEXT };

export const TOOLTIP_PROPS = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  labelStyle: { fontWeight: 600, color: "#0f172a", marginBottom: 4 },
};

/** A step of 1, 2 or 5 times a power of ten, about `rough` in size. */
function niceStep(rough: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / p;
  return (f <= 1.5 ? 1 : f <= 3 ? 2 : f <= 7 ? 5 : 10) * p;
}

/** The fewest decimals that write every multiple of `step` exactly. */
function decimalsFor(step: number): number {
  for (let d = 0; d < 3; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-6) return d;
  return 2;
}

/**
 * A value axis with its own ticks and one format for all of them: "0, 50K,
 * 100K, 150K" from 10,000 up, "0.5M, 1.0M" from a million, "0, 1,000,
 * 2,000" below, "0%, 20%, … 100%" for percentages, never a mix. Ticks are 1, 2 or 5 steps, from zero unless the
 * metric is a percentage.
 */
export function valueAxis(metric: Metric, values: number[], fromZero: boolean) {
  const real = values.filter(Number.isFinite);
  let min = fromZero || real.length === 0 ? 0 : Math.min(...real);
  let max = real.length === 0 ? 1 : Math.max(...real);
  if (max - min < 1e-9) { max = max === 0 ? 1 : max * 1.05; if (!fromZero) min = min * 0.95; }
  const step = niceStep((max - min) / 4);
  const lo = fromZero ? 0 : Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  const unit = metric.unit === "%" ? 1 : hi >= 1e6 ? 1e6 : hi >= 1e4 ? 1e3 : 1;
  const suffix = metric.unit === "%" ? "%" : unit === 1e6 ? "M" : unit === 1e3 ? "K" : "";
  const d = decimalsFor(step / unit);
  const tickFormatter = (v: number) =>
    v === 0 ? `0${metric.unit === "%" ? "%" : ""}` : `${(v / unit).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}${suffix}`;
  return { domain: [lo, hi] as [number, number], ticks, tickFormatter };
}
export const tooltipFormatter = (metric: Metric) => (v: unknown) => (typeof v === "number" ? fmtValue(v, metric) : String(v ?? "–"));

/** End labels are 11px text: this far apart, two never touch. */
export const LABEL_GAP = 14;

/**
 * Where labels go so none overlap: in order down the chart, each pushed
 * at least `gap` below the one above, then pulled back up from the bottom
 * edge only as far as needed, then down from the top edge. Labels already
 * apart stay where they are. Returns each label's y in the order given.
 */
export function placeLabels(ys: number[], top: number, bottom: number, gap = LABEL_GAP): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = order.map((o) => Math.min(Math.max(o.y, top), bottom));
  for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k], out[k - 1] + gap);
  out[out.length - 1] = Math.min(out[out.length - 1], bottom);
  for (let k = out.length - 2; k >= 0; k--) out[k] = Math.min(out[k], out[k + 1] - gap);
  out[0] = Math.max(out[0], top);
  for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k], out[k - 1] + gap);
  const placed: number[] = [];
  order.forEach((o, k) => { placed[o.i] = out[k]; });
  return placed;
}

/** Whether `count` labels fit down a chart this tall, at least `LABEL_GAP` apart; if not, the chart uses a legend. */
export function labelsFit(count: number, chartHeight: number): boolean {
  // The plot is the chart less its top margin and the x-axis.
  return count * LABEL_GAP <= chartHeight - 40;
}

export interface EndLabelItem {
  name: string;
  color: string;
  /** The series' last value. */
  value: number | undefined;
  dashed?: boolean;
}

/**
 * Each series' name at the end of its line, so the chart reads without a
 * legend: a short stroke in the series colour (dashed if the line is), then
 * the name in slate-700, since some series colours are too light for text.
 * Labels that would overlap are nudged apart, with a thin leader line from
 * the line's end to its label. Rendered inside the chart, where it can read
 * the y scale and plot area.
 */
export function EndLabels({ items }: { items: EndLabelItem[] }) {
  const y = useYAxisScale();
  const area = usePlotArea();
  if (!y || !area) return null;
  const shown = items.filter((it): it is EndLabelItem & { value: number } => typeof it.value === "number" && Number.isFinite(it.value));
  const ys = shown.map((it) => Number(y(it.value)));
  const placed = placeLabels(ys, area.y + 4, area.y + area.height - 4);
  const x = area.x + area.width;
  return (
    <g className="end-labels">
      {shown.map((it, k) => {
        const moved = Math.abs(placed[k] - ys[k]) > 1;
        return (
          <g key={it.name}>
            {moved && <polyline points={`${x + 3},${ys[k]} ${x + 9},${placed[k]}`} fill="none" stroke={GOAL} strokeWidth={1} />}
            <line x1={x + (moved ? 9 : 4)} x2={x + 18} y1={placed[k]} y2={placed[k]} stroke={it.color} strokeWidth={2.5} strokeDasharray={it.dashed ? "3 2" : undefined} />
            <text x={x + 22} y={placed[k]} dy={4} fontSize={11} fontWeight={600} fill={LABEL_TEXT}>{it.name}</text>
          </g>
        );
      })}
    </g>
  );
}

/** Rough width of a direct label, its leader and its stroke, for the chart's right margin. */
export function labelRoom(names: string[]): number {
  return Math.min(140, Math.max(0, ...names.map((n) => n.length * 6.5)) + 30);
}

/** Legend text in slate-700 rather than the series colour, for the same reason. */
export const legendText = (value: string) => <span style={{ color: LABEL_TEXT }}>{value}</span>;

/** Legends, where lines aren't named at their ends, sit below the chart, centred, with square swatches, in the series' order. */
export const LEGEND_PROPS = {
  // Recharts sorts legend items by name by default; null keeps the series order: largest first, Other last.
  itemSorter: null,
  verticalAlign: "bottom" as const,
  align: "center" as const,
  iconType: "square" as const,
  iconSize: 10,
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  formatter: legendText,
};

/** The gap on each side of a bar, as a share of its slot (Recharts takes it from both sides): bars fill about 66% of the slot. */
export const BAR_GAP = "17%";

/** Event markers sit behind bars (300) and lines (400), above the grid (-100). */
export const MARKER_Z = 50;

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
