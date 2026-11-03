"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Archive, BatteryCharging, Bike, ClipboardList, ExternalLink, ShieldAlert, Wrench, Zap } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/empty-state";
import { useBatteries } from "@/components/battery-tracking/use-batteries";
import { stationByCode, vehicleByVin, type BatteryAsset } from "@/lib/mock/battery-tracking";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { slotLabel } from "@/lib/slot-label";
import { Dash, FlagPill, LastSeenLine, mapsUrl, showCoord, Soc, splitLocation, StatusBadge, StatusCell } from "@/components/battery-tracking/cells";
import { BatteryLogs } from "@/components/battery-tracking/BatteryLogs";
import { CHARGE_DUE_DAYS, fmtDay, fmtUtc, returnsTo, STATUS_LABELS, type Stamp } from "@/lib/mock/battery-provisioning";
import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import { cn } from "@/lib/utils";

// MapLibre needs the browser; loaded as Vehicle Tracking's Map View loads FleetMap.
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
 * Every card's header, on one line: the icon, the card's name, then its
 * identifier in muted monospace with a copy button. An identifier too long
 * for the line truncates, with the whole value on hover.
 */
function CardHeader({
  icon: Icon,
  name,
  id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  /** The identifier and what it is, for the copy button's name. */
  id?: { value: string; label: string };
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100">
      <Icon className="w-5 h-5 text-zeno-red shrink-0" />
      <span className="text-sm font-semibold text-slate-800 shrink-0">{name}</span>
      {id && (
        <CopyButton value={id.value} label={id.label} onWhite className="min-w-0 font-mono text-xs text-slate-500 tabular-nums">
          <span title={id.value} className="truncate">{id.value}</span>
        </CopyButton>
      )}
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
  const pathname = usePathname();
  const params = useSearchParams();
  // The query is the table's state, for Back, plus this page's own `tab`, which Back leaves out.
  const listParams = new URLSearchParams(params.toString());
  listParams.delete("tab");
  const query = listParams.toString();
  const backHref = `/battery-tracking${query ? `?${query}` : ""}`;
  // The tab starts from the URL (so a reload keeps it); switching writes it back, replacing
  // the entry so Back still leaves the page in one step.
  const [tab, setTabState] = useState<PanelTab>(params.get("tab") === "logs" ? "logs" : "location");
  const setTab = (t: PanelTab) => {
    setTabState(t);
    const next = new URLSearchParams(listParams);
    if (t === "logs") next.set("tab", "logs");
    const q = next.toString();
    window.history.replaceState(window.history.state, "", `${pathname}${q ? `?${q}` : ""}`);
  };
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
          description={`No battery has serial number ${serialNo || "(none)"}. Check the serial number: a battery is created at its first Bring-up 1/2.`}
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
            <CardHeader icon={BatteryCharging} name="Battery" id={{ value: battery.serialNo, label: "battery serial number" }} />
            <div className="px-4 py-1">
              <InfoRow label="Status">
                <span className="inline-flex justify-end">
                  <StatusCell battery={battery} />
                </span>
              </InfoRow>
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
              <InfoRow label="Region">
                {battery.region ?? <span className="text-slate-400">No location reported</span>}
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

          <ProvisioningCard battery={battery} />
          <StatusDetailCard battery={battery} />
          <AssetCard asset={battery.asset} count={assetCount} />
        </div>

        {/* The map or the battery's log, framed like the cards, under tabs. */}
        <div className="h-[32rem] lg:h-auto lg:flex-1 shrink-0 lg:shrink flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div role="tablist" aria-label="Battery panel" className="flex items-center gap-1 px-3 border-b border-slate-100 shrink-0">
            {(["location", "logs"] as const).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                role="tab"
                type="button"
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => setTab(t)}
                className={cn(
                  "px-2.5 py-3 -mb-px border-b-2 text-sm font-semibold transition-colors rounded-t focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                  tab === t ? "border-zeno-red text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {t === "location" ? "Last known location" : `Battery logs (${battery.events.length})`}
              </button>
            ))}
            {tab === "location" && locationSuffix(battery.asset) && (
              <span className="ml-1 text-sm text-slate-500 truncate">· {locationSuffix(battery.asset)}</span>
            )}
          </div>
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex-1 min-h-0">
            {tab === "logs" ? (
              <BatteryLogs events={battery.events} now={data.loadedAt} />
            ) : pair ? (
              <BatteryMap lat={Number(pair[0])} lng={Number(pair[1])} label={`Map of battery ${battery.serialNo} at ${battery.location}`} />
            ) : (
              <EmptyState
                icon={BatteryCharging}
                title="No location reported"
                description="This battery hasn't reported a location yet."
                className="h-full"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type PanelTab = "location" | "logs";

/** "15 Oct 2026 · Ben Otieno": when a step was done, and who did it. */
function StampValue({ stamp }: { stamp: Stamp | null }) {
  if (!stamp) return <Dash />;
  return (
    <span className="block">
      <span title={`${fmtUtc(stamp.at)} UTC`} className="block tabular-nums whitespace-nowrap">{fmtDay(stamp.at)}</span>
      <span className="block text-xs text-slate-400">{stamp.by}</span>
    </span>
  );
}

/**
 * The battery's onboarding, as the ops app recorded it: shipment, both
 * bring-ups, storage and its charge clocks, and first deployment. Every
 * battery shows every row, with a dash for a step it hasn't reached, so the
 * card reads the same from battery to battery. The day counts show only while
 * the battery is in storage.
 */
function ProvisioningCard({ battery }: { battery: BatteryRecord }) {
  const { shipment, storage } = battery;
  const stored = storage?.daysInStorage != null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <CardHeader icon={ClipboardList} name="Provisioning" />
      <div className="px-4 py-1">
        <InfoRow label="Shipment">
          {shipment ? (
            <span className="font-mono text-xs tabular-nums">
              <CopyButton value={shipment.number} label="shipment number" onWhite />
            </span>
          ) : (
            <Dash />
          )}
        </InfoRow>
        <InfoRow label="Warehouse">{shipment?.warehouse ?? <Dash />}</InfoRow>
        <InfoRow label="Date received">
          {shipment ? <span className="tabular-nums whitespace-nowrap">{fmtDay(shipment.receivedOn)}</span> : <Dash />}
        </InfoRow>
        <InfoRow label="Bring-up 1/2"><StampValue stamp={battery.bringUp1} /></InfoRow>
        <InfoRow label="Registered for storage">
          {storage ? <span className="tabular-nums whitespace-nowrap">{fmtDay(storage.registeredAt)}</span> : <Dash />}
        </InfoRow>
        {stored && (
          <>
            <InfoRow label="Days in storage"><span className="tabular-nums">{storage!.daysInStorage}</span></InfoRow>
            <InfoRow label="Days since last charge">
              <span className="block">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("tabular-nums", battery.chargeDue && "text-amber-700 dark:text-amber-300 font-medium")}>
                    {storage!.daysSinceCharge}
                  </span>
                  {battery.chargeDue && <FlagPill flag="charge" />}
                </span>
                <span className="block text-xs text-slate-400">Charge due after {CHARGE_DUE_DAYS} days</span>
              </span>
            </InfoRow>
          </>
        )}
        <InfoRow label="Storage charges">
          {storage ? (
            <span className="block">
              <span className="block tabular-nums">{storage.charges}</span>
              {storage.lastChargeAt && <span className="block text-xs text-slate-400 whitespace-nowrap">Last {fmtDay(storage.lastChargeAt)}</span>}
            </span>
          ) : (
            <Dash />
          )}
        </InfoRow>
        <InfoRow label="Bring-up 2/2"><StampValue stamp={battery.bringUp2} /></InfoRow>
        <InfoRow label="First deployed">
          {battery.firstDeployedAt ? (
            <span title={`${fmtUtc(battery.firstDeployedAt)} UTC`} className="tabular-nums whitespace-nowrap">{fmtDay(battery.firstDeployedAt)}</span>
          ) : (
            <Dash />
          )}
        </InfoRow>
      </div>
    </div>
  );
}

/**
 * Only when it applies: the open repair (Repair in progress), the quarantine
 * with where a successful repair returns the battery, or the retirement.
 */
function StatusDetailCard({ battery }: { battery: BatteryRecord }) {
  const { openRepair, quarantine, retired } = battery;
  if (!openRepair && !quarantine && !retired) return null;
  const since = (at: number) => <span title={`${fmtUtc(at)} UTC`} className="tabular-nums whitespace-nowrap">{fmtDay(at)}</span>;
  return (
    <>
      {openRepair && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <CardHeader icon={Wrench} name="Repair in progress" />
          <div className="px-4 py-1">
            <InfoRow label="Maintenance">{openRepair.types.join(", ")}</InfoRow>
            <InfoRow label="Notes">{openRepair.notes}</InfoRow>
            <InfoRow label="Sent for repair">{since(openRepair.at)}</InfoRow>
            <InfoRow label="Technician">{openRepair.by}</InfoRow>
          </div>
        </div>
      )}
      {quarantine && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <CardHeader icon={ShieldAlert} name="Quarantine" />
          <div className="px-4 py-1">
            <InfoRow label="Reasons">{quarantine.reasons.join(", ")}</InfoRow>
            <InfoRow label="Notes">{quarantine.notes}</InfoRow>
            <InfoRow label="Since">{since(quarantine.at)}</InfoRow>
            <InfoRow label="By">{quarantine.by}</InfoRow>
            <InfoRow label="Before quarantine"><StatusBadge status={quarantine.statusBefore} /></InfoRow>
            <InfoRow label="After repair">
              <span title={`A successful Repair & Retest returns it to ${STATUS_LABELS[returnsTo(quarantine.statusBefore)]}`}>
                <StatusBadge status={returnsTo(quarantine.statusBefore)} />
              </span>
            </InfoRow>
          </div>
        </div>
      )}
      {retired && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <CardHeader icon={Archive} name="Retired" />
          <div className="px-4 py-1">
            <InfoRow label="Type">{retired.type}</InfoRow>
            <InfoRow label="Notes">{retired.notes}</InfoRow>
            <InfoRow label="Retired on">{since(retired.at)}</InfoRow>
            <InfoRow label="By">{retired.by}</InfoRow>
          </div>
        </div>
      )}
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
          <CardHeader icon={Zap} name="Station" id={{ value: station.code, label: "station code" }} />
          <div className="px-4 py-1">
            {asset?.type === "station" && <InfoRow label="Slot">{slotLabel(asset.slot)}</InfoRow>}
            <InfoRow label="Region">{station.region}</InfoRow>
            <InfoRow label="Address">
              <span className="block">{station.shortAddress}</span>
              <span className="block text-xs text-slate-400">{station.longAddress}</span>
            </InfoRow>
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
          <CardHeader icon={Bike} name="Vehicle" id={{ value: vehicle.vin, label: "VIN" }} />
          <div className="px-4 py-1">
            <InfoRow label="Plate">{vehicle.plate}</InfoRow>
            <InfoRow label="Region">{vehicle.region}</InfoRow>
            <InfoRow label="Vehicle IMEI">
              <span className="font-mono text-xs tabular-nums">
                <CopyButton value={vehicle.imei} label="vehicle IMEI" onWhite />
              </span>
            </InfoRow>
          </div>
          <CardActions>
            {/* Vehicle Tracking keeps its search in its store, not the URL, so set it on the way there. */}
            <Link
              href="/vehicle-tracking"
              onClick={() => {
                const { resetFilters, setFilter } = useAssetTrackingStore.getState();
                resetFilters();
                setFilter("search", vehicle.vin);
              }}
              className={ACTION}
            >
              <ActionLabel>Open in Vehicle Tracking</ActionLabel>
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
          <CardHeader icon={Zap} name="Asset" />
          <p className="px-4 py-4 text-sm text-slate-400">Not currently in a vehicle or station.</p>
        </>
      )}
    </div>
  );
}
