"use client";

import { CartesianGrid, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import { ACCENT, GRID, REFERENCE, seriesColors } from "@/lib/dashboards-v3/colors";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { AXIS_TICK, axisFormatter, EndLabel, labelRoom, TOOLTIP_PROPS, tooltipFormatter } from "./chart-parts";

/** Up to this many lines are named at their ends; more get a legend. */
const DIRECT_LABELS_UP_TO = 4;

/**
 * A trend over time. One line is the accent colour, with the previous
 * period dashed and neutral when compared; split lines use the series
 * colours. Lines are named at their ends where they fit.
 */
export function LineWidget({
  metric, result, previous, splitBy, goal, showValues, height,
}: {
  metric: Metric; result: QueryResult; previous: number[] | null; splitBy?: PropertyId; goal?: number; showValues: boolean; height: number;
}) {
  const split = result.series.length > 1 || !!splitBy;
  const names = split ? result.series.map((s) => s.name) : previous ? ["This period", "Previous"] : [];
  const colors = split ? seriesColors(splitBy, names) : [ACCENT];
  const direct = names.length > 0 && names.length <= DIRECT_LABELS_UP_TO;
  const last = result.buckets.length - 1;

  const data = result.buckets.map((b, i) => ({
    label: b.label,
    ...Object.fromEntries(result.series.map((s, j) => [`s${j}`, s.values[i]])),
    ...(previous ? { prev: previous[i] } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: direct ? labelRoom(names) : 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={axisFormatter(metric)}
          domain={metric.unit === "%" ? ["auto", "auto"] : [0, "auto"]}
        />
        <Tooltip {...TOOLTIP_PROPS} formatter={tooltipFormatter(metric)} />
        {!direct && names.length > 0 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {goal !== undefined && (
          <ReferenceLine y={goal} stroke={REFERENCE} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }} />
        )}
        {previous && !split && (
          <Line dataKey="prev" name="Previous period" stroke={REFERENCE} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false}>
            {direct && <LabelList dataKey="prev" content={(p) => <EndLabel {...p} index={p.index} last={last} name="Previous" color="#475569" />} />}
          </Line>
        )}
        {result.series.map((s, j) => (
          <Line
            key={s.name}
            dataKey={`s${j}`}
            name={split ? s.name : metric.name}
            stroke={colors[j]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          >
            {direct && <LabelList dataKey={`s${j}`} content={(p) => <EndLabel {...p} index={p.index} last={last} name={names[j]} color={colors[j]} />} />}
            {showValues && <LabelList dataKey={`s${j}`} position="top" fontSize={10} fill="#475569" formatter={(v: unknown) => (typeof v === "number" ? fmtCompact(v, metric) : "")} />}
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
