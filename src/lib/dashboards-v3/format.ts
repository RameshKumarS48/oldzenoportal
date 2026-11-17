import { formatDistanceToNowStrict, setHours, startOfHour, subDays } from "date-fns";
import type { Metric, Unit } from "./catalogue";

/** A unit as it reads after a number, or on its own beside a widget title. */
export const UNIT_LABEL: Record<Unit, string> = { points: "points", kWh: "kWh", count: "count", "%": "%" };

/** A figure in full: "412,180", "97.2", "2.8". Percentages and averages keep one decimal. */
export function fmtNumber(n: number, metric: Metric): string {
  if (!Number.isFinite(n)) return "–";
  const decimals = metric.unit === "%" || (metric.aggregation === "average" && Math.abs(n) < 100) ? 1 : 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Up to this, figures are written in full with separators; above it they're abbreviated. */
const FULL_UP_TO = 99_999;

/**
 * The one rule for figures in every widget, axis and table: in full with
 * thousand separators up to 99,999 ("4,414"), abbreviated above ("200.8K",
 * "1.2M"). Percentages and small averages keep one decimal.
 */
export function fmtCompact(n: number, metric: Metric): string {
  if (!Number.isFinite(n)) return "–";
  if (metric.unit === "%" || Math.abs(n) <= FULL_UP_TO) return fmtNumber(n, metric);
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

/** What follows a figure in words: "swaps", "points", "kWh"; "%" sits on the number itself. */
export function unitWords(metric: Metric): string {
  if (metric.unit === "%") return "";
  if (metric.unit === "count") return metric.noun ?? "";
  return UNIT_LABEL[metric.unit];
}

/** A figure with its unit: "200.8K swaps", "97.2%", "412.2K points". */
export function fmtValue(n: number, metric: Metric, compact = true): string {
  const num = compact ? fmtCompact(n, metric) : fmtNumber(n, metric);
  if (metric.unit === "%") return `${num}%`;
  const words = unitWords(metric);
  return words ? `${num} ${words}` : num;
}

/** Whether a widget's header needs a unit tag: only where the unit adds meaning (%, kWh, points), not for counts. */
export function showsUnitTag(metric: Metric): boolean {
  return metric.unit !== "count";
}

export interface Change {
  direction: "up" | "down" | "flat";
  /** "+12.4%", or "+0.4 pts" for a percentage. */
  text: string;
  /** Whether this change is good news, by the metric's higherIsBetter; null when flat or unknown. */
  good: boolean | null;
}

/** The change from the previous period: percentages in points, everything else as a percentage change. */
export function change(current: number, previous: number, metric: Metric): Change | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const pts = metric.unit === "%";
  if (!pts && previous === 0) return null;
  const delta = pts ? current - previous : ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return { direction: "flat", text: pts ? "0.0 pts" : "0.0%", good: null };
  const direction = rounded > 0 ? "up" : "down";
  const sign = rounded > 0 ? "+" : "−";
  const text = `${sign}${Math.abs(rounded).toFixed(1)}${pts ? " pts" : "%"}`;
  return { direction, text, good: direction === "up" ? metric.higherIsBetter : !metric.higherIsBetter };
}

/** The mock data refreshes daily at 06:00: today's refresh once it's past, otherwise yesterday's. */
export function dataAsOf(now: Date = new Date()): Date {
  const today = setHours(startOfHour(now), 6);
  return now >= today ? today : subDays(today, 1);
}

export function fmtLastViewed(iso: string | null, now: number): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (now - t < 60_000) return "Just now";
  return `${formatDistanceToNowStrict(t)} ago`;
}
