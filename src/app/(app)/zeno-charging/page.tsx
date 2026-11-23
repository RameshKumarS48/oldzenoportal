"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, List, Map as MapIcon, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { ChargingFilterBar } from "@/components/zeno-charging/ChargingFilterBar";
import { DraftsPanel } from "@/components/zeno-charging/DraftsPanel";
import { ChargingMapView } from "@/components/zeno-charging/ChargingMapView";
import { SegmentedControl } from "@/components/ui/FilterControls";
import { StatusBadge } from "@/components/zeno-charging/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { CopyButton } from "@/components/ui/CopyButton";
import { isPublic, type ChargingAsset } from "@/lib/charging/fields";
import { DEFAULT_SORT, distinct, matches, matchesSearch, nextSort, NO_FILTERS, sortRows, type ChargingFilters, type Sort } from "@/components/zeno-charging/list";
import { CHARGING_COLUMNS, useChargingColumns, type ChargingColumnId } from "@/components/zeno-charging/columns";
import { exportChargingXLSX, exportGbpCsv } from "@/components/zeno-charging/export";
import type { Me } from "@/components/zeno-charging/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

// The app's primary action colour (Button variant "primary"): brand red.
const PRIMARY = "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zeno-red text-white shadow-sm hover:bg-zeno-red-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-red/40 focus-visible:ring-offset-1";

export default function ZenoChargingPage() {
  return (
    <>
      <Topbar title="Zeno Charging Network" />
      <ChargingGate>{({ assets, me }) => <ChargingList assets={assets} me={me} />}</ChargingGate>
    </>
  );
}

const Dash = () => <span className="text-slate-300">–</span>;

function Cell({ id, a }: { id: ChargingColumnId; a: ChargingAsset }) {
  const base = "px-3 py-2.5 whitespace-nowrap";
  switch (id) {
    case "assetId":
      return <td className={`${base} font-mono text-xs text-slate-700`} onClick={(e) => e.stopPropagation()}>{a.assetId ? <CopyButton value={a.assetId} label="Asset ID" /> : <span className="font-sans text-amber-700">No ID</span>}</td>;
    case "assetName":
      return (
        <td className={`${base} truncate`} title={a.assetName}>
          <span className="block truncate text-slate-800">{a.assetName}</span>
          {a.needsAttention && <span className="flex items-center gap-1 truncate text-[11px] text-amber-700" title={a.needsAttention}><AlertTriangle className="h-3 w-3 shrink-0" /> Needs attention</span>}
        </td>
      );
    case "assetType": return <td className={`${base} text-slate-600`}>{a.assetType}</td>;
    case "siteId": return <td className={`${base} font-mono text-xs text-slate-600`}>{a.siteId}</td>;
    case "town": return <td className={`${base} truncate text-slate-600`}>{a.town || <Dash />}</td>;
    case "status": return <td className={base}><StatusBadge asset={a} /></td>;
    case "goLive": return <td className={`${base} tabular-nums text-slate-600`}>{a.goLiveDate ?? <Dash />}</td>;
    case "inApp": return <td className={base}>{isPublic(a) ? <span className="text-xs font-medium text-emerald-700">Yes</span> : <span className="text-xs text-slate-400">No</span>}</td>;
    case "landmark": return <td className={`${base} truncate text-slate-600`} title={a.landmark}>{a.landmark || <Dash />}</td>;
    case "area": return <td className={`${base} truncate text-slate-600`}>{a.area || <Dash />}</td>;
    case "country": return <td className={`${base} text-slate-600`}>{a.country || <Dash />}</td>;
    case "zone": return <td className={`${base} text-slate-600`}>{a.zone ?? <Dash />}</td>;
    case "access": return <td className={`${base} text-slate-600`}>{a.accessType}</td>;
    case "partner": return <td className={`${base} truncate text-slate-600`} title={a.partnerName ?? undefined}>{a.partnerName ?? <Dash />}</td>;
    case "rent": return <td className={`${base} text-right tabular-nums text-slate-700`}>{a.monthlyRent != null ? a.monthlyRent.toLocaleString() : <Dash />}</td>;
    case "phase": return <td className={`${base} text-slate-600`}>{a.phaseType || <Dash />}</td>;
    case "electricity": return <td className={`${base} truncate text-slate-600`}>{a.electricityServiceType || <Dash />}</td>;
    case "coords": return <td className={`${base} font-mono text-xs text-slate-500`}>{a.lat != null && a.lng != null ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : <Dash />}</td>;
    case "updated": return <td className={`${base} tabular-nums text-xs text-slate-500`}>{a.updatedAt.slice(0, 10)}</td>;
  }
}

