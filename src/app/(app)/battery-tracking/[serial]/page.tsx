"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BatteryCharging, Bike, ExternalLink, Zap } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/empty-state";
import { useBatteries } from "@/components/battery-tracking/use-batteries";
import { stationByCode, vehicleByVin, type BatteryAsset } from "@/lib/mock/battery-tracking";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { Dash, LastSeen, mapsUrl, showCoord, Soc, splitLocation } from "@/components/battery-tracking/cells";

// MapLibre needs the browser; loaded as Asset Tracking's Map View loads FleetMap.
const BatteryMap = dynamic(() => import("@/components/battery-tracking/BatteryMap").then((m) => m.BatteryMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-400">Loading map…</div>
  ),
});

/** The vehicle detail page's label / value row. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-36">{label}</span>
      <span className="text-sm text-slate-700 text-right">{children}</span>
    </div>
  );
}

/** The vehicle detail page's "Show on Google Map" link style, lightened in dark mode like the portal's other teal links. */
const LINK =
  "inline-flex items-center gap-1.5 text-sm text-zeno-teal dark:text-(--sidebar-text) font-medium hover:underline rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

export default function BatteryDetailPage() {
  return (
    <AccessGuard module="vehicle">
      <Topbar title="Battery Tracking" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Back carries the table's URL query, which needs a Suspense boundary for the build. */}
        <Suspense fallback={null}>
          <BatteryDetail />
        </Suspense>
      </main>
    </AccessGuard>
  );
}

/**
 * One battery: the dev portal's detail view, laid out like the vehicle detail
 * page. The details card is on the left and a Google Maps embed on the right;
 * below lg (1024px) they stack. Back returns to the table with the search,
 * filter, sort and page it had, which arrive here as the URL query.
 */
function BatteryDetail() {
  const { serial } = useParams<{ serial: string }>();
  const serialNo = decodeURIComponent(serial ?? "");
  const query = useSearchParams().toString();
  const backHref = `/battery-tracking${query ? `?${query}` : ""}`;
  const data = useBatteries();

  // Nothing until the mock rows exist (the server render), so "not found" never flashes.
  if (!data) return null;
  const battery = data.rows.find((b) => b.serialNo === serialNo);

  if (!battery) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zeno-bg p-5">
        <EmptyState
          icon={BatteryCharging}
          title="Battery not found"
          description={`No battery has serial number ${serialNo || "(none)"}.`}
          action={
            <Link href={backHref} className={LINK}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Battery Tracking
            </Link>
          }
        />
      </div>
    );
  }

  const pair = splitLocation(battery.location);

  return (
    <>
      {/* Header */}
      <div className="flex items-center px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Body: card left, map right; stacked and scrolling below lg. */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden bg-zeno-bg p-5 gap-5">
        {/* As tall as their content, as in the dev portal, not stretched to the map. */}
        <div className="w-full lg:w-80 shrink-0 lg:self-start lg:max-h-full lg:overflow-y-auto flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <BatteryCharging className="w-5 h-5 text-zeno-red" />
                <span className="text-sm font-semibold text-slate-800">Battery</span>
                <span className="text-xs text-slate-500 ml-1 font-mono tabular-nums">
                  <CopyButton value={battery.serialNo} label="battery serial number" onWhite>
                    #SN: {battery.serialNo}
                  </CopyButton>
                </span>
              </div>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="IMEI">
                {battery.imei ? (
                  <span className="font-mono text-xs tabular-nums">
                    <CopyButton value={battery.imei} label="IMEI" onWhite />
                  </span>
                ) : (
                  <Dash />
                )}
              </InfoRow>
              <InfoRow label="SOC %">
                <Soc value={battery.soc} />
              </InfoRow>
              <InfoRow label="Last Seen (UTC)">
                <LastSeen text={battery.lastSeen} />
              </InfoRow>
              {/* Both right-aligned with five decimals, so the points line up. */}
              <InfoRow label="Latitude">
                {pair ? <span className="tabular-nums">{showCoord(pair[0])}</span> : <Dash />}
              </InfoRow>
              <InfoRow label="Longitude">
                {pair ? <span className="tabular-nums">{showCoord(pair[1])}</span> : <Dash />}
              </InfoRow>
              {pair && (
                <div className="pt-3 pb-2">
                  <a href={mapsUrl(battery.location)} target="_blank" rel="noopener noreferrer" className={LINK}>
                    Show on Google Maps
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <AssetCard asset={battery.asset} />
        </div>

        {/* The map, framed like the card. */}
        <div className="h-96 lg:h-auto lg:flex-1 shrink-0 lg:shrink bg-white border border-slate-200 rounded-xl overflow-hidden">
          {pair ? (
            <BatteryMap lat={Number(pair[0])} lng={Number(pair[1])} label={`Map of battery ${battery.serialNo} at ${battery.location}`} />
          ) : (
            <EmptyState icon={BatteryCharging} title="No location reported" className="h-full" />
          )}
        </div>
      </div>
    </>
  );
}

/** Battery Tracking's table searched for one vehicle or station. */
const batteriesIn = (id: string) => `/battery-tracking?q=${encodeURIComponent(id)}`;

/**
 * Where the battery is, in a card matching the details card: the station or
 * vehicle holding it, with links out, or a muted line when it's in neither.
 */
function AssetCard({ asset }: { asset: BatteryAsset | null }) {
  const station = asset?.type === "station" ? stationByCode(asset.code) : undefined;
  const vehicle = asset?.type === "vehicle" ? vehicleByVin(asset.vin) : undefined;
  const Icon = vehicle ? Bike : Zap;

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-5 h-5 text-zeno-red" />
          <span className="text-sm font-semibold text-slate-800">
            {station ? `In station ${station.code}` : vehicle ? "In vehicle" : "Asset"}
          </span>
        </div>
      </div>
      <div className="px-5 py-2">
        {station ? (
          <>
            <InfoRow label="Station">{station.name}</InfoRow>
            <InfoRow label="Address">{station.address}</InfoRow>
            <InfoRow label="Region">{station.region}</InfoRow>
            <div className="pt-3 pb-2 flex flex-col items-start gap-2.5">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(station.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                Open in Google Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link href={batteriesIn(station.code)} className={LINK}>
                Show all batteries in this station
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : vehicle ? (
          <>
            <InfoRow label="VIN">
              <span className="font-mono text-xs tabular-nums">
                <CopyButton value={vehicle.vin} label="VIN" onWhite />
              </span>
            </InfoRow>
            <InfoRow label="Plate">{vehicle.plate}</InfoRow>
            <InfoRow label="Model">{vehicle.model}</InfoRow>
            <InfoRow label="Vehicle IMEI">
              <span className="font-mono text-xs tabular-nums">
                <CopyButton value={vehicle.imei} label="vehicle IMEI" onWhite />
              </span>
            </InfoRow>
            <div className="pt-3 pb-2 flex flex-col items-start gap-2.5">
              {/* Asset Tracking keeps its search in its store, not the URL, so set it on the way there. */}
              <Link
                href="/asset-tracking"
                onClick={() => {
                  const { resetFilters, setFilter } = useAssetTrackingStore.getState();
                  resetFilters();
                  setFilter("search", vehicle.vin);
                }}
                className={LINK}
              >
                Open in Asset Tracking
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href={batteriesIn(vehicle.vin)} className={LINK}>
                Show all batteries in this vehicle
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <p className="py-3 text-sm text-slate-400">Not currently in a vehicle or station</p>
        )}
      </div>
    </div>
  );
}
