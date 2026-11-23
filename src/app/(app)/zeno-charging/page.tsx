"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Download, Globe, Plus, Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { Pagination } from "@/components/ui/Pagination";
import { FilterChip, FilterChips } from "@/components/ui/FilterChip";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { ACCESS_TYPES, ASSET_TYPES, COUNTRIES, ZONES, isPublic, type ChargingAsset } from "@/lib/charging/fields";
import { anyFilter, DEFAULT_SORT, distinct, matches, matchesSearch, nextSort, NO_FILTERS, sortRows, type ChargingFilters, type Sort, type SortKey } from "@/components/zeno-charging/list";
import { exportChargingXLSX, exportGbpCsv } from "@/components/zeno-charging/export";
import { resetCharging, type Me } from "@/components/zeno-charging/api";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StatusBadge } from "@/components/zeno-charging/StatusBadge";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

const BAR = "bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0";
const SEARCH = "pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-72";
const CONTROL = "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";
const PRIMARY = "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/40 disabled:opacity-50";
const SECONDARY = "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/40";

const COLUMNS: { label: string; sortKey?: SortKey; className?: string }[] = [
  { label: "Asset ID", sortKey: "assetId", className: "w-[200px]" },
  { label: "Asset", sortKey: "assetName" },
  { label: "Type", className: "w-[120px]" },
  { label: "Site", sortKey: "site", className: "w-[110px]" },
  { label: "Town", sortKey: "town", className: "w-[130px]" },
  { label: "Status", className: "w-[150px]" },
  { label: "Go-live", sortKey: "goLive", className: "w-[110px]" },
  { label: "In app", className: "w-[80px]" },
];

export default function ZenoChargingPage() {
  return (
    <>
      <Topbar title="Zeno Charging" />
      <ChargingGate>{({ assets, me }) => <ChargingList assets={assets} me={me} />}</ChargingGate>
    </>
  );
}

