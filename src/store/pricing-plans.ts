import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_ASSIGNMENTS, SEED_CHANGES, SEED_PLANS } from "@/lib/mock/pricing-plans";
import { normaliseStationId, resolvePlan, sortedVersions, versionAt } from "@/lib/pricing/engine";
import { fmtEat, fmtRate, fmtWindow } from "@/lib/pricing/format";
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

export type VersionInput = Pick<
  PlanVersion,
  "effectiveFrom" | "standardRate" | "customWindowStart" | "customWindowEnd" | "customRate" | "notifyLeadHours" | "notificationText"
>;

type Result = { ok: true } | { ok: false; error: string };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function hoursFromNow(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600_000;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateVersion(v: VersionInput): string | null {
  if (!(v.standardRate > 0)) return "Enter a Standard rate above zero.";
  if (!(v.customRate > 0)) return "Enter a Custom rate above zero.";
  if (!HHMM.test(v.customWindowStart) || !HHMM.test(v.customWindowEnd)) return "Enter the custom window as HH:mm.";
  if (v.customWindowStart === v.customWindowEnd) return "The custom window can't start and end at the same time.";
  if (Number.isNaN(new Date(v.effectiveFrom).getTime())) return "Pick when the rates take effect.";
  if (!(v.notifyLeadHours >= 1)) return "Riders need at least 1 hour's notice.";
  if (hoursFromNow(v.effectiveFrom) < v.notifyLeadHours) {
    return `Rates can take effect no sooner than ${v.notifyLeadHours} h from now, so riders get notice. Pick a later time.`;
  }
  if (!v.notificationText.trim()) return "Write the message riders will receive.";
  return null;
}

function rateSummary(v: VersionInput): string {
  return `Standard ${fmtRate(v.standardRate)}, Custom window ${fmtWindow(v.customWindowStart, v.customWindowEnd)} at ${fmtRate(v.customRate)}`;
}

/** Describe what moved between two versions, for the change log. */
function diffSummary(prev: PlanVersion, next: VersionInput): { kind: PlanChange["kind"]; summary: string } {
  const parts: string[] = [];
  if (prev.standardRate !== next.standardRate) parts.push(`Standard rate KES ${prev.standardRate} → ${next.standardRate}/kWh`);
  if (prev.customRate !== next.customRate) parts.push(`Custom rate KES ${prev.customRate} → ${next.customRate}/kWh`);
  const windowMoved = prev.customWindowStart !== next.customWindowStart || prev.customWindowEnd !== next.customWindowEnd;
  if (windowMoved) {
    parts.push(`Custom window ${fmtWindow(prev.customWindowStart, prev.customWindowEnd)} → ${fmtWindow(next.customWindowStart, next.customWindowEnd)}`);
  }
  const ratesMoved = prev.standardRate !== next.standardRate || prev.customRate !== next.customRate;
  return {
    kind: windowMoved && !ratesMoved ? "window_changed" : "rates_changed",
    summary: parts.length ? parts.join("; ") : "Re-issued the same rates with a new rider message",
  };
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
            versions: [{ ...version, id: uid("pv"), createdBy: by, createdAt: now }],
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
                ? { ...p, versions: [...p.versions, { ...version, id: uid("pv"), createdBy: by, createdAt: now }] }
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
      version: 1,
      partialize: (s) => ({ plans: s.plans, assignments: s.assignments, changes: s.changes }),
      migrate: () => ({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
    }
  )
);
