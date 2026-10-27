/**
 * The plan form's rows, edited in whole hours. Pure functions, so the rules
 * can be checked without React (see scripts/check-pricing.mjs).
 *
 * There are two kinds of row:
 *   - a **slot** the user sets: From, Until and both rates, up to MAX_WINDOWS;
 *   - a **rest-of-day** row ("default"), added by Fill remaining hours with
 *     Default for an hour range no slot covers, with Default's rates at those
 *     hours. Its hours are fixed; its rates can be edited and it can be removed.
 *
 * Slots never overlap each other: every choice that would is disabled. Slots
 * win over rest-of-day rows: a slot that grows into one trims or splits it.
 * Hours no row covers are gaps, and a plan can't be saved with a gap.
 *
 * Each row holds its From hour (0–23) and the hour it runs until (1–24; 24 is
 * midnight). A row whose until is at or before its From wraps past midnight;
 * From equal to until is the whole day. Hours read as "HH:mm:ss" like every
 * other pricing time: a From is "16:00:00" and an Until the inclusive
 * "15:59:59" (the day ends 23:59:59).
 */

import {
  MAX_RATE, MAX_WINDOWS, MIN_RATE, fmtRateWindow, hourEnd, hourStart, inRateWindow, isValidRate, parseHHmmss, splitVersion,
} from "./windows";
import type { RateWindow } from "./types";

export type RowOrigin = "slot" | "default";

export interface HourRow {
  key: string;
  origin: RowOrigin;
  from: number;
  until: number;
  slab1: string;
  slab2: string;
  /** A slot's colour on the day bar, 0–5. Kept while rows re-sort, so a slot keeps its colour. */
  color: number;
}

export interface HourChoice {
  value: number;
  label: string;
  disabledReason?: string;
}

export const isSlot = (r: HourRow) => r.origin === "slot";

export function sortRows(rows: HourRow[]): HourRow[] {
  return [...rows].sort((a, b) => a.from - b.from);
}

/** The hours (0–23) a row covers, From first. */
export function rowHours(r: Pick<HourRow, "from" | "until">): number[] {
  const n = (r.until - r.from + 24) % 24 || 24;
  return Array.from({ length: n }, (_, k) => (r.from + k) % 24);
}

/** Row's times, "22:00:00–05:59:59". */
export function rowLabel(r: Pick<HourRow, "from" | "until">): string {
  return fmtRateWindow({ start: hourStart(r.from), end: hourEnd(r.until) });
}

// ── Gaps ─────────────────────────────────────────────────────────────────────

/** Hours (0–23) no row covers. */
export function uncoveredHours(rows: HourRow[]): number[] {
  const taken = new Set(rows.flatMap(rowHours));
  return Array.from({ length: 24 }, (_, h) => h).filter((h) => !taken.has(h));
}

/**
 * Runs of consecutive hours, earliest first, as { from, until }. A run that
 * crosses midnight stays one run (22 → 2), unless it is the whole day.
 */
