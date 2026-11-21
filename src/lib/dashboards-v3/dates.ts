import type { ChartType } from "./catalogue";
import {
  addDays, differenceInCalendarWeeks, addHours, differenceInCalendarDays, isSameMonth, endOfMonth, format, isSameDay, parseISO, startOfDay, startOfMonth, startOfQuarter, startOfWeek, subDays, subMonths,
} from "date-fns";
import type { DateRange, Grouping, RangePreset } from "./types";

export type PresetId = Exclude<RangePreset, "custom" | "6m">;

/** The presets on offer, in the picker's two groups: rolling back from yesterday, and calendar periods. */
export const PRESET_GROUPS: { label: string; presets: { value: PresetId; label: string }[] }[] = [
  {
    label: "Rolling",
    presets: [
      { value: "today", label: "Today" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
      { value: "12m", label: "Last 12 months" },
    ],
  },
  {
    label: "Calendar",
    presets: [
      // "Calendar" in each name, so "Last calendar month" never reads as "Last 30 days".
      { value: "mtd", label: "This calendar month" },
      { value: "lastMonth", label: "Last calendar month" },
      { value: "qtd", label: "This calendar quarter" },
    ],
  },
];

export const RANGE_PRESETS = PRESET_GROUPS.flatMap((g) => g.presets);
const PRESET_LABEL: Record<Exclude<RangePreset, "custom">, string> = {
  ...(Object.fromEntries(RANGE_PRESETS.map((p) => [p.value, p.label])) as Record<PresetId, string>),
  "6m": "Last 6 months",
};

/** The one date format: "17 Nov 2026". */
export const DATE_FORMAT = "d MMM yyyy";
export const fmtDate = (d: Date) => format(d, DATE_FORMAT);

/** The data refreshes at this hour, so today holds this much of a day so far. */
export const DATA_HOUR = 6;

export const DEFAULT_RANGE: DateRange = { preset: "30d" };

/** Ranges longer than this are grouped by week unless the widget says otherwise (sparklines too): a month or less reads day by day. */
export const WEEKLY_AFTER_DAYS = 31;

export interface ResolvedRange {
  from: Date;
  to: Date;
  days: number;
  /** The preset it came from, for wording ("vs previous 12 months"). */
  preset: RangePreset;
  /**
   * Set when the range ends today: how much of its last day has data so far
   * (data as of 06:00 is a quarter). Its previous period stops at the same
   * point, so the comparison stays fair.
   */
  endFraction?: number;
  /** Set for a snapshot's current value: the one moment it shows, today's 06:00 refresh. */
  asOf?: Date;
  /**
   * The day it was resolved on. A week, month or day holding it isn't over
   * yet, so it's drawn as "so far"; a range that ended before it (last
   * month, say) is complete throughout. Unset for previous periods.
   */
  today?: Date;
}

/** A snapshot is compared with its value this many days earlier. */
export const SNAPSHOT_COMPARE_DAYS = 7;

/** A snapshot's current value: today, as of the morning refresh. The date range doesn't apply. */
export function snapshotRange(today: Date = new Date()): ResolvedRange {
  const day = startOfDay(today);
  return { from: day, to: day, days: 1, preset: "today", asOf: addHours(day, DATA_HOUR), today: day };
}

/** "18 Nov, 06:00": when a current value is from. */
export const fmtAsOf = (d: Date) => format(d, "d MMM, HH:mm");

/**
 * The last complete day: data refreshes each morning up to the end of
 * yesterday, so ranges end there and never include a part-day.
 */
export function lastCompleteDay(today: Date = new Date()): Date {
  return subDays(startOfDay(today), 1);
}

/**
 * A range's first and last day, both inclusive. Rolling and calendar
 * presets count back from the last complete day; Today, and a custom range
 * ending today, include today so far.
 */
export function resolveRange(range: DateRange, today: Date = new Date()): ResolvedRange {
  let to = lastCompleteDay(today);
  const preset = range.preset;
  const now = startOfDay(today);
  let from: Date;
  switch (range.preset) {
    case "today": return { from: now, to: now, days: 1, preset, endFraction: DATA_HOUR / 24, today: now };
    case "lastMonth": {
      from = startOfMonth(subMonths(now, 1));
      to = startOfDay(endOfMonth(from));
      break;
    }
    case "qtd": from = startOfQuarter(to); break;
    case "7d": from = subDays(to, 6); break;
    case "30d": from = subDays(to, 29); break;
    case "90d": from = subDays(to, 89); break;
    case "6m": from = addDays(subMonths(to, 6), 1); break;
    case "12m": from = addDays(subMonths(to, 12), 1); break;
    case "mtd": from = startOfMonth(to); break;
    case "custom": {
      const t = range.to ? minDate(parseISO(range.to), now) : to;
      const f = range.from ? minDate(parseISO(range.from), t) : subDays(t, 29);
      return { from: f, to: t, days: differenceInCalendarDays(t, f) + 1, preset, today: now, ...(isSameDay(t, now) ? { endFraction: DATA_HOUR / 24 } : {}) };
    }
  }
  return { from, to, days: differenceInCalendarDays(to, from) + 1, preset, today: now };
}

const minDate = (a: Date, b: Date) => (a < b ? a : b);

/**
 * The period a range is compared with: the month before for Last month, and
 * otherwise the same number of days just before it, cut at the same point of
 * its last day when the range ends today.
 */
export function previousPeriod(r: ResolvedRange): ResolvedRange {
  if (r.asOf) {
    const day = subDays(r.from, SNAPSHOT_COMPARE_DAYS);
    return { ...r, from: day, to: day, asOf: subDays(r.asOf, SNAPSHOT_COMPARE_DAYS), today: undefined };
  }
  if (r.preset === "lastMonth") {
    const from = startOfMonth(subMonths(r.from, 1));
    const to = startOfDay(endOfMonth(from));
    return { from, to, days: differenceInCalendarDays(to, from) + 1, preset: r.preset };
  }
  const to = subDays(r.from, 1);
  return { from: subDays(to, r.days - 1), to, days: r.days, preset: r.preset, endFraction: r.endFraction };
}

/** Two dates as one span, the month and year said once when both share them: "1–31 Oct 2026", "18 Oct – 17 Nov 2026". */
export function fmtSpan(from: Date, to: Date): string {
  if (isSameDay(from, to)) return fmtDate(from);
  if (isSameMonth(from, to)) return `${format(from, "d")}–${fmtDate(to)}`;
  return from.getFullYear() === to.getFullYear() ? `${format(from, "d MMM")} – ${fmtDate(to)}` : `${fmtDate(from)} – ${fmtDate(to)}`;
}

/** A range by name: the preset's name, or its dates for a custom range. */
export function rangeLabel(range: DateRange): string {
  if (range.preset !== "custom") return PRESET_LABEL[range.preset];
  const r = resolveRange(range);
  return fmtSpan(r.from, r.to);
}

/** A range by name with its exact dates: "Last calendar month · 1–31 Oct 2026"; a custom range is its dates. */
export function rangeWithDates(range: DateRange, today: Date = new Date()): string {
  const r = resolveRange(range, today);
  return range.preset === "custom" ? fmtSpan(r.from, r.to) : `${rangeLabel(range)} · ${fmtSpan(r.from, r.to)}`;
}

/** What a comparison is with, in exact dates: "vs 1–30 Sep 2026", "vs 11 Nov, 06:00", "vs 17 Nov 2026, to 06:00". */
export function previousDates(r: ResolvedRange): string {
  const p = previousPeriod(r);
  if (p.asOf) return `vs ${fmtAsOf(p.asOf)}`;
  if (p.endFraction !== undefined && p.days === 1) return `vs ${fmtDate(p.from)}, to ${String(DATA_HOUR).padStart(2, "0")}:00`;
  return `vs ${fmtSpan(p.from, p.to)}`;
}

/** How a comparison is described, in the filter's own words: "vs previous 12 months", "vs previous 30 days". */
export function previousLabel(r: ResolvedRange): string {
  if (r.asOf) return `vs ${SNAPSHOT_COMPARE_DAYS} days earlier`;
  if (r.preset === "today") return "vs same time yesterday";
  if (r.preset === "lastMonth") return "vs the month before";
  if (r.preset === "6m") return "vs previous 6 months";
  if (r.preset === "12m") return "vs previous 12 months";
  return `vs previous ${r.days} day${r.days === 1 ? "" : "s"}`;
}

export function defaultGrouping(r: ResolvedRange): Grouping {
  return r.days > WEEKLY_AFTER_DAYS ? "week" : "day";
}

/** Most bars a stacked chart draws before its automatic grouping moves up a step. */
export const STACKED_BARS_MAX = 14;

/**
 * Automatic grouping for a chart. Stacked bars stay readable at 14 bars or
 * fewer: by day, then by week, then by month. Everything else: daily up to
 * 31 days, weekly beyond.
 */
export function autoGrouping(type: ChartType, r: ResolvedRange): Grouping {
  if (type !== "stacked") return defaultGrouping(r);
  if (r.days <= STACKED_BARS_MAX) return "day";
  return differenceInCalendarWeeks(r.to, r.from, { weekStartsOn: 1 }) + 1 <= STACKED_BARS_MAX ? "week" : "month";
}

/** What "Automatic" means for a chart, in words. */
export function autoGroupingHint(type: ChartType): string {
  return type === "stacked"
    ? `Automatic keeps it to ${STACKED_BARS_MAX} bars at most: daily, then weekly, then monthly.`
    : `Automatic is daily, or weekly for ranges over ${WEEKLY_AFTER_DAYS} days.`;
}

/** The start of the bucket a day falls in; weeks start on Monday. */
export function bucketStart(day: Date, grouping: Grouping): Date {
  if (grouping === "week") return startOfWeek(day, { weekStartsOn: 1 });
  if (grouping === "month") return startOfMonth(day);
  return startOfDay(day);
}

/** The last day a bucket would cover if it were complete. */
export function bucketEnd(start: Date, grouping: Grouping): Date {
  if (grouping === "week") return addDays(start, 6);
  if (grouping === "month") return startOfDay(endOfMonth(start));
  return start;
}

/**
 * A bucket's axis label. When the range crosses a year, the first label and
 * the first in each new year carry the year, so "Nov … Nov" reads as
 * "Nov 2025 … Nov 2026".
 */
export function bucketLabel(start: Date, grouping: Grouping, withYear = false): string {
  const y = withYear ? " yyyy" : "";
  if (grouping === "month") return format(start, `MMM${y}`);
  // Weeks are labelled by their Monday, in the same format as days; the tooltip says it's a week.
  return format(start, `d MMM${y}`);
}

/** A bucket in full, for tooltips and tables, in the one date format: "17 Nov 2026", "Week of 3 Nov 2025", "Nov 2026". */
export function bucketFullLabel(start: Date, grouping: Grouping): string {
  if (grouping === "month") return format(start, "MMM yyyy");
  if (grouping === "week") return `Week of ${fmtDate(start)}`;
  return fmtDate(start);
}

export const GROUPING_LABEL: Record<Grouping, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

export function eachDay(r: ResolvedRange): Date[] {
  return Array.from({ length: r.days }, (_, i) => addDays(r.from, i));
}

export function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
