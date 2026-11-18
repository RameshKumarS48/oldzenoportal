"use client";

import { CartesianGrid, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metric, PropertyId } from "@/lib/dashboards-v3/catalogue";
import type { Marker } from "@/lib/dashboards-v3/explore";
import { AXIS_TEXT, GOAL, GRID, PREVIOUS, SERIES, seriesColors } from "@/lib/dashboards-v3/palette";
import { fmtCompact } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { AXIS_TICK, ChartTooltip, EndLabels, GRID_PROPS, labelRoom, labelsFit, LEGEND_PROPS, splitPartial, valueAxis } from "./chart-parts";

/** Up to this many lines are named at their ends; more get a legend. */
const DIRECT_LABELS_UP_TO = 4;

/**
 * A trend over time. One line is the first palette colour, with the previous
 * period dashed grey when compared; split lines take the palette in order
 * (services keep their own colours, Other is grey). With more than one line,
 * each is named at its end, nudged apart with a leader line where names
 * would overlap; with more than four, or too little height, a legend below.
 *
 * The current week or month isn't over, so its point is joined by a dashed
 * segment and the tooltip says "so far"; the previous period isn't drawn
 * against it, so comparisons only cover complete periods. It fills its
 * card's height (at least `minHeight`), so a taller neighbour leaves no gap.
 */
export function LineWidget({
  metric, result, previous, splitBy, goal, showValues, minHeight, fill, markers = [],
}: {
  /** Events to mark with a dotted vertical line and a short label (Explore). */
  markers?: Marker[];
  metric: Metric; result: QueryResult; previous: number[] | null; splitBy?: PropertyId; goal?: number; showValues: boolean;
  minHeight: number;
  /** Fill the parent's height; off for fixed-height places like the panel preview. */
  fill: boolean;
}) {
  const split = result.series.length > 1 || !!splitBy;
  const names = split ? result.series.map((s) => s.name) : previous ? ["This period", "Previous period"] : [];
  const colors = split ? seriesColors(splitBy, names) : [SERIES[0]];
  const direct = names.length > 0 && names.length <= DIRECT_LABELS_UP_TO && labelsFit(names.length, minHeight);
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
  const prevLast = partial ? last - 1 : last;
  const axis = valueAxis(metric, [...result.series.flatMap((s) => s.values), ...(previous ?? []), ...(goal !== undefined ? [goal] : [])], metric.unit !== "%");
  const endLabels = direct
    ? [
        ...result.series.map((s, j) => ({ name: names[j], color: colors[j], value: s.values[last] })),
        ...(previous && !split ? [{ name: "Previous period", color: PREVIOUS, value: previous[prevLast], dashed: true }] : []),
      ]
    : [];

  return (
    <ResponsiveContainer width="100%" height={fill ? "100%" : minHeight} minHeight={minHeight}>
      <LineChart data={data} margin={{ top: markers.length > 0 ? 20 : 8, right: direct ? labelRoom(names) : 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          domain={axis.domain}
          ticks={axis.ticks}
          tickFormatter={axis.tickFormatter}
        />
        <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} metric={metric} buckets={result.buckets} />} />
        {!direct && names.length > 0 && <Legend {...LEGEND_PROPS} />}
        {goal !== undefined && (
          <ReferenceLine y={goal} stroke={GOAL} strokeDasharray="4 4" label={{ value: `Goal ${fmtCompact(goal, metric)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }} />
        )}
        {markers.map((m) => (
          <ReferenceLine key={m.x} x={m.x} stroke={AXIS_TEXT} strokeDasharray="2 3" label={{ value: m.label, position: "top", fontSize: 10, fill: AXIS_TEXT }} />
        ))}
        {previous && !split && (
          <Line dataKey="prev" name="Previous period" stroke={PREVIOUS} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
            />
          ))}
        {direct && <EndLabels items={endLabels} />}
      </LineChart>
    </ResponsiveContainer>
  );
}
