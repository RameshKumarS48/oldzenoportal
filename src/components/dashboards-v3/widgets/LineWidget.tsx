"use client";

import { CartesianGrid, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import { GOAL, GRID, PREVIOUS, SERIES, seriesColors } from "@/lib/dashboards-v3/palette";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { AXIS_TICK, axisFormatter, ChartTooltip, EndLabel, GRID_PROPS, labelRoom, LEGEND_PROPS, splitPartial } from "./chart-parts";

/** Up to this many lines are named at their ends; more get a legend. */
const DIRECT_LABELS_UP_TO = 4;

/**
 * A trend over time. One line is the first palette colour, with the previous
 * period dashed grey when compared; split lines take the palette in order
 * (services keep their own colours, Other is grey). With more than one line,
 * each is named at its end, or in a legend above when there are more than four.
 *
 * The current week or month isn't over, so its point is joined by a dashed
 * segment and the tooltip says "so far"; the previous period isn't drawn
 * against it, so comparisons only cover complete periods. It fills its
 * card's height (at least `minHeight`), so a taller neighbour leaves no gap.
 */
export function LineWidget({
  metric, result, previous, splitBy, goal, showValues, minHeight, fill,
}: {
  metric: Metric; result: QueryResult; previous: number[] | null; splitBy?: PropertyId; goal?: number; showValues: boolean;
  minHeight: number;
  /** Fill the parent's height; off for fixed-height places like the panel preview. */
  fill: boolean;
}) {
  const split = result.series.length > 1 || !!splitBy;
  const names = split ? result.series.map((s) => s.name) : previous ? ["This period", "Previous period"] : [];
  const colors = split ? seriesColors(splitBy, names) : [SERIES[0]];
  const direct = names.length > 0 && names.length <= DIRECT_LABELS_UP_TO;
  const last = result.buckets.length - 1;
  const partial = result.buckets[last]?.partial ?? false;

  const parts = result.series.map((s) => splitPartial(s.values, partial));
  const data = result.buckets.map((b, i) => ({
    i,
    label: b.label,
    ...Object.fromEntries(parts.flatMap((p, j) => [[`s${j}`, p.solid[i]], [`s${j}f`, p.soFar[i]]])),
    // Complete periods only: no previous-period point against the one still running.
    ...(previous ? { prev: partial && i === last ? undefined : previous[i] } : {}),
  }));
  // The end label sits on whichever piece reaches the last point.
  const endKey = (j: number) => (partial ? `s${j}f` : `s${j}`);
  const prevLast = partial ? last - 1 : last;

  return (
    <ResponsiveContainer width="100%" height={fill ? "100%" : minHeight} minHeight={minHeight}>
      <LineChart data={data} margin={{ top: 8, right: direct ? labelRoom(names) : 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={axisFormatter(metric)}
          domain={metric.unit === "%" ? ["auto", "auto"] : [0, "auto"]}
        />
        <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} metric={metric} buckets={result.buckets} />} />
        {!direct && names.length > 0 && <Legend {...LEGEND_PROPS} />}
        {goal !== undefined && (
          <ReferenceLine y={goal} stroke={GOAL} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }} />
        )}
        {previous && !split && (
          <Line dataKey="prev" name="Previous period" stroke={PREVIOUS} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false}>
            {direct && <LabelList dataKey="prev" content={(p) => <EndLabel {...p} index={p.index} last={prevLast} name="Previous period" color={PREVIOUS} dashed />} />}
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
            {direct && !partial && <LabelList dataKey={endKey(j)} content={(p) => <EndLabel {...p} index={p.index} last={last} name={names[j]} color={colors[j]} />} />}
            {showValues && <LabelList dataKey={`s${j}`} position="top" fontSize={10} fill="#475569" formatter={(v: unknown) => (typeof v === "number" ? fmtCompact(v, metric) : "")} />}
          </Line>
        ))}
        {partial &&
          result.series.map((s, j) => (
            <Line
              key={`${s.name}-so-far`}
              dataKey={`s${j}f`}
              name={split ? s.name : metric.name}
              stroke={colors[j]}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4 }}
              legendType="none"
              isAnimationActive={false}
            >
              {direct && <LabelList dataKey={endKey(j)} content={(p) => <EndLabel {...p} index={p.index} last={last} name={names[j]} color={colors[j]} />} />}
            </Line>
          ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
