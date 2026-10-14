"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AssetVehicle } from "@/store/asset-tracking";

export type ColumnId =
  | "vin" | "plate" | "customerName" | "customerPhone" | "tenant" | "status" | "connectivity"
  | "immobilization" | "dateOfSale" | "imei" | "storeCode" | "odometer" | "vcu" | "zeConnect" | "evcc";

/**
 * The list's columns, in display order. `sortKey` marks the sortable ones and
 * names the field the store's existing `setSort` sorts by: ordered values
 * sort, categories are filtered, identifiers are searched.
 *
 * `width` (px, including px-3 padding) fits the longest current value or the
 * header, whichever is wider, measured in Geist / Geist Mono. It's fixed, so a
 * column is the same width whichever others are showing. IDs fit in full;
 * Customer Name truncates past 128px of text (one name today).
 */
export const COLUMNS: { id: ColumnId; label: string; width: number; sortKey?: keyof AssetVehicle; byDefault: boolean }[] = [
  { id: "vin", label: "VIN", width: 152, byDefault: true },
  { id: "plate", label: "Plate", width: 84, byDefault: true },
  { id: "customerName", label: "Customer Name", width: 152, sortKey: "customerName", byDefault: true },
  { id: "customerPhone", label: "Customer Phone", width: 132, byDefault: true },
  { id: "tenant", label: "Tenant", width: 200, byDefault: true },
  { id: "status", label: "Status", width: 76, byDefault: true },
  // Sorts by the status itself; the last-connected text doesn't sort by time (see the decisions doc).
  { id: "connectivity", label: "Connectivity", width: 124, sortKey: "connectivity", byDefault: true },
  { id: "immobilization", label: "Immobilization", width: 120, byDefault: true },
  { id: "dateOfSale", label: "Date of Sale", width: 112, sortKey: "dateOfSale", byDefault: true },
  { id: "imei", label: "IMEI", width: 136, byDefault: true },
  { id: "storeCode", label: "Store Code", width: 136, byDefault: false },
  { id: "odometer", label: "Odo", width: 80, sortKey: "odometer", byDefault: false },
  { id: "vcu", label: "VCU", width: 92, byDefault: false },
  { id: "zeConnect", label: "ZeConnect", width: 136, byDefault: false },
  { id: "evcc", label: "EVCC", width: 120, byDefault: false },
];

export const DEFAULT_COLUMNS: ColumnId[] = COLUMNS.filter((c) => c.byDefault).map((c) => c.id);

/** A saved selection, cleaned: known ids only, in column order, VIN always in. Anything unreadable is the default. */
function parse(raw: string | null): ColumnId[] {
  if (raw === null) return DEFAULT_COLUMNS;
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return DEFAULT_COLUMNS;
    return COLUMNS.filter((c) => c.id === "vin" || saved.includes(c.id)).map((c) => c.id);
  } catch {
    return DEFAULT_COLUMNS;
  }
}

// Writes land here too, so the selection still works for this visit when
// localStorage is unavailable (private windows, blocked site data).
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The visible columns, remembered per signed-in user in this browser's
 * localStorage. The server render and any storage failure fall back to the default set.
 */
export function useVisibleColumns(userId: string | undefined): [ColumnId[], (cols: ColumnId[]) => void] {
  const key = `zeno:asset-tracking:columns:${userId ?? "anonymous"}`;
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const visible = useMemo(() => parse(raw), [raw]);

  const setVisible = useCallback(
    (cols: ColumnId[]) => {
      const value = JSON.stringify(cols);
      memory.set(key, value);
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Kept in memory for this visit only.
      }
      listeners.forEach((l) => l());
    },
    [key]
  );

  return [visible, setVisible];
}
