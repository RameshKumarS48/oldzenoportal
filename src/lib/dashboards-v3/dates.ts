import {
  addDays, differenceInCalendarDays, format, parseISO, startOfDay, startOfMonth, startOfWeek, subDays, subMonths,
} from "date-fns";
import type { DateRange, Grouping, RangePreset } from "./types";

export const RANGE_PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "mtd", label: "This month" },
];

export const DEFAULT_RANGE: DateRange = { preset: "30d" };

/** Ranges longer than this are grouped by week unless the widget says otherwise. */
export const WEEKLY_AFTER_DAYS = 90;

export interface ResolvedRange {
  from: Date;
  to: Date;
  days: number;
}

/** A range's first and last day, both inclusive, counted back from `today`. */
export function resolveRange(range: DateRange, today: Date = new Date()): ResolvedRange {
  const to = startOfDay(today);
  let from: Date;
  switch (range.preset) {
    case "7d": from = subDays(to, 6); break;
    case "30d": from = subDays(to, 29); break;
    case "90d": from = subDays(to, 89); break;
    case "6m": from = addDays(subMonths(to, 6), 1); break;
    case "12m": from = addDays(subMonths(to, 12), 1); break;
    case "mtd": from = startOfMonth(to); break;
    case "custom": {
      const f = range.from ? parseISO(range.from) : subDays(to, 29);
      const t = range.to ? parseISO(range.to) : to;
      return { from: f, to: t, days: differenceInCalendarDays(t, f) + 1 };
    }
  }
  return { from, to, days: differenceInCalendarDays(to, from) + 1 };
}

/** The same number of days immediately before a range. */
export function previousPeriod(r: ResolvedRange): ResolvedRange {
  const to = subDays(r.from, 1);
  return { from: subDays(to, r.days - 1), to, days: r.days };
}

export function rangeLabel(range: DateRange): string {
  if (range.preset !== "custom") return RANGE_PRESETS.find((p) => p.value === range.preset)!.label;
  const r = resolveRange(range);
  return `${format(r.from, "d MMM yyyy")} – ${format(r.to, "d MMM yyyy")}`;
}

/** How a comparison is described: "vs previous 30 days". */
export function previousLabel(r: ResolvedRange): string {
  return `vs previous ${r.days} day${r.days === 1 ? "" : "s"}`;
}

export function defaultGrouping(r: ResolvedRange): Grouping {
  return r.days > WEEKLY_AFTER_DAYS ? "week" : "day";
}

/** The start of the bucket a day falls in; weeks start on Monday. */
export function bucketStart(day: Date, grouping: Grouping): Date {
  if (grouping === "week") return startOfWeek(day, { weekStartsOn: 1 });
  if (grouping === "month") return startOfMonth(day);
  return startOfDay(day);
}

export function bucketLabel(start: Date, grouping: Grouping): string {
  if (grouping === "month") return format(start, "MMM yyyy");
  if (grouping === "week") return `w/c ${format(start, "d MMM")}`;
  return format(start, "d MMM");
}

export const GROUPING_LABEL: Record<Grouping, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

export function eachDay(r: ResolvedRange): Date[] {
  return Array.from({ length: r.days }, (_, i) => addDays(r.from, i));
}

export function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
