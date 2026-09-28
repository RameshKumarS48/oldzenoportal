"use client";

import { useMemo, useState } from "react";
import { Search, Download, PlusSquare } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { SWAP_STATIONS } from "@/lib/mock/kpi-infra";
import type { SwapStation } from "@/lib/mock/kpi-infra";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", nyeri: "Nyeri" };
const REGION_COLORS: Record<string, string> = { nbo: "bg-[#003B49]/10 text-[#003B49]", nanyuki: "bg-[#FF3B06]/10 text-[#FF3B06]", nyeri: "bg-emerald-50 text-emerald-700" };
const RATING_STYLES: Record<string, string> = { H: "bg-emerald-50 text-emerald-700", M: "bg-amber-50 text-amber-700", L: "bg-slate-100 text-slate-500" };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function stationStatus(s: SwapStation) {
  if (!s.live) return { label: "Offline", cls: "bg-red-50 text-red-600" };
  if (s.live && !s.operational) return { label: "Not Operational", cls: "bg-amber-50 text-amber-700" };
  return { label: "Live", cls: "bg-emerald-50 text-emerald-700" };
}

function utilizationColor(pct: number) {
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-500";
}

function exportCSV(stations: SwapStation[]) {
  const headers = ["ID","Name","Location","Region","Live","Operational","InstallType","BatteriesInstalled","BatteriesAvailable","EnergyKwh","Rating","StartDate","RentKES"];
  const rows = stations.map(s => [s.id,s.name,s.location,s.region,s.live,s.operational,s.installationType,s.batteriesInstalled,s.batteriesAvailable,s.energyConsumptionKwh,s.rating,s.startDate,s.rent]);
  const csv = [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`swap-stations-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function SwapStationsPage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const filtered = useMemo(() => SWAP_STATIONS.filter(s => {
    if (regionFilter && s.region !== regionFilter) return false;
    if (statusFilter === "live" && !s.live) return false;
    if (statusFilter === "offline" && s.live) return false;
    if (typeFilter && s.installationType !== typeFilter) return false;
    if (ratingFilter && s.rating !== ratingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    }
    return true;
  }), [search, regionFilter, statusFilter, typeFilter, ratingFilter]);

  const totalBatteries = SWAP_STATIONS.reduce((a,s)=>a+s.batteriesInstalled,0);
  const totalKwh = SWAP_STATIONS.reduce((a,s)=>a+s.energyConsumptionKwh,0);
  const liveOps = SWAP_STATIONS.filter(s=>s.live&&s.operational).length;

  const pageWidgets = [
    { title: "Total Swap Stations", snapshotValue: SWAP_STATIONS.length, snapshotLabel: "in network", snapshotSource: "Swap Station Telemetry" },
    { title: "Live & Operational", snapshotValue: liveOps, snapshotLabel: "currently serving", snapshotSource: "Swap Station Telemetry" },
    { title: "Batteries Installed", snapshotValue: totalBatteries, snapshotLabel: "across all stations", snapshotSource: "Swap Station Telemetry" },
    { title: "Total Energy (kWh)", snapshotValue: totalKwh.toLocaleString(), snapshotLabel: "cumulative energy", snapshotSource: "Swap Station Telemetry" },
  ];

  const topEnergy = [...SWAP_STATIONS].sort((a,b)=>b.energyConsumptionKwh-a.energyConsumptionKwh).slice(0,12).map(s=>({
    name: s.name.split(",")[0].trim().slice(0,14),
    kWh: s.energyConsumptionKwh,
  }));

  const regionPie = [
    { name: "NBO", value: SWAP_STATIONS.filter(s=>s.region==="nbo").length, color: "#003B49" },
    { name: "Nanyuki", value: SWAP_STATIONS.filter(s=>s.region==="nanyuki").length, color: "#FF3B06" },
    { name: "Nyeri", value: SWAP_STATIONS.filter(s=>s.region==="nyeri").length, color: "#10b981" },
  ];

  return (
    <>
      <Topbar
        title="Swap Station Telemetry"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-slate-400 font-medium">{filtered.length} stations</span>
            <Button size="sm" variant="ghost-dark" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" variant="ghost-dark" onClick={() => exportCSV(filtered)}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Stations"      value={SWAP_STATIONS.length} />
          <StatCard label="Live & Operational"  value={liveOps}                     valueColor="text-emerald-600" />
          <StatCard label="Batteries Installed" value={totalBatteries}              valueColor="text-zeno-teal" />
          <StatCard label="Total Energy (kWh)"  value={totalKwh.toLocaleString()}   valueColor="text-zeno-orange" />
        </StatGrid>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Energy Consumption by Station (top 12)</p>
            <div style={{ height: 240 }}>
              <BarChart
                data={topEnergy}
                series={[{ key: "kWh", label: "Energy (kWh)", color: "#003B49" }]}
                xKey="name"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Stations by Region</p>
            <div style={{ height: 240 }}>
              <PieChart data={regionPie} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, location…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
            />
          </div>
          {([
            ["Region", regionFilter, setRegionFilter, [["","All Regions"],["nbo","NBO"],["nanyuki","Nanyuki"],["nyeri","Nyeri"]]],
            ["Status", statusFilter, setStatusFilter, [["","All Status"],["live","Live"],["offline","Offline"]]],
            ["Type", typeFilter, setTypeFilter, [["","All Types"],["single_phase","Single Phase"],["three_phase","Three Phase"]]],
            ["Rating", ratingFilter, setRatingFilter, [["","All Ratings"],["H","High"],["M","Medium"],["L","Low"]]],
          ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
            <select key={label} value={val} onChange={e => setter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {(search || regionFilter || statusFilter || typeFilter || ratingFilter) && (
            <button onClick={() => { setSearch(""); setRegionFilter(""); setStatusFilter(""); setTypeFilter(""); setRatingFilter(""); }}
              className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {["Station ID","Name / Location","Region","Status","Type","Batteries","Avail. %","Energy kWh","Rating","Start Date","Rent (KES)"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-400">No stations match your filters</td></tr>
                )}
                {filtered.map(s => {
                  const stat = stationStatus(s);
                  const utilPct = s.batteriesInstalled > 0 ? Math.round((s.batteriesAvailable / s.batteriesInstalled) * 100) : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{s.id}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-700">{s.name.split(",")[0].trim()}</p>
                        <p className="text-slate-400 text-[11px]">{s.location}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", REGION_COLORS[s.region] ?? "bg-slate-100 text-slate-500")}>
                          {REGION_LABELS[s.region] ?? s.region}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", stat.cls)}>{stat.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{s.installationType === "single_phase" ? "1-Phase" : "3-Phase"}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-600">{s.batteriesAvailable}/{s.batteriesInstalled}</td>
                      <td className="px-3 py-2.5">
                        {utilPct !== null
                          ? <span className={cn("font-semibold", utilizationColor(utilPct))}>{utilPct}%</span>
                          : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-600">{s.energyConsumptionKwh.toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", RATING_STYLES[s.rating])}>{s.rating}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(s.startDate)}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-right">
                        {s.rent === 0 ? <span className="text-slate-300">–</span> : `KES ${s.rent.toLocaleString()}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <AddToDashboardModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widgets={pageWidgets} />
    </>
  );
}