function ChargingList({ assets, me }: { assets: ChargingAsset[]; me: Me }) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = useChargingColumns(userId);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ChargingFilters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  // List View by default, as Vehicle Tracking; both views show the same searched and filtered assets.
  const [view, setView] = useState<"list" | "map">("list");

  const rows = sortRows(assets.filter((a) => matchesSearch(a, search) && matches(a, filters)), sort);
  const total = assets.filter((a) => !a.archivedAt).length;
  const shownPage = Math.min(page, Math.max(1, Math.ceil(rows.length / perPage)));
  const pageRows = rows.slice((shownPage - 1) * perPage, shownPage * perPage);
  const columns = CHARGING_COLUMNS.filter((c) => visible.includes(c.id));
  const minWidth = columns.reduce((sum, c) => sum + c.width, 0);

  function handleExport() {
    if (!rows.length) { toast.error("Nothing to export", "No asset matches the search and filters. Clear a filter and try again."); return; }
    void exportChargingXLSX(rows).then(() => toast.success("Export downloaded", `${rows.length.toLocaleString()} assets written to XLSX.`));
  }
  function handleGoogleExport() {
    const n = exportGbpCsv(rows);
    if (n === 0) toast.error("Nothing to export", "None of the matching assets is published (commissioned and public).");
    else toast.success("Google Business Profile CSV downloaded", `${n.toLocaleString()} published locations.`);
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List View", icon: <List className="h-4 w-4" /> },
            { value: "map", label: "Map View", icon: <MapIcon className="h-4 w-4" /> },
          ]}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        {me.can.write && <DraftsPanel />}
        <ChargingFilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          filters={filters}
          onFilters={(f) => { setFilters(f); setPage(1); }}
          towns={distinct(assets, (a) => a.town)}
          columns={visible}
          onColumns={setVisible}
          shown={rows.length}
          total={total}
          onExport={handleExport}
          onExportGoogle={handleGoogleExport}
          showColumns={view === "list"}
          action={me.can.write ? <Link href="/zeno-charging/new" className={PRIMARY}><Plus className="h-3.5 w-3.5" /> Add charging asset</Link> : undefined}
        />

        {view === "map" ? (
          <ChargingMapView assets={rows} onOpen={(id) => router.push(`/zeno-charging/${id}`)} className="flex-1" />
        ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth }}>
              <colgroup>
                {columns.map(({ id, width }) => <col key={id} style={{ width }} />)}
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {columns.map(({ id, label, sortKey }) => (
                    <th
                      key={id}
                      aria-sort={!sortKey ? undefined : sort.column !== sortKey ? "none" : sort.direction === "asc" ? "ascending" : "descending"}
                      className={`sticky top-0 z-10 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap select-none ${id === "rent" ? "text-right" : "text-left"}`}
                    >
                      {sortKey ? (
                        <button onClick={() => setSort((s) => nextSort(s, sortKey))} className="inline-flex items-center rounded hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
                          {label}
                          {sort.column !== sortKey ? <ArrowUpDown className="ml-1 h-3 w-3 text-slate-300" /> : sort.direction === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-zeno-red" /> : <ArrowDown className="ml-1 h-3 w-3 text-zeno-red" />}
                        </button>
                      ) : label}
                    </th>
                  ))}
                  <th aria-hidden className="sticky top-0 bg-slate-50" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={columns.length + 1} className="py-16 text-center text-sm text-slate-400">No charging assets match the current filters.</td></tr>
                )}
                {pageRows.map((a) => (
                  <tr
                    key={a.id}
                    tabIndex={0}
                    onClick={() => router.push(`/zeno-charging/${a.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/zeno-charging/${a.id}`); }}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    {columns.map(({ id }) => <Cell key={id} id={id} a={a} />)}
                    <td aria-hidden />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={rows.length} page={shownPage} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} perPageOptions={[20, 50, 100]} />
        </div>
        )}
      </div>
    </main>
  );
}
