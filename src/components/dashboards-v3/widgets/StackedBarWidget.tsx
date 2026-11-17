"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import { GOAL, GRID, seriesColors } from "@/lib/dashboards-v3/palette";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { AXIS_TICK, axisFormatter, LEGEND_PROPS, TOOLTIP_PROPS, tooltipFormatter } from "./chart-parts";

/** The parts of a total over time: one stack per period, from zero, in palette order (services in their own colours, Other grey), with a legend above. */
export function StackedBarWidget({
  metric, result, splitBy, goal, showValues, height,
}: {
  metric: Metric; result: QueryResult; splitBy?: PropertyId; goal?: number; showValues: boolean; height: number;
}) {
  const colors = seriesColors(splitBy, result.series.map((s) => s.name));
  const data = result.buckets.map((b, i) => ({
    label: b.label,
    ...Object.fromEntries(result.series.map((s, j) => [`s${j}`, s.values[i]])),
    total: result.series.reduce((a, s) => a + (s.values[i] || 0), 0),
  }));
  const top = result.series.length - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} domain={[0, "auto"]} tickFormatter={axisFormatter(metric)} />
        <Tooltip {...TOOLTIP_PROPS} cursor={{ fill: "#f8fafc" }} formatter={tooltipFormatter(metric)} />
        <Legend {...LEGEND_PROPS} iconType="square" />
        {goal !== undefined && <ReferenceLine y={goal} stroke={GOAL} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }} />}
        {result.series.map((s, j) => (
          <Bar key={s.name} dataKey={`s${j}`} name={s.name} stackId="stack" fill={colors[j]} isAnimationActive={false} radius={j === top ? [2, 2, 0, 0] : 0}>
            {showValues && j === top && <LabelList dataKey="total" position="top" fontSize={10} fill="#475569" formatter={(v: unknown) => (typeof v === "number" ? fmtCompact(v, metric) : "")} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
