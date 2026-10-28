import type { SwapRecord } from "@/store/swap-transactions";
import { normaliseStationId, priceSwap, type SwapPrice, type SwapTiming } from "./engine";
import type { PricingBook } from "./types";

function shift(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

/**
 * The station a swap is billed at: where the rider brought the old battery
 * back, which is where the swap happens. Falls back to the dispense station
 * for a record with no collect side.
 */
export function billingStation(r: SwapRecord): string {
  return normaliseStationId(r.collectStationId || r.dispenseStationId);
}

/**
 * The four station events. Older records only carry the collect timestamp
 * (the deposit), so the rest are placed around it on the station's usual
 * cadence: tap 25 s before, new battery out 20 s after, closed 35 s after.
 */
export function swapTiming(r: SwapRecord): SwapTiming {
  const deposit = r.depositAt ?? r.collectTimestamp ?? r.occurredAt;
  return {
    rfidTapAt: r.rfidTapAt ?? shift(deposit, -25),
    depositAt: deposit,
    collectionAt: r.collectionAt ?? shift(deposit, 20),
    completedAt: r.completedAt ?? shift(deposit, 35),
  };
}

/** The EAT calendar day of a moment, "2026-10-27". */
function eatDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Price every swap. Slab 1 covers a rider's first kWh of each EAT day, so
 * swaps are walked in completion order and each one counts what the same
 * rider (by phone) already used that day. Skipped and manually ignored swaps
 * are still priced but don't use up anyone's slab 1.
 */
export function priceSwapRecords(book: PricingBook, records: SwapRecord[]): Map<string, SwapPrice> {
  const timed = records
    .map((r) => ({ r, timing: swapTiming(r) }))
    .sort((a, b) => new Date(a.timing.completedAt).getTime() - new Date(b.timing.completedAt).getTime());
  const usedToday = new Map<string, number>();
  const out = new Map<string, SwapPrice>();
  for (const { r, timing } of timed) {
    const key = `${r.phone}|${eatDay(timing.completedAt)}`;
    const earlier = usedToday.get(key) ?? 0;
    out.set(r.id, priceSwap(book, billingStation(r), timing, r.totalKWh, earlier));
    if (!r.skipped && !r.manualIgnore) usedToday.set(key, earlier + r.totalKWh);
  }
  return out;
}