function ChargingList({ assets, me }: { assets: ChargingAsset[]; me: Me }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ChargingFilters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [resetting, setResetting] = useState(false);

  const live = assets.filter((a) => !a.archivedAt);
  const rows = sortRows(assets.filter((a) => matchesSearch(a, search) && matches(a, filters)), sort);
  const shownPage = Math.min(page, Math.max(1, Math.ceil(rows.length / perPage)));
  const pageRows = rows.slice((shownPage - 1) * perPage, shownPage * perPage);
  const attention = live.filter((a) => a.needsAttention).length;
  const narrowed = anyFilter(filters) || search.trim() !== "";
  const towns = distinct(assets, (a) => a.town);
  const set = (f: Partial<ChargingFilters>) => { setFilters({ ...filters, ...f }); setPage(1); };

  const summary = [
    { label: "Swap stations", value: live.filter((a) => a.assetType === "Swap Station").length, onClick: () => set({ ...NO_FILTERS, type: "Swap Station" }) },
    { label: "Fast chargers", value: live.filter((a) => a.assetType === "Fast Charger").length, onClick: () => set({ ...NO_FILTERS, type: "Fast Charger" }) },
    { label: "Sites", value: new Set(live.map((a) => a.siteId)).size, onClick: () => set(NO_FILTERS) },
    { label: "In the app & website", value: live.filter(isPublic).length, onClick: () => set({ ...NO_FILTERS, inApp: "yes" }) },
  ];

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
        <p className="max-w-xl text-xs text-slate-400">
          The source of truth for every swap station and fast charger. Commissioned, public assets appear in the rider app, on zeno.earth and on Google (see the preview). Prototype: data is kept in this browser.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs font-medium text-slate-400 hover:text-slate-600" onClick={() => setResetting(true)}>Reset sandbox data</button>
          <Link href="/zeno-charging/preview" className={SECONDARY}><Globe className="h-3.5 w-3.5" /> App & website preview</Link>
          {me.can.write && (
            <Link href="/zeno-charging/new" className={PRIMARY}><Plus className="h-3.5 w-3.5" /> Add charging asset</Link>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden bg-zeno-bg p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
          {summary.map((s) => (
            <button key={s.label} type="button" onClick={s.onClick} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              <p className="text-[11px] font-medium text-slate-500">{s.label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-800">{s.value.toLocaleString()}</p>
            </button>
          ))}
        </div>

        {attention > 0 && !filters.attention && (
          <button type="button" onClick={() => set({ ...NO_FILTERS, attention: true })} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 shrink-0 hover:bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span><span className="font-semibold">{attention} assets need attention</span>: missing or invalid details from the sheet (no Asset ID, a duplicate, a bad phone number…). Show them</span>
          </button>
        )}

        <div className={BAR}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search ID, name, site, landmark, partner" aria-label="Search charging assets" className={SEARCH} />
          </div>
          <select aria-label="Asset type" value={filters.type} onChange={(e) => set({ type: e.target.value })} className={CONTROL}>
            <option value="">All types</option>
            {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Status" value={filters.status} onChange={(e) => set({ status: e.target.value as ChargingFilters["status"] })} className={CONTROL}>
            <option value="">Active (not archived)</option>
            <option value="Commissioned">Commissioned</option>
            <option value="Decommissioned">Decommissioned</option>
            <option value="archived">Archived</option>
          </select>
          <select aria-label="Access" value={filters.access} onChange={(e) => set({ access: e.target.value })} className={CONTROL}>
            <option value="">All access</option>
            {ACCESS_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Town" value={filters.town} onChange={(e) => set({ town: e.target.value })} className={CONTROL}>
            <option value="">All towns</option>
            {towns.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Country" value={filters.country} onChange={(e) => set({ country: e.target.value })} className={CONTROL}>
            <option value="">All countries</option>
            {COUNTRIES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Zone" value={filters.zone} onChange={(e) => set({ zone: e.target.value })} className={CONTROL}>
            <option value="">All zones</option>
            {ZONES.map((t) => <option key={t} value={t}>Zone {t}</option>)}
          </select>
          <select aria-label="In the app" value={filters.inApp} onChange={(e) => set({ inApp: e.target.value as ChargingFilters["inApp"] })} className={CONTROL}>
            <option value="">In app: any</option>
            <option value="yes">In the app & website</option>
            <option value="no">Not in the app</option>
          </select>
          {narrowed && <ClearFiltersButton onClick={() => { setSearch(""); setFilters(NO_FILTERS); setPage(1); }} />}
          <span aria-live="polite" className="ml-auto text-xs tabular-nums text-slate-500">
            {narrowed ? `${rows.length.toLocaleString()} of ${assets.length.toLocaleString()} assets` : `${rows.length.toLocaleString()} assets`}
          </span>
          <button type="button" className={SECONDARY} onClick={() => { const n = exportGbpCsv(assets); toast.success("Google Business Profile CSV downloaded", `${n} public locations.`); }}>
            <Download className="h-3.5 w-3.5" /> Google CSV
          </button>
          <button type="button" className={PRIMARY} onClick={() => {
            if (!rows.length) { toast.error("Nothing to export", "No asset matches the search and filters."); return; }
            void exportChargingXLSX(rows).then(() => toast.success("Export downloaded", `${rows.length} assets written to XLSX.`));
          }}>
            <Download className="h-3.5 w-3.5" /> Export XLSX
          </button>
        </div>

        {filters.attention && (
          <FilterChips>
            <FilterChip label="Needs attention" value={`${rows.length}`} removeLabel="Remove Needs attention filter" onRemove={() => set({ attention: false })} />
          </FilterChips>
        )}

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.label} className={cn("sticky top-0 z-10 bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-500 shadow-[inset_0_-1px_0_var(--color-slate-200)]", c.className)}>
                      {c.sortKey ? (
                        <button type="button" onClick={() => setSort((s) => nextSort(s, c.sortKey!))} className="inline-flex items-center hover:text-slate-700">
                          {c.label}
                          {sort.column !== c.sortKey ? <ArrowUpDown className="ml-1 h-3 w-3 text-slate-300" /> : sort.direction === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-zeno-red" /> : <ArrowDown className="ml-1 h-3 w-3 text-zeno-red" />}
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-slate-500">No charging asset matches the search and filters.</td></tr>
                )}
                {pageRows.map((a) => (
                  <tr
                    key={a.id}
                    tabIndex={0}
                    onClick={() => router.push(`/zeno-charging/${a.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/zeno-charging/${a.id}`); }}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="truncate px-3 py-2.5 font-mono text-xs text-slate-700">
                      {a.assetId ?? <span className="font-sans text-amber-700">No ID</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="truncate font-medium text-slate-800">{a.assetName}</p>
                      {a.needsAttention && <p className="flex items-center gap-1 truncate text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3 shrink-0" /> {a.needsAttention}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{a.assetType}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{a.siteId}</td>
                    <td className="truncate px-3 py-2.5 text-xs text-slate-600">{a.town}</td>
                    <td className="px-3 py-2.5"><StatusBadge asset={a} /></td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-slate-600">{a.goLiveDate ?? "–"}</td>
                    <td className="px-3 py-2.5 text-xs">{isPublic(a) ? <span className="font-medium text-emerald-700">Yes</span> : <span className="text-slate-400">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={rows.length} page={shownPage} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} perPageOptions={[25, 50, 100, 400]} />
        </div>
      </div>
      <ConfirmModal open={resetting} title="Reset sandbox data?" confirmLabel="Reset" onClose={() => setResetting(false)} onConfirm={() => { resetCharging(); setResetting(false); toast.success("Sandbox reset", "Back to the 331 assets from the sheet."); }}>
        Every asset you added, edited or archived in this browser goes back to the Charging Asset Master sheet as imported.
      </ConfirmModal>
    </main>
  );
}
