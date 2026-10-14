"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAssetTrackingStore, type AssetVehicle } from "@/store/asset-tracking";
import { Pagination } from "@/components/ui/Pagination";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  ConnectivityBadge,
  ImmobilizationBadge,
  VehicleStatusPill,
} from "@/components/ui/StatusIndicator";
import { COLUMNS, type ColumnId } from "./vehicle-columns";

function SortIcon({ col }: { col: keyof AssetVehicle }) {
  const sort = useAssetTrackingStore((s) => s.sort);
  if (sort?.column !== col) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return sort.direction === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-zeno-red" />
    : <ArrowDown className="w-3 h-3 ml-1 text-zeno-red" />;
}

const Dash = () => <span className="text-slate-300">–</span>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "01 Sep 2026 13:01" as an instant. The stored text has no zone; every vehicle
 * is in Kenya, so it's read as EAT (UTC+3), as Swap Audit labels its times.
 */
function parseEat(text: string): number | null {
  const m = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4}) (\d{2}):(\d{2})$/.exec(text);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return null;
  return Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]) - 3, Number(m[5]));
}

function relative(ms: number, now: number): string {
  const min = Math.floor((now - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return `${Math.floor(min / (24 * 60))} d ago`;
}

// The current minute, so "5 min ago" moves on while the page is open. Null in
// the server render, which has no "now" that matches the viewer's.
function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noMinute = () => null;

function LastConnected({ text }: { text: string }) {
  const now = useSyncExternalStore(subscribeMinute, currentMinute, noMinute);
  const at = parseEat(text);
  if (!text || at === null) return <span className="block text-xs text-slate-400">{text || "–"}</span>;
  const exact = `${text.slice(0, 11)}, ${text.slice(12)} EAT`;
  return (
    <time dateTime={new Date(at).toISOString()} title={exact} className="block text-xs text-slate-400">
      {now === null ? exact : relative(at, now)}
      <span className="sr-only">, last connected {exact}</span>
    </time>
  );
}

function Cell({ id, v }: { id: ColumnId; v: AssetVehicle }) {
  switch (id) {
    case "vin":
      return <td className="px-3 py-2.5 text-slate-700 font-mono text-xs whitespace-nowrap"><CopyButton value={v.vin} label="VIN" /></td>;
    case "plate":
      return <td className="px-3 py-2.5 text-slate-600 font-mono text-xs whitespace-nowrap">{v.plate ? <CopyButton value={v.plate} label="plate" /> : <Dash />}</td>;
    case "customerName":
      return <td title={v.customerName || undefined} className="px-3 py-2.5 text-slate-700 whitespace-nowrap truncate">{v.customerName || <Dash />}</td>;
    case "customerPhone":
      return <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.customerPhone ? <CopyButton value={v.customerPhone} label="customer phone" /> : <Dash />}</td>;
    case "tenant":
      return <td title={v.tenant || undefined} className="px-3 py-2.5 text-slate-600 whitespace-nowrap truncate">{v.tenant || <Dash />}</td>;
    case "status":
      return <td className="px-3 py-2.5 whitespace-nowrap"><VehicleStatusPill value={v.status} /></td>;
    case "connectivity":
      return (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <ConnectivityBadge value={v.connectivity} />
          <LastConnected text={v.lastConnected} />
        </td>
      );
    case "immobilization":
      return <td className="px-3 py-2.5 whitespace-nowrap"><ImmobilizationBadge value={v.immobilization} /></td>;
    case "dateOfSale":
      return <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.dateOfSale || <Dash />}</td>;
    case "imei":
      return <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{v.imei ? <CopyButton value={v.imei} label="IMEI" /> : <Dash />}</td>;
    case "storeCode":
      return <td className="px-3 py-2.5 text-slate-600 font-mono text-xs whitespace-nowrap">{v.storeCode || <Dash />}</td>;
    case "odometer":
      return <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap text-right tabular-nums">{v.odometer.toLocaleString()}</td>;
    case "vcu":
      return <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{v.vcuFirmware || <Dash />}</td>;
    case "zeConnect":
      return <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{v.zeConnectFirmware || <Dash />}</td>;
    case "evcc":
      return <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{v.evccFirmware || <Dash />}</td>;
  }
}

export function VehicleTable({ visible }: { visible: ColumnId[] }) {
  const router = useRouter();
  const page = useAssetTrackingStore((s) => s.page);
  const perPage = useAssetTrackingStore((s) => s.perPage);
  const sort = useAssetTrackingStore((s) => s.sort);
  const setPage = useAssetTrackingStore((s) => s.setPage);
  const setPerPage = useAssetTrackingStore((s) => s.setPerPage);
  const setSort = useAssetTrackingStore((s) => s.setSort);
  const filteredVehicles = useAssetTrackingStore((s) => s.filteredVehicles);

  const columns = COLUMNS.filter((c) => visible.includes(c.id));
  // Fixed widths: the table is at least their sum (scrolling sideways only when
  // that's wider than the page), and a blank last column takes any spare room,
  // so no column stretches when others are hidden.
  const minWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const all = filteredVehicles();
  const total = all.length;
  const rows = all.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white border border-slate-200 rounded-xl">
      <div className="overflow-auto flex-1">
        <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth }}>
          <colgroup>
            {columns.map(({ id, width }) => (
              <col key={id} style={{ width }} />
            ))}
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map(({ id, label, sortKey }) => (
                <th
                  key={id}
                  aria-sort={
                    !sortKey ? undefined
                    : sort?.column !== sortKey ? "none"
                    : sort.direction === "asc" ? "ascending" : "descending"
                  }
                  className={`px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap select-none ${id === "odometer" ? "text-right" : "text-left"}`}
                >
                  {sortKey ? (
                    <button
                      onClick={() => setSort(sortKey)}
                      className="inline-flex items-center hover:text-slate-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                    >
                      {label}
                      <SortIcon col={sortKey} />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400 text-sm">
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
                {columns.map(({ id }) => (
                  <Cell key={id} id={id} v={v} />
                ))}
                <td aria-hidden />
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
