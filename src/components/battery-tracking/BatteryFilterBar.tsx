"use client";

import { Search, X } from "lucide-react";
import { anyFilter, LAST_SEEN_OPTIONS, NO_FILTERS, type BatteryFilters, type LastSeenPreset } from "./filters";

// Swap Audit's filter bar (SwapAuditTable.tsx): a white card holding compact
// text-xs controls. Its styles are repeated here so that file stays untouched.
const BAR = "bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0";
const SEARCH =
  "pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60";
const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";
// Asset Tracking's Clear filters link (FilterBar.tsx).
const CLEAR =
  "inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline dark:text-(--sidebar-text) rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * Battery Tracking's filter bar, in Swap Audit's pattern: search, the Last seen
 * dropdown, Clear filters while the dropdown is set, and the count on the
 * right. Every control applies at once.
 */
export function BatteryFilterBar({
  search,
  onSearch,
  filters,
  onFilters,
  shown,
  total,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: BatteryFilters;
  onFilters: (f: BatteryFilters) => void;
  /** Batteries matching search and filters, and in all; null until the rows have loaded. */
  shown: number | null;
  total: number | null;
}) {
  const filtered = anyFilter(filters);
  const narrowed = filtered || search.trim() !== "";
  const noun = (n: number) => (n === 1 ? "battery" : "batteries");

  return (
    <div className={BAR}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search serial no. or IMEI"
          aria-label="Search by battery serial number or IMEI"
          className={SEARCH}
        />
      </div>

      <select
        aria-label="Last seen"
        value={filters.lastSeen}
        onChange={(e) => onFilters({ ...filters, lastSeen: e.target.value as LastSeenPreset })}
        className={CONTROL}
      >
        {LAST_SEEN_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

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
            ? `${shown.toLocaleString()} of ${total.toLocaleString()} ${noun(total)}`
            : `${total.toLocaleString()} ${noun(total)}`}
      </span>
    </div>
  );
}
