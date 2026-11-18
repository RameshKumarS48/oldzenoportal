"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Check, ChevronDown, Globe, MapPin } from "lucide-react";
import { PROPERTIES, REGION_COUNTRY, regionsIn } from "@/lib/dashboards-v3/catalogue";
import { DATE_FORMAT, DEFAULT_RANGE } from "@/lib/dashboards-v3/dates";
import { dataAsOf } from "@/lib/dashboards-v3/format";
import type { DashboardFilters as Filters, DateRange } from "@/lib/dashboards-v3/types";
import { DateRangePicker } from "./DateRangePicker";

// Battery Tracking's filter bar (BatteryFilterBar.tsx): a white card of compact text-xs controls.
const BAR = "flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5";
const CONTROL =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
const QUIET =
  "rounded-md px-2 py-1.5 text-xs font-medium text-slate-700 underline-offset-2 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";
const SECONDARY =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

export const sameRange = (a: DateRange, b: DateRange) => a.preset === b.preset && a.from === b.from && a.to === b.to;
export const filtersActive = (f: Filters) => !sameRange(f.range, DEFAULT_RANGE) || f.country !== null || f.regions.length > 0;
export const sameFilters = (a: Filters, b: Filters) => sameRange(a.range, b.range) && a.country === b.country && a.regions.join() === b.regions.join();
export const DEFAULT_FILTERS: Filters = { range: DEFAULT_RANGE, country: null, regions: [] };

/**
 * The dashboard's filter bar, under the title row: date range, country and
 * region on the left, each showing its value. Region lists the chosen
 * country's regions, and choosing a country drops regions outside it. When the filters differ from the saved
 * ones, the right says so, with Reset and, on your own dashboard in view
 * mode, Save as default; on someone else's, a note that changes aren't
 * saved. "Data as of" sits at the far right: the page's one freshness label.
 */
export function FilterBar({
  value, saved, onChange, canSaveDefault, onSaveDefault, readOnlyNote, resetOnly,
}: {
  value: Filters;
  /** The dashboard's saved filters: what Reset goes back to. */
  saved: Filters;
  onChange: (f: Filters) => void;
  canSaveDefault: boolean;
  onSaveDefault: () => void;
  /** For dashboards that aren't yours: why changes aren't kept. */
  readOnlyNote?: string;
  /** Templates: filters are for looking around, so changed ones only offer "Reset filters", with no note about saving. */
  resetOnly?: boolean;
}) {
  const changed = !sameFilters(value, saved);
  return (
    <div role="toolbar" aria-label="Dashboard filters" className={BAR}>
      <DateRangePicker value={value.range} onChange={(range) => onChange({ ...value, range })} />
      <CountryControl
        value={value.country}
        onChange={(country) => onChange({ ...value, country, regions: value.regions.filter((r) => !country || REGION_COUNTRY[r] === country) })}
      />
      <RegionControl country={value.country} value={value.regions} onChange={(regions) => onChange({ ...value, regions })} />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {changed && resetOnly && (
          <>
            <button type="button" onClick={() => onChange(saved)} className={QUIET}>Reset filters</button>
            <span aria-hidden className="mx-1 h-4 w-px bg-slate-200" />
          </>
        )}
        {changed && !resetOnly && (
          <>
            <span className="text-xs text-slate-500">Filters changed</span>
            <button type="button" onClick={() => onChange(saved)} className={QUIET}>Reset</button>
            {canSaveDefault ? (
              <button type="button" onClick={onSaveDefault} className={SECONDARY}>Save as default</button>
            ) : (
              readOnlyNote && <span className="text-xs text-slate-500">{readOnlyNote}</span>
            )}
            <span aria-hidden className="mx-1 h-4 w-px bg-slate-200" />
          </>
        )}
        <span className="whitespace-nowrap text-xs text-slate-500">Data as of {format(dataAsOf(), `${DATE_FORMAT}, HH:mm`)}</span>
      </div>
    </div>
  );
}

/** A filter's popover: opens from its button, focuses its first choice, and closes on Escape or a click away, with focus back on the button. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    (panel.current?.querySelector<HTMLElement>("[aria-checked=true], input:checked") ?? panel.current?.querySelector<HTMLElement>("input, [role=radio]"))?.focus();
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => { setOpen(false); button.current?.focus(); };
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
  return { open, setOpen, button, panel, close, onKeyDown };
}

const COUNTRY_CHOICES: { value: string | null; label: string }[] = [
  { value: null, label: "All countries" },
  ...PROPERTIES.country.values.map((c) => ({ value: c, label: c })),
];

/** One country, or all, as radio rows in a popover; ↑ ↓ move between them. */
export function CountryControl({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  const { open, setOpen, button, panel, close, onKeyDown } = usePopover();
  function onArrows(e: React.KeyboardEvent) {
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>("[role=radio]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    items[(to + items.length) % items.length]?.focus();
  }
  return (
    <div className="relative">
      <button ref={button} type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={CONTROL}>
        <Globe className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        <span>Country: <span className="font-medium text-slate-800">{value ?? "All"}</span></span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
      </button>
      {open && (
        <div
          ref={panel}
          role="radiogroup"
          aria-label="Country"
          onKeyDown={(e) => { onKeyDown(e); onArrows(e); }}
          className="absolute left-0 z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {COUNTRY_CHOICES.map((c) => (
            <button
              key={c.label}
              type="button"
              role="radio"
              aria-checked={value === c.value}
              onClick={() => { onChange(c.value); close(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <span className="flex-1">{c.label}</span>
              <Check className={value === c.value ? "h-3.5 w-3.5 text-zeno-teal" : "invisible h-3.5 w-3.5"} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The chosen country's regions as a checkbox list in a popover, grouped by country when all countries are shown. */
export function RegionControl({ country, value, onChange }: { country: string | null; value: string[]; onChange: (r: string[]) => void }) {
  const { open, setOpen, button, panel, close, onKeyDown } = usePopover();
  const label = value.length === 0 ? "All" : value.length === 1 ? value[0] : `${value.length} selected`;
  const groups = (country ? [country] : PROPERTIES.country.values).map((c) => ({ country: c, regions: regionsIn(c) }));

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
        <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        <span>Region: <span className="font-medium text-slate-800">{label}</span></span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
      </button>
      {open && (
        <div
          ref={panel}
          role="group"
          aria-label="Regions"
          onKeyDown={onKeyDown}
          className="absolute left-0 z-30 mt-1 max-h-96 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {groups.map((g) => (
            <div key={g.country} role="group" aria-label={`Regions in ${g.country}`}>
              {!country && <p className="px-3 pb-0.5 pt-1.5 text-xs font-semibold text-slate-500">{g.country}</p>}
              {g.regions.map((r) => (
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
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-slate-100 px-3 pt-1.5">
            <button type="button" onClick={() => onChange([])} disabled={value.length === 0} className="rounded text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              Clear
            </button>
            <button type="button" onClick={close} className="rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
