import { PROPERTIES, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { CHANGE_CLASS } from "@/lib/dashboards-v3/colors";
import { change, fmtNumber, fmtValue, UNIT_LABEL } from "@/lib/dashboards-v3/format";
import type { QueryResult } from "@/lib/dashboards-v3/series";
import type { WidgetSort } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { sortSeries } from "./BarWidget";

const TH = "sticky top-0 bg-white px-2 py-1.5 text-left text-xs font-semibold text-slate-500 shadow-[inset_0_-1px_0_var(--color-slate-200)]";
const TD = "px-2 py-1.5 tabular-nums";

/**
 * A list. Split, it's one row per value (top values, then Other) with each
 * one's share and, when compared, its change; unsplit, one row per period.
 */
export function TableWidget({
  metric, result, splitBy, sort, previous, maxHeight,
}: {
  metric: Metric; result: QueryResult; splitBy?: PropertyId; sort: WidgetSort; previous: Map<string, number> | null; maxHeight: number;
}) {
  const valueHead = metric.unit === "count" ? metric.name : `${metric.name} (${UNIT_LABEL[metric.unit]})`;
  const additive = metric.unit !== "%" && metric.aggregation === "sum";

  if (!splitBy) {
    const rows = result.buckets.map((b, i) => ({ label: b.label, value: result.series[0].values[i] }));
    const ordered = sort === "asc" ? [...rows].sort((a, b) => a.value - b.value) : sort === "desc" ? [...rows].sort((a, b) => b.value - a.value) : rows;
    return (
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead><tr><th className={TH}>Period</th><th className={cn(TH, "text-right")}>{valueHead}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {ordered.map((r) => (
              <tr key={r.label}><td className={cn(TD, "text-slate-700")}>{r.label}</td><td className={cn(TD, "text-right text-slate-800")}>{fmtNumber(r.value, metric)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rows = sortSeries(result.series, sort);
  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={TH}>{PROPERTIES[splitBy].name}</th>
            <th className={cn(TH, "text-right")}>{valueHead}</th>
            {additive && <th className={cn(TH, "text-right")}>Share</th>}
            {previous && <th className={cn(TH, "text-right")}>Change</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((s) => {
            const prev = previous?.get(s.name);
            const c = prev !== undefined ? change(s.total, prev, metric) : null;
            const tone = !c || c.good === null ? "flat" : c.good ? "good" : "bad";
            return (
              <tr key={s.name}>
                <td className={cn(TD, s.other ? "italic text-slate-600" : "text-slate-700")}>{s.name}</td>
                <td className={cn(TD, "text-right text-slate-800")} title={fmtValue(s.total, metric)}>{fmtNumber(s.total, metric)}</td>
                {additive && <td className={cn(TD, "text-right text-slate-600")}>{((s.total / result.total) * 100).toFixed(1)}%</td>}
                {previous && (
                  <td className={cn(TD, "whitespace-nowrap text-right text-xs font-medium", CHANGE_CLASS[tone])}>
                    {c ? <><span aria-hidden>{c.direction === "up" ? "▲ " : c.direction === "down" ? "▼ " : ""}</span>{c.direction === "flat" ? "No change" : c.text}</> : "–"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
