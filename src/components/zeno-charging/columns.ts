"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SortKey } from "./list";

export type ChargingColumnId =
  | "assetId" | "assetName" | "assetType" | "siteId" | "town" | "status" | "goLive" | "inApp"
  | "landmark" | "area" | "country" | "zone" | "access" | "partner" | "rent" | "phase" | "electricity" | "coords" | "updated";

/**
 * Zeno Charging Network's columns, in display order, as Vehicle Tracking's:
 * fixed widths (px, including padding), the sortable ones name their sort
 * key, and Asset ID can't be hidden.
 */
export const CHARGING_COLUMNS: { id: ChargingColumnId; label: string; width: number; sortKey?: SortKey; byDefault: boolean }[] = [
  { id: "assetId", label: "Asset ID", width: 210, sortKey: "assetId", byDefault: true },
  { id: "assetName", label: "Asset", width: 300, sortKey: "assetName", byDefault: true },
  { id: "assetType", label: "Type", width: 116, byDefault: true },
  { id: "siteId", label: "Site", width: 96, sortKey: "site", byDefault: true },
  { id: "town", label: "Town", width: 128, sortKey: "town", byDefault: true },
  { id: "status", label: "Status", width: 150, byDefault: true },
  { id: "goLive", label: "Go-live", width: 104, sortKey: "goLive", byDefault: true },
  { id: "inApp", label: "In app", width: 76, byDefault: true },
  { id: "landmark", label: "Landmark", width: 180, byDefault: false },
  { id: "area", label: "Area", width: 140, byDefault: false },
  { id: "country", label: "Country", width: 92, byDefault: false },
  { id: "zone", label: "Zone", width: 72, byDefault: false },
  { id: "access", label: "Access", width: 96, byDefault: false },
  { id: "partner", label: "Site partner", width: 200, byDefault: false },
  { id: "rent", label: "Monthly rent", width: 116, byDefault: false },
  { id: "phase", label: "Phase", width: 112, byDefault: false },
  { id: "electricity", label: "Electricity service", width: 196, byDefault: false },
  { id: "coords", label: "Coordinates", width: 200, byDefault: false },
  { id: "updated", label: "Last updated", width: 132, sortKey: "updated", byDefault: false },
];

export const DEFAULT_CHARGING_COLUMNS: ChargingColumnId[] = CHARGING_COLUMNS.filter((c) => c.byDefault).map((c) => c.id);

function parse(raw: string | null): ChargingColumnId[] {
  if (raw === null) return DEFAULT_CHARGING_COLUMNS;
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return DEFAULT_CHARGING_COLUMNS;
    return CHARGING_COLUMNS.filter((c) => c.id === "assetId" || saved.includes(c.id)).map((c) => c.id);
  } catch {
    return DEFAULT_CHARGING_COLUMNS;
  }
}

const memory = new Map<string, string>();
const listeners = new Set<() => void>();
function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => { listeners.delete(onChange); window.removeEventListener("storage", onChange); };
}

/** The visible columns, remembered per signed-in user in this browser. */
export function useChargingColumns(userId: string | undefined): [ChargingColumnId[], (cols: ChargingColumnId[]) => void] {
  const key = `zeno:charging:columns:${userId ?? "anonymous"}`;
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const visible = useMemo(() => parse(raw), [raw]);
  const setVisible = useCallback((cols: ChargingColumnId[]) => {
    const value = JSON.stringify(cols);
    memory.set(key, value);
    try { window.localStorage.setItem(key, value); } catch { /* this visit only */ }
    listeners.forEach((l) => l());
  }, [key]);
  return [visible, setVisible];
}
