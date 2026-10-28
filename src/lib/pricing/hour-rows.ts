/**
 * The plan form's rows, edited in whole hours. Pure functions, so the rules
 * can be checked without React (see scripts/check-pricing.mjs).
 *
 * There are two kinds of row:
 *   - a **slot** the user sets: From, Until and both rates, up to MAX_WINDOWS;
 *   - a **Default Rate** row ("default"), added by Fill with Default Rate:
 *     one per gap, split only at midnight, at the Default plan's Default Rate.
 *     Its hours and rates can be edited and it can be removed.
 *
 * Slots never overlap each other: every choice that would is disabled. Slots
 * win over Default Rate rows: a slot that grows into one trims or splits it.
 * A Default Rate row can't grow into any other row. Hours no row covers are
 * gaps, and a plan can't be saved with a gap.
 *
 * Each row holds its From hour (0–23) and the hour it runs until (1–24; 24 is
 * midnight). A row whose until is at or before its From wraps past midnight;
 * From equal to until is the whole day. Hours read as "HH:mm:ss" like every
 * other pricing time: a From is "16:00:00" and an Until the inclusive
 * "15:59:59" (the day ends 23:59:59).
 */

import {
  MAX_RATE, MAX_WINDOWS, MIN_RATE, fmtRateWindow, hourEnd, hourStart, inRateWindow, isValidRate, parseHHmmss, splitVersion,
  type BaseRates,
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

/** Runs of consecutive hours within the day, 00:00 to 23:59: a run never crosses midnight. */
function dayRuns(hours: number[]): Pick<HourRow, "from" | "until">[] {
  const set = new Set(hours);
  const out: Pick<HourRow, "from" | "until">[] = [];
  for (let h = 0; h < 24; h++) {
    if (!set.has(h)) continue;
    const last = out.at(-1);
    if (last && last.until === h) last.until = h + 1;
    else out.push({ from: h, until: h + 1 });
  }
  return out;
}

/** The gaps as hour ranges within the day, earliest first; one crossing midnight is two. */
export function gapStretches(rows: HourRow[]): Pick<HourRow, "from" | "until">[] {
  return dayRuns(uncoveredHours(rows));
}

/** "00:00:00–05:59:59, 10:00:00–16:59:59": the gaps, for the coverage line. */
export function gapText(rows: HourRow[]): string {
  return gapStretches(rows).map(rowLabel).join(", ");
}

// ── Slots ────────────────────────────────────────────────────────────────────

/**
 * Null when row i could take these hours; otherwise "Used by …", naming the
 * row it would run into. `edge` is the hour that moved, so the row holding it
 * is named first. A slot is blocked only by slots (it trims Default Rate
 * rows); a Default Rate row is blocked by every other row.
 */
function clash(rows: HourRow[], i: number, next: Pick<HourRow, "from" | "until">, edge: number): string | undefined {
  const mine = new Set(rowHours(next));
  const slotOnly = isSlot(rows[i]);
  const hits = rows.filter((r, k) => k !== i && (!slotOnly || isSlot(r)) && rowHours(r).some((h) => mine.has(h)));
  if (hits.length === 0) return undefined;
  const hit = hits.find((r) => rowHours(r).includes(edge)) ?? hits[0];
  return `Used by ${isSlot(hit) ? "slot " : ""}${rowLabel(hit)}`;
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

/** Row i's From choices, 00:00:00 to 23:00:00. */
export function fromChoices(rows: HourRow[], i: number): HourChoice[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: hourStart(h),
    disabledReason: clash(rows, i, movedFrom(rows[i], h), h),
  }));
}

/** Row i's Until choices, 00:59:59 to 23:59:59, as the hour it runs until (1–24). */
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

/** Why Add slot can't add a row, or null when it can. A new slot goes in the first gap, so it needs one. */
export function addBlocked(rows: HourRow[]): string | null {
  if (uncoveredHours(rows).length === 0) return "All 24 hours have a rate";
  if (rows.filter(isSlot).length >= MAX_WINDOWS) return `Maximum ${MAX_WINDOWS} slots`;
  return null;
}

/** How long Add slot makes a new slot, in hours; the user can move either end. */
export const NEW_SLOT_HOURS = 3;

/**
 * Add a slot, `newKey`, with empty rates, in the first gap. It runs
 * NEW_SLOT_HOURS from its start (07:00:00–09:59:59), or less where the gap
 * ends or the day does.
 */
export function addRow(rows: HourRow[], newKey: string, key: () => string): HourRow[] {
  const h = uncoveredHours(rows)[0];
  if (addBlocked(rows) || h === undefined) return rows;
  const taken = new Set(rows.flatMap(rowHours));
  let until = h + 1;
  while (until < Math.min(h + NEW_SLOT_HOURS, 24) && !taken.has(until)) until++;
  const slot: HourRow = { key: newKey, origin: "slot", from: h, until, slab1: "", slab2: "" };
  return settle([...rows, slot], key);
}

