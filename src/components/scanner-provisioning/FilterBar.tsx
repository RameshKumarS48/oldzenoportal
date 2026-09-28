"use client";

import { Field, SelectField } from "@/components/ui/FilterControls";
import { ChevronDown } from "lucide-react";
import {
  useScannerProvisioningStore,
  ACTION_TYPES,
  ACTION_LABELS,
  SYNC_STATUSES,
  SYNC_LABELS,
} from "@/store/scanner-provisioning";

const STORE_CODE_OPTIONS = [
  "All",
  "ke-jgo-mkp", "ke-nbo-grw-hq", "ke-nbo-jgo-mkp", "ke-nbo-mbsa-wtu",
  "ke-nbo-mkp", "ke-nbo-zhq", "ke-nrm-zgs", "ke-nyk-zhq",
  "ke-nyr-ctr-zhb", "ke-tmu-zgs",
];
const TENANT_OPTIONS = [
  "All", "None",
  "fleet/greenwheels", "fleet/mkopa",
  "retail/4g", "retail/cash", "retail/fortune", "retail/safari_customer",
  "retail/tireproz", "retail/tugende", "retail/watu", "retail/zeno_captive",
  "zeno-internal/demo_bikes", "zeno-internal/pd_bikes", "zeno-internal/test_bike",
];
const CREDENTIAL_OPTIONS = ["All", "Zeno", "Partner"];
const BIKE_STATE_OPTIONS = ["All", "new", "active", "test", "used"];
const SOURCE_OPTIONS = ["All", "scanner_app", "portal"];

export function FilterBar() {
  const filters = useScannerProvisioningStore((s) => s.filters);
  const setFilter = useScannerProvisioningStore((s) => s.setFilter);
  const resetFilters = useScannerProvisioningStore((s) => s.resetFilters);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {/* Action Type, custom labels, so an inline select wrapped in Field */}
        <Field label="Action Type">
          <div className="relative">
            <select
              value={filters.actionType}
              onChange={(e) => setFilter("actionType", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 cursor-pointer"
            >
              <option value="All">All</option>
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>{ACTION_LABELS[t]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </Field>

        <SelectField
          label="Store Code"
          value={filters.storeCode}
          options={STORE_CODE_OPTIONS}
          onChange={(v) => setFilter("storeCode", v)}
        />
        <SelectField
          label="Tenant"
          value={filters.tenant}
          options={TENANT_OPTIONS}
          onChange={(v) => setFilter("tenant", v)}
        />
        <SelectField
          label="Credential"
          value={filters.credentialType}
          options={CREDENTIAL_OPTIONS}
          onChange={(v) => setFilter("credentialType", v)}
        />
        <SelectField
          label="Bike State"
          value={filters.bikeState}
          options={BIKE_STATE_OPTIONS}
          onChange={(v) => setFilter("bikeState", v)}
        />
        <SelectField
          label="Source"
          value={filters.source}
          options={SOURCE_OPTIONS}
          onChange={(v) => setFilter("source", v)}
        />
        {/* Sync Status, custom labels, so an inline select wrapped in Field */}
        <Field label="Sync Status">
          <div className="relative">
            <select
              value={filters.syncStatus}
              onChange={(e) => setFilter("syncStatus", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 cursor-pointer"
            >
              <option value="All">All</option>
              {SYNC_STATUSES.map((s) => (
                <option key={s} value={s}>{SYNC_LABELS[s]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </Field>
        <Field label="From Date">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40"
          />
        </Field>
        <Field label="To Date">
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          onClick={resetFilters}
          className="text-xs text-slate-500 hover:text-slate-700 font-medium underline-offset-2 hover:underline"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
