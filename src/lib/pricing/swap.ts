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

export function priceSwapRecord(book: PricingBook, r: SwapRecord): SwapPrice {
  return priceSwap(book, billingStation(r), swapTiming(r), r.totalKWh);
}