function runs(hours: number[]): Pick<HourRow, "from" | "until">[] {
  const set = new Set(hours);
  if (set.size === 0) return [];
  if (set.size === 24) return [{ from: 0, until: 24 }];
  // Start just after an hour that isn't in the set, so no run is cut at midnight.
  const anchor = Array.from({ length: 24 }, (_, h) => h).find((h) => !set.has(h))!;
  const out: Pick<HourRow, "from" | "until">[] = [];
  let from: number | null = null;
  for (let k = 1; k <= 24; k++) {
    const h = (anchor + k) % 24;
    if (set.has(h) && from === null) from = h;
    if (!set.has(h) && from !== null) {
      out.push({ from, until: h || 24 });
      from = null;
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

/** The gaps as hour ranges, earliest first. */
export function gapStretches(rows: HourRow[]): Pick<HourRow, "from" | "until">[] {
  return runs(uncoveredHours(rows));
}

/** "00:00:00–05:59:59, 10:00:00–16:59:59": the gaps, for the coverage line. */
export function gapText(rows: HourRow[]): string {
  return gapStretches(rows).map(rowLabel).join(", ");
}

// ── Slots ────────────────────────────────────────────────────────────────────

/**
 * Null when slot i could take these hours; otherwise "Used by slot …", naming
 * the slot it would run into. `edge` is the hour that moved, so the slot
 * holding it is named first. Rest-of-day rows never block a slot.
 */
function clash(rows: HourRow[], i: number, next: Pick<HourRow, "from" | "until">, edge: number): string | undefined {
  const mine = new Set(rowHours(next));
  const hits = rows.filter((r, k) => k !== i && isSlot(r) && rowHours(r).some((h) => mine.has(h)));
  if (hits.length === 0) return undefined;
  const hit = hits.find((r) => rowHours(r).includes(edge)) ?? hits[0];
  return `Used by slot ${rowLabel(hit)}`;
}

/**
 * A slot's hours after its From moves to `from`. A slot that doesn't wrap
 * past midnight keeps its length when From moves to or past its Until, so it
 * never turns into a long wrapping slot by accident; wrapping is chosen by
 * picking an Until before From.
 */
export function movedFrom(r: Pick<HourRow, "from" | "until">, from: number): Pick<HourRow, "from" | "until"> {
  const wraps = r.until <= r.from && r.until !== r.from;
  const whole = r.until === r.from || (r.from === 0 && r.until === 24);
  if (wraps || whole || from < r.until) return { from, until: r.until };
  const length = r.until - r.from;
  return { from, until: Math.min(from + length, 24) };
}

/** Slot i's From choices, 00:00:00 to 23:00:00. */
export function fromChoices(rows: HourRow[], i: number): HourChoice[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: hourStart(h),
    disabledReason: clash(rows, i, movedFrom(rows[i], h), h),
  }));
}

/** Slot i's Until choices, 00:59:59 to 23:59:59, as the hour it runs until (1–24). */
export function untilChoices(rows: HourRow[], i: number): HourChoice[] {
  return Array.from({ length: 24 }, (_, k) => {
    const value = k + 1;
    return { value, label: hourEnd(value), disabledReason: clash(rows, i, { from: rows[i].from, until: value }, k) };
  });
}

/**
 * Rest-of-day rows give up any hour a slot now covers: trimmed, split in two,
 * or dropped when nothing is left. `key` names the extra half of a split.
 */
export function settle(rows: HourRow[], key: () => string): HourRow[] {
  const slotHours = new Set(rows.filter(isSlot).flatMap(rowHours));
  const out: HourRow[] = [];
  for (const r of rows) {
    if (isSlot(r)) {
      out.push(r);
      continue;
    }
    const left = rowHours(r).filter((h) => !slotHours.has(h));
    if (left.length === rowHours(r).length) {
      out.push(r);
      continue;
    }
    runs(left).forEach((run, n) => out.push({ ...r, ...run, key: n === 0 ? r.key : key() }));
  }
  return sortRows(out);
}

export function setFrom(rows: HourRow[], i: number, from: number, key: () => string): HourRow[] {
  return settle(rows.map((r, k) => (k === i ? { ...r, ...movedFrom(r, from) } : r)), key);
}

export function setUntil(rows: HourRow[], i: number, until: number, key: () => string): HourRow[] {
  return settle(rows.map((r, k) => (k === i ? { ...r, until } : r)), key);
}

/** Where Add slot puts a new 1-hour slot: the first gap, else the first hour no slot holds. */
function nextSlotHour(rows: HourRow[]): number | null {
  const gap = uncoveredHours(rows)[0];
  if (gap !== undefined) return gap;
  const slotHours = new Set(rows.filter(isSlot).flatMap(rowHours));
  return Array.from({ length: 24 }, (_, h) => h).find((h) => !slotHours.has(h)) ?? null;
}

/** Why Add slot can't add a row, or null when it can. */
export function addBlocked(rows: HourRow[]): string | null {
  if (rows.filter(isSlot).length >= MAX_WINDOWS) return `Maximum ${MAX_WINDOWS} slots`;
  if (nextSlotHour(rows) === null) return "Every hour is already in a slot";
  return null;
}

