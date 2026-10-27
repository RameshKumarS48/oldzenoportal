/**
 * The plan form's custom windows, edited in whole hours. Pure functions, so
 * the rules can be checked without React.
 *
 * Each row holds its From hour (0–23), the hour it runs until (1–24; 24 is
 * midnight) and its two rates as typed. A row whose until is at or before
 * its From wraps past midnight; From equal to until is the whole day.
 * Custom windows never overlap: every choice that would make one overlap or
 * swallow another is disabled. Hours no row covers take the rest-of-day rates.
 * Rows are kept in From order.
 *
 * Hours read as "HH:mm:ss" like every other pricing time: a From is
 * "16:00:00" and an Until the inclusive "15:59:59" (the day ends 23:59:59).
 */

import { MAX_RATE, MAX_WINDOWS, MIN_RATE, fmtRateWindow, hourEnd, hourStart, isValidRate, parseHHmmss } from "./windows";
import type { RateWindow } from "./types";

export interface HourRow {
  key: string;
  from: number;
  until: number;
  slab1: string;
  slab2: string;
  /** Its colour on the day bar, 0–5. Kept while rows re-sort, so a window keeps its colour. */
  color: number;
}

export interface HourChoice {
  value: number;
  label: string;
  disabledReason?: string;
}

export function sortRows(rows: HourRow[]): HourRow[] {
  return [...rows].sort((a, b) => a.from - b.from);
}

/** The hours (0–23) a row covers, From first. */
function rowHours(r: Pick<HourRow, "from" | "until">): number[] {
  const n = (r.until - r.from + 24) % 24 || 24;
  return Array.from({ length: n }, (_, k) => (r.from + k) % 24);
}

/** Row's times, "22:00:00–05:59:59". */
export function rowLabel(r: Pick<HourRow, "from" | "until">): string {
  return fmtRateWindow({ start: hourStart(r.from), end: hourEnd(r.until) });
}

/**
 * Null when row i could take these hours; otherwise "Used by window …",
 * naming the window it would run into. `edge` is the hour that moved, so
 * the window holding it is named first.
 */
function clash(rows: HourRow[], i: number, next: Pick<HourRow, "from" | "until">, edge: number): string | undefined {
  const mine = new Set(rowHours(next));
  const hits = rows.filter((r, k) => k !== i && rowHours(r).some((h) => mine.has(h)));
  if (hits.length === 0) return undefined;
  const hit = hits.find((r) => rowHours(r).includes(edge)) ?? hits[0];
  return `Used by window ${rowLabel(hit)}`;
}

/** Row i's From choices, 00:00:00 to 23:00:00. */
export function fromChoices(rows: HourRow[], i: number): HourChoice[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: hourStart(h),
    disabledReason: clash(rows, i, { from: h, until: rows[i].until }, h),
  }));
}

/** Row i's Until choices, 00:59:59 to 23:59:59, as the hour it runs until (1–24). */
export function untilChoices(rows: HourRow[], i: number): HourChoice[] {
  return Array.from({ length: 24 }, (_, k) => {
    const value = k + 1;
    return { value, label: hourEnd(value), disabledReason: clash(rows, i, { from: rows[i].from, until: value }, k) };
  });
}

export function setFrom(rows: HourRow[], i: number, from: number): HourRow[] {
  return sortRows(rows.map((r, k) => (k === i ? { ...r, from } : r)));
}

export function setUntil(rows: HourRow[], i: number, until: number): HourRow[] {
  return sortRows(rows.map((r, k) => (k === i ? { ...r, until } : r)));
}

/** The first hour from midnight that no row covers, or null. */
function firstFreeHour(rows: HourRow[]): number | null {
  const taken = new Set(rows.flatMap(rowHours));
  return Array.from({ length: 24 }, (_, h) => h).find((h) => !taken.has(h)) ?? null;
}

/** Why Add window can't add a row, or null when it can. */
export function addBlocked(rows: HourRow[]): string | null {
  if (rows.length >= MAX_WINDOWS) return `Maximum ${MAX_WINDOWS} windows`;
  if (firstFreeHour(rows) === null) return "Every hour is already in a window";
  return null;
}

/** Add a 1-hour row, `key`, at the first free hour, with empty rates and the first unused colour. */
export function addRow(rows: HourRow[], key: string): HourRow[] {
  const h = firstFreeHour(rows);
  if (addBlocked(rows) || h === null) return rows;
  const used = new Set(rows.map((r) => r.color));
  const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
  return sortRows([...rows, { key, from: h, until: h + 1, slab1: "", slab2: "", color }]);
}

export function removeRow(rows: HourRow[], key: string): HourRow[] {
  return rows.filter((r) => r.key !== key);
}

/** Null when the typed rate is fine; otherwise the inline error. */
export function rateError(text: string): string | null {
  const t = text.trim();
  if (t === "") return "Required";
  if (!/^\d+$/.test(t) || !isValidRate(Number(t))) return `Whole number, ${MIN_RATE}–${MAX_RATE}`;
  return null;
}

/** A typed rate as a number; NaN while it's empty. */
export const typedRate = (text: string) => (text.trim() === "" ? NaN : Number(text));

/** The rows as custom windows. */
export function rowsToWindows(rows: HourRow[]): RateWindow[] {
  return rows.map((r) => ({
    start: hourStart(r.from),
    end: hourEnd(r.until),
    slab1: typedRate(r.slab1),
    slab2: typedRate(r.slab2),
    isBase: false,
  }));
}

/** Custom windows as rows, coloured in time order like the plan page. */
export function windowsToRows(custom: RateWindow[], key: () => string): HourRow[] {
  return sortRows(
    custom.map((w) => ({
      key: key(),
      from: Math.floor(parseHHmmss(w.start) / 3600),
      until: (parseHHmmss(w.end) + 1) / 3600,
      slab1: String(w.slab1),
      slab2: String(w.slab2),
      color: 0,
    }))
  ).map((r, i) => ({ ...r, color: i }));
}
