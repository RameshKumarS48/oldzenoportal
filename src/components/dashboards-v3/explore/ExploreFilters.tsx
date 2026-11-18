"use client";

import { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { PROPERTIES, PROPERTY_ORDER, propertyBlocked, REGION_COUNTRY, valuesIn, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { DATE_FORMAT, rangeLabel } from "@/lib/dashboards-v3/dates";
import { dataAsOf } from "@/lib/dashboards-v3/format";
import type { DashboardFilters, PropertyFilter } from "@/lib/dashboards-v3/types";
import { WIDGET_FILTERS_MAX } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { EYEBROW } from "../editor/controls";
import { CountryControl, RegionControl, sameFilters } from "../page/DashboardFilters";
import { DateRangePicker } from "../page/DateRangePicker";
import { useAnchoredPopover } from "../ui/useAnchoredPopover";

const LABEL = "mb-1 block text-xs font-medium text-slate-700";
/** What's applied, as tags in the collapsed box: neutral, so they read as values rather than buttons. */
const TAG = "max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700";
const SELECT =
  "min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

/** "Nairobi", "Nairobi +2", or "All regions". */
function regionSummary(regions: string[]): string {
  if (regions.length === 0) return "All regions";
  return regions.length === 1 ? regions[0] : `${regions[0]} +${regions.length - 1}`;
}

/**
 * Explore's filters, all in the controls column, as one bordered box under
 * the section heading. Collapsed (as the page opens), the box shows what's
 * applied as tags (Last 30 days, Kenya, Nairobi, +1 filter) with a chevron;
 * its accessible name reads "Filters · Last 30 days · Kenya · Nairobi (+1)".
 * Expanded, a tinted panel inside the same box holds the dashboard filter
 * bar's date range, country and region controls, each labelled above and
 * full width, then up to three extra filters as compact rows, "[Property ▾]
 * is [values ▾] ✕". Region and station values follow the chosen country.
 */
export function ExploreFilters({
  metric, filters, saved, onFilters, extra, onExtra, noOverlap,
}: {
  metric: Metric;
  filters: DashboardFilters;
  /** What Reset goes back to: the dashboard's filters when Explore opened. */
  saved: DashboardFilters;
  onFilters: (f: DashboardFilters) => void;
  extra: PropertyFilter[];
  onExtra: (f: PropertyFilter[] | undefined) => void;
  noOverlap: boolean;
}) {
  const [open, setOpen] = useState(false);
  const setExtra = (next: PropertyFilter[]) => onExtra(next.length > 0 ? next : undefined);
  const extraCount = extra.filter((f) => f.values.length > 0).length;
  const tags = [rangeLabel(filters.range), filters.country ?? "All countries", regionSummary(filters.regions), ...(extraCount > 0 ? [`+${extraCount} filter${extraCount > 1 ? "s" : ""}`] : [])];
  const line = `Filters · ${tags.slice(0, 3).join(" · ")}${extraCount > 0 ? ` (+${extraCount})` : ""}`;
  const usable = (p: PropertyId) => !propertyBlocked(metric, p, "filter");
  const free = PROPERTY_ORDER.find((p) => usable(p) && !extra.some((f) => f.property === p));
  const full = extra.length >= WIDGET_FILTERS_MAX;

  return (
    <section aria-labelledby="explore-filters">
      <h3 id="explore-filters" className={EYEBROW}>Filters</h3>
      <div className={cn("rounded-lg border bg-white shadow-sm", open ? "border-slate-300" : "border-slate-300 hover:border-slate-400")}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="explore-filters-body"
          aria-label={line}
          title={line}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {tags.map((t) => <span key={t} className={TAG}>{t}</span>)}
          </span>
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      {open && (
      <div id="explore-filters-body" className="rounded-b-lg border-t border-slate-200 bg-slate-50 px-3 py-3">
      {!sameFilters(filters, saved) && (
        <button type="button" onClick={() => onFilters(saved)} className="mb-2 rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
          Reset to the dashboard’s filters
        </button>
      )}
      <div className="space-y-3">
        <div><span className={LABEL}>Date range</span><DateRangePicker fullWidth value={filters.range} onChange={(range) => onFilters({ ...filters, range })} /></div>
        <div>
          <span className={LABEL}>Country</span>
          <CountryControl fullWidth value={filters.country} onChange={(country) => onFilters({ ...filters, country, regions: filters.regions.filter((r) => !country || REGION_COUNTRY[r] === country) })} />
        </div>
        <div><span className={LABEL}>Region</span><RegionControl fullWidth country={filters.country} value={filters.regions} onChange={(regions) => onFilters({ ...filters, regions })} /></div>
      </div>

      {extra.length > 0 && (
        <ul className="mt-3 space-y-2">
          {extra.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <select
                aria-label={`Filter ${i + 1}: property`}
                value={f.property}
                onChange={(e) => setExtra(extra.map((g, j) => (j === i ? { property: e.target.value as PropertyId, values: [] } : g)))}
                className={cn(SELECT, "w-28")}
              >
                {PROPERTY_ORDER.map((p) => {
                  const why = propertyBlocked(metric, p, "filter") ?? (extra.some((g, j) => j !== i && g.property === p) ? "Already used in another filter" : null);
                  return <option key={p} value={p} disabled={!!why} title={why ?? undefined}>{PROPERTIES[p].name}{why ? " (not available)" : ""}</option>;
                })}
              </select>
              <span className="text-xs text-slate-500">is</span>
              <ValuesDropdown
                label={`Filter ${i + 1}: ${PROPERTIES[f.property].name} values`}
                options={valuesIn(f.property, filters.country)}
                value={f.values}
                onChange={(values) => setExtra(extra.map((g, j) => (j === i ? { ...g, values } : g)))}
              />
              <button
                type="button"
                aria-label={`Remove filter ${i + 1}`}
                title="Remove filter"
                onClick={() => setExtra(extra.filter((_, j) => j !== i))}
                className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="mt-2 text-xs text-slate-500">{WIDGET_FILTERS_MAX} of {WIDGET_FILTERS_MAX} filters</p>
      ) : free ? (
        <button
          type="button"
          onClick={() => setExtra([...extra, { property: free, values: [] }])}
          className="mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add filter
        </button>
      ) : null}

      {noOverlap && <p role="status" className="mt-2 text-xs text-slate-700">These filters don’t overlap, so there’s no data.</p>}
      <p className="mt-3 text-xs text-slate-500">Data as of {format(dataAsOf(), `${DATE_FORMAT}, HH:mm`)}</p>
      </div>
      )}
      </div>
      {!open && noOverlap && <p role="status" className="mt-1 text-xs text-slate-700">These filters don’t overlap, so there’s no data.</p>}
    </section>
  );
}

/**
 * A property's values as a searchable multi-select: the button lists the
 * chosen ones; the popover has a search box and a checkbox list. Escape or
 * Done closes it and focus goes back to the button.
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
