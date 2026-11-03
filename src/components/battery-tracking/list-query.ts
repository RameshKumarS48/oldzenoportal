import type { DayRange } from "@/components/swap-transactions/DateRangeFilter";
import {
  ASSET_TYPES, FLAGS, LAST_SEEN_VALUES, REGIONS, SORT_KEYS, STATUSES, WAREHOUSE_OPTIONS,
  type AssetType, type FlagFilter, type LastSeenPreset, type RegionFilter, type Sort, type SortKey, type StatusFilter, type WarehouseFilter,
} from "./filters";
import { PER_PAGE_OPTIONS } from "./per-page";

/**
 * The Battery Tracking table's state as a URL query, so a detail page's Back
 * link, and the browser's back button, return to the table as it was:
 * `?q=2me9&seen=7d&asset=vehicle&region=Nairobi&status=storage&flag=charge&wh=Warehouse+1&sort=soc-desc&page=2&per=50`, or `seen=custom&from=2026-10-01&to=2026-10-07`
 * for a custom range. Defaults are left out, and
 * anything unreadable falls back to its default.
 */
export interface ListState {
  search: string;
  lastSeen: LastSeenPreset;
  range: DayRange | null;
  asset: AssetType;
  region: RegionFilter;
  status: StatusFilter;
  flag: FlagFilter;
  warehouse: WarehouseFilter;
  sort: Sort;
  page: number;
  /** Null when the URL doesn't name one: the saved rows-per-page applies. */
  perPage: number | null;
}

export function readListState(params: URLSearchParams): ListState {
  const seen = params.get("seen") ?? "";
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const range = day.test(from) && day.test(to) && from <= to ? { from, to } : null;
  const known = LAST_SEEN_VALUES.includes(seen as LastSeenPreset) && (seen !== "custom" || range !== null);
  const asset = params.get("asset") ?? "";
  const region = params.get("region") ?? "";
  const status = params.get("status") ?? "";
  const flag = params.get("flag") ?? "";
  const wh = params.get("wh") ?? "";
  const sort = /^([A-Za-z]+)-(asc|desc)$/.exec(params.get("sort") ?? "");
  const sortKey = sort && SORT_KEYS.includes(sort[1] as SortKey) ? (sort[1] as SortKey) : null;
  const page = Number(params.get("page"));
  const per = Number(params.get("per"));
  return {
    search: params.get("q") ?? "",
    lastSeen: known ? (seen as LastSeenPreset) : "",
    range: known && seen === "custom" ? range : null,
    asset: ASSET_TYPES.some((a) => a.value === asset) ? (asset as AssetType) : "",
    region: REGIONS.some((r) => r.value === region) ? (region as RegionFilter) : "",
    status: STATUSES.some((o) => o.value === status) ? (status as StatusFilter) : "",
    flag: FLAGS.some((o) => o.value === flag) ? (flag as FlagFilter) : "",
    warehouse: WAREHOUSE_OPTIONS.some((o) => o.value === wh) ? (wh as WarehouseFilter) : "",
    sort: sort && sortKey ? { column: sortKey, direction: sort[2] as "asc" | "desc" } : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    perPage: PER_PAGE_OPTIONS.includes(per) ? per : null,
  };
}

/** The query string for a state, "" when everything is at its default. */
export function listQuery(s: ListState): string {
  const p = new URLSearchParams();
  if (s.search) p.set("q", s.search);
  if (s.lastSeen) p.set("seen", s.lastSeen);
  if (s.lastSeen === "custom" && s.range) {
    p.set("from", s.range.from);
    p.set("to", s.range.to);
  }
  if (s.asset) p.set("asset", s.asset);
  if (s.region) p.set("region", s.region);
  if (s.status) p.set("status", s.status);
  if (s.flag) p.set("flag", s.flag);
  if (s.warehouse) p.set("wh", s.warehouse);
  if (s.sort) p.set("sort", `${s.sort.column}-${s.sort.direction}`);
  if (s.page > 1) p.set("page", String(s.page));
  if (s.perPage !== null) p.set("per", String(s.perPage));
  const q = p.toString();
  return q ? `?${q}` : "";
}
