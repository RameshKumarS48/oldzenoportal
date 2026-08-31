"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAssetTrackingStore, type AssetVehicle } from "@/store/asset-tracking";
import { Pagination } from "@/components/ui/Pagination";
import {
  ConnectivityBadge,
  ImmobilizationBadge,
  VehicleStatusPill,
} from "@/components/ui/StatusIndicator";

type ColKey = keyof AssetVehicle;

const COLUMNS: { key: ColKey; label: string; width?: string }[] = [
  { key: "vin", label: "VIN", width: "min-w-[140px]" },
  { key: "customerName", label: "Customer Name", width: "min-w-[130px]" },
  { key: "customerPhone", label: "Customer Phone", width: "min-w-[130px]" },
  { key: "status", label: "Status", width: "min-w-[80px]" },
  { key: "tenant", label: "Tenant", width: "min-w-[150px]" },
  { key: "storeCode", label: "Store Code", width: "min-w-[130px]" },
  { key: "dateOfSale", label: "Date of Sale", width: "min-w-[110px]" },
  { key: "odometer", label: "Odo", width: "min-w-[80px]" },
  { key: "plate", label: "Plate", width: "min-w-[90px]" },
  { key: "imei", label: "IMEI", width: "min-w-[130px]" },
  { key: "connectivity", label: "Connectivity", width: "min-w-[110px]" },
  { key: "lastConnected", label: "Last Connected", width: "min-w-[140px]" },
  { key: "immobilization", label: "Immobilization", width: "min-w-[130px]" },
  { key: "vcuFirmware", label: "VCU", width: "min-w-[90px]" },
  { key: "zeConnectFirmware", label: "ZeConnect", width: "min-w-[130px]" },
  { key: "evccFirmware", label: "EVCC", width: "min-w-[110px]" },
];

function SortIcon({ col }: { col: ColKey }) {
  const sort = useAssetTrackingStore((s) => s.sort);
  if (sort?.column !== col) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return sort.direction === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-zeno-red" />
    : <ArrowDown className="w-3 h-3 ml-1 text-zeno-red" />;
}

export function VehicleTable() {
  const router = useRouter();
  const page = useAssetTrackingStore((s) => s.page);
  const perPage = useAssetTrackingStore((s) => s.perPage);
  const setPage = useAssetTrackingStore((s) => s.setPage);
  const setPerPage = useAssetTrackingStore((s) => s.setPerPage);
  const setSort = useAssetTrackingStore((s) => s.setSort);
  const filteredVehicles = useAssetTrackingStore((s) => s.filteredVehicles);

  const all = filteredVehicles();
  const total = all.length;
  const rows = all.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white border border-slate-200 rounded-xl">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {COLUMNS.map(({ key, label, width }) => (
                <th
                  key={key}
                  className={`px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700 select-none ${width ?? ""}`}
                  onClick={() => setSort(key)}
                >
                  <span className="flex items-center">
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-16 text-slate-400 text-sm">
                  No vehicles match the current filters.
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <tr
                key={v.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/asset-tracking/${encodeURIComponent(v.vin)}`)}
              >
                <td className="px-3 py-2.5 text-slate-700 font-mono text-xs whitespace-nowrap">{v.vin}</td>
                <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{v.customerName || <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.customerPhone}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><VehicleStatusPill value={v.status} /></td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.tenant || <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.storeCode}</td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.dateOfSale}</td>
                <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{v.odometer.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.plate}</td>
                <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{v.imei}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><ConnectivityBadge value={v.connectivity} /></td>
                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{v.lastConnected}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><ImmobilizationBadge value={v.immobilization} /></td>
                <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{v.vcuFirmware}</td>
                <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{v.zeConnectFirmware}</td>
                <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{v.evccFirmware}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        total={total}
        page={page}
        perPage={perPage}
        onPage={setPage}
        onPerPage={setPerPage}
        perPageOptions={[20, 50, 100]}
      />
    </div>
  );
}
