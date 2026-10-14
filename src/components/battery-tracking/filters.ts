import type { BatteryRecord } from "@/lib/mock/battery-tracking";

/**
 * Battery Tracking's Last seen filter and its sort, and the rules that apply them
 * to the mock data. Nothing here changes a record: Last Seen is read only to
 * compare it.
 */

export type LastSeenPreset = "any" | "24h" | "7d" | "30d";

/** The Last seen dropdown's options, labelled as the closed dropdown shows them. */
export const LAST_SEEN_OPTIONS: { value: LastSeenPreset; label: string }[] = [
  { value: "any", label: "Last seen: Any time" },
  { value: "24h", label: "Last seen: Not seen in 24 h" },
  { value: "7d", label: "Last seen: Not seen in 7 days" },
  { value: "30d", label: "Last seen: Not seen in 30 days" },
];

const HOURS: Record<Exclude<LastSeenPreset, "any">, number> = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 };

export interface BatteryFilters {
  /** Batteries last seen longer ago than this. */
  lastSeen: LastSeenPreset;
}

export const NO_FILTERS: BatteryFilters = { lastSeen: "any" };

export const anyFilter = (f: BatteryFilters) => f.lastSeen !== "any";

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
  if (f.lastSeen !== "any") {
    const at = seenAt(b.lastSeen);
    // A battery with no readable Last Seen hasn't been seen in any window.
    if (at !== null && now - at <= HOURS[f.lastSeen] * 3_600_000) return false;
  }
  return true;
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
