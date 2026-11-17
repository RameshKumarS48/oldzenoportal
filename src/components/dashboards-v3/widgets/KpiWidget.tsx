"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { ACCENT, CHANGE_CLASS } from "@/lib/dashboards-v3/colors";
import { previousLabel, type ResolvedRange } from "@/lib/dashboards-v3/dates";
import { change, fmtValue } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import { cn } from "@/lib/utils";
import { TOOLTIP_PROPS, tooltipFormatter } from "./chart-parts";

const SPARK_PX = 36;

/**
 * One figure, its change since the previous period, and a sparkline of the
 * period with values on hover. The change always has ▲ or ▼ and words; its
 * colour follows higherIsBetter, so a rise in riders with negative balance
 * is red.
 */
export function KpiWidget({ metric, result, previous, range, compare }: { metric: Metric; result: QueryResult; previous: number | null; range: ResolvedRange; compare: boolean }) {
  const total = result.total;
  const c = compare && previous !== null ? change(total, previous, metric) : null;
  const tone = !c || c.good === null ? "flat" : c.good ? "good" : "bad";
  const spark = result.buckets.map((b, i) => ({ label: b.label, value: result.series[0].values[i] }));

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-2xl font-semibold tabular-nums text-slate-800" title={fmtValue(total, metric)}>
        {fmtValue(total, metric, true)}
      </p>
      {c && (
        <p className={cn("mt-1 flex flex-wrap items-center gap-x-1 text-xs font-medium tabular-nums", CHANGE_CLASS[tone])}>
          <span aria-hidden>{c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "●"}</span>
          <span className="sr-only">{c.direction === "up" ? "Up" : c.direction === "down" ? "Down" : ""}</span>
          {c.direction === "flat" ? "No change" : c.text}
          <span className="font-normal text-slate-600">{previousLabel(range)}</span>
        </p>
      )}
      {spark.length > 1 && (
        // The sparkline repeats the period for the eye; the figure above is what's read out.
        <div className="mt-2" aria-hidden>
          <ResponsiveContainer width="100%" height={SPARK_PX}>
            <LineChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={tooltipFormatter(metric)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                cursor={{ stroke: "#cbd5e1" }}
              />
              <Line dataKey="value" name={metric.name} stroke={ACCENT} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
