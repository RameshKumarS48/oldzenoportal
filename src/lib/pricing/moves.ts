/**
 * What moving stations onto a plan would do, before it's done: which
 * stations leave which plan, which are already there, and which plans would
 * be left with no stations. Pure, so the confirmations and the check script
 * read the same answer.
 */

import { normaliseStationId, resolvePlan, stationsOnPlan } from "./engine";
import type { PricingBook, PricingPlan } from "./types";

export interface StationMove {
  id: string;
  /** The plan the station is on now. */
  from: PricingPlan;
}

export interface MoveSummary {
  /** Stations that change plan, with the plan each leaves. */
  moves: StationMove[];
  /** Selected stations already on the target plan: nothing happens to them. */
  unchanged: string[];
  /** Codes that aren't stations. */
  unknown: string[];
  /** Plans other than Default that would have no stations left. */
  emptied: PricingPlan[];
}

/**
 * Moving `stationIds` onto `targetPlanId` (null for Default, or an id the
 * book doesn't have yet, for a plan being created) at `at`. Codes are
 * upper-cased and de-duplicated.
 */
export function summarizeMoves(
  book: PricingBook,
  stationIds: string[],
  targetPlanId: string | null,
  allStationIds: string[],
  at: string
): MoveSummary {
  const known = new Set(allStationIds);
  const ids = Array.from(new Set(stationIds.map(normaliseStationId)));
  const unknown = ids.filter((id) => !known.has(id));
  const moves: StationMove[] = [];
  const unchanged: string[] = [];
  for (const id of ids.filter((x) => known.has(x))) {
    const from = resolvePlan(book, id, at).plan;
    const same = targetPlanId === null ? from.isDefault : from.id === targetPlanId;
    if (same) unchanged.push(id);
    else moves.push({ id, from });
  }
  const leaving = new Set(moves.map((m) => m.id));
  const emptied = Array.from(new Map(moves.map((m) => [m.from.id, m.from])).values()).filter(
    (p) => !p.isDefault && stationsOnPlan(book, p.id, allStationIds, at).every((id) => leaving.has(id))
  );
  return { moves, unchanged, unknown, emptied };
}