export function removeRow(rows: HourRow[], key: string): HourRow[] {
  return rows.filter((r) => r.key !== key);
}

// ── Fill from Default ────────────────────────────────────────────────────────

/**
 * The rates Fill gives a gap starting at `from`: the Default plan's Default
 * Rate, or, if its Default Rate hours don't share one rate, what Default
 * charges at `from`.
 */
export function defaultFillRate(defaultWindows: RateWindow[], from: number): BaseRates | null {
  const base = splitVersion({ windows: defaultWindows }).base;
  if (base) return base;
  const w = defaultWindows.find((d) => inRateWindow(from * 3600, d));
  return w ? { slab1: w.slab1, slab2: w.slab2 } : null;
}

/**
 * Fill every gap with one continuous Default Rate row, split only at
 * midnight (the day runs 00:00:00 to 23:59:59), so 18:00 to 05:59 fills as
 * 18:00–23:59 and 00:00–05:59. With `defaultWindows` null (a plan whose
 * currency isn't Default's) the rows come with empty rates to fill in.
 */
export function fillFromDefault(rows: HourRow[], defaultWindows: RateWindow[] | null, key: () => string): HourRow[] {
  const added: HourRow[] = [];
  for (const gap of gapStretches(rows)) {
    // No Default to copy (a plan in another currency): the hours, with rates left to type.
    const rate = defaultWindows ? defaultFillRate(defaultWindows, gap.from) : null;
    if (defaultWindows && !rate) continue;
    added.push({
      key: key(), origin: "default", ...gap,
      slab1: rate ? String(rate.slab1) : "", slab2: rate ? String(rate.slab2) : "",
    });
  }
  return sortRows([...rows, ...added]);
}

// ── Linked to the Default Rate ───────────────────────────────────────────────

/**
 * The hours a plan's linked Default Rate covers: every hour its own rows
 * don't, as continuous stretches (one crossing midnight stays one).
 */
export function linkedStretches(rows: HourRow[]): Pick<HourRow, "from" | "until">[] {
  return runs(uncoveredHours(rows));
}

/** The linked hours as stored: one window per stretch, holding a copy of the Default Rate. */
export function linkedWindows(rows: HourRow[], rate: BaseRates): RateWindow[] {
  return linkedStretches(rows).map((r) => ({
    start: hourStart(r.from),
    end: hourEnd(r.until),
    slab1: rate.slab1,
    slab2: rate.slab2,
    isBase: true,
    linkedToDefault: true,
  }));
}

/** Why Set own rate is refused. */
export const SLOT_LIMIT = `Maximum ${MAX_WINDOWS} time slots. Remove one first.`;

/**
 * Set own rate: the linked hours become the plan's own slots, one per
 * stretch, pre-filled with the Default Rate; or SLOT_LIMIT when that would
 * make more than MAX_WINDOWS slots.
 */
export function ownRateRows(rows: HourRow[], rate: BaseRates, key: () => string): { rows: HourRow[] } | { error: string } {
  const stretches = linkedStretches(rows);
  if (rows.filter(isSlot).length + stretches.length > MAX_WINDOWS) return { error: SLOT_LIMIT };
  const slots: HourRow[] = stretches.map((r) => ({
    key: key(), origin: "slot", ...r, slab1: String(rate.slab1), slab2: String(rate.slab2),
  }));
  return { rows: sortRows([...rows, ...slots]) };
}

// ── Rates ────────────────────────────────────────────────────────────────────

/** Typing or pasting "KES 90" or " 9 0 " keeps just the digits' text: "90". */
export function cleanRate(text: string): string {
  return text.replace(/^\s*kes\s*/i, "").replace(/\s+/g, "");
}

/** Null when the typed rate is fine; otherwise the inline error. `max` is the plan currency's top rate. */
export function rateError(text: string, max = MAX_RATE): string | null {
  const t = text.trim();
  if (t === "") return "Required";
  if (!/^\d+$/.test(t) || !isValidRate(Number(t), max)) return `Whole number, ${MIN_RATE}–${max.toLocaleString()}`;
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
 * so old data without `isBase` works too) as rest-of-day rows, and the rest
 * as slots.
 */
export function windowsToRows(windows: RateWindow[], key: () => string): HourRow[] {
  const base = new Set(splitVersion({ windows }).baseWindows.map((w) => w.start));
  return sortRows(
    windows.map((w) => ({
      key: key(),
      origin: (base.has(w.start) ? "default" : "slot") as RowOrigin,
      from: Math.floor(parseHHmmss(w.start) / 3600),
      until: (parseHHmmss(w.end) + 1) / 3600,
      slab1: String(w.slab1),
      slab2: String(w.slab2),
    }))
  );
}
