import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_ASSIGNMENTS, SEED_CHANGES, SEED_PLANS } from "@/lib/mock/pricing-plans";
import { normaliseStationId, resolvePlan, sortedVersions, versionAt } from "@/lib/pricing/engine";
import {
  BASE_LABEL,
  MAX_RATE,
  MIN_RATE,
  changeParts,
  isValidRate,
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
 * What the forms send: the full day's windows and the rest-of-day rates.
 * Every change applies as soon as it's saved, so the store stamps the
 * effective time, and fills in the legacy rate fields from the windows.
 */
export type VersionInput = Pick<PlanVersion, "windows" | "baseSlab1" | "baseSlab2">;

type Result = { ok: true } | { ok: false; error: string };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function validateVersion(v: VersionInput): string | null {
  if (!isValidRate(v.baseSlab1 ?? NaN) || !isValidRate(v.baseSlab2 ?? NaN)) {
    return `Slab 1 and slab 2 for ${BASE_LABEL} must be whole numbers from ${MIN_RATE} to ${MAX_RATE}.`;
  }
  return validateWindows(v.windows);
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
  deletePlan: (planId: string) => Result;
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
          if (!trimmed) return { ok: false, error: "Give the plan a name." };
          if (get().plans.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
            return { ok: false, error: `A plan called "${trimmed}" already exists.` };
          }
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
          const plan = get().plans.find((p) => p.id === planId);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
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
          const plan = get().plans.find((p) => p.id === planId);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
          const trimmed = name.trim();
          if (!trimmed) return { ok: false, error: "Give the plan a name." };
          if (get().plans.some((p) => p.id !== planId && p.name.toLowerCase() === trimmed.toLowerCase())) {
            return { ok: false, error: `A plan called "${trimmed}" already exists.` };
          }
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

        deletePlan: (planId) => {
          const book = get();
          const plan = book.plans.find((p) => p.id === planId);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
          if (plan.isDefault) return { ok: false, error: "The Default plan can't be deleted." };
          if (book.assignments.some((a) => a.planId === planId)) {
            return {
              ok: false,
              error: "Swaps have been, or will be, priced on this plan. Move its stations to another plan instead of deleting it.",
            };
          }
          set((s) => ({
            plans: s.plans.filter((p) => p.id !== planId),
            changes: s.changes.filter((c) => c.planId !== planId),
          }));
          return { ok: true };
        },

        resetToSeed: () => set({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
      };
    },
    {
      name: "zeno-pricing-plans",
      // 2: versions carry `windows`. 3: nothing is scheduled. 4–5: history time format.
      // 6: rest-of-day rates and `isBase` windows.
      // Anything saved before is reset to the seed.
      version: 6,
      partialize: (s) => ({ plans: s.plans, assignments: s.assignments, changes: s.changes }),
      migrate: () => ({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
    }
  )
);
