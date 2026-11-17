"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROPERTIES } from "@/lib/dashboards-v3/catalogue";
import { DEFAULT_RANGE, isoDay, RANGE_PRESETS, rangeLabel, resolveRange } from "@/lib/dashboards-v3/dates";
import type { DashboardFilters as Filters, DateRange } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { ClearFilters, FilterChip } from "../ui/FilterChip";

const CONTROL =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

export const sameRange = (a: DateRange, b: DateRange) => a.preset === b.preset && a.from === b.from && a.to === b.to;
export const filtersActive = (f: Filters) => !sameRange(f.range, DEFAULT_RANGE) || f.regions.length > 0;
export const sameFilters = (a: Filters, b: Filters) => sameRange(a.range, b.range) && a.regions.join() === b.regions.join();
export const DEFAULT_FILTERS: Filters = { range: DEFAULT_RANGE, regions: [] };

/**
 * The whole dashboard's filters: a date range (presets or custom dates) and
 * regions. Anything other than the default shows as a removable chip.
 */
export function DashboardFilters({
  value, onChange, note, extra,
}: {
  value: Filters; onChange: (f: Filters) => void; note?: string;
  /** Beside Clear filters, e.g. "Save as dashboard default"; the row shows whenever this is given. */
  extra?: React.ReactNode;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <RangeControl value={value.range} onChange={(range) => set({ range })} />
        <RegionControl value={value.regions} onChange={(regions) => set({ regions })} />
        {note && <span className="text-xs text-slate-500">{note}</span>}
      </div>
      {(filtersActive(value) || extra) && (
        <div className="flex flex-wrap items-center gap-2">
          {!sameRange(value.range, DEFAULT_RANGE) && <FilterChip label="Date" value={rangeLabel(value.range)} onRemove={() => set({ range: DEFAULT_RANGE })} />}
          {value.regions.map((r) => (
            <FilterChip key={r} label="Region" value={r} onRemove={() => set({ regions: value.regions.filter((x) => x !== r) })} />
          ))}
          {filtersActive(value) && <ClearFilters onClick={() => onChange(DEFAULT_FILTERS)} />}
          {extra}
        </div>
      )}
    </div>
  );
}

function RangeControl({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const today = isoDay(new Date());
  const error = custom && (!custom.from || !custom.to ? "Choose both dates" : custom.from > custom.to ? "The start date is after the end date" : null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="dashboard-range">Date range</label>
      <select
        id="dashboard-range"
        value={custom ? "custom" : value.preset}
        onChange={(e) => {
          if (e.target.value === "custom") {
            const r = resolveRange(value);
            setCustom({ from: isoDay(r.from), to: isoDay(r.to) });
          } else {
            setCustom(null);
            onChange({ preset: e.target.value as DateRange["preset"] });
          }
        }}
        className={cn(CONTROL, "pr-8")}
      >
        {RANGE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        <option value="custom">{value.preset === "custom" && !custom ? rangeLabel(value) : "Custom range…"}</option>
      </select>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (error) return;
            onChange({ preset: "custom", from: custom.from, to: custom.to });
            setCustom(null);
          }}
        >
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            From
            <input type="date" value={custom.from} max={today} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={CONTROL} />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            To
            <input type="date" value={custom.to} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={CONTROL} />
          </label>
          <Button type="submit" size="sm" variant="teal" disabled={!!error}>Apply</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCustom(null)}>Cancel</Button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </form>
      )}
    </div>
  );
}

/** Regions as a checkbox list in a popover. Escape or clicking away closes it; focus goes back to the button. */
function RegionControl({ value, onChange }: { value: string[]; onChange: (r: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = value.length === 0 ? "All regions" : value.length === 1 ? value[0] : `${value.length} regions`;

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={CONTROL}
      >
        <MapPin className="h-4 w-4 text-slate-500" aria-hidden />
        <span className="sr-only">Region: </span>
        {label}
        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
      </button>
      {open && (
        <div
          ref={panel}
          role="group"
          aria-label="Regions"
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); setOpen(false); button.current?.focus(); }
          }}
          className="absolute left-0 z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {PROPERTIES.region.values.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={value.includes(r)}
                onChange={(e) => onChange(e.target.checked ? PROPERTIES.region.values.filter((v) => v === r || value.includes(v)) : value.filter((v) => v !== r))}
                className="h-4 w-4 rounded border-slate-300 accent-[#003B49]"
              />
              {r}
            </label>
          ))}
          <div className="mt-1 flex justify-between border-t border-slate-100 px-3 pt-1.5">
            <button type="button" onClick={() => onChange([])} disabled={value.length === 0} className="rounded text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              Clear
            </button>
            <button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} className="rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
