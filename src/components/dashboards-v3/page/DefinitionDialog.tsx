"use client";

import { Button } from "@/components/ui/button";
import { categoryName, PROPERTIES, type Aggregation, type Metric } from "@/lib/dashboards-v3/catalogue";
import { UNIT_LABEL } from "@/lib/dashboards-v3/format";
import { Dialog } from "../ui/Dialog";

const HOW: Record<Aggregation, string> = {
  sum: "Added up over the period",
  average: "Averaged over the period",
  latest: "The value on the last day of the period",
  unique: "Each one counted once over the period",
};

/** Everything about a metric in plain words: what it is, its unit, how a period is counted, and what it can be split and filtered by. */
export function DefinitionDialog({ metric, open, onClose }: { metric: Metric; open: boolean; onClose: () => void }) {
  const names = (ids: Metric["splitBy"]) => ids.map((p) => PROPERTIES[p].name).join(", ") || "Nothing";
  const rows: [string, string][] = [
    ["Category", categoryName(metric.category)],
    ["Unit", metric.unit === "count" ? "Count" : UNIT_LABEL[metric.unit]],
    ["How a period is counted", HOW[metric.aggregation]],
    ["Good news when it", metric.higherIsBetter ? "Goes up" : "Goes down"],
    ["Can be split by", names(metric.splitBy)],
    ["Can be filtered by", names(metric.filters)],
  ];
  return (
    <Dialog open={open} onClose={onClose} title={metric.name} subtitle="Metric definition" footer={<Button variant="teal" onClick={onClose}>Done</Button>}>
      <p className="text-sm leading-relaxed text-slate-700">{metric.definition}</p>
      <dl className="mt-4 divide-y divide-slate-100 border-y border-slate-100 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2">
            <dt className="w-44 shrink-0 text-slate-500">{k}</dt>
            <dd className="text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
