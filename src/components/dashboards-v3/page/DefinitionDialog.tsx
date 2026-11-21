"use client";

import { Button } from "@/components/ui/button";
import { categoryName, isMoney, kindLabel, MONEY_NOTE, PROPERTIES, type Metric } from "@/lib/dashboards-v3/catalogue";
import { UNIT_LABEL } from "@/lib/dashboards-v3/format";
import { Dialog } from "../ui/Dialog";

/** Everything about a metric in plain words: what it is, how it's counted, what it leaves out, what a good trend looks like, and what it can be split and filtered by. */
export function DefinitionDialog({ metric, open, onClose }: { metric: Metric; open: boolean; onClose: () => void }) {
  const names = (ids: Metric["splitBy"]) => ids.map((p) => PROPERTIES[p].name).join(", ") || "Nothing";
  const rows: [string, string][] = [
    ["Category", categoryName(metric.category)],
    ["Shows", kindLabel(metric)],
    ["Unit", metric.unit === "count" ? "Count" : isMoney(metric) ? `${UNIT_LABEL[metric.unit]}. ${MONEY_NOTE}` : UNIT_LABEL[metric.unit]],
    ["Can be split by", names(metric.splitBy)],
    ["Can be filtered by", names(metric.filters)],
  ];
  return (
    <Dialog open={open} onClose={onClose} title={metric.name} subtitle="Metric definition" footer={<Button variant="teal" onClick={onClose}>Done</Button>}>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        <section>
          <h3 className="text-xs font-semibold text-slate-500">What it is</h3>
          <p>{metric.definition}</p>
        </section>
        <section>
          <h3 className="text-xs font-semibold text-slate-500">How it’s counted</h3>
          <p>{metric.counted}</p>
        </section>
        <section>
          <h3 className="text-xs font-semibold text-slate-500">What it excludes</h3>
          <p>{metric.excludes}</p>
        </section>
        <section>
          <h3 className="text-xs font-semibold text-slate-500">What a good trend looks like</h3>
          <p>{metric.goodTrend}</p>
        </section>
      </div>
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
