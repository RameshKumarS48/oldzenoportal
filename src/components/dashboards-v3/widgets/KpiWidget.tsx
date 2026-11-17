"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { CHANGE_CLASS, SERIES } from "@/lib/dashboards-v3/palette";
import { previousLabel, type ResolvedRange } from "@/lib/dashboards-v3/dates";
import { change, fmtCompact, fmtValue, unitWords } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { cn } from "@/lib/utils";
import { ChartTooltip, splitPartial } from "./chart-parts";

const SPARK_PX = 36;
export const LOWER_IS_BETTER = "Lower is better for this metric.";

/**
 * One figure with its unit in words ("200.8K swaps"), its change since the
 * previous period, and a sparkline of the period with values on hover.
 *
 * The change always has ▲ or ▼ and words; its colour follows
 * higherIsBetter, so a rise in riders with negative balance is red, and its
 * tooltip says when lower is better. Both periods are complete days. The
 * sparkline's last point, if its week or month isn't over, is dashed.
 */
export function KpiWidget({ metric, result, previous, range, compare }: { metric: Metric; result: QueryResult; previous: number | null; range: ResolvedRange; compare: boolean }) {
  const total = result.total;
  const c = compare && previous !== null ? change(total, previous, metric) : null;
  const tone = !c || c.good === null ? "flat" : c.good ? "good" : "bad";
  const words = unitWords(metric);
  const vs = previousLabel(range);
  const said = c ? `${c.direction === "up" ? "Up" : c.direction === "down" ? "Down" : "No change"}${c.direction === "flat" ? "" : ` ${c.text.replace(/^[+−]/, "")}`} ${vs}.` : "";
  const tip = c ? `${said}${metric.higherIsBetter ? "" : ` ${LOWER_IS_BETTER}`}` : undefined;

  const last = result.buckets.length - 1;
  const { solid, soFar } = splitPartial(result.series[0].values, result.buckets[last]?.partial ?? false);
  const spark = result.buckets.map((b, i) => ({ i, label: b.label, value: solid[i], soFar: soFar[i] }));

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums" title={fmtValue(total, metric, false)}>
        <span className="text-2xl font-semibold text-slate-800">{fmtCompact(total, metric)}{metric.unit === "%" ? "%" : ""}</span>
        {words && <span className="text-sm text-slate-500">{words}</span>}
      </p>
      {c && (
        <p title={tip} className={cn("mt-1 flex flex-wrap items-center gap-x-1 text-xs font-medium tabular-nums", CHANGE_CLASS[tone])}>
          <span aria-hidden>{c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "●"}</span>
          <span className="sr-only">{tip}</span>
          <span aria-hidden>{c.direction === "flat" ? "No change" : c.text}</span>
          <span aria-hidden className="font-normal text-slate-600">{vs}</span>
        </p>
      )}
      {spark.length > 1 && (
        // The sparkline repeats the period for the eye; the figure above is what's read out.
        <div className="mt-2" aria-hidden>
          <ResponsiveContainer width="100%" height={SPARK_PX}>
            <LineChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip cursor={{ stroke: "#cbd5e1" }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} metric={metric} buckets={result.buckets} />} />
              <Line dataKey="value" name={metric.name} stroke={SERIES[0]} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="soFar" name={metric.name} stroke={SERIES[0]} strokeWidth={1.5} strokeDasharray="3 2" dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
