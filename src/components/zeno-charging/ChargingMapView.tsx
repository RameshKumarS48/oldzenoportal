"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChargingAsset } from "@/lib/charging/fields";
import { cn } from "@/lib/utils";

const ChargingMap = dynamic(() => import("./ChargingMap").then((m) => m.ChargingMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-400">Loading map…</div>,
});

// The pin colours (ASSET_META in src/lib/map-data.ts), repeated here so the legend doesn't load the map library.
const LEGEND = [
  { label: "Swap station", color: "#F59E0B" },
  { label: "Fast charger", color: "#EF4444" },
];

/**
 * The map with its legend and count. `activeId` shows that asset as the active
 * pin and centres on it (the asset page); without it, the map frames every asset.
 */
export function ChargingMapView({
  assets, activeId, onOpen, className, compact,
}: {
  assets: ChargingAsset[];
  activeId?: string;
  onOpen: (id: string) => void;
  className?: string;
  /** The asset page's side map: a smaller legend, no count. */
  compact?: boolean;
}) {
  const placed = assets.filter((a) => a.lat != null && a.lng != null);
  if (placed.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border border-slate-200 bg-white", className)}>
        <EmptyState
          icon={MapPin}
          title={assets.length === 0 ? "No charging assets match these filters" : "None of these assets has coordinates"}
          description={assets.length === 0 ? "Clear a filter to bring assets back onto the map." : "Add latitude and longitude to place them on the map. They are still in List View."}
        />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-slate-200", className)}>
      <ChargingMap assets={placed} activeId={activeId} onOpen={onOpen} />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />{l.label}</span>
        ))}
        {!compact && <span className="flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[9px] text-white">3</span>Zoom in</span>}
      </div>
      {!compact && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
          {placed.length.toLocaleString()} of {assets.length.toLocaleString()} assets on the map
        </p>
      )}
    </div>
  );
}
