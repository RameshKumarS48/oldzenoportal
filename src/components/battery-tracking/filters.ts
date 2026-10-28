import { OTHER_AREA, type BatteryRecord, type Region } from "@/lib/mock/battery-tracking";
import type { DayRange } from "@/components/swap-transactions/DateRangeFilter";

/**
 * Battery Tracking's Last seen, Asset type and Region filters and its sort, and the
 * rules that apply them to the mock data. Nothing here changes a record: Last Seen is read only to
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

/** What holds the battery: "" is All assets, "none" is in neither a station nor a vehicle. */
export type AssetType = "" | "station" | "vehicle" | "none";
export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "", label: "All assets" },
  { value: "station", label: "In station" },
  { value: "vehicle", label: "In vehicle" },
  { value: "none", label: "Unassigned" },
];
export const assetTypeLabel = (t: AssetType) => ASSET_TYPES.find((a) => a.value === t)!.label;

/** Where the battery last reported: "" is All regions, "other" is Outside service regions, "none" is no location. */
export type RegionFilter = "" | Region | "other" | "none";
export const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: "", label: "All regions" },
  ...(["Kajiado", "Kiambu", "Machakos", "Nairobi", "Nanyuki", "Nyeri"] as const).map((r) => ({ value: r, label: r })),
  { value: "other", label: OTHER_AREA },
  { value: "none", label: "No location" },
];
export const regionLabel = (r: RegionFilter) => REGIONS.find((o) => o.value === r)!.label;

export interface BatteryFilters {
  lastSeen: LastSeenPreset;
  /** The custom range, as YYYY-MM-DD UTC days, both ends included. */
  range: DayRange | null;
  asset: AssetType;
  region: RegionFilter;
}

export const NO_FILTERS: BatteryFilters = { lastSeen: "", range: null, asset: "", region: "" };

/** Is Last seen narrowing the rows? (It names the Last Seen header and the count's words.) */
export const lastSeenActive = (f: BatteryFilters) => f.lastSeen !== "" && (f.lastSeen !== "custom" || f.range !== null);

export const anyFilter = (f: BatteryFilters) => lastSeenActive(f) || f.asset !== "" || f.region !== "";

function regionMatches(b: BatteryRecord, r: RegionFilter): boolean {
  if (r === "") return true;
  if (r === "none") return b.region === null;
  if (r === "other") return b.region === OTHER_AREA;
  return b.region === r;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Oct 2026 09:56" (UTC) as ms, or null if it can't be read. */
function seenAt(text: string): number | null {
  const m = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4}) (\d{2}):(\d{2})$/.exec(text);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return null;
  return Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]));
}

/** Does the battery pass every filter, Last seen measured from `now` (ms)? */
export function matches(b: BatteryRecord, f: BatteryFilters, now: number): boolean {
  if (!regionMatches(b, f.region)) return false;
  if (f.asset === "none" ? b.asset !== null : f.asset !== "" && b.asset?.type !== f.asset) return false;
  if (!lastSeenActive(f)) return true;
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

/** "1 Oct", or "1 Oct 2025" when it isn't `year`. */
function dayLabel(iso: string, year: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${y === year ? "" : ` ${y}`}`;
}

/**
 * The active filter in words, for the count: "seen today", "seen in the last 7
 * days", or a custom range, "seen 1–10 Oct", "seen 28 Sep – 3 Oct", "seen on
 * 5 Oct". The year shows only when it isn't `year` (the current one), and on
 * both ends of a range that crosses years. Null
 * when Last seen isn't filtering; Asset type and Region show as chips instead.
 */
export function describeFilter(f: BatteryFilters, year: number): string | null {
  if (!lastSeenActive(f)) return null;
  if (f.lastSeen === "today") return "seen today";
  if (f.lastSeen === "7d") return "seen in the last 7 days";
  if (f.lastSeen === "30d") return "seen in the last 30 days";
  const { from, to } = f.range!;
  if (from === to) return `seen on ${dayLabel(from, year)}`;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  if (sameMonth) {
    const end = dayLabel(to, year);
    return `seen ${Number(from.slice(8))}–${end}`;
  }
  // A range across years names both, so "28 Dec 2025 – 3 Jan 2026" isn't half-dated.
  const show = from.slice(0, 4) === to.slice(0, 4) ? year : 0;
  return `seen ${dayLabel(from, show)} – ${dayLabel(to, show)}`;
}

export type SortKey = "lastSeen" | "soc";
export type Sort = { column: SortKey; direction: "asc" | "desc" } | null;

/** As Vehicle Tracking's setSort: a new column sorts ascending, the same one flips. */
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
