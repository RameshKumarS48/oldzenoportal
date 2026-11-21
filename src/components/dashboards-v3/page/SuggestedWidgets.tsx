"use client";

import { Hash, Pencil, Plus, TrendingUp, BarChart3, Table2, Layers, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestedMetrics, type CategoryId, type ChartType, type Metric } from "@/lib/dashboards-v3/catalogue";
import { CHART_LABEL } from "@/lib/dashboards-v3/rules";

const ICON: Record<Exclude<ChartType, "text">, typeof Hash> = { kpi: Hash, line: TrendingUp, bar: BarChart3, stacked: Layers, table: Table2, toplist: ListOrdered };

/** Four starting widgets for a category: its first two metrics as numbers, the first as a trend, and the third in its own chart. */
export function suggestionsFor(category: CategoryId): { metric: Metric; type: Exclude<ChartType, "text"> }[] {
  const [a, b, c] = suggestedMetrics(category);
  return [
    { metric: a, type: "kpi" },
    { metric: b, type: "kpi" },
    { metric: a, type: "line" },
    { metric: c, type: c.defaultChart === "kpi" ? "kpi" : c.defaultChart },
  ];
}

/** A blank dashboard's first view: a way to add any widget, and four ready ones for its category. */
export function SuggestedWidgets({
  category, mode, onEdit, onAddWidget, onAddSuggestion,
}: {
  category: CategoryId;
  /** "add" in edit mode; "edit" on your own dashboard in view mode, which only offers Edit; "none" when it isn't yours. */
  mode: "add" | "edit" | "none";
  onEdit: () => void;
  onAddWidget: () => void;
  onAddSuggestion: (metric: Metric, type: ChartType) => void;
}) {
  const canAdd = mode === "add";
  return (
    <section aria-labelledby="first-widget" className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8">
      <div className="text-center">
        <h3 id="first-widget" className="text-base font-semibold text-slate-800">Add your first widget</h3>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "edit" ? "Edit the dashboard to choose any metric or add one of these." : mode === "none" ? "This dashboard has no widgets yet." : "Choose any metric, or start with one of these."}
        </p>
        {canAdd && (
          <Button variant="teal" size="sm" onClick={onAddWidget} className="mt-4">
            <Plus className="h-4 w-4" /> Add widget
          </Button>
        )}
        {mode === "edit" && (
          <Button variant="teal" size="sm" onClick={onEdit} className="mt-4">
            <Pencil className="h-4 w-4" /> Edit dashboard
          </Button>
        )}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {suggestionsFor(category).map(({ metric, type }) => {
          const Icon = ICON[type];
          return (
            <li key={`${metric.id}-${type}`} className="flex flex-col rounded-lg border border-slate-200 p-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {CHART_LABEL[type]}
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-800">{metric.name}</span>
              <span className="mt-0.5 flex-1 text-xs text-slate-500">{metric.definition}</span>
              {canAdd && (
                <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => onAddSuggestion(metric, type)} aria-label={`Add ${metric.name} as a ${CHART_LABEL[type].toLowerCase()}`}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
