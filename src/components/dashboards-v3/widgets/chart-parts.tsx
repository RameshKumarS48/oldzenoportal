"use client";

import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { AXIS_TEXT } from "@/lib/dashboards-v3/colors";
import { fmtCompact, fmtValue } from "@/lib/dashboards-v3/format";

/** Shared Recharts settings so every v3 chart reads the same: light grid, slate-500 axis text, no axis lines. */
export const AXIS_TICK = { fontSize: 11, fill: AXIS_TEXT };

export const TOOLTIP_PROPS = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  labelStyle: { fontWeight: 600, color: "#0f172a", marginBottom: 4 },
};

export const axisFormatter = (metric: Metric) => (v: number) => fmtCompact(v, metric);
export const tooltipFormatter = (metric: Metric) => (v: unknown) => (typeof v === "number" ? fmtValue(v, metric) : String(v ?? "–"));

/** A series' name written at the end of its line, so the chart reads without a legend. */
export function EndLabel({ x, y, index, last, name, color }: { x?: number | string; y?: number | string; index?: number; last: number; name: string; color: string }) {
  if (index !== last || x === undefined || y === undefined) return null;
  return (
    <text x={Number(x) + 6} y={Number(y)} dy={4} fontSize={11} fontWeight={600} fill={color}>
      {name}
    </text>
  );
}

/** Rough width of a direct label, for the chart's right margin. */
export function labelRoom(names: string[]): number {
  return Math.min(120, Math.max(0, ...names.map((n) => n.length * 6.5)) + 12);
}
