import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_ASSIGNMENTS, SEED_CHANGES, SEED_PLANS } from "@/lib/mock/pricing-plans";
import { normaliseStationId, resolvePlan, sortedVersions, versionAt } from "@/lib/pricing/engine";
import { fmtEat } from "@/lib/pricing/format";
import {
  fmtRateWindow,
  fmtWindowCount,
  legacyFromWindows,
  sameWindows,
  sortWindows,
  validateWindows,
  windowsSummary,
} from "@/lib/pricing/windows";
import type {
  PlanChange,
  PlanVersion,
  PricingBook,
  PricingPlan,
  StationAssignment,
} from "@/lib/pricing/types";

/** Assignment moves change what riders pay too, so they get the same notice. */
export const ASSIGNMENT_LEAD_HOURS = 24;
export const DEFAULT_LEAD_HOURS = 24;

/** What the forms send: windows only. The legacy rate fields are filled in on save. */
export type VersionInput = Pick<PlanVersion, "effectiveFrom" | "windows" | "notifyLeadHours" | "notificationText">;

type Result = { ok: true } | { ok: false; error: string };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function hoursFromNow(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600_000;
}

export function validateVersion(v: VersionInput): string | null {
  const windowError = validateWindows(v.windows);
  if (windowError) return windowError;
  if (Number.isNaN(new Date(v.effectiveFrom).getTime())) return "Pick when the rates take effect.";
  if (!(v.notifyLeadHours >= 1)) return "Riders need at least 1 hour's notice.";
  if (hoursFromNow(v.effectiveFrom) < v.notifyLeadHours) {
    return `Rates can take effect no sooner than ${v.notifyLeadHours} h from now, so riders get notice. Pick a later time.`;
  }
  if (!v.notificationText.trim()) return "Write the message riders will receive.";
  return null;
}

function rateSummary(v: VersionInput): string {
  return `${fmtWindowCount(v.windows.length)}, ${windowsSummary(v.windows)}`;
}

/**
 * Describe what moved between two versions, for the change log. Same window
 * times: each rate that changed. New times: the whole new set.
 */
function diffSummary(prev: PlanVersion, next: VersionInput): { kind: PlanChange["kind"]; summary: string } {
  if (sameWindows(prev.windows, next.windows)) {
    return { kind: "rates_changed", summary: "Re-issued the same rates with a new rider message" };
  }
  const before = sortWindows(prev.windows);
  const after = sortWindows(next.windows);
  const sameTimes = before.length === after.length && before.every((w, i) => w.start === after[i].start && w.end === after[i].end);
  if (sameTimes) {
    const parts = before
      .map((w, i) => ({ w, n: after[i] }))
      .filter(({ w, n }) => w.slab1 !== n.slab1 || w.slab2 !== n.slab2)
      .map(({ w, n }) => `${fmtRateWindow(w)} ${w.slab1}/${w.slab2} → ${n.slab1}/${n.slab2}`);
    return { kind: "rates_changed", summary: parts.join("; ") };
  }
  const count = before.length === after.length ? fmtWindowCount(after.length) : `Windows ${before.length} → ${after.length}`;
  return { kind: "window_changed", summary: `${count}: ${windowsSummary(after)}` };
}

/** A new version as stored: the windows plus the legacy fields derived from them. */
function toVersion(v: VersionInput, by: string, at: string): PlanVersion {
  return { ...v, ...legacyFromWindows(v.windows), id: uid("pv"), createdBy: by, createdAt: at };
}

