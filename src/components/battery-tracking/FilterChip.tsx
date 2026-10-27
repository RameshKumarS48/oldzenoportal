"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { stationByCode, type AssetRef } from "@/lib/mock/battery-tracking";

// Asset Tracking's filter chip (FilterBar.tsx). Its styles are repeated here
// so that file stays untouched.
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * Asset Tracking's "Field: value" chip, with × to remove it. There's nothing
 * to open, so unlike Asset Tracking's chips the label isn't a button.
 */
export function FilterChip({ label, value, removeLabel, onRemove }: {
  label: string;
  value: string;
  /** The × button's name, saying what removing does. */
  removeLabel: string;
  onRemove: () => void;
}) {
  const text = `${label}: ${value}`;
  return (
    <span className={cn("inline-flex max-w-full shrink-0 items-center rounded-full text-xs font-medium", TINT)}>
      <span title={text} className="inline-flex min-w-0 items-center gap-1 pl-3 pr-1.5 py-1">
        <span className="shrink-0">{label}:</span>
        <span className="truncate max-w-40">{value}</span>
      </span>
      <button onClick={onRemove} aria-label={removeLabel} className={cn("mr-1 p-0.5 rounded-full hover:bg-zeno-teal/15", RING)}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/**
 * The chip for a search naming one vehicle or station exactly:
 * "Station: BS0025 · Thika Rd" or "Vehicle: ME92ZPSBB1J000760".
 */
export function searchChip(asset: AssetRef): { label: string; value: string; removeLabel: string } {
  if (asset.type === "vehicle") {
    return { label: "Vehicle", value: asset.vin, removeLabel: `Remove vehicle ${asset.vin} and clear the search` };
  }
  // The street, the address's first part, places a station without its whole address.
  const street = stationByCode(asset.code)?.longAddress.split(",")[0];
  return {
    label: "Station",
    value: street ? `${asset.code} · ${street}` : asset.code,
    removeLabel: `Remove station ${asset.code} and clear the search`,
  };
}
