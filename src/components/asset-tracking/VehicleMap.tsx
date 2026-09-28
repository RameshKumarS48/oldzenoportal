"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { popupHtml, regionForCoords, REGION_LABELS } from "@/lib/map-data";
import type { MapAsset } from "@/lib/map-data";
import type { AssetVehicle } from "@/store/asset-tracking";

const FleetMap = dynamic(() => import("@/components/map/FleetMap").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

const CONNECTIVITY_LABELS: Record<AssetVehicle["connectivity"], string> = {
  Online: "Online",
  Offline: "Offline",
  GpsOffline: "GPS offline",
  CloudOffline: "Cloud offline",
};

/**
 * Map View for Asset Tracking. These vehicles carry real coordinates from the
 * tracker, so pins sit where the bike last reported rather than on a synthesized
 * scatter. It reads the same filtered list as the table, so switching views
 * never changes which vehicles you are looking at.
 */
export function VehicleMap({ vehicles, className }: { vehicles: AssetVehicle[]; className?: string }) {
  const assets = useMemo<MapAsset[]>(
    () =>
      vehicles
        // A bike that has never reported has no position to draw.
        .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.long) && (v.lat !== 0 || v.long !== 0))
        .map((v) => {
          const region = regionForCoords(v.long, v.lat);
          const label = v.plate || v.vin;
          return {
            id: v.id,
            kind: "vehicle" as const,
            lng: v.long,
            lat: v.lat,
            region,
            label,
            html: popupHtml("vehicle", label, [
              ["VIN", v.vin],
              ["Rider", v.customerName],
              ["Tenant", v.tenant],
              ["Connectivity", CONNECTIVITY_LABELS[v.connectivity]],
              ["Immobilisation", v.immobilization],
              ["Battery", `${v.soc}%`],
              ["Odometer", `${v.odometer.toLocaleString()} km`],
              ["Nearest town", REGION_LABELS[region]],
              ["Last seen", v.lastLocationTime],
            ]),
          };
        }),
    [vehicles]
  );

  if (assets.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-slate-200 bg-white ${className ?? ""}`}>
        <EmptyState
          icon={MapPin}
          title={vehicles.length === 0 ? "No vehicles match these filters" : "No vehicle has reported a position"}
          description={
            vehicles.length === 0
              ? "Clear a filter to bring vehicles back onto the map."
              : "These vehicles are in the fleet but none has sent a location yet. They still appear in List View."
          }
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 ${className ?? ""}`}>
      <FleetMap assets={assets} mode="pins" />
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
        {assets.length.toLocaleString()} of {vehicles.length.toLocaleString()} vehicles reporting a position
      </p>
    </div>
  );
}
