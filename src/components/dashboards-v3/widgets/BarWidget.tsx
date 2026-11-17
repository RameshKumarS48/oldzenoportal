"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import { GOAL, GRID, OTHER, SERIES, SERVICE_COLOR } from "@/lib/dashboards-v3/palette";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { Series } from "@/lib/dashboards-v3/series";
import type { WidgetSort } from "@/lib/dashboards-v3/types";
import { AXIS_TICK, axisFormatter, TOOLTIP_PROPS, tooltipFormatter } from "./chart-parts";

const ROW_PX = 30;

/** Split values in the widget's order; Other always comes last, whatever the sort. */
export function sortSeries(series: Series[], sort: WidgetSort): Series[] {
  const named = series.filter((s) => !s.other);
  const other = series.filter((s) => s.other);
  const by = sort === "name" ? (a: Series, b: Series) => a.name.localeCompare(b.name) : sort === "asc" ? (a: Series, b: Series) => a.total - b.total : (a: Series, b: Series) => b.total - a.total;
  return [...named.sort(by), ...other];
}

/**
 * A comparison: horizontal bars from zero, sorted, each value written at its
 * bar's end and each bar named on the axis, so it needs no legend. One
 * series, so every bar is the first palette colour; split by service, each
 * bar keeps its service's colour; Other is grey.
 */
export function BarWidget({ metric, series, sort, goal, splitBy }: { metric: Metric; series: Series[]; sort: WidgetSort; goal?: number; splitBy?: PropertyId }) {
  const rows = sortSeries(series, sort);
  const fill = (s: Series) => (s.other ? OTHER : splitBy === "service" && SERVICE_COLOR[s.name] ? SERVICE_COLOR[s.name] : SERIES[0]);
  const data = rows.map((s) => ({ name: s.name, value: s.total, fill: fill(s) }));
  const labelWidth = Math.min(140, Math.max(...rows.map((s) => s.name.length)) * 6.5 + 8);

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_PX + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" domain={[0, "auto"]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axisFormatter(metric)} />
        <YAxis type="category" dataKey="name" width={labelWidth} tick={{ ...AXIS_TICK, fill: "#334155" }} tickLine={false} axisLine={false} interval={0} />
        <Tooltip {...TOOLTIP_PROPS} cursor={{ fill: "#f8fafc" }} formatter={tooltipFormatter(metric)} />
        {goal !== undefined && (
          <ReferenceLine x={goal} stroke={GOAL} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "top", fontSize: 11, fill: "#475569" }} />
        )}
        <Bar dataKey="value" name={metric.name} radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
          <LabelList dataKey="value" position="right" fontSize={11} fill="#334155" formatter={(v: unknown) => (typeof v === "number" ? fmtCompact(v, metric) : "")} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
