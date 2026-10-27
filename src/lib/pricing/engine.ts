/**
 * The pricing rules, as pure functions over a `PricingBook`. No React and no
 * store, so the same code prices a row in the swap table and runs in the check
 * script (`scripts/check-pricing.mjs`).
 *
 * Billing rule for a swap:
 *   1. The plan and its rate version are locked at the RFID tap, so a change
 *      that takes effect while a swap is in progress never touches it.
 *   2. The time window is picked by when the swap completes.
 *   3. The window's slab 1 rate covers the rider's first SLAB1_DAILY_KWH kWh
 *      of the EAT day, counting earlier swaps; slab 2 covers the rest.
 */

import type {
  PlanVersion,
  PricingBook,
  PricingPlan,
  RateSlot,
  RateWindow,
  StationAssignment,
  SwapEvent,
} from "./types";

const EAT_OFFSET_MIN = 180;

/** A rider's first this-many kWh each EAT day are billed at slab 1. */
export const SLAB1_DAILY_KWH = 3;

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

// The window lookup is repeated from windows.ts so the check script can load
// this file on its own (Node needs file extensions on relative imports).
function secondOfDay(hhmmss: string): number {
  const [h, m, s] = hhmmss.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function eatSecond(iso: string): number {
  const d = new Date(iso);
  return (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() + EAT_OFFSET_MIN * 60) % 86_400;
}

/**
 * The window in force at `at`, with both slab rates. Versions saved with
 * `windows` use them (inclusive "HH:mm:ss" ends); older ones fall back to the
 * single Standard rate and custom window, with one rate for both slabs.
 */
export function rateWindowAt(version: PlanVersion, at: string): RateWindow {
  if (version.windows?.length) {
    const t = eatSecond(at);
    const hit = version.windows.find((w) => {
      const s = secondOfDay(w.start);
      const e = secondOfDay(w.end);
      return s <= e ? t >= s && t <= e : t >= s || t <= e;
    });
    if (hit) return hit;
  }
  const slot = slotFor(version, at);
  const rate = rateFor(version, slot);
  if (slot === "standard") return { start: "00:00:00", end: "23:59:59", slab1: rate, slab2: rate, isBase: true };
  // Legacy ends are exclusive "HH:mm"; windows end on their last second.
  const last = (secondOfDay(`${version.customWindowEnd}:00`) + 86_399) % 86_400;
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = `${pad(Math.floor(last / 3600))}:${pad(Math.floor((last % 3600) / 60))}:${pad(last % 60)}`;
  return { start: `${version.customWindowStart}:00`, end, slab1: rate, slab2: rate, isBase: false };
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
  /** The window this event falls in, with its slab rates. */
  window: RateWindow;
  /** Rest of the day or a custom window, for the badge. */
  slot: RateSlot;
  /** Only the completed row is what the rider pays. */
  charged: boolean;
}

export interface SwapPrice {
  planId: string;
  planName: string;
  versionId: string;
  viaDefault: boolean;
  window: RateWindow;
  slot: RateSlot;
  kWh: number;
  /** The rider's kWh earlier the same EAT day, which uses up slab 1 first. */
  kWhEarlierToday: number;
  slab1KWh: number;
  slab2KWh: number;
  amount: number;
  /**
   * What each event would price at on its own. Earlier rows read the book as
   * of that moment; the completed row carries the plan locked at the tap.
   */
  events: EventPrice[];
}

const slotOf = (w: RateWindow): RateSlot => (w.isBase ? "standard" : "custom_window");

export function priceSwap(
  book: PricingBook,
  stationId: string,
  timing: SwapTiming,
  kWh: number,
  kWhEarlierToday = 0
): SwapPrice {
  const locked = resolvePlan(book, stationId, timing.rfidTapAt);
  const window = rateWindowAt(locked.version, timing.completedAt);

  const events: EventPrice[] = SWAP_EVENTS.map((event) => {
    const at = eventTime(timing, event);
    if (event === "completed") {
      return {
        event, at, window, slot: slotOf(window), charged: true,
        planId: locked.plan.id, planName: locked.plan.name, versionId: locked.version.id,
      };
    }
    const r = resolvePlan(book, stationId, at);
    const w = rateWindowAt(r.version, at);
    return {
      event, at, window: w, slot: slotOf(w), charged: false,
      planId: r.plan.id, planName: r.plan.name, versionId: r.version.id,
    };
  });

  const slab1KWh = Math.min(kWh, Math.max(0, SLAB1_DAILY_KWH - kWhEarlierToday));
  const slab2KWh = kWh - slab1KWh;
  const amount = slab1KWh * window.slab1 + slab2KWh * window.slab2;

  return {
    planId: locked.plan.id,
    planName: locked.plan.name,
    versionId: locked.version.id,
    viaDefault: locked.viaDefault,
    window,
    slot: slotOf(window),
    kWh,
    kWhEarlierToday,
    slab1KWh,
    slab2KWh,
    amount: Math.round(amount * 100) / 100,
    events,
  };
}