interface PricingState extends PricingBook {
  changes: PlanChange[];
  createPlan: (input: { name: string; description: string; version: VersionInput }, by: string) => Result & { planId?: string };
  addVersion: (planId: string, version: VersionInput, by: string) => Result;
  renamePlan: (planId: string, name: string, description: string, by: string) => Result;
  /** Move stations onto a plan, or back to Default with `planId: null`. */
  assignStations: (planId: string | null, stationIds: string[], effectiveFrom: string, by: string) => Result;
  cancelAssignment: (assignmentId: string, by: string) => Result;
  deletePlan: (planId: string) => Result;
  resetToSeed: () => void;
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set, get) => {
      const log = (entry: Omit<PlanChange, "id" | "at">) =>
        set((s) => ({ changes: [{ ...entry, id: uid("pc"), at: new Date().toISOString() }, ...s.changes] }));

      return {
        plans: SEED_PLANS,
        assignments: SEED_ASSIGNMENTS,
        changes: SEED_CHANGES,

        createPlan: ({ name, description, version }, by) => {
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
            description: description.trim(),
            isDefault: false,
            createdAt: now,
            versions: [toVersion(version, by, now)],
          };
          set((s) => ({ plans: [...s.plans, plan] }));
          log({ planId, by, kind: "created", summary: `Created plan: ${rateSummary(version)}`, effectiveFrom: version.effectiveFrom });
          return { ok: true, planId };
        },

        addVersion: (planId, version, by) => {
          const plan = get().plans.find((p) => p.id === planId);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
          const error = validateVersion(version);
          if (error) return { ok: false, error };

          // The version a rider would otherwise get at that moment.
          const prev = versionAt(plan, version.effectiveFrom) ?? sortedVersions(plan)[0];
          const now = new Date().toISOString();
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === planId
                ? { ...p, versions: [...p.versions, toVersion(version, by, now)] }
                : p
            ),
          }));
          const { kind, summary } = diffSummary(prev, version);
          log({ planId, by, kind, summary, effectiveFrom: version.effectiveFrom });
          return { ok: true };
        },

        renamePlan: (planId, name, description, by) => {
          const plan = get().plans.find((p) => p.id === planId);
          if (!plan) return { ok: false, error: "That plan no longer exists." };
          const trimmed = name.trim();
          if (!trimmed) return { ok: false, error: "Give the plan a name." };
          if (get().plans.some((p) => p.id !== planId && p.name.toLowerCase() === trimmed.toLowerCase())) {
            return { ok: false, error: `A plan called "${trimmed}" already exists.` };
          }
          if (trimmed === plan.name && description.trim() === plan.description) return { ok: true };
          set((s) => ({
            plans: s.plans.map((p) => (p.id === planId ? { ...p, name: trimmed, description: description.trim() } : p)),
          }));
          log({
            planId, by, kind: "renamed",
            summary: trimmed === plan.name ? "Updated the description" : `Renamed "${plan.name}" → "${trimmed}"`,
          });
          return { ok: true };
        },

        assignStations: (planId, stationIds, effectiveFrom, by) => {
          const ids = Array.from(new Set(stationIds.map(normaliseStationId)));
          if (ids.length === 0) return { ok: false, error: "Select at least one station." };
          if (Number.isNaN(new Date(effectiveFrom).getTime())) return { ok: false, error: "Pick when the move takes effect." };
          if (hoursFromNow(effectiveFrom) < ASSIGNMENT_LEAD_HOURS) {
            return {
              ok: false,
              error: `Station moves can take effect no sooner than ${ASSIGNMENT_LEAD_HOURS} h from now, so riders get notice.`,
            };
          }
          const target = planId ? get().plans.find((p) => p.id === planId) : null;
          if (planId && !target) return { ok: false, error: "That plan no longer exists." };

          // Where each station would otherwise be at that moment, for the log.
          const book = get();
          const leaving = new Map<string, string[]>();
          for (const id of ids) {
            const from = resolvePlan(book, id, effectiveFrom).plan;
            if (from.id === planId || (planId === null && from.isDefault)) continue;
            leaving.set(from.id, [...(leaving.get(from.id) ?? []), id]);
          }

          const assignedAt = new Date().toISOString();
          const rows: StationAssignment[] = ids.map((stationId) => ({
            id: uid("sa"), stationId, planId, effectiveFrom, assignedBy: by, assignedAt,
          }));
          set((s) => ({ assignments: [...s.assignments, ...rows] }));

          const when = fmtEat(effectiveFrom);
          if (target) {
            log({
              planId: target.id, by, kind: "stations_assigned", effectiveFrom,
              summary: `Assigned ${ids.length} station${ids.length === 1 ? "" : "s"} from ${when}: ${ids.join(", ")}`,
            });
          }
          leaving.forEach((moved, fromId) => {
            const fromPlan = book.plans.find((p) => p.id === fromId);
            if (!fromPlan || fromPlan.isDefault) return;
            log({
              planId: fromId, by, kind: "stations_unassigned", effectiveFrom,
              summary: `${moved.join(", ")} ${moved.length === 1 ? "moves" : "move"} to ${target?.name ?? "Default"} from ${when}`,
            });
          });
          return { ok: true };
        },

        cancelAssignment: (assignmentId, by) => {
          const a = get().assignments.find((x) => x.id === assignmentId);
          if (!a) return { ok: false, error: "That station move no longer exists." };
          if (new Date(a.effectiveFrom).getTime() <= Date.now()) {
            return { ok: false, error: "That move has already taken effect. Schedule a new move instead." };
          }
          set((s) => ({ assignments: s.assignments.filter((x) => x.id !== assignmentId) }));
          if (a.planId) {
            log({
              planId: a.planId, by, kind: "stations_unassigned", effectiveFrom: a.effectiveFrom,
              summary: `Cancelled the scheduled move of ${a.stationId} (was due ${fmtEat(a.effectiveFrom)})`,
            });
          }
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
      // 2: versions carry `windows`; anything saved before is reset to the seed.
      version: 2,
      partialize: (s) => ({ plans: s.plans, assignments: s.assignments, changes: s.changes }),
      migrate: () => ({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
    }
  )
);
