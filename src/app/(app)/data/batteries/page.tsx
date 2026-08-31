"use client";

import { useMemo, useState } from "react";
import { Search, Download, AlertTriangle, PlusSquare } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

interface BatteryTelemetry {
  id: string;
  serial: string;
  soc: number;
  temperature: number;
  cycles: number;
  health: number;
  voltage: number;
  current: number;
  status: "charging" | "discharging" | "idle" | "fault";
  assignment: "vehicle" | "swap_station" | "unassigned";
  assignmentId: string;
  lastUpdated: string;
  alerts: string[];
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
}

const BATTERIES: BatteryTelemetry[] = [
  // On vehicles — discharging
  { id:"bt-01", serial:"ZB-0001", soc:72, temperature:28, cycles:142, health:96, voltage:54.2, current:-18, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001988", lastUpdated:"2026-07-30T07:41:00Z", alerts:[], region:"nbo" },
  { id:"bt-02", serial:"ZB-0002", soc:55, temperature:31, cycles:278, health:91, voltage:52.8, current:-22, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001526", lastUpdated:"2026-07-30T07:39:00Z", alerts:[], region:"nbo" },
  { id:"bt-03", serial:"ZB-0003", soc:84, temperature:26, cycles:67,  health:98, voltage:55.6, current:-15, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001547", lastUpdated:"2026-07-30T07:42:00Z", alerts:[], region:"nbo" },
  { id:"bt-04", serial:"ZB-0004", soc:38, temperature:34, cycles:412, health:87, voltage:51.4, current:-20, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001905", lastUpdated:"2026-07-30T07:40:00Z", alerts:[], region:"nbo" },
  { id:"bt-05", serial:"ZB-0005", soc:11, temperature:29, cycles:389, health:88, voltage:49.6, current:-24, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001934", lastUpdated:"2026-07-30T07:38:00Z", alerts:["Low SoC"], region:"nbo" },
  { id:"bt-06", serial:"ZB-0006", soc:63, temperature:27, cycles:201, health:94, voltage:53.4, current:-19, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001616", lastUpdated:"2026-07-30T07:43:00Z", alerts:[], region:"nbo" },
  { id:"bt-07", serial:"ZB-0007", soc:47, temperature:33, cycles:334, health:89, voltage:52.1, current:-21, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001942", lastUpdated:"2026-07-30T07:37:00Z", alerts:[], region:"nbo" },
  { id:"bt-08", serial:"ZB-0008", soc:79, temperature:41, cycles:156, health:95, voltage:55.0, current:-17, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001423", lastUpdated:"2026-07-30T07:44:00Z", alerts:["High Temp"], region:"nbo" },
  { id:"bt-09", serial:"ZB-0009", soc:52, temperature:28, cycles:487, health:84, voltage:52.5, current:-23, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001938", lastUpdated:"2026-07-30T07:36:00Z", alerts:[], region:"nbo" },
  { id:"bt-10", serial:"ZB-0010", soc:33, temperature:30, cycles:561, health:81, voltage:51.0, current:-25, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001820", lastUpdated:"2026-07-30T07:45:00Z", alerts:[], region:"nbo" },
  { id:"bt-11", serial:"ZB-0011", soc:68, temperature:27, cycles:89,  health:97, voltage:54.0, current:-16, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001856", lastUpdated:"2026-07-30T07:35:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-12", serial:"ZB-0012", soc:24, temperature:29, cycles:445, health:85, voltage:50.4, current:-22, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001712", lastUpdated:"2026-07-30T07:46:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-13", serial:"ZB-0013", soc:77, temperature:32, cycles:213, health:93, voltage:54.8, current:-18, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001677", lastUpdated:"2026-07-30T07:34:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-14", serial:"ZB-0014", soc:9,  temperature:31, cycles:398, health:87, voltage:49.2, current:-26, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001543", lastUpdated:"2026-07-30T07:47:00Z", alerts:["Low SoC"], region:"nanyuki" },
  { id:"bt-15", serial:"ZB-0015", soc:58, temperature:36, cycles:302, health:90, voltage:53.1, current:-20, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001590", lastUpdated:"2026-07-30T07:33:00Z", alerts:[], region:"naromoru" },
  { id:"bt-16", serial:"ZB-0016", soc:41, temperature:25, cycles:178, health:95, voltage:51.7, current:-21, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001448", lastUpdated:"2026-07-30T07:48:00Z", alerts:[], region:"naromoru" },
  { id:"bt-17", serial:"ZB-0017", soc:83, temperature:28, cycles:44,  health:99, voltage:55.5, current:-14, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001423", lastUpdated:"2026-07-30T07:32:00Z", alerts:[], region:"naromoru" },
  { id:"bt-18", serial:"ZB-0018", soc:66, temperature:29, cycles:267, health:92, voltage:53.8, current:-19, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001388", lastUpdated:"2026-07-30T07:49:00Z", alerts:[], region:"nyeri" },
  { id:"bt-19", serial:"ZB-0019", soc:50, temperature:27, cycles:133, health:96, voltage:52.4, current:-22, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001344", lastUpdated:"2026-07-30T07:31:00Z", alerts:[], region:"nyeri" },
  { id:"bt-20", serial:"ZB-0020", soc:29, temperature:30, cycles:522, health:82, voltage:50.7, current:-24, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001301", lastUpdated:"2026-07-30T07:50:00Z", alerts:[], region:"nyeri" },
  { id:"bt-21", serial:"ZB-0021", soc:74, temperature:26, cycles:95,  health:97, voltage:54.5, current:-16, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001256", lastUpdated:"2026-07-30T07:30:00Z", alerts:[], region:"nbo" },
  { id:"bt-22", serial:"ZB-0022", soc:46, temperature:43, cycles:612, health:78, voltage:52.0, current:-23, status:"fault",       assignment:"vehicle", assignmentId:"ME92ZPSEB1J001199", lastUpdated:"2026-07-30T06:55:00Z", alerts:["High Temp","BMS Fault"], region:"nbo" },
  { id:"bt-23", serial:"ZB-0023", soc:61, temperature:28, cycles:188, health:94, voltage:53.5, current:-20, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001173", lastUpdated:"2026-07-30T07:29:00Z", alerts:[], region:"nbo" },
  { id:"bt-24", serial:"ZB-0024", soc:87, temperature:27, cycles:55,  health:98, voltage:55.9, current:-14, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001122", lastUpdated:"2026-07-30T07:51:00Z", alerts:[], region:"nbo" },
  { id:"bt-25", serial:"ZB-0025", soc:35, temperature:31, cycles:449, health:85, voltage:51.3, current:-22, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001088", lastUpdated:"2026-07-30T07:28:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-26", serial:"ZB-0026", soc:70, temperature:29, cycles:234, health:93, voltage:54.3, current:-17, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J001044", lastUpdated:"2026-07-30T07:52:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-27", serial:"ZB-0027", soc:43, temperature:33, cycles:376, health:88, voltage:51.8, current:-21, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J001011", lastUpdated:"2026-07-30T07:27:00Z", alerts:[], region:"naromoru" },
  { id:"bt-28", serial:"ZB-0028", soc:80, temperature:26, cycles:122, health:96, voltage:55.2, current:-15, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J000977", lastUpdated:"2026-07-30T07:53:00Z", alerts:[], region:"naromoru" },
  { id:"bt-29", serial:"ZB-0029", soc:57, temperature:30, cycles:288, health:91, voltage:53.0, current:-20, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSFB1J000944", lastUpdated:"2026-07-30T07:26:00Z", alerts:[], region:"nyeri" },
  { id:"bt-30", serial:"ZB-0030", soc:22, temperature:28, cycles:534, health:82, voltage:50.2, current:-25, status:"discharging", assignment:"vehicle", assignmentId:"ME92ZPSEB1J000911", lastUpdated:"2026-07-30T07:54:00Z", alerts:[], region:"nyeri" },
  // At swap stations — charging
  { id:"bt-31", serial:"ZB-0031", soc:48, temperature:35, cycles:210, health:93, voltage:52.3, current:28, status:"charging", assignment:"swap_station", assignmentId:"SS-NBO-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nbo" },
  { id:"bt-32", serial:"ZB-0032", soc:91, temperature:34, cycles:167, health:95, voltage:57.1, current:12, status:"charging", assignment:"swap_station", assignmentId:"SS-NBO-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nbo" },
  { id:"bt-33", serial:"ZB-0033", soc:63, temperature:33, cycles:301, health:90, voltage:53.6, current:26, status:"charging", assignment:"swap_station", assignmentId:"SS-NBO-02", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nbo" },
  { id:"bt-34", serial:"ZB-0034", soc:30, temperature:36, cycles:453, health:85, voltage:50.8, current:30, status:"charging", assignment:"swap_station", assignmentId:"SS-NBO-02", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nbo" },
  { id:"bt-35", serial:"ZB-0035", soc:77, temperature:32, cycles:88,  health:97, voltage:54.9, current:18, status:"charging", assignment:"swap_station", assignmentId:"SS-NBO-03", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nbo" },
  { id:"bt-36", serial:"ZB-0036", soc:54, temperature:34, cycles:244, health:92, voltage:52.7, current:27, status:"charging", assignment:"swap_station", assignmentId:"SS-NAN-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-37", serial:"ZB-0037", soc:86, temperature:33, cycles:133, health:96, voltage:55.8, current:14, status:"charging", assignment:"swap_station", assignmentId:"SS-NAN-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-38", serial:"ZB-0038", soc:42, temperature:35, cycles:389, health:87, voltage:51.6, current:29, status:"charging", assignment:"swap_station", assignmentId:"SS-NAR-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"naromoru" },
  { id:"bt-39", serial:"ZB-0039", soc:70, temperature:36, cycles:199, health:94, voltage:54.2, current:21, status:"charging", assignment:"swap_station", assignmentId:"SS-NYR-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nyeri" },
  { id:"bt-40", serial:"ZB-0040", soc:95, temperature:33, cycles:76,  health:98, voltage:57.5, current:8,  status:"charging", assignment:"swap_station", assignmentId:"SS-NYR-01", lastUpdated:"2026-07-30T07:55:00Z", alerts:[], region:"nyeri" },
  // Unassigned — idle
  { id:"bt-41", serial:"ZB-0041", soc:100, temperature:22, cycles:0,   health:100, voltage:58.0, current:0, status:"idle", assignment:"unassigned", assignmentId:"", lastUpdated:"2026-07-30T06:00:00Z", alerts:[], region:"nbo" },
  { id:"bt-42", serial:"ZB-0042", soc:100, temperature:23, cycles:0,   health:100, voltage:57.9, current:0, status:"idle", assignment:"unassigned", assignmentId:"", lastUpdated:"2026-07-30T06:00:00Z", alerts:[], region:"nbo" },
  { id:"bt-43", serial:"ZB-0043", soc:85,  temperature:21, cycles:611, health:79,  voltage:55.7, current:0, status:"idle", assignment:"unassigned", assignmentId:"", lastUpdated:"2026-07-29T18:00:00Z", alerts:[], region:"nbo" },
  { id:"bt-44", serial:"ZB-0044", soc:100, temperature:22, cycles:12,  health:100, voltage:58.0, current:0, status:"idle", assignment:"unassigned", assignmentId:"", lastUpdated:"2026-07-30T06:00:00Z", alerts:[], region:"nanyuki" },
  { id:"bt-45", serial:"ZB-0045", soc:100, temperature:23, cycles:4,   health:100, voltage:57.8, current:0, status:"idle", assignment:"unassigned", assignmentId:"", lastUpdated:"2026-07-30T06:00:00Z", alerts:[], region:"naromoru" },
];

const STATUS_META = {
  charging:    { label: "Charging",     badge: "bg-emerald-50 text-emerald-700", color: "#10b981" },
  discharging: { label: "In Use",       badge: "bg-[#003B49]/10 text-[#003B49]", color: "#003B49" },
  idle:        { label: "Idle",         badge: "bg-slate-100 text-slate-500",    color: "#94a3b8" },
  fault:       { label: "Fault",        badge: "bg-red-50 text-red-600",         color: "#ef4444" },
};

const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", naromoru: "Naro Moru", nyeri: "Nyeri" };

function SocBar({ soc }: { soc: number }) {
  const color = soc < 20 ? "bg-red-500" : soc < 50 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${soc}%` }} />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", soc < 20 ? "text-red-600" : soc < 50 ? "text-amber-600" : "text-emerald-700")}>
        {soc}%
      </span>
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function exportCSV(list: BatteryTelemetry[]) {
  const h = ["Serial","Status","SoC%","Temp°C","Cycles","Health%","Voltage","Current","Assignment","AssignmentID","Alerts","Region","LastUpdated"];
  const rows = list.map(b => [b.serial, b.status, b.soc, b.temperature, b.cycles, b.health, b.voltage, b.current, b.assignment, b.assignmentId, b.alerts.join(";"), b.region, b.lastUpdated]);
  const csv = [h, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `battery-telemetry-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function BatteryTelemetryPage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  const filtered = useMemo(() => BATTERIES.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (regionFilter && b.region !== regionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.serial.toLowerCase().includes(q) || b.assignmentId.toLowerCase().includes(q);
    }
    return true;
  }), [search, statusFilter, regionFilter]);

  const totalAlerts = BATTERIES.filter(b => b.alerts.length > 0).length;
  const activeCount = BATTERIES.filter(b => b.assignment === "vehicle").length;
  const chargingCount = BATTERIES.filter(b => b.assignment === "swap_station").length;
  const avgSoc = Math.round(BATTERIES.reduce((a, b) => a + b.soc, 0) / BATTERIES.length);

  const pageWidgets = [
    { title: "Total Batteries", snapshotValue: BATTERIES.length, snapshotLabel: "in fleet", snapshotSource: "Battery Telemetry" },
    { title: "On Vehicles", snapshotValue: activeCount, snapshotLabel: "discharging in field", snapshotSource: "Battery Telemetry" },
    { title: "Charging at Stations", snapshotValue: chargingCount, snapshotLabel: "at swap stations", snapshotSource: "Battery Telemetry" },
    { title: "Active Alerts", snapshotValue: totalAlerts, snapshotLabel: "batteries with alerts", snapshotSource: "Battery Telemetry" },
    { title: "Avg State of Charge", snapshotValue: `${avgSoc}%`, snapshotLabel: "fleet average SoC", snapshotSource: "Battery Telemetry" },
  ];

  // SoC distribution buckets
  const socBuckets = [
    { range: "0–20%",   count: BATTERIES.filter(b => b.soc < 20).length,             color: "#ef4444" },
    { range: "20–40%",  count: BATTERIES.filter(b => b.soc >= 20 && b.soc < 40).length, color: "#f59e0b" },
    { range: "40–60%",  count: BATTERIES.filter(b => b.soc >= 40 && b.soc < 60).length, color: "#eab308" },
    { range: "60–80%",  count: BATTERIES.filter(b => b.soc >= 60 && b.soc < 80).length, color: "#22c55e" },
    { range: "80–100%", count: BATTERIES.filter(b => b.soc >= 80).length,             color: "#10b981" },
  ];
  const socData = socBuckets.map(b => ({ range: b.range, count: b.count }));

  const statusPie = (["discharging","charging","idle","fault"] as const).map(s => ({
    name: STATUS_META[s].label,
    value: BATTERIES.filter(b => b.status === s).length,
    color: STATUS_META[s].color,
  }));

  return (
    <>
      <Topbar
        title="Battery Telemetry"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-white/60 font-medium">{filtered.length} / {BATTERIES.length}</span>
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
          <StatCard label="Total Batteries"      value={BATTERIES.length} />
          <StatCard label="Active (On Vehicle)"  value={activeCount}    valueColor="text-zeno-teal" />
          <StatCard label="Charging at Station"  value={chargingCount}  valueColor="text-emerald-600" />
          <StatCard label="Active Alerts"        value={totalAlerts}    valueColor={totalAlerts > 0 ? "text-red-500" : "text-slate-400"} />
        </StatGrid>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">SoC Distribution</p>
            <div style={{ height: 200 }}>
              <BarChart
                data={socData}
                series={[{ key: "count", label: "Batteries", color: "#003B49" }]}
                xKey="range"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">By Status</p>
            <div style={{ height: 200 }}>
              <PieChart data={statusPie} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search serial or assignment…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Status</option>
            <option value="discharging">In Use</option>
            <option value="charging">Charging</option>
            <option value="idle">Idle</option>
            <option value="fault">Fault</option>
          </select>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Regions</option>
            <option value="nbo">NBO</option>
            <option value="nanyuki">Nanyuki</option>
            <option value="naromoru">Naro Moru</option>
            <option value="nyeri">Nyeri</option>
          </select>
          {(statusFilter || regionFilter || search) && (
            <button onClick={() => { setStatusFilter(""); setRegionFilter(""); setSearch(""); }}
              className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Serial","Status","SoC","Temp","Cycles","Health","Voltage","Current","Assignment","Region","Updated","Alerts"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-12 text-slate-400">No batteries match your filters</td></tr>
                )}
                {filtered.map(b => {
                  const meta = STATUS_META[b.status];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-700">{b.serial}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", meta.badge)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><SocBar soc={b.soc} /></td>
                      <td className={cn("px-3 py-2.5 font-semibold tabular-nums", b.temperature > 38 ? "text-red-600" : "text-slate-600")}>
                        {b.temperature}°C
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 tabular-nums">{b.cycles}</td>
                      <td className={cn("px-3 py-2.5 font-semibold tabular-nums", b.health < 85 ? "text-amber-600" : "text-slate-600")}>
                        {b.health}%
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 tabular-nums font-mono text-[11px]">{b.voltage.toFixed(1)}V</td>
                      <td className="px-3 py-2.5 tabular-nums font-mono text-[11px]">
                        <span className={b.current > 0 ? "text-emerald-600" : b.current < 0 ? "text-[#003B49]" : "text-slate-400"}>
                          {b.current > 0 ? "+" : ""}{b.current}A
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {b.assignmentId
                          ? <div>
                              <div className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]">{b.assignmentId}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{b.assignment.replace("_"," ")}</div>
                            </div>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{REGION_LABELS[b.region]}</td>
                      <td className="px-3 py-2.5 text-slate-400 tabular-nums">{fmtTime(b.lastUpdated)}</td>
                      <td className="px-3 py-2.5">
                        {b.alerts.length > 0
                          ? <div className="flex flex-wrap gap-1">
                              {b.alerts.map(a => (
                                <span key={a} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">
                                  <AlertTriangle className="w-2.5 h-2.5" />{a}
                                </span>
                              ))}
                            </div>
                          : <span className="text-slate-300">—</span>
                        }
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
