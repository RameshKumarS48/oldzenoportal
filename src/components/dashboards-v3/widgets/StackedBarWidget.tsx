"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import { GOAL, GRID, seriesColors } from "@/lib/dashboards-v3/palette";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { AXIS_TICK, axisFormatter, ChartTooltip, GRID_PROPS, LEGEND_PROPS } from "./chart-parts";

/**
 * The parts of a total over time: one stack per period, from zero, in
 * palette order (services in their own colours, Other grey), with a legend
 * below. The current week or month isn't over: its stack is paler with a
 * dashed outline, and the tooltip says "so far". It fills its card's height.
 */
export function StackedBarWidget({
  metric, result, splitBy, goal, showValues, minHeight, fill,
}: {
  metric: Metric; result: QueryResult; splitBy?: PropertyId; goal?: number; showValues: boolean; minHeight: number; fill: boolean;
}) {
  const colors = seriesColors(splitBy, result.series.map((s) => s.name));
  const data = result.buckets.map((b, i) => ({
    i,
    label: b.label,
    ...Object.fromEntries(result.series.map((s, j) => [`s${j}`, s.values[i]])),
    total: result.series.reduce((a, s) => a + (s.values[i] || 0), 0),
  }));
  const top = result.series.length - 1;

  return (
    <ResponsiveContainer width="100%" height={fill ? "100%" : minHeight} minHeight={minHeight}>
      {/* Bars take about 55% of each period's slot, so periods read as separate. */}
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="45%">
        <CartesianGrid stroke={GRID} {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} domain={[0, "auto"]} tickFormatter={axisFormatter(metric)} />
        <Tooltip cursor={{ fill: "#f8fafc" }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} metric={metric} buckets={result.buckets} />} />
        <Legend {...LEGEND_PROPS} />
        {goal !== undefined && <ReferenceLine y={goal} stroke={GOAL} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }} />}
        {result.series.map((s, j) => (
          <Bar key={s.name} dataKey={`s${j}`} name={s.name} stackId="stack" fill={colors[j]} isAnimationActive={false} radius={j === top ? [2, 2, 0, 0] : 0}>
            {result.buckets.map((b) => (
              <Cell key={b.start.getTime()} fillOpacity={b.partial ? 0.4 : 1} stroke={b.partial ? colors[j] : undefined} strokeDasharray={b.partial ? "3 2" : undefined} />
            ))}
            {showValues && j === top && <LabelList dataKey="total" position="top" fontSize={10} fill="#475569" formatter={(v: unknown) => (typeof v === "number" ? fmtCompact(v, metric) : "")} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
