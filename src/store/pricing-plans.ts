import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALL_STATION_IDS, PRICING_STATIONS, SEED_ASSIGNMENTS, SEED_CHANGES, SEED_PLANS } from "@/lib/mock/pricing-plans";
import { COUNTRIES, countryOf, type CountryCode } from "@/lib/pricing/country";
import { sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import { summarizeMoves } from "@/lib/pricing/moves";
import {
  changeParts,
  legacyFromWindows,
  rateRows,
  validateWindows,
  versionSummary,
} from "@/lib/pricing/windows";
import type {
  MoveReason,
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

/** `maxRate` is the plan currency's top rate; KES's by default. */
export function validateVersion(v: VersionInput, maxRate?: number): string | null {
  return validateWindows(v.windows, maxRate);
}

const STATION_COUNTRY = new Map(PRICING_STATIONS.map((s) => [s.id, s.country]));

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

/**
 * The assignments and change-log entries for moving `stationIds` onto
 * `planId` (null for Default) at `at`, read against `book`. Stations already
 * there are skipped, so nothing is logged for a move that changes nothing.
 */
function planMoves(
  book: PricingBook,
  planId: string | null,
  planName: string,
  stationIds: string[],
  by: string,
  at: string,
  reason: MoveReason
): { error?: string; rows: StationAssignment[]; logs: Omit<PlanChange, "id">[] } {
  const summary = summarizeMoves(book, stationIds, planId, ALL_STATION_IDS, at);
  if (summary.unknown.length > 0) {
    return { error: `Unknown station${summary.unknown.length === 1 ? "" : "s"}: ${summary.unknown.join(", ")}.`, rows: [], logs: [] };
  }
  // A station can only be on a plan in its own country (Default is Kenya's).
  const target = countryOf((planId && book.plans.find((p) => p.id === planId)) || {});
  const abroad = summary.moves.filter((m) => (STATION_COUNTRY.get(m.id) ?? "KE") !== target.code);
  if (abroad.length > 0) {
    return { error: `${abroad.length === 1 ? "That station isn't" : "Those stations aren't"} in ${target.name}.`, rows: [], logs: [] };
  }
  const ids = summary.moves.map((m) => m.id);
  const rows: StationAssignment[] = ids.map((stationId) => ({
    id: uid("sa"), stationId, planId, effectiveFrom: at, assignedBy: by, assignedAt: at, reason,
  }));
  const logs: Omit<PlanChange, "id">[] = [];
  if (planId && ids.length > 0) {
    logs.push({
      planId, by, at, effectiveFrom: at, kind: "stations_assigned",
      summary: `Moved ${ids.length} station${ids.length === 1 ? "" : "s"} here`,
    });
  }
  const leaving = new Map<string, string[]>();
  for (const m of summary.moves) if (!m.from.isDefault) leaving.set(m.from.id, [...(leaving.get(m.from.id) ?? []), m.id]);
  leaving.forEach((moved, fromId) => {
    logs.push({
      planId: fromId, by, at, effectiveFrom: at, kind: "stations_unassigned",
      summary: `${moved.length} station${moved.length === 1 ? "" : "s"} moved to ${planName}`,
    });
  });
  return { rows, logs };
}

/** The most a create or edit note can hold. */
export const NOTE_MAX = 500;

/** A note as stored: trimmed, capped, and left out when empty. */
const cleanNote = (note?: string) => note?.trim().slice(0, NOTE_MAX) || undefined;

interface PricingState extends PricingBook {
  changes: PlanChange[];
  /** Create a plan, and move `stationIds` onto it, in one update: all or nothing. */
  createPlan: (
    input: { name: string; version: VersionInput; stationIds?: string[]; note?: string; country?: CountryCode },
    by: string
  ) => Result & { planId?: string; moved?: number };
  /** `note` goes on the change entry this logs, like every note below. */
  addVersion: (planId: string, version: VersionInput, by: string, note?: string) => Result;
  renamePlan: (planId: string, name: string, by: string, note?: string) => Result;
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

        createPlan: ({ name, version, stationIds = [], note, country = "KE" }, by) => {
          const trimmed = name.trim();
          const nameError = validatePlanName(trimmed, get().plans);
          if (nameError) return { ok: false, error: nameError };
          if (!COUNTRIES[country]) return { ok: false, error: "Choose Kenya or Uganda." };
          const error = validateVersion(version, COUNTRIES[country].maxRate);
          if (error) return { ok: false, error };

          const now = new Date().toISOString();
          const planId = uid("pp");
          const plan: PricingPlan = {
            id: planId,
            name: trimmed,
            isDefault: false,
            country,
            createdAt: now,
            versions: [toVersion(version, by, now)],
          };
          // Read the moves against the book with the new plan in it.
          const book = get();
          const moved = planMoves({ plans: [...book.plans, plan], assignments: book.assignments }, planId, trimmed, stationIds, by, now, "plan_created");
          if (moved.error) return { ok: false, error: moved.error };
          const created: PlanChange = { planId, by, at: now, effectiveFrom: now, kind: "created", summary: `Created plan: ${versionSummary(version)}`, note: cleanNote(note), id: uid("pc") };
          set((s) => ({
            plans: [...s.plans, plan],
            assignments: [...s.assignments, ...moved.rows],
            changes: [...moved.logs.map((l) => ({ ...l, id: uid("pc") })).reverse(), created, ...s.changes],
          }));
          return { ok: true, planId, moved: moved.rows.length };
        },

        addVersion: (planId, version, by, note) => {
          const plan = get().plans.find((p) => p.id === planId && !p.archived);
          if (!plan) return { ok: false, error: PLAN_GONE };
          const error = validateVersion(version, countryOf(plan).maxRate);
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
          log({ planId, by, kind, summary, note: cleanNote(note) }, now);
          return { ok: true };
        },

        renamePlan: (planId, name, by, note) => {
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
            note: cleanNote(note),
          });
          return { ok: true };
        },

        assignStations: (planId, stationIds, by) => {
          if (stationIds.length === 0) return { ok: false, error: "Select at least one station." };
          const book = get();
          const target = planId ? book.plans.find((p) => p.id === planId && !p.archived) : null;
          if (planId && !target) return { ok: false, error: PLAN_GONE };
          const at = new Date().toISOString();
          const moved = planMoves(book, planId, target?.name ?? "Default", stationIds, by, at, planId ? "assigned" : "removed");
          if (moved.error) return { ok: false, error: moved.error };
          if (moved.rows.length === 0) return { ok: false, error: `Those stations are already on ${target?.name ?? "Default"}.` };
          set((s) => ({
            assignments: [...s.assignments, ...moved.rows],
            changes: [...moved.logs.map((l) => ({ ...l, id: uid("pc") })).reverse(), ...s.changes],
          }));
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
            id: uid("sa"), stationId, planId: null, effectiveFrom: now, assignedBy: by, assignedAt: now, reason: "plan_deleted" as const,
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
      // 9: station moves record why they happened, for station history.
      // Anything saved before is reset to the seed.
      // 10: history entries name how many stations moved, not which.
      // 11: the Peak Hours Pilot plan, five rates on the day bar's full scale.
      version: 11,
      partialize: (s) => ({ plans: s.plans, assignments: s.assignments, changes: s.changes }),
      migrate: () => ({ plans: SEED_PLANS, assignments: SEED_ASSIGNMENTS, changes: SEED_CHANGES }),
    }
  )
);
