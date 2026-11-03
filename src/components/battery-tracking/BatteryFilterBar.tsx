"use client";

import { Download, Search } from "lucide-react";
import { DateRangeFilter } from "@/components/swap-transactions/DateRangeFilter";
import {
  anyFilter,
  ASSET_TYPES,
  describeFilter,
  FLAGS,
  REGIONS,
  STATUSES,
  WAREHOUSE_OPTIONS,
  type AssetType,
  type BatteryFilters,
  type FlagFilter,
  type LastSeenPreset,
  type RegionFilter,
  type StatusFilter,
  type WarehouseFilter,
} from "./filters";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";

// Swap Audit's filter bar (SwapAuditTable.tsx): a white card holding compact
// text-xs controls. Its styles are repeated here so that file stays untouched.
// The search is w-72, Vehicle Tracking's width, to fit its longer placeholder.
const BAR = "bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0";
const SEARCH =
  "pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-72";
const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";

/**
 * Battery Tracking's filter bar, in Swap Audit's pattern: search, Swap
 * Transactions' time filter for Last Seen, Asset type, Region, Status, Flag, Warehouse, Clear filters while
 * the search or any filter narrows the rows, the count on the right, then
 * Vehicle Tracking's Export XLSX button, which exports the rows the count describes. The presets apply at once; a custom range on Apply.
 */
export function BatteryFilterBar({
  search,
  onSearch,
  filters,
  onFilters,
  onClear,
  onExport,
  shown,
  total,
  year,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: BatteryFilters;
  onFilters: (f: BatteryFilters) => void;
  /** Clears the search and every filter. */
  onClear: () => void;
  /** Downloads the matching rows as XLSX. */
  onExport: () => void;
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
          placeholder="Search serial, IMEI, VIN, station or shipment"
          aria-label="Search by battery serial number, IMEI, VIN, station code, region or shipment number"
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

      <select
        aria-label="Status"
        value={filters.status}
        onChange={(e) => onFilters({ ...filters, status: e.target.value as StatusFilter })}
        className={CONTROL}
      >
        {STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>

      <select
        aria-label="Flag"
        value={filters.flag}
        onChange={(e) => onFilters({ ...filters, flag: e.target.value as FlagFilter })}
        className={CONTROL}
      >
        {FLAGS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>

      <select
        aria-label="Warehouse"
        value={filters.warehouse}
        onChange={(e) => onFilters({ ...filters, warehouse: e.target.value as WarehouseFilter })}
        className={CONTROL}
      >
        {WAREHOUSE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>

      {narrowed && <ClearFiltersButton onClick={onClear} />}

      <span aria-live="polite" className="ml-auto text-xs text-slate-500 tabular-nums">
        {shown === null || total === null
          ? null
          : narrowed
            ? `${shown.toLocaleString()} of ${total.toLocaleString()} ${noun(total)}${filterWords ? ` · ${filterWords}` : ""}`
            : `${total.toLocaleString()} ${noun(total)}`}
      </span>

      {/* Vehicle Tracking's Export XLSX button (asset-tracking/FilterBar.tsx), repeated so that file stays untouched. */}
      <button
        type="button"
        onClick={onExport}
        disabled={shown === null}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/40 focus-visible:ring-offset-1 disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" /> Export XLSX
      </button>
    </div>
  );
}
