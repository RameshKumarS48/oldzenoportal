import type { RateWindow } from "./types";

/**
 * The day bars' colours, ranked by price: a plan's distinct rates (Default
 * Rate hours aside, which are grey) are ordered by slab 1, then slab 2, and
 * spread over a five-step teal scale, cheapest lightest. Windows with the
 * same rates share a shade. The colours are the `--color-pricing-*` tokens
 * in globals.css.
 */

/** A shade on the scale, 1 (lightest) to 5 (darkest). */
export type Shade = 1 | 2 | 3 | 4 | 5;

/** Which shades n distinct rates use, cheapest first: spread so neighbours stay apart. */
const SPREAD: Record<number, Shade[]> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

const rateKey = (r: Pick<RateWindow, "slab1" | "slab2">) => `${r.slab1}/${r.slab2}`;

/**
 * Each distinct rate's shade, keyed "slab1/slab2" (see `shadeOf`). Rates
 * that aren't numbers yet (a form row still being typed) aren't ranked.
 * More than five distinct rates can't be saved, so past five the darkest
 * shade repeats.
 */
export function rateShades(rates: Pick<RateWindow, "slab1" | "slab2">[]): Map<string, Shade> {
  const distinct = new Map<string, Pick<RateWindow, "slab1" | "slab2">>();
  for (const r of rates) {
    if (Number.isFinite(r.slab1) && Number.isFinite(r.slab2)) distinct.set(rateKey(r), r);
  }
  const ranked = [...distinct.values()].sort((a, b) => a.slab1 - b.slab1 || a.slab2 - b.slab2);
  const spread = SPREAD[Math.min(ranked.length, 5)] ?? [];
  return new Map(ranked.map((r, i) => [rateKey(r), spread[Math.min(i, spread.length - 1)]]));
}

/** A window's shade from `rateShades`, or null when its rates weren't ranked. */
export const shadeOf = (shades: Map<string, Shade>, r: Pick<RateWindow, "slab1" | "slab2">): Shade | null =>
  shades.get(rateKey(r)) ?? null;
