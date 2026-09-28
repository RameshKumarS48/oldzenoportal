"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bike, ExternalLink, ChevronDown } from "lucide-react";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { MapPlaceholder } from "@/components/asset-tracking/MapPlaceholder";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConnectivityBadge, ImmobilizationBadge } from "@/components/ui/StatusIndicator";
import { useAccess } from "@/lib/access";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-36">{label}</span>
      <span className="text-sm text-slate-700 text-right">{children}</span>
    </div>
  );
}

const TIMELINE_OPTIONS = ["Live", "Last Hour", "Last 6h", "Last 24h"];

export default function VehicleDetailPage() {
  const { vin } = useParams<{ vin: string }>();
  const router = useRouter();
  const vehicles = useAssetTrackingStore((s) => s.vehicles);
  const toggleImmobilization = useAssetTrackingStore((s) => s.toggleImmobilization);
  const canWrite = useAccess().canWrite("vehicle");

  const vehicle = vehicles.find((v) => v.vin === decodeURIComponent(vin ?? ""));

  const [highRefresh, setHighRefresh] = useState(false);
  const [timeline, setTimeline] = useState("Live");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!vehicle) {
    return (
      <main className="flex items-center justify-center h-full text-slate-400 text-sm">
        Vehicle not found.
      </main>
    );
  }

  const isImmobilized = vehicle.immobilization !== "Off";

  function handleImmobilize() {
    toggleImmobilization(vehicle!.vin);
    setConfirmOpen(false);
  }

  return (
    <main className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => router.push("/asset-tracking")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <Button
            variant={highRefresh ? "primary" : "outline"}
            onClick={() => setHighRefresh((v) => !v)}
          >
            High Refresh Rate : {highRefresh ? "On" : "Off"}
          </Button>

          <div className="relative flex items-center">
            <span className="text-sm text-slate-500 mr-2">Timeline</span>
            <div className="relative">
              <select
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 cursor-pointer"
              >
                {TIMELINE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {canWrite && (
            <Button variant="primary" onClick={() => setConfirmOpen(true)}>
              {isImmobilized ? "Mobilize Vehicle" : "Immobilize Vehicle"}
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden p-5 gap-5">
        {/* Left panel */}
        <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-xl overflow-y-auto">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Bike className="w-5 h-5 text-zeno-red" />
              <span className="text-sm font-semibold text-slate-800">Bike</span>
              <span className="text-xs text-slate-500 ml-1">#{vehicle.vin}</span>
            </div>
          </div>
          <div className="px-5 py-2">
            <InfoRow label="Customer Name">{vehicle.customerName || <span className="text-slate-300">—</span>}</InfoRow>
            <InfoRow label="Customer Phone">{vehicle.customerPhone}</InfoRow>
            <InfoRow label="Date of Sale">{vehicle.dateOfSale}</InfoRow>
            <InfoRow label="Odometer">{vehicle.odometer.toLocaleString()}</InfoRow>
            <InfoRow label="SOC">{vehicle.soc}</InfoRow>
            <InfoRow label="Immobilization"><ImmobilizationBadge value={vehicle.immobilization} /></InfoRow>
            <InfoRow label="Tenant">{vehicle.tenant || <span className="text-slate-300">—</span>}</InfoRow>
            <InfoRow label="Status">{vehicle.status}</InfoRow>
            <InfoRow label="Store Code">{vehicle.storeCode}</InfoRow>
            <InfoRow label="Plate">{vehicle.plate}</InfoRow>
            <InfoRow label="IMEI">{vehicle.imei}</InfoRow>
            <InfoRow label="Connectivity"><ConnectivityBadge value={vehicle.connectivity} /></InfoRow>
            <InfoRow label="Last Connected"><span className="text-xs">{vehicle.lastConnected}</span></InfoRow>
            <InfoRow label="Last Location Time"><span className="text-xs">{vehicle.lastLocationTime}</span></InfoRow>
            <InfoRow label="Lat">{vehicle.lat}</InfoRow>
            <InfoRow label="Long">{vehicle.long}</InfoRow>
            <InfoRow label="VCU">{vehicle.vcuFirmware}</InfoRow>
            <InfoRow label="ZeConnect">{vehicle.zeConnectFirmware}</InfoRow>
            <InfoRow label="EVCC">{vehicle.evccFirmware}</InfoRow>
            <div className="pt-3 pb-2">
              <a
                href={`https://maps.google.com/?q=${vehicle.lat},${vehicle.long}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-zeno-teal font-medium hover:underline"
              >
                Show on Google Map
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right map */}
        <MapPlaceholder className="flex-1" />
      </div>

      {/* Immobilize confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isImmobilized ? "Mobilize Vehicle" : "Immobilize Vehicle"}
      >
        <p className="text-sm text-slate-600 mb-6">
          {isImmobilized
            ? `Are you sure you want to mobilize bike #${vehicle.vin}? The vehicle will be able to move again.`
            : `Are you sure you want to immobilize bike #${vehicle.vin}? The vehicle will be remotely disabled.`}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleImmobilize}>
            Confirm
          </Button>
        </div>
      </Modal>
    </main>
  );
}
