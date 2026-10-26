import type { PlanChangeKind, RateSlot, SwapEvent } from "./types";
import type { PlanStatus } from "./engine";

/**
 * The statuses the pricing screens show. Changes apply as soon as they're
 * saved, so nothing is ever scheduled; engine.ts can still return "scheduled"
 * for future-dated data, which shows as No stations.
 */
export type DisplayStatus = Exclude<PlanStatus, "scheduled">;

export function displayStatus(status: PlanStatus): DisplayStatus {
  return status === "scheduled" ? "inactive" : status;
}

/** Legacy: Swap Transactions still labels swaps Standard / Custom window. */
export const SLOT_LABELS: Record<RateSlot, string> = {
  standard: "Standard",
  custom_window: "Custom window",
};

export const SLOT_BADGE: Record<RateSlot, string> = {
  standard: "bg-slate-100 text-slate-600",
  custom_window: "bg-teal-50 text-teal-700",
};

export const EVENT_LABELS: Record<SwapEvent, string> = {
  rfid_tap: "RFID tap",
  deposit: "Battery deposited",
  collection: "Battery collected",
  completed: "Swap complete",
};

export const STATUS_META: Record<DisplayStatus, { label: string; badge: string }> = {
  default:   { label: "Default",   badge: "bg-zeno-teal/10 text-zeno-teal" },
  active:    { label: "Active",    badge: "bg-emerald-50 text-emerald-700" },
  inactive:  { label: "No stations", badge: "bg-slate-100 text-slate-500" },
};

export const CHANGE_LABELS: Record<PlanChangeKind, string> = {
  created: "Plan created",
  rates_changed: "Rates changed",
  window_changed: "Windows changed",
  stations_assigned: "Stations moved",
  stations_unassigned: "Stations moved",
  renamed: "Plan renamed",
};

export function fmtKes(n: number, digits = 0): string {
  return `KES ${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtRate(n: number): string {
  return `${fmtKes(n)}/kWh`;
}

/** "23 Oct 2026, 14:05" in EAT, whatever the viewer's zone. */
export function fmtEat(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })
  );
}

export function fmtEatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Nairobi",
  });
}
