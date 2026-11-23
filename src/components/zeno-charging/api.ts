"use client";

/**
 * Zeno Charging's data and rights for the pages. In this prototype the data
 * is the browser store (src/store/charging.ts) and rights come from Dome's
 * role; the functions are shaped like the API engineers will build
 * (list, create, update with version, archive, restore, history).
 */
import { useSyncExternalStore } from "react";
import { useAccess } from "@/lib/access";
import { useAuthStore } from "@/store/auth";
import { chargingCan } from "@/lib/charging/permissions";
import { useChargingStore, type AuditEntry, type ChargingDraft, type SaveOptions, type SaveResult } from "@/store/charging";
import type { ChargingAsset, ChargingAssetInput } from "@/lib/charging/fields";

export type { AuditEntry, ChargingDraft, SaveResult };

export interface Me {
  name: string;
  can: { view: boolean; write: boolean; restore: boolean; overrideId: boolean };
}

const noop = () => () => {};
/** The store lives in localStorage: wait for the browser before reading it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function useCharging(): { assets: ChargingAsset[]; me: Me } {
  const assets = useChargingStore((s) => s.assets);
  const { role, canView, canWrite } = useAccess();
  const user = useAuthStore((s) => s.user);
  return {
    assets,
    me: {
      name: user?.name ?? user?.email ?? "Someone",
      can: { view: canView("charging"), write: canWrite("charging"), restore: chargingCan(role, "restore"), overrideId: chargingCan(role, "overrideId") },
    },
  };
}

export function useHistory(id: string): AuditEntry[] {
  const audit = useChargingStore((s) => s.audit);
  return audit.filter((e) => e.assetId === id).sort((a, b) => b.at.localeCompare(a.at));
}

type Opts = Omit<SaveOptions, "actor">;
const actor = () => useAuthStore.getState().user?.name ?? "Someone";
const isSuperAdmin = () => chargingCan(useAuthStore.getState().user?.role, "overrideId");

export const createAsset = (asset: ChargingAssetInput, o: Opts = {}) =>
  useChargingStore.getState().createAsset(asset, { ...o, actor: actor(), allowIdFormat: !!o.allowIdFormat && isSuperAdmin() });
export const updateAsset = (id: string, asset: ChargingAssetInput, version: number, o: Opts = {}) =>
  useChargingStore.getState().updateAsset(id, asset, version, { ...o, actor: actor(), allowIdFormat: !!o.allowIdFormat && isSuperAdmin(), canChangeAssetId: isSuperAdmin() });
export const archiveAsset = (id: string, reason: string) => useChargingStore.getState().setArchived(id, true, actor(), reason || undefined);
export const restoreAsset = (id: string) => useChargingStore.getState().setArchived(id, false, actor());
export const resetCharging = () => useChargingStore.getState().reset();

export const useDrafts = () => useChargingStore((s) => s.drafts);
export const saveDraft = (d: Omit<ChargingDraft, "id" | "createdAt" | "updatedAt" | "createdBy"> & { id?: string }) => useChargingStore.getState().saveDraft(d, actor());
export const deleteDraft = (id: string) => useChargingStore.getState().deleteDraft(id);
export const getDraft = (id: string) => useChargingStore.getState().drafts.find((d) => d.id === id);
