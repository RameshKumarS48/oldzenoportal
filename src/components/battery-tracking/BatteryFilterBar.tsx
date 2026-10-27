"use client";

import { Search } from "lucide-react";
import { DateRangeFilter } from "@/components/swap-transactions/DateRangeFilter";
import {
  anyFilter,
  ASSET_TYPES,
  describeFilter,
  NO_FILTERS,
  REGIONS,
  type AssetType,
  type BatteryFilters,
  type LastSeenPreset,
  type RegionFilter,
} from "./filters";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";

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

/**
 * Battery Tracking's filter bar, in Swap Audit's pattern: search, Swap
 * Transactions' time filter for Last Seen, Asset type, Region, Clear filters while
 * any filter is set, and the count on the right. The presets apply at once; a custom range on Apply.
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
          placeholder="Search serial no., IMEI, VIN, station or region"
          aria-label="Search by battery serial number, IMEI, VIN, station code or region"
          className={SEARCH}
        />
      </div>

      {/* Swap Transactions' time filter, unchanged: presets plus "Custom range…". */}
      <DateRangeFilter
        value={filters.lastSeen}
        range={filters.range}
        onChange={(v, r) => onFilters({ ...filters, lastSeen: v as LastSeenPreset, range: r })}
        className={CONTROL}
      />

      {/* Asset type, in the same native dropdown and style; it applies on selection. */}
      <select
        aria-label="Asset type"
        value={filters.asset}
        onChange={(e) => onFilters({ ...filters, asset: e.target.value as AssetType })}
        className={CONTROL}
      >
        {ASSET_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>

      <select
        aria-label="Region"
        value={filters.region}
        onChange={(e) => onFilters({ ...filters, region: e.target.value as RegionFilter })}
        className={CONTROL}
      >
        {REGIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>

      {filtered && (
        <ClearFiltersButton onClick={() => onFilters(NO_FILTERS)} />
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
