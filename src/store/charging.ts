"use client";

/**
 * Zeno Charging, prototype store: the Charging Asset Master sheet as seed
 * data, kept in the browser like Dome's other mock data ("Reset" brings the
 * seed back). Every write runs the same validation a real backend would, and
 * records who changed what, so engineers can see the intended behaviour.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import seed from "@/lib/mock/charging-seed.json";
import { FIELDS, type ChargingAsset, type ChargingAssetInput } from "@/lib/charging/fields";
import { validateAsset, type ValidationResult } from "@/lib/charging/validate";

/** Bump with the seed (or the stored shape) so browsers reload it. */
export const CHARGING_SEED_REVISION = 1;
const SEED = seed as ChargingAsset[];
const SEED_DATE = "2026-11-23T00:00:00.000Z";

export interface AuditEntry {
  id: string;
  assetId: string; // internal id
  actor: string;
  action: "import" | "create" | "update" | "archive" | "restore";
  /** { field: [before, after] }, a reason or a note. */
  changes: Record<string, unknown> | null;
  at: string;
}

export type SaveResult =
  | { ok: true; asset: ChargingAsset }
  | { ok: false; error: string; validation?: ValidationResult; stale?: boolean };

/** A new asset someone started and saved to finish later: the form as it was, unvalidated. */
export interface ChargingDraft {
  id: string;
  /** Every form field as typed (strings, like the form holds them). */
  values: Record<string, string>;
  /** The step to reopen at (0-based). */
  step: number;
  siteMode: "existing" | "new";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveOptions {
  actor: string;
  /** The person saw the possible-duplicate warnings and chose to save. */
  confirmWarnings?: boolean;
  /** Super Admin keeps an Asset ID that isn't in the usual format. */
  allowIdFormat?: boolean;
  /** The asset starts a new site, so its Site ID must not be in use. */
  newSite?: boolean;
}

interface ChargingState {
  assets: ChargingAsset[];
  audit: AuditEntry[];
  drafts: ChargingDraft[];
  /** Saves a draft (new or existing id); returns its id. */
  saveDraft: (d: Omit<ChargingDraft, "id" | "createdAt" | "updatedAt" | "createdBy"> & { id?: string }, actor: string) => string;
  deleteDraft: (id: string) => void;
  createAsset: (input: ChargingAssetInput, o: SaveOptions) => SaveResult;
  updateAsset: (id: string, input: ChargingAssetInput, version: number, o: SaveOptions & { canChangeAssetId: boolean }) => SaveResult;
  setArchived: (id: string, archived: boolean, actor: string, reason?: string) => SaveResult;
  reset: () => void;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ca-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const seedAudit = (): AuditEntry[] => SEED.map((a) => ({ id: `import-${a.id}`, assetId: a.id, actor: "Imported from the sheet", action: "import", changes: null, at: SEED_DATE }));

function diff(before: ChargingAssetInput, after: ChargingAssetInput): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const f of FIELDS) {
    const a = before[f.key] ?? null;
    const b = after[f.key] ?? null;
    if (a !== b) out[f.key] = [a, b];
  }
  return out;
}

function check(input: ChargingAssetInput, others: ChargingAsset[], selfId: string | undefined, o: SaveOptions): SaveResult | null {
  const validation = validateAsset(input, { others, selfId, allowIdFormat: o.allowIdFormat, newSite: o.newSite });
  if (Object.keys(validation.errors).length) return { ok: false, error: "Some fields need fixing.", validation };
  if (validation.warnings.length && !o.confirmWarnings) return { ok: false, error: "Please confirm the possible duplicates.", validation };
  return null;
}

