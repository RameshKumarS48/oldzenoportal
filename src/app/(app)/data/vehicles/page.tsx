"use client";

import { useMemo, useState } from "react";
import { Search, Download, PlusSquare, MoreHorizontal } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { useVehiclesStore } from "@/store/vehicles";
import type { Vehicle } from "@/store/vehicles";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";
import { Pagination } from "@/components/ui/Pagination";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ColumnFilterPanel } from "@/components/ui/ColumnFilterPanel";
import { QuickActionModal } from "@/components/ui/QuickActionModal";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtLastConn(iso: string) {
  const d = new Date(iso);
  const now = new Date("2026-07-29T15:00:00Z");
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return "< 1h ago";
  if (diffH < 24) return `${diffH}h ago`;
  return fmtDate(iso);
}

const STATUS_STYLES: Record<Vehicle["status"], string> = {
  active:       "bg-emerald-50 text-emerald-700",
  offroad:      "bg-red-50 text-red-600",
  provisioning: "bg-amber-50 text-amber-700",
};
const STATUS_LABELS: Record<Vehicle["status"], string> = {
  active: "Active", offroad: "Off-Road", provisioning: "Provisioning",
};
const CONN_DOT: Record<Vehicle["connectivity"], string> = {
  Online: "bg-emerald-500", GpsOffline: "bg-amber-400", Offline: "bg-slate-300",
};

const ALL_COLUMNS = [
  { key: "vin",          label: "VIN" },
  { key: "customer",     label: "Customer" },
  { key: "status",       label: "Status" },
  { key: "partner",      label: "Partner" },
  { key: "storeCode",    label: "Store Code" },
  { key: "dateOfSale",   label: "Date of Sale" },
  { key: "odometer",     label: "Odo" },
  { key: "plate",        label: "Plate" },
  { key: "connectivity", label: "Connectivity" },
  { key: "lastConnected",label: "Last Connected" },
  { key: "immob",        label: "Immob" },
  { key: "firmware",     label: "Firmware" },
  { key: "actions",      label: "Actions" },
];

