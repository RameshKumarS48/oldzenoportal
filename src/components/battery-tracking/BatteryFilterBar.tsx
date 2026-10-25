"use client";

import { Search, X } from "lucide-react";
import { DateRangeFilter } from "@/components/swap-transactions/DateRangeFilter";
import { anyFilter, describeFilter, NO_FILTERS, type BatteryFilters, type LastSeenPreset } from "./filters";

// Swap Audit's filter bar (SwapAuditTable.tsx): a white card holding compact
// text-xs controls. Its styles are repeated here so that file stays untouched.
// The search is w-72, Asset Tracking's width, to fit its longer placeholder.
const BAR = "bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0";
const SEARCH =
  "pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-72";
const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";
// Asset Tracking's Clear filters link (FilterBar.tsx).
const CLEAR =
  "inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline dark:text-(--sidebar-text) rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * Battery Tracking's filter bar, in Swap Audit's pattern: search, Swap
 * Transactions' time filter for Last Seen, Clear filters while it's set, and the
 * count on the right. The presets apply at once; a custom range on Apply.
 */
export function BatteryFilterBar({
  search,
  onSearch,
  filters,
  onFilters,
  shown,
  total,
  year,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: BatteryFilters;
  onFilters: (f: BatteryFilters) => void;
  /** Batteries matching search and filters, and in all; null until the rows have loaded. */
  shown: number | null;
  total: number | null;
  /** The current year, so a custom range in it can leave the year out. */
  year: number;
}) {
  const filtered = anyFilter(filters);
  const narrowed = filtered || search.trim() !== "";
  const noun = (n: number) => (n === 1 ? "battery" : "batteries");
  const filterWords = describeFilter(filters, year);

  return (
    <div className={BAR}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search serial no., IMEI, VIN or station"
          aria-label="Search by battery serial number, IMEI, VIN or station code"
          className={SEARCH}
        />
      </div>

      {/* Swap Transactions' time filter, unchanged: presets plus "Custom range…". */}
      <DateRangeFilter
        value={filters.lastSeen}
        range={filters.range}
        onChange={(v, r) => onFilters({ lastSeen: v as LastSeenPreset, range: r })}
        className={CONTROL}
      />

      {filtered && (
        <button onClick={() => onFilters(NO_FILTERS)} className={CLEAR}>
          <X className="w-3.5 h-3.5" />
          Clear filters
        </button>
      )}

      <span aria-live="polite" className="ml-auto text-xs text-slate-500 tabular-nums">
        {shown === null || total === null
          ? null
          : narrowed
            ? `${shown.toLocaleString()} of ${total.toLocaleString()} ${noun(total)}${filterWords ? ` · ${filterWords}` : ""}`
            : `${total.toLocaleString()} ${noun(total)}`}
      </span>
    </div>
  );
}
