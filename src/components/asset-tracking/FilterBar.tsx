"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAssetTrackingStore, type AssetVehicle } from "@/store/asset-tracking";
import { Field, SelectField, TriggerField } from "@/components/ui/FilterControls";
import { OdoRangeModal } from "./OdoRangeModal";

const IMMOBILIZATION_OPTIONS = [
  "All", "Immobilized", "Mobilized",
  "ImmobilizedRequestSent", "MobilizedRequestSent",
  "ImmobilizedRequestAck", "MobilizedRequestAck",
];
const CONNECTIVITY_OPTIONS = ["All", "Online", "Offline", "GpsOffline", "CloudOffline"];
const STATUS_OPTIONS = ["All", "active", "new", "test", "used"];
const TENANT_OPTIONS = [
  "All", "None",
  "fleet/greenwheels", "fleet/mkopa",
  "retail/4g", "retail/cash", "retail/fortune", "retail/safari_customer",
  "retail/tireproz", "retail/tugende", "retail/watu", "retail/zeno_captive",
  "zeno-internal/demo_bikes", "zeno-internal/pd_bikes", "zeno-internal/test_bike",
];
const STORE_CODE_OPTIONS = [
  "All",
  "ke-jgo-mkp", "ke-nbo-grw-hq", "ke-nbo-jgo-mkp", "ke-nbo-mbsa-wtu",
  "ke-nbo-mkp", "ke-nbo-zhq", "ke-nrm-zgs", "ke-nyk-zhq",
  "ke-nyr-ctr-zhb", "ke-tmu-zgs",
];

function getUnique(vehicles: AssetVehicle[], key: keyof AssetVehicle): string[] {
  const vals = Array.from(new Set(vehicles.map((v) => String(v[key])))).filter(Boolean);
  vals.sort();
  return ["All", ...vals];
}

export function FilterBar() {
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const vehicles = useAssetTrackingStore((s) => s.vehicles);
  const [odoOpen, setOdoOpen] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const vcuOptions = getUnique(vehicles, "vcuFirmware");
  const zeConnectOptions = getUnique(vehicles, "zeConnectFirmware");
  const evccOptions = getUnique(vehicles, "evccFirmware");

  const odoLabel =
    filters.odoFrom !== null || filters.odoTo !== null
      ? `${filters.odoFrom ?? 0} → ${filters.odoTo ?? "∞"}`
      : "All";

  const handleDateChange = (v: string) => {
    if (v === "All") {
      setFilter("dateOfSale", "All");
      setDatePickerVisible(false);
    } else if (v === "Pick Date") {
      setDatePickerVisible(true);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <SelectField
            label="Immobilization"
            value={filters.immobilization}
            options={IMMOBILIZATION_OPTIONS}
            onChange={(v) => setFilter("immobilization", v)}
          />

          {/* Date of Sale, reveals a native date picker when "Pick Date" is chosen */}
          <Field label="Date of Sale">
            <div className="relative">
              <select
                value={datePickerVisible ? "Pick Date" : filters.dateOfSale === "All" ? "All" : "Pick Date"}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Pick Date">Pick Date</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            {datePickerVisible && (
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
                onChange={(e) => {
                  if (e.target.value) {
                    const d = new Date(e.target.value);
                    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                    setFilter("dateOfSale", label);
                  }
                }}
              />
            )}
          </Field>

          <SelectField
            label="Connectivity"
            value={filters.connectivity}
            options={CONNECTIVITY_OPTIONS}
            onChange={(v) => setFilter("connectivity", v)}
          />

          <TriggerField label="Odo Range" onClick={() => setOdoOpen(true)}>
            {odoLabel}
          </TriggerField>

          <SelectField
            label="Store Code"
            value={filters.storeCode}
            options={STORE_CODE_OPTIONS}
            onChange={(v) => setFilter("storeCode", v)}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <SelectField label="VCU" value={filters.vcu} options={vcuOptions} onChange={(v) => setFilter("vcu", v)} />
          <SelectField label="ZeConnect" value={filters.zeConnect} options={zeConnectOptions} onChange={(v) => setFilter("zeConnect", v)} />
          <SelectField label="EVCC" value={filters.evcc} options={evccOptions} onChange={(v) => setFilter("evcc", v)} />
          <SelectField label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => setFilter("status", v)} />
          <SelectField label="Tenant" value={filters.tenant} options={TENANT_OPTIONS} onChange={(v) => setFilter("tenant", v)} />
        </div>
      </div>

      <OdoRangeModal
        open={odoOpen}
        onClose={() => setOdoOpen(false)}
        onApply={(from, to) => {
          setFilter("odoFrom", from);
          setFilter("odoTo", to);
        }}
        initialFrom={filters.odoFrom}
        initialTo={filters.odoTo}
      />
    </>
  );
}