function exportCSV(vehicles: Vehicle[]) {
  const headers = ["VIN","Customer","Phone","Status","Tenant","StoreCode","DateOfSale","Odo","Plate","IMEI","Connectivity","LastConnected","Immobilization","VCU","ZeConnect","EVCC","Partner","Region"];
  const rows = vehicles.map(v => [v.vin, v.customerName, v.customerPhone, v.status, v.tenant, v.storeCode, v.dateOfSale, v.odometer, v.plate, v.imei, v.connectivity, v.lastConnected, v.immobilization, v.vcuFirmware, v.zeConnectFirmware, v.evccFirmware, v.partner, v.region]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `vehicles-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function VehiclesPage() {
  const { vehicles } = useVehiclesStore();
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [connFilter, setConnFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("zeno-cols-vehicles");
        if (saved) return new Set(JSON.parse(saved) as string[]);
      } catch {}
    }
    return new Set(ALL_COLUMNS.map(c => c.key));
  });
  const [quickActionVehicle, setQuickActionVehicle] = useState<Vehicle | null>(null);

  const filtered = useMemo(() => vehicles.filter(v => {
    if (statusFilter  && v.status       !== statusFilter)  return false;
    if (connFilter    && v.connectivity !== connFilter)    return false;
    if (regionFilter  && v.region       !== regionFilter)  return false;
    if (partnerFilter && v.partner      !== partnerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.vin.toLowerCase().includes(q) || v.customerName.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.imei.includes(q);
    }
    return true;
  }), [vehicles, search, statusFilter, connFilter, regionFilter, partnerFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const active  = filtered.filter(v => v.status === "active").length;
  const offline = filtered.filter(v => v.connectivity === "Offline").length;
  const partners = [...new Set(vehicles.map(v => v.partner))].sort();

  const allPageSelected = paginated.length > 0 && paginated.every(v => selected.has(v.id));
  const someSelected = paginated.some(v => selected.has(v.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) {
      paginated.forEach(v => next.delete(v.id));
    } else {
      paginated.forEach(v => next.add(v.id));
    }
    setSelected(next);
  };

  const pageWidgets = [
    { title: "Total Vehicles", snapshotValue: vehicles.length, snapshotLabel: "in fleet", snapshotSource: "Vehicle Telemetry" },
    { title: "Active Vehicles", snapshotValue: vehicles.filter(v => v.status === "active").length, snapshotLabel: "currently active", snapshotSource: "Vehicle Telemetry" },
    { title: "Offline Vehicles", snapshotValue: vehicles.filter(v => v.connectivity === "Offline").length, snapshotLabel: "not reachable", snapshotSource: "Vehicle Telemetry" },
    { title: "Off-Road Vehicles", snapshotValue: vehicles.filter(v => v.status === "offroad").length, snapshotLabel: "taken off-road", snapshotSource: "Vehicle Telemetry" },
  ];

  return (
    <>
      <Topbar
        title="Vehicle Telemetry"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-slate-400 font-medium">{filtered.length} vehicles</span>
            <Button size="sm" variant="ghost-dark" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" variant="ghost-dark" onClick={() => exportCSV(filtered)}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-hidden flex flex-col bg-zeno-bg">
        {/* Stats strip */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-6 text-xs text-slate-500">
          <span><span className="font-bold text-slate-700">{filtered.length}</span> Total</span>
          <span><span className="font-bold text-emerald-600">{active}</span> Active</span>
          <span><span className="font-bold text-slate-400">{offline}</span> Offline</span>
          <span><span className="font-bold text-red-500">{filtered.filter(v => v.status === "offroad").length}</span> Off-Road</span>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search VIN, name, plate…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
            />
          </div>
          {([
            ["Status",       statusFilter,  setStatusFilter,  [["","All Status"],["active","Active"],["offroad","Off-Road"],["provisioning","Provisioning"]]],
            ["Connectivity", connFilter,    setConnFilter,    [["","All Connectivity"],["Online","Online"],["GpsOffline","GPS Offline"],["Offline","Offline"]]],
            ["Region",       regionFilter,  setRegionFilter,  [["","All Regions"],["nbo","NBO"],["nanyuki","Nanyuki"],["naromoru","Naro Moru"],["nyeri","Nyeri"]]],
            ["Partner",      partnerFilter, setPartnerFilter, [["","All Partners"], ...partners.map(p => [p, p])]],
          ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
            <select key={label} value={val} onChange={e => setter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {(statusFilter || connFilter || regionFilter || partnerFilter || search) && (
            <button
              onClick={() => { setStatusFilter(""); setConnFilter(""); setRegionFilter(""); setPartnerFilter(""); setSearch(""); setPage(1); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
          <div className="ml-auto">
            <ColumnFilterPanel columns={ALL_COLUMNS.filter(c => c.key !== "actions")} visible={visibleCols} onChange={setVisibleCols} storageKey="zeno-cols-vehicles" />
          </div>
        </div>

        {/* Bulk action bar */}
        <BulkActionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          actions={[
            { label: "Immobilise", variant: "danger",    onClick: () => { window.alert(`Immobilise ${selected.size} vehicles`); setSelected(new Set()); } },
            { label: "Mobilise",   variant: "primary",   onClick: () => { window.alert(`Mobilise ${selected.size} vehicles`); setSelected(new Set()); } },
            { label: "Export",     variant: "secondary", onClick: () => exportCSV(filtered.filter(v => selected.has(v.id))) },
          ]}
        />

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = !allPageSelected && someSelected; }}
                    onChange={toggleAll}
                    className="accent-[#FF3B06]"
                  />
                </th>
                {ALL_COLUMNS.filter(c => visibleCols.has(c.key)).map(c => (
                  <th key={c.key} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400">No vehicles match your filters</td>
                </tr>
              )}
              {paginated.map(v => (
                <tr key={v.id} className={cn("hover:bg-slate-50 transition-colors", selected.has(v.id) && "bg-blue-50/40")}>
                  <td className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selected.has(v.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
                        setSelected(next);
                      }}
                      className="accent-[#FF3B06]"
                    />
                  </td>
                  {visibleCols.has("vin") && (
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">{v.vin}</td>
                  )}
                  {visibleCols.has("customer") && (
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-700">{v.customerName}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{v.customerPhone}</div>
                    </td>
                  )}
                  {visibleCols.has("status") && (
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", STATUS_STYLES[v.status])}>
                        {STATUS_LABELS[v.status]}
                      </span>
                    </td>
                  )}
                  {visibleCols.has("partner") && (
                    <td className="px-3 py-2.5 text-slate-600 capitalize">{v.partner}</td>
                  )}
                  {visibleCols.has("storeCode") && (
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{v.storeCode}</td>
                  )}
                  {visibleCols.has("dateOfSale") && (
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(v.dateOfSale)}</td>
                  )}
                  {visibleCols.has("odometer") && (
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.odometer.toLocaleString()} km</td>
                  )}
                  {visibleCols.has("plate") && (
                    <td className="px-3 py-2.5 font-mono text-slate-600">{v.plate}</td>
                  )}
                  {visibleCols.has("connectivity") && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", CONN_DOT[v.connectivity])} />
                        <span className="text-slate-600">{v.connectivity}</span>
                      </div>
                    </td>
                  )}
                  {visibleCols.has("lastConnected") && (
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtLastConn(v.lastConnected)}</td>
                  )}
                  {visibleCols.has("immob") && (
                    <td className="px-3 py-2.5">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", v.immobilization === "On" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400")}>
                        {v.immobilization}
                      </span>
                    </td>
                  )}
                  {visibleCols.has("firmware") && (
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-[10px] text-slate-500 leading-tight">
                        <div>VCU {v.vcuFirmware}</div>
                        <div>ZC {v.zeConnectFirmware}</div>
                        <div>EC {v.evccFirmware}</div>
                      </div>
                    </td>
                  )}
                  {visibleCols.has("actions") && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setQuickActionVehicle(v)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Quick actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </main>
      <AddToDashboardModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widgets={pageWidgets} />
      <QuickActionModal vehicle={quickActionVehicle} onClose={() => setQuickActionVehicle(null)} />
    </>
  );
}
