import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALL_STATION_IDS, SEED_ASSIGNMENTS, SEED_CHANGES, SEED_PLANS } from "@/lib/mock/pricing-plans";
import { normaliseStationId, resolvePlan, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import {
  changeParts,
  legacyFromWindows,
  rateRows,
  validateWindows,
  versionSummary,
} from "@/lib/pricing/windows";
import type {
  PlanChange,
  PlanVersion,
  PricingBook,
  PricingPlan,
  StationAssignment,
} from "@/lib/pricing/types";

/**
 * What the forms send: the full day's windows, slots and rest-of-day hours.
 * Every change applies as soon as it's saved, so the store stamps the
 * effective time, and fills in the legacy rate fields from the windows.
 */
export type VersionInput = Pick<PlanVersion, "windows">;

type Result = { ok: true } | { ok: false; error: string };

/** Saving to a plan that was deleted meanwhile, in another tab say. */
export const PLAN_GONE = "That plan no longer exists.";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function validateVersion(v: VersionInput): string | null {
  return validateWindows(v.windows);
}

export const NAME_MIN = 2;
export const NAME_MAX = 60;

/**
 * Null when `name` can be this plan's name (`selfId` for a plan being renamed);
 * otherwise why not. Names are trimmed, 2–60 characters, unique among plans
 * that aren't deleted (ignoring case), and "Default" is kept for Default.
 */
export function validatePlanName(name: string, plans: PricingPlan[], selfId?: string): string | null {
  const trimmed = name.trim();
  const self = selfId ? plans.find((p) => p.id === selfId) : undefined;
  if (self?.isDefault) return trimmed === self.name ? null : "The Default plan can't be renamed.";
  if (!trimmed) return "Give the plan a name.";
  if (trimmed.length < NAME_MIN) return `Use at least ${NAME_MIN} characters.`;
  if (trimmed.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
  if (trimmed.toLowerCase() === "default") return `"Default" is the name of the Default plan.`;
  if (plans.some((p) => !p.archived && p.id !== selfId && p.name.toLowerCase() === trimmed.toLowerCase())) {
    return `A plan called "${trimmed}" already exists.`;
  }
  return null;
}

/**
 * Describe what moved between two versions, for the change log: each rate
 * that changed, and each custom window added or removed.
 */
function diffSummary(prev: PlanVersion, next: VersionInput): { kind: PlanChange["kind"]; summary: string } {
  const parts = changeParts(prev, next);
  if (parts.length === 0) return { kind: "rates_changed", summary: "Re-saved the same rates" };
  const moved = rateRows(prev, next).some((r) => !r.base && (!r.before || !r.after));
  return { kind: moved ? "window_changed" : "rates_changed", summary: parts.join("; ") };
}

/** A new version as stored, in force from `at`: the windows plus the legacy fields derived from them. */
function toVersion(v: VersionInput, by: string, at: string): PlanVersion {
  return { ...v, ...legacyFromWindows(v.windows), effectiveFrom: at, id: uid("pv"), createdBy: by, createdAt: at };
}

interface PricingState extends PricingBook {
  changes: PlanChange[];
  createPlan: (input: { name: string; version: VersionInput }, by: string) => Result & { planId?: string };
  addVersion: (planId: string, version: VersionInput, by: string) => Result;
  renamePlan: (planId: string, name: string, by: string) => Result;
  /** Move stations onto a plan, or back to Default with `planId: null`, from now. */
  assignStations: (planId: string | null, stationIds: string[], by: string) => Result;
  /** Archive a plan and move its stations to Default, from now. */
  deletePlan: (planId: string, by: string) => Result & { moved?: number };
  resetToSeed: () => void;
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set, get) => {
      // Changes apply when they're made, so a new entry's effective time is its own.
      const log = (entry: Omit<PlanChange, "id" | "at" | "effectiveFrom">, at = new Date().toISOString()) =>
        set((s) => ({ changes: [{ ...entry, id: uid("pc"), at, effectiveFrom: at }, ...s.changes] }));

      return {
        plans: SEED_PLANS,
        assignments: SEED_ASSIGNMENTS,
        changes: SEED_CHANGES,

        createPlan: ({ name, version }, by) => {
          const trimmed = name.trim();
          const nameError = validatePlanName(trimmed, get().plans);
          if (nameError) return { ok: false, error: nameError };
          const error = validateVersion(version);
          if (error) return { ok: false, error };

          const now = new Date().toISOString();
          const planId = uid("pp");
          const plan: PricingPlan = {
            id: planId,
            name: trimmed,
            isDefault: false,
            createdAt: now,
            versions: [toVersion(version, by, now)],
          };
          set((s) => ({ plans: [...s.plans, plan] }));
          log({ planId, by, kind: "created", summary: `Created plan: ${versionSummary(version)}` }, now);
          return { ok: true, planId };
        },

        addVersion: (planId, version, by) => {
          const plan = get().plans.find((p) => p.id === planId && !p.archived);
          if (!plan) return { ok: false, error: PLAN_GONE };
          const error = validateVersion(version);
          if (error) return { ok: false, error };

          const now = new Date().toISOString();
          // The version it replaces.
          const prev = versionAt(plan, now) ?? sortedVersions(plan)[0];
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === planId
                ? { ...p, versions: [...p.versions, toVersion(version, by, now)] }
                : p
            ),
          }));
          const { kind, summary } = diffSummary(prev, version);
          log({ planId, by, kind, summary }, now);
          return { ok: true };
        },

        renamePlan: (planId, name, by) => {
          const plan = get().plans.find((p) => p.id === planId && !p.archived);
          if (!plan) return { ok: false, error: PLAN_GONE };
          const trimmed = name.trim();
          const nameError = validatePlanName(trimmed, get().plans, planId);
          if (nameError) return { ok: false, error: nameError };
          if (trimmed === plan.name) return { ok: true };
          set((s) => ({
            plans: s.plans.map((p) => (p.id === planId ? { ...p, name: trimmed } : p)),
          }));
          log({
            planId, by, kind: "renamed",
            summary: `Renamed "${plan.name}" → "${trimmed}"`,
          });
          return { ok: true };
        },

        assignStations: (planId, stationIds, by) => {
          const ids = Array.from(new Set(stationIds.map(normaliseStationId)));
          if (ids.length === 0) return { ok: false, error: "Select at least one station." };
          const effectiveFrom = new Date().toISOString();
          const target = planId ? get().plans.find((p) => p.id === planId) : null;
          if (planId && !target) return { ok: false, error: "That plan no longer exists." };

          // Where each station is now, for the log.
          const book = get();
          const leaving = new Map<string, string[]>();
          for (const id of ids) {
            const from = resolvePlan(book, id, effectiveFrom).plan;
            if (from.id === planId || (planId === null && from.isDefault)) continue;
            leaving.set(from.id, [...(leaving.get(from.id) ?? []), id]);
          }

          const rows: StationAssignment[] = ids.map((stationId) => ({
            id: uid("sa"), stationId, planId, effectiveFrom, assignedBy: by, assignedAt: effectiveFrom,
          }));
          set((s) => ({ assignments: [...s.assignments, ...rows] }));

          if (target) {
            log({
              planId: target.id, by, kind: "stations_assigned",
              summary: `Moved ${ids.length} station${ids.length === 1 ? "" : "s"} here: ${ids.join(", ")}`,
            }, effectiveFrom);
          }
          leaving.forEach((moved, fromId) => {
            const fromPlan = book.plans.find((p) => p.id === fromId);
            if (!fromPlan || fromPlan.isDefault) return;
            log({
              planId: fromId, by, kind: "stations_unassigned",
              summary: `${moved.join(", ")} moved to ${target?.name ?? "Default"}`,
            }, effectiveFrom);
          });
          return { ok: true };
        },

        deletePlan: (planId, by) => {
          const book = get();
          const plan = book.plans.find((p) => p.id === planId && !p.archived);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
          if (plan.isDefault) return { ok: false, error: "The Default plan can't be deleted." };

          // The plan stays in the data, so swaps already priced on it still resolve.
          const now = new Date().toISOString();
          const ids = stationsOnPlan(book, planId, ALL_STATION_IDS, now);
          const rows: StationAssignment[] = ids.map((stationId) => ({
            id: uid("sa"), stationId, planId: null, effectiveFrom: now, assignedBy: by, assignedAt: now,
          }));
          set((s) => ({
            plans: s.plans.map((p) => (p.id === planId ? { ...p, archived: true } : p)),
            assignments: [...s.assignments, ...rows],
          }));
          if (ids.length > 0) {
            log({
              planId, by, kind: "stations_unassigned",
              summary: `${ids.length} station${ids.length === 1 ? "" : "s"} moved to Default`,
            }, now);
          }
          log({ planId, by, kind: "deleted", summary: "" }, now);
          return { ok: true, moved: ids.length };
        },

        resetToSeed: () => set({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
      };
    },
    {
      name: "zeno-pricing-plans",
      // 2: versions carry `windows`. 3: nothing is scheduled. 4–5: history time format.
      // 6: rest-of-day rates and `isBase` windows. 7: archived plans.
      // 8: rest-of-day hours copied from Default can carry different rates.
      // Anything saved before is reset to the seed.
      version: 8,
      partialize: (s) => ({ plans: s.plans, assignments: s.assignments, changes: s.changes }),
      migrate: () => ({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
    }
  )
);
