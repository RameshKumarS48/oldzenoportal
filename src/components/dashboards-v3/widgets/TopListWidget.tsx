"use client";

import { BookOpen } from "lucide-react";
import type { Metric } from "@/lib/dashboards-v3/catalogue";
import { fmtCompact, fmtValue, unitWords } from "@/lib/dashboards-v3/format";
import { CHANGE_CLASS } from "@/lib/dashboards-v3/palette";
import type { TopRow } from "@/lib/dashboards-v3/toplist";
import { cn } from "@/lib/utils";
import { RowMenu } from "../ui/RowMenu";
import { LOWER_IS_BETTER } from "./KpiWidget";

const TH = "px-1.5 pb-1.5 text-left text-xs font-semibold text-slate-500";
const TD = "px-1.5 py-1.5 align-top tabular-nums";

/**
 * A ranked list: rank, name (two lines at most, the whole of it on hover),
 * value with its unit, share of the total with a thin bar under it, and
 * the change since the previous period (▲/▼, coloured by whether up is
 * good). Each item's ⋯ has View rows; Other comes last, with
 * no menu. Show all lists up to 20.
 */
export function TopListWidget({
  metric, rows, property, onViewRows, showAll,
}: {
  metric: Metric;
  rows: TopRow[];
  /** What the items are: "Station". */
  property: string;
  onViewRows: (name: string) => void;
  /** Show all or Show fewer, when there are more items than shown, or more were shown. */
  showAll?: { expanded: boolean; onToggle: () => void } | null;
}) {
  const words = unitWords(metric);
  const shares = rows.some((r) => r.share !== null);
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={cn(TH, "w-6")}><span className="sr-only">Rank</span></th>
            <th className={TH}>{property}</th>
            <th className={cn(TH, "text-right")}>{metric.unit === "%" ? "%" : words ? words.charAt(0).toUpperCase() + words.slice(1) : "Value"}</th>
            {shares && <th className={cn(TH, "w-20 text-right")}>Share</th>}
            <th className={cn(TH, "w-20 text-right")}>Change</th>
            <th className={cn(TH, "w-8")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const c = r.change;
            const tone = !c || c.good === null ? "flat" : c.good ? "good" : "bad";
            return (
              <tr key={r.name}>
                <td className={cn(TD, "text-xs text-slate-500")}>{r.rank ?? ""}</td>
                <td className={cn(TD, "min-w-0")}>
                  <span title={r.name} className={cn("line-clamp-2 break-words", r.other ? "italic text-slate-600" : "text-slate-800")}>{r.name}</span>
                </td>
                <td className={cn(TD, "whitespace-nowrap text-right text-slate-800")} title={fmtValue(r.value, metric, false)}>
                  {fmtCompact(r.value, metric)}{metric.unit === "%" ? "%" : ""}
                </td>
                {shares && (
                  <td className={cn(TD, "text-right text-slate-700")}>
                    {r.share === null ? "–" : (
                      <span className="inline-flex flex-col items-end">
                        <span>{r.share.toFixed(1)}%</span>
                        {/* The share as a thin bar, one neutral colour. */}
                        <span aria-hidden className="mt-0.5 h-1 w-14 rounded-full">
                          <span className="block h-1 rounded-full bg-slate-300" style={{ width: `${Math.max(2, Math.min(100, r.share))}%` }} />
                        </span>
                      </span>
                    )}
                  </td>
                )}
                <td className={cn(TD, "whitespace-nowrap text-right text-xs font-medium", CHANGE_CLASS[tone])} title={c && metric.higherIsBetter === false ? LOWER_IS_BETTER : undefined}>
                  {c ? (
                    <>
                      <span aria-hidden>{c.direction === "up" ? "▲ " : c.direction === "down" ? "▼ " : ""}</span>
                      <span className="sr-only">{c.direction === "up" ? "up " : c.direction === "down" ? "down " : ""}</span>
                      {c.direction === "flat" ? "No change" : c.text.replace(/^[+−]/, "")}
                    </>
                  ) : "–"}
                </td>
                <td className={cn(TD, "py-0.5 text-right")}>
                  {!r.other && (
                    <RowMenu
                      label={`Actions for ${r.name}`}
                      items={[{ label: "View rows", icon: BookOpen, onSelect: () => onViewRows(r.name) }]}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showAll && (
        <button
          type="button"
          onClick={showAll.onToggle}
          aria-expanded={showAll.expanded}
          className="mt-2 rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          {showAll.expanded ? "Show top 8" : "Show all"}
        </button>
      )}
    </div>
  );
}