function nextColor(rows: HourRow[]): number {
  const used = new Set(rows.filter(isSlot).map((r) => r.color));
  return [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
}

/** How long Add slot makes a new slot, in hours; the user can move either end. */
export const NEW_SLOT_HOURS = 3;

/**
 * Add a slot, `newKey`, with empty rates and the first unused colour. It runs
 * NEW_SLOT_HOURS from its start (07:00:00–09:59:59), or less where it would
 * run into another slot or past midnight.
 */
export function addRow(rows: HourRow[], newKey: string, key: () => string): HourRow[] {
  const h = nextSlotHour(rows);
  if (addBlocked(rows) || h === null) return rows;
  const slotHours = new Set(rows.filter(isSlot).flatMap(rowHours));
  let until = h + 1;
  while (until < Math.min(h + NEW_SLOT_HOURS, 24) && !slotHours.has(until)) until++;
  const slot: HourRow = { key: newKey, origin: "slot", from: h, until, slab1: "", slab2: "", color: nextColor(rows) };
  return settle([...rows, slot], key);
}

export function removeRow(rows: HourRow[], key: string): HourRow[] {
  return rows.filter((r) => r.key !== key);
}

// ── Fill from Default ────────────────────────────────────────────────────────

/**
 * Fill every gap with what Default charges at those hours: one rest-of-day
 * row per stretch of a gap that falls in a single Default window, so a gap
 * crossing Default's 22:00 edge becomes two rows. Hours Default doesn't cover
 * (it always should) stay gaps.
 */
export function fillFromDefault(rows: HourRow[], defaultWindows: RateWindow[], key: () => string): HourRow[] {
  const added: HourRow[] = [];
  for (const gap of gapStretches(rows)) {
    // Consecutive hours of the gap, grouped by the Default window that prices them.
    const pieces: { from: number; hours: number; w: RateWindow }[] = [];
    for (const h of rowHours(gap)) {
      const w = defaultWindows.find((d) => inRateWindow(h * 3600, d));
      const last = pieces.at(-1);
      if (w && last && last.w === w && (last.from + last.hours) % 24 === h) last.hours++;
      else if (w) pieces.push({ from: h, hours: 1, w });
    }
    for (const p of pieces) {
      added.push({
        key: key(), origin: "default", from: p.from, until: (p.from + p.hours) % 24 || 24,
        slab1: String(p.w.slab1), slab2: String(p.w.slab2), color: 0,
      });
    }
  }
  return sortRows([...rows, ...added]);
}

// ── Rates ────────────────────────────────────────────────────────────────────

/** Typing or pasting "KES 90" or " 9 0 " keeps just the digits' text: "90". */
export function cleanRate(text: string): string {
  return text.replace(/^\s*kes\s*/i, "").replace(/\s+/g, "");
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

// ── To and from saved windows ────────────────────────────────────────────────

/** The rows as stored windows: slots, and rest-of-day rows marked `isBase`. */
export function rowsToWindows(rows: HourRow[]): RateWindow[] {
  return sortRows(rows).map((r) => ({
    start: hourStart(r.from),
    end: hourEnd(r.until),
    slab1: typedRate(r.slab1),
    slab2: typedRate(r.slab2),
    isBase: r.origin === "default",
  }));
}

/**
 * Saved windows as rows: rest-of-day windows (as `splitVersion` reads them,
 * so old data without `isBase` works too) as rest-of-day rows, and slots
 * coloured in time order.
 */
export function windowsToRows(windows: RateWindow[], key: () => string): HourRow[] {
  const base = new Set(splitVersion({ windows }).baseWindows.map((w) => w.start));
  let color = 0;
  return sortRows(
    windows.map((w) => ({
      key: key(),
      origin: (base.has(w.start) ? "default" : "slot") as RowOrigin,
      from: Math.floor(parseHHmmss(w.start) / 3600),
      until: (parseHHmmss(w.end) + 1) / 3600,
      slab1: String(w.slab1),
      slab2: String(w.slab2),
      color: 0,
    }))
  ).map((r) => (isSlot(r) ? { ...r, color: color++ } : r));
}
