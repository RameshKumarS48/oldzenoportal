/**
 * Time windows: how every swap-station-pricing screen reads a plan's rates.
 *
 * A version's windows cover the whole day exactly once. Times are stored as
 * "HH:mm:ss" EAT with both ends inclusive, so one window ends the second
 * before the next begins (06:00:00–16:59:59, then 17:00:00–21:59:59) and no
 * second is in two windows. A window whose end is before its start wraps past
 * midnight (22:00:00–05:59:59). One window can cover the whole day:
 * 00:00:00–23:59:59.
 *
 * A plan is up to MAX_WINDOWS time slots the user set, plus the rest of the
 * day: `isBase` windows covering every other hour, usually copied from the
 * Default plan hour by hour, so they can carry different rates (Default's
 * night rate overnight, its day rate by day). Together they cover the day.
 *
 * Screens show the same "HH:mm:ss" times, inclusive ends and all:
 * "06:00:00–16:59:59", "22:00:00–05:59:59", "00:00:00–23:59:59".
 *
 * Each window has two rates in KES per kWh: slab 1 for a rider's first
 * 3 kWh each day, slab 2 for everything after.
 */

import type { PlanVersion, RateWindow } from "./types";

export const DAY_SECONDS = 86_400;
/** Time slots per plan; the rest-of-day hours don't count. */
export const MAX_WINDOWS = 5;
/** Rates are whole KES per kWh in this range. */
export const MIN_RATE = 1;
export const MAX_RATE = 500;

/** The hours a plan doesn't set itself, priced like the Default plan. */
export const BASE_LABEL = "Default Rate";

/** Is the rate a whole number from MIN_RATE to MAX_RATE? */
export function isValidRate(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_RATE && n <= MAX_RATE;
}

/** Hour h (0–24) as a window start, "06:00:00"; 24 is midnight, "00:00:00". */
export function hourStart(h: number): string {
  return fmtHHmmss(h * 3600);
}

/** The inclusive end of a window that runs until hour h (1–24), "05:59:59"; 24 gives "23:59:59". */
export function hourEnd(h: number): string {
  return fmtHHmmss(h * 3600 - 1);
}

const EAT_OFFSET_S = 3 * 3600;
const HHMMSS = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export function isHHmmss(t: string): boolean {
  return HHMMSS.test(t);
}

