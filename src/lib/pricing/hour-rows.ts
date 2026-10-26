/**
 * The plan form's time windows, edited in whole hours. Pure functions, so the
 * rules can be checked without React.
 *
 * Each row holds only its start hour (0–23) and its two rates as typed. A
 * row runs until the next row starts and the last wraps round to the first,
 * so the rows always cover the day once: gaps and overlaps can't happen.
 * Rows are kept in start order, so a window that crosses midnight is last.
 *
 * Hours read as "HH:mm:ss" like every other pricing time: a From is
 * "16:00:00" and an Until the inclusive "15:59:59" (the day ends 23:59:59).
 */

import {
  MAX_RATE,
  MAX_WINDOWS,
  MIN_RATE,
  hourEnd,
  hourStart,
  isValidRate,
  parseHHmmss,
  sortWindows,
} from "./windows";
import type { RateWindow } from "./types";

export interface HourRow {
  key: string;
  start: number;
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

const ZERO_HOURS = "A window needs at least 1 hour";

export function sortRows(rows: HourRow[]): HourRow[] {
  return [...rows].sort((a, b) => a.start - b.start);
}

/** The hour row i runs until (0–23; 0 is midnight). One row runs all day. */
export function rowEnd(rows: HourRow[], i: number): number {
  return rows[(i + 1) % rows.length].start;
}

/** Hours in row i, 1–24. */
export function rowHours(rows: HourRow[], i: number): number {
  return (rowEnd(rows, i) - rows[i].start + 24) % 24 || 24;
}

/** Row i's times, "22:00:00 → 05:59:59". */
export function rowLabel(rows: HourRow[], i: number): string {
  return `${hourStart(rows[i].start)} → ${hourEnd(rowEnd(rows, i) || 24)}`;
}

/** Is h strictly inside the circular span from a to b? a === b spans the whole day. */
function strictlyBetween(h: number, a: number, b: number): boolean {
  const d = (h - a + 24) % 24;
  const span = (b - a + 24) % 24 || 24;
  return d > 0 && d < span;
}

/** The row whose hours include the hour starting at h. */
function rowAt(rows: HourRow[], h: number): number {
  return rows.findIndex((_, i) => (h - rows[i].start + 24) % 24 < rowHours(rows, i));
}

const usedBy = (rows: HourRow[], h: number) => `Used by window ${rowLabel(rows, rowAt(rows, h))}`;

/**
 * Row i's Until choices, 00:59:59 to 23:59:59. Moving it moves the next row's
 * start, so it must stay strictly between row i's start and the next row's end.
 */
export function untilChoices(rows: HourRow[], i: number): HourChoice[] {
  const n = rows.length;
  const start = rows[i].start;
  const nextEnd = rows[(i + 2) % n].start;
  return Array.from({ length: 24 }, (_, k) => {
    const value = k + 1;
    const h = value % 24;
    const ok = n > 1 && strictlyBetween(h, start, nextEnd);
    const disabledReason = ok ? undefined : h === start || h === nextEnd ? ZERO_HOURS : usedBy(rows, (h + 23) % 24);
    return { value, label: hourEnd(value), disabledReason };
  });
}

/** Row i's Until as a choice value, 1–24. */
export function untilValue(rows: HourRow[], i: number): number {
  return rowEnd(rows, i) || 24;
}

/**
 * Row i's From choices, 00:00:00 to 23:00:00. Moving it moves the previous
 * row's end, so it must stay strictly between the previous row's start and
 * row i's end.
 */
export function fromChoices(rows: HourRow[], i: number): HourChoice[] {
  const n = rows.length;
  const prevStart = rows[(i - 1 + n) % n].start;
  const end = rowEnd(rows, i);
  return Array.from({ length: 24 }, (_, h) => {
    const ok = n > 1 && strictlyBetween(h, prevStart, end);
    const disabledReason = ok ? undefined : h === prevStart || h === end ? ZERO_HOURS : usedBy(rows, h);
    return { value: h, label: hourStart(h), disabledReason };
  });
}

/** The neighbour an edit moved: which field, and the note shown under its row. */
export interface MovedField {
  key: string;
  field: "from" | "until";
  note: string;
}

export interface RowsChange {
  rows: HourRow[];
  moved: MovedField;
}

/**
 * Set row i's Until; the next row starts there. It follows "the window above"
 * unless the edited row is the last and the moved one the first.
 */
export function setUntil(rows: HourRow[], i: number, value: number): RowsChange {
  const h = value % 24;
  const editedKey = rows[i].key;
  const movedKey = rows[(i + 1) % rows.length].key;
  const next = sortRows(rows.map((r) => (r.key === movedKey ? { ...r, start: h } : r)));
  const above = next.findIndex((r) => r.key === editedKey) === next.findIndex((r) => r.key === movedKey) - 1;
  return {
    rows: next,
    moved: { key: movedKey, field: "from", note: `Moved to ${hourStart(h)} to follow ${above ? "the window above" : "the last window"}` },
  };
}

/**
 * Set row i's From; the previous row now ends there. It follows "the window
 * below" unless the edited row is the first and the moved one the last.
 */
export function setFrom(rows: HourRow[], i: number, h: number): RowsChange {
  const editedKey = rows[i].key;
  const movedKey = rows[(i - 1 + rows.length) % rows.length].key;
  const next = sortRows(rows.map((r) => (r.key === editedKey ? { ...r, start: h } : r)));
  const below = next.findIndex((r) => r.key === editedKey) === next.findIndex((r) => r.key === movedKey) + 1;
  return {
    rows: next,
    moved: { key: movedKey, field: "until", note: `Moved to ${hourEnd(h || 24)} to follow ${below ? "the window below" : "the first window"}` },
  };
}

/** Why Add window can't split, or null when it can. */
export function splitBlocked(rows: HourRow[]): string | null {
  if (rows.length >= MAX_WINDOWS) return `Maximum ${MAX_WINDOWS} windows`;
  if (rows.every((_, i) => rowHours(rows, i) < 2)) return "No window is long enough to split";
  return null;
}

/**
 * Split the longest window (the earlier one on a tie) at its midpoint, rounded
 * to the hour. The first half keeps its rates; the second is a new row, `key`,
 * with empty rates.
 */
export function splitLongest(rows: HourRow[], key: string): HourRow[] {
  if (splitBlocked(rows)) return rows;
  const i = rows.reduce((best, _, k) => (rowHours(rows, k) > rowHours(rows, best) ? k : best), 0);
  const start = (rows[i].start + Math.round(rowHours(rows, i) / 2)) % 24;
  const used = new Set(rows.map((r) => r.color));
  const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
  return sortRows([...rows, { key, start, slab1: "", slab2: "", color }]);
}

/** Remove a row; the previous window (the last one, for the first row) takes its hours. */
export function removeRow(rows: HourRow[], key: string): HourRow[] {
  return rows.length > 1 ? rows.filter((r) => r.key !== key) : rows;
}

/** Null when the typed rate is fine; otherwise the inline error. */
export function rateError(text: string): string | null {
  const t = text.trim();
  if (t === "") return "Required";
  if (!/^\d+$/.test(t) || !isValidRate(Number(t))) return `Whole number, ${MIN_RATE}–${MAX_RATE}`;
  return null;
}

export function rowsToWindows(rows: HourRow[]): RateWindow[] {
  return rows.map((r, i) => ({
    start: hourStart(r.start),
    end: hourEnd(rowEnd(rows, i) || 24),
    slab1: r.slab1.trim() === "" ? NaN : Number(r.slab1),
    slab2: r.slab2.trim() === "" ? NaN : Number(r.slab2),
  }));
}

export function windowsToRows(windows: RateWindow[], key: () => string): HourRow[] {
  return sortWindows(windows).map((w, i) => ({
    color: i % MAX_WINDOWS,
    key: key(),
    start: Math.floor(parseHHmmss(w.start) / 3600),
    slab1: String(w.slab1),
    slab2: String(w.slab2),
  }));
}
