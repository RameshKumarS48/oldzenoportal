"use client";

import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { AXIS_TEXT, LABEL_TEXT } from "@/lib/dashboards-v3/palette";
import { fmtCompact, fmtValue } from "@/lib/dashboards-v3/format";

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

/** Legends sit above the chart, left-aligned. */
export const LEGEND_PROPS = {
  verticalAlign: "top" as const,
  align: "left" as const,
  iconSize: 10,
  wrapperStyle: { fontSize: 11, paddingBottom: 8 },
  formatter: legendText,
};
