/**
 * The pricing rules, as pure functions over a `PricingBook`. No React and no
 * store, so the same code prices a row in the swap table and runs in the check
 * script (`scripts/check-pricing.ts`).
 *
 * Billing rule for a swap:
 *   1. The plan and its rate version are locked at the RFID tap, so a change
 *      that takes effect while a swap is in progress never touches it.
 *   2. Standard vs Custom window is decided by the time the swap completes.
 *   3. amount = billed kWh × that rate.
 */

import type {
  PlanVersion,
  PricingBook,
  PricingPlan,
  RateSlot,
  StationAssignment,
  SwapEvent,
} from "./types";

const EAT_OFFSET_MIN = 180;

// ── Clock ────────────────────────────────────────────────────────────────────

function ms(iso: string): number {
  return new Date(iso).getTime();
}

/** Minutes past midnight in EAT. */
export function eatMinuteOfDay(iso: string): number {
  const d = new Date(iso);
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + EAT_OFFSET_MIN) % 1440;
}

export function parseHHmm(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Is a minute-of-day inside [start, end)? Handles windows that wrap midnight. */
export function inWindow(minute: number, start: string, end: string): boolean {
  const s = parseHHmm(start);
  const e = parseHHmm(end);
  if (s === e) return false;
  return s < e ? minute >= s && minute < e : minute >= s || minute < e;
}

/** Length of a window in minutes, wrapping midnight. */
export function windowMinutes(start: string, end: string): number {
  return (parseHHmm(end) - parseHHmm(start) + 1440) % 1440;
}

export function normaliseStationId(id: string): string {
  return id.trim().toUpperCase();
}

// ── Plans & versions ─────────────────────────────────────────────────────────

export function defaultPlan(book: PricingBook): PricingPlan {
  const plan = book.plans.find((p) => p.isDefault);
  if (!plan) throw new Error("Pricing book has no Default plan");
  return plan;
}

export function sortedVersions(plan: PricingPlan): PlanVersion[] {
  return [...plan.versions].sort((a, b) => ms(a.effectiveFrom) - ms(b.effectiveFrom));
}

/** The version in force at `at`, or null if the plan hasn't started yet. */
export function versionAt(plan: PricingPlan, at: string): PlanVersion | null {
  const t = ms(at);
  let found: PlanVersion | null = null;
  for (const v of sortedVersions(plan)) {
    if (ms(v.effectiveFrom) <= t) found = v;
  }
  return found;
}

/** The next version after `at`, if one is scheduled. */
export function nextVersionAfter(plan: PricingPlan, at: string): PlanVersion | null {
  const t = ms(at);
  return sortedVersions(plan).find((v) => ms(v.effectiveFrom) > t) ?? null;
}

export function slotFor(version: PlanVersion, at: string): RateSlot {
  return inWindow(eatMinuteOfDay(at), version.customWindowStart, version.customWindowEnd)
    ? "custom_window"
    : "standard";
}

export function rateFor(version: PlanVersion, slot: RateSlot): number {
  return slot === "custom_window" ? version.customRate : version.standardRate;
}

// ── Stations ─────────────────────────────────────────────────────────────────

/** The station's latest assignment on or before `at`; later `assignedAt` wins a tie. */
export function assignmentAt(book: PricingBook, stationId: string, at: string): StationAssignment | null {
  const id = normaliseStationId(stationId);
  const t = ms(at);
  let found: StationAssignment | null = null;
  for (const a of book.assignments) {
    if (a.stationId !== id || ms(a.effectiveFrom) > t) continue;
    if (
      !found ||
      ms(a.effectiveFrom) > ms(found.effectiveFrom) ||
      (ms(a.effectiveFrom) === ms(found.effectiveFrom) && ms(a.assignedAt) >= ms(found.assignedAt))
    ) {
      found = a;
    }
  }
  return found;
}

export interface ResolvedPlan {
  plan: PricingPlan;
  version: PlanVersion;
  assignment: StationAssignment | null;
  /** True when the station had no live assignment and fell back to Default. */
  viaDefault: boolean;
}

/**
 * Which plan and version price this station at `at`. A station assigned to a
 * plan whose first version hasn't started yet stays on Default until it does.
 */
export function resolvePlan(book: PricingBook, stationId: string, at: string): ResolvedPlan {
  const fallback = defaultPlan(book);
  const assignment = assignmentAt(book, stationId, at);
  const plan = assignment?.planId ? book.plans.find((p) => p.id === assignment.planId) : undefined;
  const version = plan ? versionAt(plan, at) : null;
  if (plan && version) {
    return { plan, version, assignment, viaDefault: plan.isDefault };
  }
  const defaultVersion = versionAt(fallback, at) ?? sortedVersions(fallback)[0];
  return { plan: fallback, version: defaultVersion, assignment, viaDefault: true };
}

/** Station codes on a plan at `at`. For Default, that's every station with no other live plan. */
export function stationsOnPlan(book: PricingBook, planId: string, allStationIds: string[], at: string): string[] {
  return allStationIds.filter((id) => resolvePlan(book, id, at).plan.id === planId);
}

/** Assignments onto (or off) a plan that haven't taken effect yet. */
export function upcomingAssignments(book: PricingBook, planId: string, now: string): StationAssignment[] {
  const t = ms(now);
  return book.assignments
    .filter((a) => ms(a.effectiveFrom) > t && a.planId === planId)
    .sort((a, b) => ms(a.effectiveFrom) - ms(b.effectiveFrom));
}

export type PlanStatus = "default" | "active" | "scheduled" | "inactive";

export function planStatus(book: PricingBook, plan: PricingPlan, allStationIds: string[], now: string): PlanStatus {
  if (plan.isDefault) return "default";
  if (stationsOnPlan(book, plan.id, allStationIds, now).length > 0) return "active";
  const hasFutureVersion = plan.versions.some((v) => ms(v.effectiveFrom) > ms(now));
  if (upcomingAssignments(book, plan.id, now).length > 0 || (hasFutureVersion && !versionAt(plan, now))) {
    return "scheduled";
  }
  return "inactive";
}

// ── Swaps ────────────────────────────────────────────────────────────────────

export interface SwapTiming {
  rfidTapAt: string;
  depositAt: string;
  collectionAt: string;
  completedAt: string;
}

export const SWAP_EVENTS: SwapEvent[] = ["rfid_tap", "deposit", "collection", "completed"];

function eventTime(timing: SwapTiming, event: SwapEvent): string {
  switch (event) {
    case "rfid_tap":   return timing.rfidTapAt;
    case "deposit":    return timing.depositAt;
    case "collection": return timing.collectionAt;
    case "completed":  return timing.completedAt;
  }
}

export interface EventPrice {
  event: SwapEvent;
  at: string;
  planId: string;
  planName: string;
  versionId: string;
  slot: RateSlot;
  rate: number;
  /** Only the completed row is what the rider pays. */
  charged: boolean;
}

export interface SwapPrice {
  planId: string;
  planName: string;
  versionId: string;
  viaDefault: boolean;
  slot: RateSlot;
  rate: number;
  kWh: number;
  amount: number;
  /**
   * What each event would price at on its own. Earlier rows read the book as
   * of that moment; the completed row carries the plan locked at the tap.
   */
  events: EventPrice[];
}

export function priceSwap(book: PricingBook, stationId: string, timing: SwapTiming, kWh: number): SwapPrice {
  const locked = resolvePlan(book, stationId, timing.rfidTapAt);
  const slot = slotFor(locked.version, timing.completedAt);
  const rate = rateFor(locked.version, slot);

  const events: EventPrice[] = SWAP_EVENTS.map((event) => {
    const at = eventTime(timing, event);
    if (event === "completed") {
      return {
        event, at, slot, rate, charged: true,
        planId: locked.plan.id, planName: locked.plan.name, versionId: locked.version.id,
      };
    }
    const r = resolvePlan(book, stationId, at);
    const s = slotFor(r.version, at);
    return {
      event, at, slot: s, rate: rateFor(r.version, s), charged: false,
      planId: r.plan.id, planName: r.plan.name, versionId: r.version.id,
    };
  });

  return {
    planId: locked.plan.id,
    planName: locked.plan.name,
    versionId: locked.version.id,
    viaDefault: locked.viaDefault,
    slot,
    rate,
    kWh,
    amount: Math.round(kWh * rate * 100) / 100,
    events,
  };
}
