/** Time ranges, grains and buckets. Days are calendar days, YYYY-MM-DD. */
import type { DayRange, Grain, PresetId, RangeValue } from "./types";

export const RANGE_PRESETS: [PresetId, string][] = [
  ["today", "Today"], ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"],
  ["this_week", "This week"], ["this_month", "This month"], ["this_quarter", "This quarter"], ["this_year", "This year"],
  ["last_month", "Last month"], ["last_quarter", "Last quarter"],
];

export const MAX_RANGE_DAYS = 731; // 24 months
const HOURLY_MAX_DAYS = 7;
const DAILY_MAX_DAYS = 366;
const DAY = 86_400_000;
const EAT_MS = 3 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toMs = (day: string) => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10));
export const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => toDay(toMs(day) + n * DAY);
export const daysIn = (r: DayRange) => Math.round((toMs(r.to) - toMs(r.from)) / DAY) + 1;
/** Today in Nairobi. */
export const todayEat = () => new Date(Date.now() + EAT_MS).toISOString().slice(0, 10);
/** Days since a fixed point, for sample data that doesn't move between visits. */
export const dayNumber = (day: string) => Math.round(toMs(day) / DAY);

const monthStart = (y: number, m: number) => toDay(Date.UTC(y, m, 1));
const monthEnd = (y: number, m: number) => toDay(Date.UTC(y, m + 1, 0));

/** The actual days a range covers, as of `today`. */
export function resolveRange(r: RangeValue, today: string): DayRange {
  const y = +today.slice(0, 4);
  const m = +today.slice(5, 7) - 1;
  const q = Math.floor(m / 3) * 3;
  switch (r.preset) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: addDays(today, -1), to: addDays(today, -1) };
    case "7d": return { from: addDays(today, -6), to: today };
    case "30d": return { from: addDays(today, -29), to: today };
    case "90d": return { from: addDays(today, -89), to: today };
    case "this_week": { const dow = (new Date(toMs(today)).getUTCDay() + 6) % 7; return { from: addDays(today, -dow), to: today }; }
    case "this_month": return { from: monthStart(y, m), to: today };
    case "this_quarter": return { from: monthStart(y, q), to: today };
    case "this_year": return { from: monthStart(y, 0), to: today };
    case "last_month": return { from: monthStart(y, m - 1), to: monthEnd(y, m - 1) };
    case "last_quarter": return { from: monthStart(y, q - 3), to: monthEnd(y, q - 1) };
    case "custom": return r.from && r.to ? { from: r.from, to: r.to } : { from: addDays(today, -29), to: today };
  }
}

/** Why a custom range can't be used, or null. */
export function customRangeError(from: string, to: string, today: string): string | null {
  if (!from || !to) return "Choose both dates.";
  if (from > to) return "The start date must be on or before the end date.";
  if (to > today) return "The range can’t end in the future.";
  if (daysIn({ from, to }) > MAX_RANGE_DAYS) return "A range can cover at most 24 months.";
  return null;
}

const fmt = (day: string, withYear = false) => `${+day.slice(8, 10)} ${MONTHS[+day.slice(5, 7) - 1]}${withYear ? ` ${day.slice(0, 4)}` : ""}`;

/** "Last 30 days", or "12 Sep – 30 Sep 2026" for a custom range. */
export function rangeText(r: RangeValue, today: string): string {
  const preset = RANGE_PRESETS.find(([id]) => id === r.preset);
  if (preset) return preset[1];
  const d = resolveRange(r, today);
  if (d.from === d.to) return fmt(d.from, true);
  return d.from.slice(0, 4) === d.to.slice(0, 4) ? `${fmt(d.from)} – ${fmt(d.to, true)}` : `${fmt(d.from, true)} – ${fmt(d.to, true)}`;
}

/** The grain a range gets when nobody chose one. */
export function autoGrain(r: DayRange): Grain {
  const n = daysIn(r);
  if (n <= 2) return "hour";
  if (n <= 92) return "day";
  if (n <= 400) return "week";
  return "month";
}

/** Grains a range can be drawn in: hourly up to 7 days, daily up to 12 months. */
export function allowedGrains(r: DayRange): Grain[] {
  const n = daysIn(r);
  const out: Grain[] = [];
  if (n <= HOURLY_MAX_DAYS) out.push("hour");
  if (n <= DAILY_MAX_DAYS) out.push("day");
  if (n >= 7) out.push("week");
  if (n >= 28) out.push("month");
  return out.length ? out : ["day"];
}

/** The chosen grain if the range allows it, else the automatic one. */
export function effectiveGrain(r: DayRange, chosen?: Grain): Grain {
  return chosen && allowedGrains(r).includes(chosen) ? chosen : autoGrain(r);
}

export const GRAIN_LABELS: Record<Grain, string> = { hour: "Hourly", day: "Daily", week: "Weekly", month: "Monthly" };

export interface Bucket { label: string; days: string[]; hour?: number }

/** The range cut into buckets of one grain, in order. */
export function buckets(r: DayRange, grain: Grain): Bucket[] {
  const days: string[] = [];
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) days.push(d);
  if (grain === "hour") {
    return days.flatMap((d) => Array.from({ length: 24 }, (_, h) => ({ label: days.length > 1 ? `${fmt(d)} ${String(h).padStart(2, "0")}:00` : `${String(h).padStart(2, "0")}:00`, days: [d], hour: h })));
  }
  if (grain === "day") return days.map((d) => ({ label: fmt(d), days: [d] }));
  const out: Bucket[] = [];
  let key = "";
  for (const d of days) {
    const k = grain === "month" ? d.slice(0, 7) : addDays(d, -((new Date(toMs(d)).getUTCDay() + 6) % 7));
    if (k !== key) {
      key = k;
      out.push({ label: grain === "month" ? `${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : fmt(d), days: [] });
    }
    out[out.length - 1].days.push(d);
  }
  return out;
}

/** The range to compare with: the same length just before, or the same days a year earlier. */
export function compareRange(r: DayRange, mode: "previous" | "year"): DayRange {
  if (mode === "year") return { from: addDays(r.from, -364), to: addDays(r.to, -364) };
  const n = daysIn(r);
  return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
}
