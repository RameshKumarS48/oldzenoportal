"use client";

import type { ChargingAsset } from "@/lib/charging/fields";
import { cn } from "@/lib/utils";

/** Archived, Commissioned (with its access when not Public) or Decommissioned. */
export function StatusBadge({ asset }: { asset: ChargingAsset }) {
  const [text, cls] = asset.archivedAt
    ? ["Archived", "bg-slate-100 text-slate-500"]
    : asset.commissionStatus === "Commissioned"
      ? [asset.accessType === "Public" ? "Commissioned" : `Commissioned · ${asset.accessType}`, "bg-emerald-50 text-emerald-700"]
      : ["Decommissioned", "bg-red-50 text-red-700"];
  return <span className={cn("inline-block truncate rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{text}</span>;
}
