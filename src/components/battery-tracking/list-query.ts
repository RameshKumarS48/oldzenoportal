import type { DayRange } from "@/components/swap-transactions/DateRangeFilter";
import { LAST_SEEN_VALUES, type LastSeenPreset, type Sort } from "./filters";
import { PER_PAGE_OPTIONS } from "./per-page";

/**
 * The Battery Tracking table's state as a URL query, so a detail page's Back
 * link, and the browser's back button, return to the table as it was:
 * `?q=2me9&seen=7d&sort=soc-desc&page=2&per=50`, or `seen=custom&from=2026-10-01&to=2026-10-07`
 * for a custom range. Defaults are left out, and
 * anything unreadable falls back to its default.
 */
export interface ListState {
  search: string;
  lastSeen: LastSeenPreset;
  range: DayRange | null;
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
  const sort = /^(lastSeen|soc)-(asc|desc)$/.exec(params.get("sort") ?? "");
  const page = Number(params.get("page"));
  const per = Number(params.get("per"));
  return {
    search: params.get("q") ?? "",
    lastSeen: known ? (seen as LastSeenPreset) : "",
    range: known && seen === "custom" ? range : null,
    sort: sort ? { column: sort[1] as "lastSeen" | "soc", direction: sort[2] as "asc" | "desc" } : null,
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
  if (s.sort) p.set("sort", `${s.sort.column}-${s.sort.direction}`);
  if (s.page > 1) p.set("page", String(s.page));
  if (s.perPage !== null) p.set("per", String(s.perPage));
  const q = p.toString();
  return q ? `?${q}` : "";
}
