/**
 * Time windows: how every swap-station-pricing screen reads a plan's rates.
 *
 * A version's windows cover the whole day exactly once. Times are "HH:mm:ss"
 * EAT and both ends are inclusive, so one window ends the second before the
 * next begins (06:00:00–16:59:59, then 17:00:00–21:59:59) and no second is in
 * two windows. A window whose end is before its start wraps past midnight
 * (22:00:00–05:59:59). One window can cover the whole day: 00:00:00–23:59:59.
 *
 * Each window has two rates in KES per kWh: slab 1 for a rider's first
 * 3 kWh each day, slab 2 for everything after.
 */

import type { PlanVersion, RateWindow } from "./types";

export const DAY_SECONDS = 86_400;
export const MAX_WINDOWS = 6;

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
export function windowSeconds(w: RateWindow): number {
  return ((parseHHmmss(w.end) - parseHHmmss(w.start) + DAY_SECONDS) % DAY_SECONDS) + 1;
}

export function inRateWindow(second: number, w: RateWindow): boolean {
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
export function sortWindows(windows: RateWindow[]): RateWindow[] {
  return [...windows].sort((a, b) => parseHHmmss(a.start) - parseHHmmss(b.start));
}

export function fmtRateWindow(w: RateWindow): string {
  return `${w.start}–${w.end}`;
}

/** "100 / 80": slab 1 / slab 2. */
export function fmtSlabs(w: RateWindow): string {
  return `${w.slab1} / ${w.slab2}`;
}

export function fmtWindowCount(n: number): string {
  return `${n} window${n === 1 ? "" : "s"}`;
}

/** "06:00:00–16:59:59 100/80 · 17:00:00–21:59:59 110/90", for the change log. */
export function windowsSummary(windows: RateWindow[]): string {
  return sortWindows(windows).map((w) => `${fmtRateWindow(w)} ${w.slab1}/${w.slab2}`).join(" · ");
}

/** What riders are told. `when` is a date such as "15 Nov". */
export function riderMessage(when: string, windows: RateWindow[]): string {
  const list = sortWindows(windows).map((w) => `${fmtRateWindow(w)} ${w.slab1}/${w.slab2}`).join(", ");
  return `From ${when}, swaps at this station cost, in KES/kWh for your first 3 kWh of the day / after that: ${list}.`;
}

export function sameWindows(a: RateWindow[], b: RateWindow[]): boolean {
  const x = sortWindows(a);
  const y = sortWindows(b);
  return (
    x.length === y.length &&
    x.every((w, i) => w.start === y[i].start && w.end === y[i].end && w.slab1 === y[i].slab1 && w.slab2 === y[i].slab2)
  );
}

/**
 * Null when the windows cover every second of the day exactly once with
 * rates above zero; otherwise what's wrong, in words.
 */
export function validateWindows(windows: RateWindow[]): string | null {
  if (windows.length === 0) return "Add at least one time window.";
  if (windows.length > MAX_WINDOWS) return `Use at most ${MAX_WINDOWS} time windows.`;
  for (const w of windows) {
    if (!isHHmmss(w.start) || !isHHmmss(w.end)) return "Enter each window's times as HH:mm:ss.";
    if (!(Number.isFinite(w.slab1) && w.slab1 > 0) || !(Number.isFinite(w.slab2) && w.slab2 > 0)) {
      return `Enter slab 1 and slab 2 rates above zero for ${fmtRateWindow(w)}.`;
    }
  }

  // Sorted by start, each window must begin the second after the previous one
  // ends, and the last must end the second before the first begins.
  const sorted = sortWindows(windows);
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const expected = (parseHHmmss(cur.end) + 1) % DAY_SECONDS;
    const nextStart = parseHHmmss(next.start);
    if (nextStart === expected) continue;
    if (sorted.length === 1) {
      return `One window must cover the whole day: end it at ${fmtHHmmss(parseHHmmss(cur.start) - 1)}.`;
    }
    // Seconds from this window's start to the next one's; a shared start is a full overlap.
    const gap = (nextStart - parseHHmmss(cur.start) + DAY_SECONDS) % DAY_SECONDS;
    if (gap === 0 || windowSeconds(cur) > gap) {
      return `${fmtRateWindow(cur)} overlaps ${fmtRateWindow(next)}.`;
    }
    const last = (nextStart - 1 + DAY_SECONDS) % DAY_SECONDS;
    return `No rate covers ${last === expected ? fmtHHmmss(expected) : `${fmtHHmmss(expected)}–${fmtHHmmss(last)}`}.`;
  }
  return null;
}

/** The fields engine.ts, SwapRecordsTable and check-pricing.mjs still read. */
export type LegacyRates = Pick<PlanVersion, "standardRate" | "customWindowStart" | "customWindowEnd" | "customRate">;

/**
 * Legacy single-rate fields from valid windows, so swaps on plans made in the
 * app still price: Standard is slab 1 of the longest window; the custom window
 * is the cheapest other window (by slab 1), as "HH:mm" with an exclusive end.
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
