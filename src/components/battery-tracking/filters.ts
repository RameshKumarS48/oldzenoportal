import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import type { DayRange } from "@/components/swap-transactions/DateRangeFilter";

/**
 * Battery Tracking's Last seen filter and its sort, and the rules that apply them
 * to the mock data. Nothing here changes a record: Last Seen is read only to
 * compare it.
 *
 * The filter is Swap Transactions' time filter (DateRangeFilter): All Time,
 * Today, Last 7 days, Last 30 days or a custom range of days, meaning "last
 * seen within" that period. The presets count back from now, as Swap
 * Transactions' do; a custom range covers whole UTC days, to match the Last
 * Seen (UTC) column.
 */

/** DateRangeFilter's values: "" is All Time, "custom" uses `range`. */
export type LastSeenPreset = "" | "today" | "7d" | "30d" | "custom";
export const LAST_SEEN_VALUES: LastSeenPreset[] = ["", "today", "7d", "30d", "custom"];

const HOURS: Record<"today" | "7d" | "30d", number> = { today: 24, "7d": 7 * 24, "30d": 30 * 24 };

export interface BatteryFilters {
  lastSeen: LastSeenPreset;
  /** The custom range, as YYYY-MM-DD UTC days, both ends included. */
  range: DayRange | null;
}

export const NO_FILTERS: BatteryFilters = { lastSeen: "", range: null };

export const anyFilter = (f: BatteryFilters) => f.lastSeen !== "" && (f.lastSeen !== "custom" || f.range !== null);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Oct 2026 09:56" (UTC) as ms, or null if it can't be read. */
function seenAt(text: string): number | null {
  const m = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4}) (\d{2}):(\d{2})$/.exec(text);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return null;
  return Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]));
}

/** Does the battery pass the filter, measured from `now` (ms)? */
export function matches(b: BatteryRecord, f: BatteryFilters, now: number): boolean {
  if (!anyFilter(f)) return true;
  const at = seenAt(b.lastSeen);
  // A battery with no readable Last Seen wasn't seen in any period.
  if (at === null) return false;
  if (f.lastSeen === "custom") {
    const [fy, fm, fd] = f.range!.from.split("-").map(Number);
    const [ty, tm, td] = f.range!.to.split("-").map(Number);
    return at >= Date.UTC(fy, fm - 1, fd) && at < Date.UTC(ty, tm - 1, td + 1);
  }
  return now - at <= HOURS[f.lastSeen as keyof typeof HOURS] * 3_600_000;
}

export type SortKey = "lastSeen" | "soc";
export type Sort = { column: SortKey; direction: "asc" | "desc" } | null;

/** As Asset Tracking's setSort: a new column sorts ascending, the same one flips. */
export function nextSort(sort: Sort, column: SortKey): Sort {
  return sort?.column === column
    ? { column, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { column, direction: "asc" };
}

/** Sorted copy. Last Seen by time; SOC by value, with no-SOC rows last either way. */
export function sortRows(rows: BatteryRecord[], sort: Sort): BatteryRecord[] {
  if (!sort) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.column === "lastSeen") return dir * ((seenAt(a.lastSeen) ?? 0) - (seenAt(b.lastSeen) ?? 0));
    if (a.soc === null || b.soc === null) return (a.soc === null ? 1 : 0) - (b.soc === null ? 1 : 0);
    return dir * (a.soc - b.soc);
  });
}
