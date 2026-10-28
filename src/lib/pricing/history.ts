/**
 * A station's pricing history: every plan it joined or left, who moved it,
 * when and why. Read from the station assignments, so there's no second log
 * to keep in step. Pure, so the drawer and the check script agree.
 */

import { assignmentAt, defaultPlan, normaliseStationId, resolvePlan } from "./engine";
import type { MoveReason, PricingBook, PricingPlan, StationAssignment } from "./types";

export const REASON_LABELS: Record<MoveReason, string> = {
  assigned: "Assigned",
  removed: "Moved to Default",
  plan_created: "Added when the plan was created",
  plan_deleted: "Plan deleted",
};

export interface HistoryEntry {
  id: string;
  /** When the move took effect. */
  at: string;
  from: PricingPlan;
  to: PricingPlan;
  by: string;
  reason: MoveReason;
  /** Takes effect after `now` (only older data was ever scheduled). */
  scheduled: boolean;
}

export function reasonOf(a: StationAssignment): MoveReason {
  return a.reason ?? (a.planId ? "assigned" : "removed");
}

const second = (iso: string, delta: number) => new Date(new Date(iso).getTime() + delta * 1000).toISOString();

/**
 * Every real move of a station, newest first. A move onto the plan it was
 * already on is left out. On a tie, the later `assignedAt` comes first.
 */
export function stationHistory(book: PricingBook, stationId: string, now: string): HistoryEntry[] {
  const id = normaliseStationId(stationId);
  const fallback = defaultPlan(book);
  const rows = book.assignments
    .filter((a) => a.stationId === id)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.assignedAt.localeCompare(b.assignedAt));
  const out: HistoryEntry[] = [];
  for (const a of rows) {
    const from = resolvePlan(book, id, second(a.effectiveFrom, -1)).plan;
    const to = (a.planId && book.plans.find((p) => p.id === a.planId)) || fallback;
    if (from.id === to.id) continue;
    out.push({
      id: a.id,
      at: a.effectiveFrom,
      from,
      to,
      by: a.assignedBy,
      reason: reasonOf(a),
      scheduled: new Date(a.effectiveFrom).getTime() > new Date(now).getTime(),
    });
  }
  return out.reverse();
}

export interface StationNow {
  plan: PricingPlan;
  /** When the station joined its current plan; null when it has always been on Default. */
  since: string | null;
  /** Who made the latest move, if any. */
  lastBy: string | null;
}

/** Where a station is now, since when, and who last moved it. */
export function stationNow(book: PricingBook, stationId: string, now: string): StationNow {
  const id = normaliseStationId(stationId);
  const plan = resolvePlan(book, id, now).plan;
  const live = stationHistory(book, id, now).filter((e) => !e.scheduled);
  return {
    plan,
    since: live[0]?.at ?? (plan.isDefault ? null : assignmentAt(book, id, now)?.effectiveFrom ?? null),
    lastBy: live[0]?.by ?? null,
  };
}