/** "17:00:00" as seconds past midnight. */
export function parseHHmmss(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Seconds past midnight as "HH:mm:ss", wrapping at 24 h. */
export function fmtHHmmss(seconds: number): string {
  const t = ((seconds % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** Seconds past midnight in EAT, whatever the viewer's zone. */
export function eatSecondOfDay(iso: string): number {
  const d = new Date(iso);
  return (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() + EAT_OFFSET_S) % DAY_SECONDS;
}

/** How many seconds the window covers, both ends included. */
export function windowSeconds(w: Pick<RateWindow, "start" | "end">): number {
  return ((parseHHmmss(w.end) - parseHHmmss(w.start) + DAY_SECONDS) % DAY_SECONDS) + 1;
}

export function inRateWindow(second: number, w: Pick<RateWindow, "start" | "end">): boolean {
  const s = parseHHmmss(w.start);
  const e = parseHHmmss(w.end);
  return s <= e ? second >= s && second <= e : second >= s || second <= e;
}

/** The window in force at `iso`, or null if none covers it (only for invalid windows). */
export function windowAt(windows: RateWindow[], iso: string): RateWindow | null {
  const second = eatSecondOfDay(iso);
  return windows.find((w) => inRateWindow(second, w)) ?? null;
}

/** Earliest start first. */
export function sortWindows<W extends Pick<RateWindow, "start">>(windows: W[]): W[] {
  return [...windows].sort((a, b) => parseHHmmss(a.start) - parseHHmmss(b.start));
}

/** The second a window hands over to the next, 1–86400. */
export function windowBoundary(w: RateWindow): number {
  return parseHHmmss(w.end) + 1;
}

/** "16:00" from seconds past midnight: the day bars show hours and minutes only. */
export function fmtHHmm(seconds: number): string {
  return fmtHHmmss(seconds).slice(0, 5);
}

/** "07:00–15:59": a window's times on a day bar. */
export function fmtRateWindowHHmm(w: Pick<RateWindow, "start" | "end">): string {
  return `${w.start.slice(0, 5)}–${w.end.slice(0, 5)}`;
}

/** One stretch of the day and what it costs on each of two plans. */
export interface RateCompareRow {
  start: string;
  end: string;
  before: BaseRates | null;
  after: BaseRates | null;
}

/**
 * Two plans' rates side by side, for moving stations between them: the day
 * cut at every window start on either side, each stretch with the rates it
 * has before and after, and neighbours with the same pair merged. Earliest
 * first; a stretch may wrap past midnight.
 */
export function compareWindows(before: RateWindow[], after: RateWindow[]): RateCompareRow[] {
  const at = (ws: RateWindow[], second: number): BaseRates | null => {
    const w = ws.find((x) => inRateWindow(second, x));
    return w ? { slab1: w.slab1, slab2: w.slab2 } : null;
  };
  const cuts = [...new Set([...before, ...after].map((w) => parseHHmmss(w.start)))].sort((a, b) => a - b);
  if (cuts.length === 0) return [];
  const pieces = cuts.map((s, i) => ({ s, e: i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + DAY_SECONDS }));
  const out: { s: number; e: number; before: BaseRates | null; after: BaseRates | null }[] = [];
  for (const p of pieces) {
    const row = { ...p, before: at(before, p.s), after: at(after, p.s) };
    const last = out.at(-1);
    if (last && last.e === row.s && sameRates(last.before ?? undefined, row.before ?? undefined) && sameRates(last.after ?? undefined, row.after ?? undefined)) {
      last.e = row.e;
    } else out.push(row);
  }
  return out.map((r) => ({ start: fmtHHmmss(r.s), end: fmtHHmmss(r.e - 1), before: r.before, after: r.after }));
}

/** "07:00:00–15:59:59": the start and the inclusive end. */
export function fmtRateWindow(w: Pick<RateWindow, "start" | "end">): string {
  return `${w.start}–${w.end}`;
}

/** "100 / 80": slab 1 / slab 2. */
export function fmtSlabs(w: Pick<RateWindow, "slab1" | "slab2">): string {
  return `${w.slab1} / ${w.slab2}`;
}

/** "100/80", for the change log. */
const slabsShort = (r: BaseRates) => `${r.slab1}/${r.slab2}`;

/** "2 slots + Default Rate", or "Default Rate only". */
export function fmtCustomCount(n: number): string {
  return n === 0 ? `${BASE_LABEL} only` : `${n} slot${n === 1 ? "" : "s"} + ${BASE_LABEL}`;
}

// ── Rest of the day and custom windows ───────────────────────────────────────

export interface BaseRates {
  slab1: number;
  slab2: number;
}

const sameRates = (a?: BaseRates, b?: BaseRates) => a?.slab1 === b?.slab1 && a?.slab2 === b?.slab2;

export interface SplitVersion {
  /**
   * The rest-of-day rates when every rest-of-day window shares them; null when
   * they differ (copied from Default hour by hour) or no hour is left.
   */
  base: BaseRates | null;
  /** The hours on the rest-of-day rates, earliest first. */
  baseWindows: RateWindow[];
  /** Earliest first. */
  custom: RateWindow[];
}

/**
 * A version as a rest-of-day rate and its custom windows. Windows marked
 * `isBase` are the rest of the day. Data saved before `isBase` existed has
 * none marked: the rates covering the most hours become the base (the
 * earliest on a tie), and every other window is custom.
 */
export function splitVersion(v: Pick<PlanVersion, "windows" | "baseSlab1" | "baseSlab2">): SplitVersion {
  const sorted = sortWindows(v.windows);
  const marked = sorted.some((w) => w.isBase !== undefined);
  let isBase = (w: RateWindow) => !!w.isBase;
  if (!marked) {
    const hours = new Map<string, number>();
    for (const w of sorted) hours.set(slabsShort(w), (hours.get(slabsShort(w)) ?? 0) + windowSeconds(w));
    let top: string | null = null;
    for (const w of sorted) if (top === null || hours.get(slabsShort(w))! > hours.get(top)!) top = slabsShort(w);
    isBase = (w) => slabsShort(w) === top;
  }
  const baseWindows = sorted.filter(isBase);
  const custom = sorted.filter((w) => !isBase(w));
  const first = baseWindows[0];
  const shared = first && baseWindows.every((w) => sameRates(w, first));
  const base = shared
    ? { slab1: first.slab1, slab2: first.slab2 }
    : !first && v.baseSlab1 !== undefined && v.baseSlab2 !== undefined
      ? { slab1: v.baseSlab1, slab2: v.baseSlab2 }
      : null;
  return { base, baseWindows, custom };
}

/** The hours (0–23) a whole-hour window covers. */
function hoursIn(w: Pick<RateWindow, "start" | "end">): number[] {
  const from = Math.floor(parseHHmmss(w.start) / 3600);
  return Array.from({ length: Math.round(windowSeconds(w) / 3600) }, (_, k) => (from + k) % 24);
}

/**
 * The stretches no custom window covers, earliest first: what the rest of
 * the day prices. Whole hours; one stretch may wrap past midnight.
 */
export function freeStretches(custom: Pick<RateWindow, "start" | "end">[]): { start: string; end: string }[] {
  const taken = new Set(custom.flatMap(hoursIn));
  if (taken.size === 0) return [{ start: hourStart(0), end: hourEnd(24) }];
  if (taken.size === 24) return [];
  // Walk the day from a taken hour, so a free stretch is never cut at midnight.
  const anchor = [...taken][0];
  const out: { start: string; end: string }[] = [];
  let from: number | null = null;
  for (let k = 1; k <= 24; k++) {
    const h = (anchor + k) % 24;
    if (!taken.has(h) && from === null) from = h;
    if (taken.has(h) && from !== null) {
      out.push({ start: hourStart(from), end: hourEnd(h || 24) });
      from = null;
    }
  }
  return sortWindows(out);
}

/** The muted line under Rest of the day: which hours it covers. */
export function coversText(custom: Pick<RateWindow, "start" | "end">[]): string {
  const free = freeStretches(custom);
  if (custom.length === 0) return "Covers all 24 hours";
  if (free.length === 0) return "Covers no hours: every hour is in a custom window.";
  return `Covers ${free.map(fmtRateWindow).join(", ")}`;
}

/** The full day as stored: the custom windows, plus every free stretch at the rest-of-day rates. */
export function fillBase(custom: RateWindow[], base: BaseRates): RateWindow[] {
  return sortWindows([
    ...custom.map((w) => ({ ...w, isBase: false })),
    ...freeStretches(custom).map((s) => ({ ...s, ...base, isBase: true })),
  ]);
}

// ── Comparing and describing versions ────────────────────────────────────────

type VersionRates = Pick<PlanVersion, "windows" | "baseSlab1" | "baseSlab2">;

/** One line of a before → after comparison. A row only on one side was added or removed. */
export interface RateRow {
  /** The window's times, "10:00:00–16:59:59". */
  label: string;
  /** A rest-of-day stretch rather than a slot the user set. */
  base: boolean;
  before?: BaseRates;
  after?: BaseRates;
}

/** A row's times, as the change log names it. */
export const rowName = (r: RateRow) => r.label;


/**
 * Every window on either side, earliest first, matched by its times. Rest-of-
 * day stretches are rows of their own, since they can carry different rates.
 */
export function rateRows(before: VersionRates | undefined, after: VersionRates): RateRow[] {
  const was = before ? splitVersion(before) : null;
  const now = splitVersion(after);
  const rates = (w: RateWindow): BaseRates => ({ slab1: w.slab1, slab2: w.slab2 });
  const tag = (ws: RateWindow[], base: boolean) => ws.map((w) => ({ w, base }));
  const prev = was ? [...tag(was.baseWindows, true), ...tag(was.custom, false)] : [];
  const next = [...tag(now.baseWindows, true), ...tag(now.custom, false)];
  const byTime = new Map<string, RateRow>();
  for (const { w, base } of [...prev, ...next].sort((a, b) => parseHHmmss(a.w.start) - parseHHmmss(b.w.start))) {
    const label = fmtRateWindow(w);
    const row = byTime.get(label) ?? { label, base };
    // A stretch kept as rest of the day reads as one; the "after" side wins.
    row.base = base;
    byTime.set(label, row);
  }
  for (const { w } of prev) byTime.get(fmtRateWindow(w))!.before = rates(w);
  for (const { w } of next) byTime.get(fmtRateWindow(w))!.after = rates(w);
  return [...byTime.values()];
}

export const rowChanged = (r: RateRow) => !sameRates(r.before, r.after);

/** "06:00:00–09:59:59 110/90 · 10:00:00–16:59:59 90/70", for the change log. */
export function versionSummary(v: VersionRates): string {
  return sortWindows(v.windows)
    .map((w) => `${fmtRateWindow(w)} ${slabsShort(w)}`)
    .join(" · ");
}

/**
 * What changed, for the change log: "Rest of the day 90/70 → 95/75",
 * "Added 17:00:00–19:59:59 at 110/90", "Removed 22:00:00–05:59:59". Empty when nothing did.
 */
export function changeParts(before: VersionRates, after: VersionRates): string[] {
  return rateRows(before, after)
    .filter(rowChanged)
    .map((r) =>
      !r.before ? `Added ${rowName(r)} at ${slabsShort(r.after!)}`
      : !r.after ? `Removed ${rowName(r)}`
      : `${rowName(r)} ${slabsShort(r.before)} → ${slabsShort(r.after)}`
    );
}

export function sameWindows(a: RateWindow[], b: RateWindow[]): boolean {
  const x = sortWindows(a);
  const y = sortWindows(b);
  return (
    x.length === y.length &&
    x.every(
      (w, i) =>
        w.start === y[i].start && w.end === y[i].end && w.slab1 === y[i].slab1 && w.slab2 === y[i].slab2 && !!w.isBase === !!y[i].isBase
    )
  );
}

/**
 * Null when the windows cover every second of the day exactly once, in whole
 * hours, with valid rates and at most MAX_WINDOWS slots; otherwise what's
 * wrong, in words. Rest-of-day windows may carry different rates.
 */
export function validateWindows(windows: RateWindow[]): string | null {
  if (windows.length === 0) return "Add at least one time slot.";
  if (windows.filter((w) => !w.isBase).length > MAX_WINDOWS) return `Use at most ${MAX_WINDOWS} time slots.`;
  for (const w of windows) {
    if (!isHHmmss(w.start) || !isHHmmss(w.end)) return "Enter each window's times as HH:mm:ss.";
    if (!w.start.endsWith(":00:00") || !w.end.endsWith(":59:59")) {
      return `Windows run in whole hours: ${w.start}–${w.end} doesn't.`;
    }
    if (!isValidRate(w.slab1) || !isValidRate(w.slab2)) {
      return `Slab 1 and slab 2 for ${fmtRateWindow(w)} must be whole numbers from ${MIN_RATE} to ${MAX_RATE}.`;
    }
  }

  // Sorted by start, each window must begin the second after the previous one
  // ends, and the last must end the second before the first begins.
  const sorted = sortWindows(windows);
  const shared = sorted.find((w, i) => i > 0 && w.start === sorted[i - 1].start);
  if (shared) return `Two windows start at ${shared.start}.`;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const expected = (parseHHmmss(cur.end) + 1) % DAY_SECONDS;
    const nextStart = parseHHmmss(next.start);
    if (nextStart === expected) continue;
    if (sorted.length === 1) return "One window must cover the whole day.";
    // Seconds from this window's start to the next one's; a shared start is a full overlap.
    const gap = (nextStart - parseHHmmss(cur.start) + DAY_SECONDS) % DAY_SECONDS;
    if (gap === 0 || windowSeconds(cur) > gap) {
      return `${fmtRateWindow(cur)} overlaps ${fmtRateWindow(next)}.`;
    }
    return `No rate covers ${fmtHHmmss(expected)}–${fmtHHmmss(nextStart - 1)}.`;
  }
  return null;
}

/** The single-rate fields older versions priced with; billing now reads `windows` instead. */
export type LegacyRates = Pick<PlanVersion, "standardRate" | "customWindowStart" | "customWindowEnd" | "customRate">;

/**
 * Legacy single-rate fields from valid windows, kept filled in so the stored
 * shape stays complete. Lossy: Standard is slab 1 of the longest window and the
 * custom window is the cheapest other one, so nothing should price from these
 * when `windows` exist (engine.ts `rateWindowAt` doesn't).
 * An end that isn't a whole minute is rounded down to one.
 */
export function legacyFromWindows(windows: RateWindow[]): LegacyRates {
  const sorted = sortWindows(windows);
  const longest = sorted.reduce((a, b) => (windowSeconds(b) > windowSeconds(a) ? b : a));
  const others = sorted.filter((w) => w !== longest);
  if (others.length === 0) {
    // engine.ts treats a window that starts and ends together as empty.
    return { standardRate: longest.slab1, customWindowStart: "00:00", customWindowEnd: "00:00", customRate: longest.slab1 };
  }
  const cheapest = others.reduce((a, b) => (b.slab1 < a.slab1 ? b : a));
  return {
    standardRate: longest.slab1,
    customWindowStart: cheapest.start.slice(0, 5),
    customWindowEnd: fmtHHmmss(parseHHmmss(cheapest.end) + 1).slice(0, 5),
    customRate: cheapest.slab1,
  };
}

// ── Soft warnings ────────────────────────────────────────────────────────────

export interface RateWarning {
  /** The window's times, "17:00:00–19:59:59". */
  time: string;
  kind: "slab_order" | "far_from_default";
  /** What's off, short enough to sit on the window's row. */
  title: string;
}

export interface RateWarnings {
  /** One entry per thing that looks off; saving is still allowed. */
  items: RateWarning[];
  /** Every hour charges exactly what Default does. */
  matchesDefault: boolean;
}

/**
 * Rates that are allowed but look like a typo: slab 2 above slab 1 (slab 2 is
 * usually the cheaper bulk rate), or a rate more than double or under half of
 * what Default charges in those hours. `defaultWindows` is null when the plan
 * being edited is Default itself.
 */
export function rateWarnings(windows: RateWindow[], defaultWindows: RateWindow[] | null): RateWarnings {
  const items: RateWarning[] = [];
  const at = (h: number) => defaultWindows?.find((d) => inRateWindow(h * 3600, d));
  let matches = !!defaultWindows;
  for (const w of sortWindows(windows)) {
    const time = fmtRateWindow(w);
    if (w.slab2 > w.slab1) {
      items.push({ time, kind: "slab_order", title: "Slab 2 is higher than slab 1. Swapped?" });
    }
    if (!defaultWindows) continue;
    const refs = hoursIn(w).map(at).filter((d): d is RateWindow => !!d);
    if (refs.some((d) => d.slab1 !== w.slab1 || d.slab2 !== w.slab2)) matches = false;
    const far = (mine: number, theirs: number) => mine > theirs * 2 || mine < theirs / 2;
    const off = refs.find((d) => far(w.slab1, d.slab1) || far(w.slab2, d.slab2));
    if (off) {
      items.push({ time, kind: "far_from_default", title: `Far from Default's ${fmtSlabs(off)}. Typo?` });
    }
  }
  return { items, matchesDefault: matches };
}
