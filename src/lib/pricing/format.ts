import type { PlanChangeKind, RateSlot, SwapEvent } from "./types";
import type { PlanStatus } from "./engine";

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

export const STATUS_META: Record<PlanStatus, { label: string; badge: string }> = {
  default:   { label: "Default",   badge: "bg-zeno-teal/10 text-zeno-teal" },
  active:    { label: "Active",    badge: "bg-emerald-50 text-emerald-700" },
  scheduled: { label: "Scheduled", badge: "bg-amber-50 text-amber-700" },
  inactive:  { label: "No stations", badge: "bg-slate-100 text-slate-500" },
};

export const CHANGE_LABELS: Record<PlanChangeKind, string> = {
  created: "Plan created",
  rates_changed: "Rates changed",
  window_changed: "Windows changed",
  stations_assigned: "Stations assigned",
  stations_unassigned: "Stations removed",
  renamed: "Plan renamed",
};

export function fmtKes(n: number, digits = 0): string {
  return `KES ${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtRate(n: number): string {
  return `${fmtKes(n)}/kWh`;
}

export function fmtWindow(start: string, end: string): string {
  return `${start}–${end}`;
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

/** A `datetime-local` value (no zone) read as EAT. */
export function eatLocalToIso(local: string): string {
  return `${local.length === 16 ? `${local}:00` : local}+03:00`;
}

/** An ISO time as a `datetime-local` value in EAT. */
export function isoToEatLocal(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}
