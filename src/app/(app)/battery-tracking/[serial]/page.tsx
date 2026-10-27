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
import { slotLabel } from "@/lib/mock/swap-audit";
import { Dash, LastSeenLine, mapsUrl, showCoord, Soc, splitLocation } from "@/components/battery-tracking/cells";

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
    <div className="flex justify-between items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-28">{label}</span>
      <span className="text-sm text-slate-700 text-right">{children}</span>
    </div>
  );
}

/** The vehicle detail page's Google Maps link style, lightened in dark mode like the portal's other teal links. */
const LINK =
  "inline-flex items-center gap-1.5 text-sm text-zeno-teal dark:text-(--sidebar-text) font-medium hover:underline rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * The cards' one action style: the small outline Button (ui/button.tsx, size
 * "sm"), drawn on a link, since Button renders a <button>. Its classes are
 * repeated here so that file stays untouched, with h-8 so it is 32px tall; the focus ring is the page's teal
 * one rather than Button's red. Full width, with the label on the left and the
 * icon pinned right, so the icons line up from card to card.
 */
const ACTION =
  "flex w-full items-center justify-between gap-2 rounded-lg font-medium transition-colors whitespace-nowrap " +
  "border border-slate-300 hover:bg-slate-50 text-slate-700 h-8 px-3 text-xs " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40 focus-visible:ring-offset-2";

/** A card's footer: its actions, full width and stacked 8px apart, with the same padding on every card. */
function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 px-4 py-3 border-t border-slate-100">{children}</div>;
}

/**
 * Every card's header: a small icon, a muted uppercase label naming the card,
 * then, where there is one, the value as the most prominent text and a muted
 * subtitle under it.
 */
function CardHeader({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-slate-100">
      <div className="flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-zeno-red shrink-0" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      {value && <div className="mt-1 text-base font-semibold text-slate-800">{value}</div>}
      {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
}

/** A button's label, which gives way (truncating) before the icon does. */
const ActionLabel = ({ children }: { children: React.ReactNode }) => <span className="truncate">{children}</span>;

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
  // How many batteries share this one's station or vehicle, for its asset card.
  const assetKey = (a: BatteryAsset | null) => (a ? `${a.type}:${a.type === "station" ? a.code : a.vin}` : "");
  const assetCount = battery.asset ? data.rows.filter((b) => assetKey(b.asset) === assetKey(battery.asset)).length : 0;

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
        <div className="w-full lg:w-80 shrink-0 lg:self-start lg:max-h-full lg:overflow-y-auto flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl">
            <CardHeader
              icon={BatteryCharging}
              label="Battery"
              value={
                <span className="font-mono tabular-nums">
                  <CopyButton value={battery.serialNo} label="battery serial number" onWhite />
                </span>
              }
            />
            <div className="px-4 py-1">
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
                <LastSeenLine text={battery.lastSeen} />
              </InfoRow>
              {/* Latitude, longitude, each with five decimals. */}
              <InfoRow label="Coordinates">
                {pair ? <span className="tabular-nums whitespace-nowrap">{showCoord(pair[0])}, {showCoord(pair[1])}</span> : <Dash />}
              </InfoRow>
            </div>
            {pair && (
              <CardActions>
                <a href={mapsUrl(battery.location)} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Maps (new tab)" className={ACTION}>
                  <ActionLabel>Open in Google Maps</ActionLabel>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                </a>
              </CardActions>
            )}
          </div>

          <AssetCard asset={battery.asset} count={assetCount} />
        </div>

        {/* The map, framed like the card, under a heading that says what holds the battery. */}
        <div className="h-96 lg:h-auto lg:flex-1 shrink-0 lg:shrink flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
          <h2 className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800 shrink-0">
            Last known location
            {locationSuffix(battery.asset) && (
              <span className="font-normal text-slate-500"> · {locationSuffix(battery.asset)}</span>
            )}
          </h2>
          <div className="flex-1 min-h-0">
            {pair ? (
              <BatteryMap lat={Number(pair[0])} lng={Number(pair[1])} label={`Map of battery ${battery.serialNo} at ${battery.location}`} />
            ) : (
              <EmptyState icon={BatteryCharging} title="No location reported" className="h-full" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** "in vehicle KMGY105Z" (the VIN when there's no plate), "at station BS0025", or null when in neither. */
function locationSuffix(asset: BatteryAsset | null): string | null {
  if (asset?.type === "station") return `at station ${asset.code}`;
  if (asset?.type === "vehicle") return `in vehicle ${vehicleByVin(asset.vin)?.plate || asset.vin}`;
  return null;
}

/** Battery Tracking's table searched for one vehicle or station. */
const batteriesIn = (id: string) => `/battery-tracking?q=${encodeURIComponent(id)}`;

/**
 * Where the battery is, in a card matching the details card: the station or
 * vehicle holding it, then its actions, or a muted line when it's in
 * neither. `count` is how many batteries that station or vehicle holds.
 */
function AssetCard({ asset, count }: { asset: BatteryAsset | null; count: number }) {
  const station = asset?.type === "station" ? stationByCode(asset.code) : undefined;
  const vehicle = asset?.type === "vehicle" ? vehicleByVin(asset.vin) : undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      {station ? (
        <>
          <CardHeader
            icon={Zap}
            label="Station"
            value={<span className="font-mono tabular-nums">{station.code}</span>}
            subtitle={station.shortAddress}
          />
          <div className="px-4 py-1">
            {asset?.type === "station" && <InfoRow label="Slot">{slotLabel(asset.slot)}</InfoRow>}
            <InfoRow label="Address">{station.longAddress}</InfoRow>
          </div>
          <CardActions>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(station.longAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Google Maps (new tab)"
              className={ACTION}
            >
              <ActionLabel>Open in Google Maps</ActionLabel>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </a>
            <Link href={batteriesIn(station.code)} className={ACTION}>
              <ActionLabel>Batteries in this station ({count})</ActionLabel>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </Link>
          </CardActions>
        </>
      ) : vehicle ? (
        <>
          <CardHeader icon={Bike} label="Vehicle" />
          <div className="px-4 py-1">
            <InfoRow label="VIN">
              <span className="font-mono text-xs tabular-nums">
                <CopyButton value={vehicle.vin} label="VIN" onWhite />
              </span>
            </InfoRow>
            <InfoRow label="Plate">{vehicle.plate}</InfoRow>
            <InfoRow label="Vehicle IMEI">
              <span className="font-mono text-xs tabular-nums">
                <CopyButton value={vehicle.imei} label="vehicle IMEI" onWhite />
              </span>
            </InfoRow>
          </div>
          <CardActions>
            {/* Asset Tracking keeps its search in its store, not the URL, so set it on the way there. */}
            <Link
              href="/asset-tracking"
              onClick={() => {
                const { resetFilters, setFilter } = useAssetTrackingStore.getState();
                resetFilters();
                setFilter("search", vehicle.vin);
              }}
              className={ACTION}
            >
              <ActionLabel>Open in Asset Tracking</ActionLabel>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </Link>
            <Link href={batteriesIn(vehicle.vin)} className={ACTION}>
              <ActionLabel>Batteries in this vehicle ({count})</ActionLabel>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </Link>
          </CardActions>
        </>
      ) : (
        <>
          <CardHeader icon={Zap} label="Asset" />
          <p className="px-4 py-4 text-sm text-slate-400">Not currently in a vehicle or station.</p>
        </>
      )}
    </div>
  );
}