export const useChargingStore = create<ChargingState>()(
  persist(
    (set, get) => ({
      assets: SEED,
      audit: seedAudit(),
      drafts: [],

      saveDraft: (d, actor) => {
        const now = new Date().toISOString();
        const existing = d.id ? get().drafts.find((x) => x.id === d.id) : undefined;
        const draft: ChargingDraft = existing
          ? { ...existing, values: d.values, step: d.step, siteMode: d.siteMode, updatedAt: now }
          : { id: newId(), values: d.values, step: d.step, siteMode: d.siteMode, createdBy: actor, createdAt: now, updatedAt: now };
        set((s) => ({ drafts: existing ? s.drafts.map((x) => (x.id === draft.id ? draft : x)) : [...s.drafts, draft] }));
        return draft.id;
      },

      deleteDraft: (id) => set((s) => ({ drafts: s.drafts.filter((x) => x.id !== id) })),

      createAsset: (input, o) => {
        const problem = check(input, get().assets, undefined, o);
        if (problem) return problem;
        const now = new Date().toISOString();
        const asset: ChargingAsset = { ...input, id: newId(), version: 1, needsAttention: null, archivedAt: null, createdBy: o.actor, createdAt: now, updatedBy: o.actor, updatedAt: now };
        const entry: AuditEntry = { id: newId(), assetId: asset.id, actor: o.actor, action: "create", changes: o.allowIdFormat ? { note: "Asset ID format check overridden" } : null, at: now };
        set((s) => ({ assets: [...s.assets, asset], audit: [...s.audit, entry] }));
        return { ok: true, asset };
      },

      updateAsset: (id, input, version, o) => {
        const current = get().assets.find((a) => a.id === id);
        if (!current) return { ok: false, error: "This asset no longer exists." };
        if (current.archivedAt) return { ok: false, error: "Restore this asset before editing it." };
        if (current.version !== version) {
          return { ok: false, stale: true, error: `Changed by ${current.updatedBy} at ${current.updatedAt.slice(0, 16).replace("T", " ")} UTC since you opened it. Reload to see their changes.` };
        }
        // An asset stays at its site; its Asset ID changes only with Super Admin rights (or when it had none).
        input = { ...input, siteId: current.siteId };
        if (current.assetId && input.assetId !== current.assetId && !o.canChangeAssetId) {
          return { ok: false, error: "Only a Super Admin can change an Asset ID.", validation: { errors: { assetId: "Only a Super Admin can change this." }, warnings: [] } };
        }
        const problem = check(input, get().assets, id, o);
        if (problem) return problem;
        const changes = diff(current, input);
        if (!Object.keys(changes).length && !current.needsAttention) return { ok: true, asset: current };
        const now = new Date().toISOString();
        const asset: ChargingAsset = { ...current, ...input, version: current.version + 1, needsAttention: null, updatedBy: o.actor, updatedAt: now };
        const entry: AuditEntry = { id: newId(), assetId: id, actor: o.actor, action: "update", changes: { ...changes, ...(o.allowIdFormat ? { note: "Asset ID format check overridden" } : {}) }, at: now };
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? asset : a)), audit: [...s.audit, entry] }));
        return { ok: true, asset };
      },

      setArchived: (id, archived, actor, reason) => {
        const current = get().assets.find((a) => a.id === id);
        if (!current) return { ok: false, error: "This asset no longer exists." };
        if (!!current.archivedAt === archived) return { ok: true, asset: current };
        const now = new Date().toISOString();
        const asset: ChargingAsset = { ...current, archivedAt: archived ? now : null, version: current.version + 1, updatedBy: actor, updatedAt: now };
        const entry: AuditEntry = { id: newId(), assetId: id, actor, action: archived ? "archive" : "restore", changes: reason ? { reason } : null, at: now };
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? asset : a)), audit: [...s.audit, entry] }));
        return { ok: true, asset };
      },

      reset: () => set({ assets: SEED, audit: seedAudit(), drafts: [] }),
    }),
    {
      name: "zeno-charging",
      version: CHARGING_SEED_REVISION,
      partialize: (s) => ({ assets: s.assets, audit: s.audit, drafts: s.drafts }),
      migrate: () => ({ assets: SEED, audit: seedAudit(), drafts: [] }),
    },
  ),
);
