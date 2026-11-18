"use client";

import { useId } from "react";
import { Plus, X } from "lucide-react";
import { propertyBlocked, PROPERTIES, PROPERTY_ORDER, valuesIn, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import type { DashboardFilters, PropertyFilter } from "@/lib/dashboards-v3/types";
import { WIDGET_FILTERS_MAX } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { OptionChips } from "./controls";

/**
 * A widget's own filters: up to three, each a property and the values to
 * keep, all of which must match. Properties the metric can't be filtered by,
 * or that another filter already uses, stay visible, greyed, with the reason.
 */
export function WidgetFilters({
  metric, value, dashboard, noOverlap, onChange,
}: {
  metric: Metric;
  value: PropertyFilter[];
  dashboard: DashboardFilters;
  /** The widget's filters and the dashboard's leave no place in common. */
  noOverlap: boolean;
  onChange: (filters: PropertyFilter[] | undefined) => void;
}) {
  const id = useId();
  const set = (next: PropertyFilter[]) => onChange(next.length > 0 ? next : undefined);
  const blocked = (p: PropertyId, at: number): string | null => {
    const why = propertyBlocked(metric, p, "filter");
    if (why) return why;
    const other = value.findIndex((f, i) => i !== at && f.property === p);
    return other >= 0 ? `Already used in filter ${other + 1}` : null;
  };
  const free = PROPERTY_ORDER.find((p) => !blocked(p, -1));
  const addBlocked = value.length >= WIDGET_FILTERS_MAX
    ? `Up to ${WIDGET_FILTERS_MAX} filters per widget`
    : !free ? `Nothing else can filter ${metric.name.toLowerCase()}` : null;
  const shown = [dashboard.country, ...dashboard.regions].filter(Boolean).join(", ");

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">Filters</p>
      <p className="mb-2 mt-0.5 text-xs text-slate-500">
        Up to {WIDGET_FILTERS_MAX}. The widget shows what matches all of them{shown ? `, within the dashboard’s ${shown}` : ""}.
      </p>

      <div className="space-y-2">
        {value.map((f, i) => (
          <div key={i} role="group" aria-labelledby={`${id}-${i}`} className="space-y-2 rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-center justify-between">
              <p id={`${id}-${i}`} className="text-xs font-medium text-slate-600">Filter {i + 1}</p>
              <button
                type="button"
                onClick={() => set(value.filter((_, j) => j !== i))}
                className="inline-flex items-center gap-1 rounded px-1 text-xs font-medium text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Remove<span className="sr-only"> filter {i + 1}</span>
              </button>
            </div>
            <OptionChips<PropertyId>
              label="Filter by"
              value={f.property}
              onChange={(property) => set(value.map((g, j) => (j === i ? { property, values: [] } : g)))}
              options={PROPERTY_ORDER.map((p) => ({ value: p, label: PROPERTIES[p].name, blocked: blocked(p, i) }))}
            />
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-slate-600">{PROPERTIES[f.property].name}: show only</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {/* Regions and stations: only those in the dashboard's country. */}
                {valuesIn(f.property, dashboard.country).map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={f.values.includes(v)}
                      onChange={(e) => {
                        const values = e.target.checked ? PROPERTIES[f.property].values.filter((x) => x === v || f.values.includes(x)) : f.values.filter((x) => x !== v);
                        set(value.map((g, j) => (j === i ? { ...g, values } : g)));
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-[#003B49]"
                    />
                    {v}
                  </label>
                ))}
              </div>
              {f.values.length === 0 && <p className="mt-1.5 text-xs text-slate-500">Nothing ticked yet, so this filter does nothing.</p>}
            </fieldset>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-disabled={!!addBlocked}
        aria-describedby={addBlocked ? `${id}-add-why` : undefined}
        title={addBlocked ?? undefined}
        onClick={() => { if (!addBlocked && free) set([...value, { property: free, values: [] }]); }}
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
          addBlocked ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : "border-dashed border-slate-300 text-slate-700 hover:border-slate-400"
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add filter
        {addBlocked && <span id={`${id}-add-why`} className="sr-only">: {addBlocked}</span>}
      </button>

      {noOverlap && (
        <p role="status" className="mt-2 text-xs text-slate-700">
          These filters don’t overlap with the dashboard’s ({shown}), so the widget will show no data.
        </p>
      )}
    </div>
  );
}
