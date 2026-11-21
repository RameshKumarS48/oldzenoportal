"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { propertyBlocked, PROPERTIES, PROPERTY_ORDER, valuesIn, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import type { DashboardFilters, PropertyFilter } from "@/lib/dashboards-v3/types";
import { WIDGET_FILTERS_MAX } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { useAnchoredPopover } from "../ui/useAnchoredPopover";

const SELECT =
  "min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

/**
 * A widget's own filters as compact rows, "[Property ▾] is [values ▾] ✕",
 * up to three, all of which must match. Each row's property list has only
 * the properties the metric can be filtered by and no other row uses.
 * Region and station values follow the dashboard's country.
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
  const set = (next: PropertyFilter[]) => onChange(next.length > 0 ? next : undefined);
  const usable = (p: PropertyId, at: number) => !propertyBlocked(metric, p, "filter") && !value.some((f, i) => i !== at && f.property === p);
  const free = PROPERTY_ORDER.find((p) => usable(p, -1));
  const shown = [dashboard.country, ...dashboard.regions].filter(Boolean).join(", ");

  return (
    <div>
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <select
                aria-label={`Filter ${i + 1}: property`}
                value={f.property}
                onChange={(e) => set(value.map((g, j) => (j === i ? { property: e.target.value as PropertyId, values: [] } : g)))}
                className={cn(SELECT, "w-32 shrink-0")}
              >
                {PROPERTY_ORDER.filter((p) => usable(p, i)).map((p) => <option key={p} value={p}>{PROPERTIES[p].name}</option>)}
              </select>
              <span className="text-xs text-slate-500">is</span>
              <ValuesDropdown
                label={`Filter ${i + 1}: ${PROPERTIES[f.property].name} values`}
                options={valuesIn(f.property, dashboard.country)}
                value={f.values}
                onChange={(values) => set(value.map((g, j) => (j === i ? { ...g, values } : g)))}
              />
              <button
                type="button"
                aria-label={`Remove filter ${i + 1}`}
                title="Remove filter"
                onClick={() => set(value.filter((_, j) => j !== i))}
                className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length >= WIDGET_FILTERS_MAX ? (
        <p className="mt-2 text-xs text-slate-500">{WIDGET_FILTERS_MAX} of {WIDGET_FILTERS_MAX} filters</p>
      ) : free ? (
        <button
          type="button"
          onClick={() => set([...value, { property: free, values: [] }])}
          className={cn("inline-flex items-center gap-1 rounded text-sm font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40", value.length > 0 && "mt-2")}
        >
          <Plus className="h-4 w-4" aria-hidden /> Add filter
        </button>
      ) : value.length === 0 ? (
        <p className="text-xs text-slate-500">Nothing can filter {metric.name.toLowerCase()} beyond the dashboard’s filters.</p>
      ) : null}

      {value.length > 0 && !noOverlap && <p className="mt-2 text-xs text-slate-500">The widget shows what matches all of them{shown ? `, within the dashboard’s ${shown}` : ""}.</p>}
      {noOverlap && (
        <p role="status" className="mt-2 text-xs text-slate-700">
          These filters don’t overlap with the dashboard’s ({shown}), so the widget will show no data.
        </p>
      )}
    </div>
  );
}

/**
 * A property's values as a searchable multi-select: the button lists the
 * chosen ones ("Any" when none); the popover has a search box and a
 * checkbox list. Escape, a click outside or Done close it, and focus goes
 * back to the button.
 */
function ValuesDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const { open, button, panel, toggle, close, onKeyDown, style } = useAnchoredPopover({ width: 240, height: 300 });
  const id = useId();
  const q = query.trim().toLowerCase();
  const shown = options.filter((o) => !q || o.toLowerCase().includes(q));
  const summary = value.length === 0 ? "Any" : value.length <= 2 ? value.join(", ") : `${value.length} selected`;

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`${label}: ${summary}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setQuery(""); toggle(); }}
        className={cn(SELECT, "inline-flex flex-1 items-center gap-1 text-left")}
      >
        <span className={cn("min-w-0 flex-1 truncate", value.length === 0 && "text-slate-500")}>{summary}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label={label} style={style} onKeyDown={onKeyDown} className="z-50 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-200">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input ref={search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search values" className="w-full rounded-t-lg py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none" />
          </div>
          <div role="group" aria-labelledby={`${id}-label`} className="max-h-56 overflow-y-auto py-1">
            <span id={`${id}-label`} className="sr-only">{label}</span>
            {shown.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={value.includes(o)}
                  onChange={(e) => onChange(e.target.checked ? options.filter((x) => x === o || value.includes(x)) : value.filter((x) => x !== o))}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#003B49]"
                />
                {o}
              </label>
            ))}
            {shown.length === 0 && <p className="px-2.5 py-2 text-xs text-slate-500">No values match “{query.trim()}”.</p>}
          </div>
          <div className="flex justify-between border-t border-slate-100 px-2.5 py-1.5">
            <button type="button" onClick={() => onChange([])} disabled={value.length === 0} className="rounded text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">Clear</button>
            <button type="button" onClick={() => close()} className="rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">Done</button>
          </div>
        </div>
      )}
    </>
  );
}
