"use client";

import { useMemo, useState } from "react";
import { Search, Download, Zap, PlusSquare } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

// ── Session Telemetry ─────────────────────────────────────────────────────────

interface FCSession {
  id: string;
  stationId: string;
  stationName: string;
  unitNo: number;
  phone: string;
  customerName: string;
  startTime: string;
  endTime?: string;
  durationMin?: number;
  kwhDelivered?: number;
  costKES?: number;
  status: "active" | "completed" | "error";
  region: "nbo" | "nanyuki" | "nyeri";
}

const SESSIONS: FCSession[] = [
  // Active sessions (right now)
  { id:"FCS-0001", stationId:"FC-NBO-01", stationName:"Zeno Hub — Westlands",    unitNo:2, phone:"0712 345 678", customerName:"NICKSON MWITI",    startTime:"2026-07-30T07:10:00Z", status:"active",    region:"nbo" },
  { id:"FCS-0002", stationId:"FC-NBO-05", stationName:"Kilimani Business Ctr",   unitNo:1, phone:"0723 456 789", customerName:"Grace Wanjiru",     startTime:"2026-07-30T07:22:00Z", status:"active",    region:"nbo" },
  { id:"FCS-0003", stationId:"FC-NAN-01", stationName:"Nanyuki Town Centre",      unitNo:3, phone:"0734 567 890", customerName:"David Kimani",      startTime:"2026-07-30T07:35:00Z", status:"active",    region:"nanyuki" },

  // Completed sessions — today
  { id:"FCS-0004", stationId:"FC-NBO-01", stationName:"Zeno Hub — Westlands",    unitNo:1, phone:"0745 678 901", customerName:"MUVUNYI JEAN",      startTime:"2026-07-30T05:12:00Z", endTime:"2026-07-30T06:04:00Z", durationMin:52, kwhDelivered:8.3,  costKES:415,  status:"completed", region:"nbo" },
  { id:"FCS-0005", stationId:"FC-NBO-02", stationName:"Upperhill Medical Ctr",   unitNo:2, phone:"0756 789 012", customerName:"James Ng'ang'a",    startTime:"2026-07-30T05:44:00Z", endTime:"2026-07-30T06:58:00Z", durationMin:74, kwhDelivered:11.8, costKES:590,  status:"completed", region:"nbo" },
  { id:"FCS-0006", stationId:"FC-NBO-03", stationName:"Parklands Retail Park",   unitNo:1, phone:"0767 890 123", customerName:"Fredrick Ochieng",  startTime:"2026-07-30T06:00:00Z", endTime:"2026-07-30T07:05:00Z", durationMin:65, kwhDelivered:10.4, costKES:520,  status:"completed", region:"nbo" },
  { id:"FCS-0007", stationId:"FC-NBO-04", stationName:"Karen Country Club",      unitNo:1, phone:"0778 901 234", customerName:"Erick Nganda",      startTime:"2026-07-30T06:15:00Z", endTime:"2026-07-30T07:02:00Z", durationMin:47, kwhDelivered:7.5,  costKES:375,  status:"completed", region:"nbo" },
  { id:"FCS-0008", stationId:"FC-NBO-06", stationName:"Eastleigh Mall",          unitNo:3, phone:"0789 012 345", customerName:"Augustine Mbevi",   startTime:"2026-07-30T06:30:00Z", endTime:"2026-07-30T07:41:00Z", durationMin:71, kwhDelivered:11.3, costKES:565,  status:"completed", region:"nbo" },
  { id:"FCS-0009", stationId:"FC-NBO-07", stationName:"Ruaka Supercentre",       unitNo:2, phone:"0790 123 456", customerName:"Zechariah Anita",   startTime:"2026-07-30T06:45:00Z", endTime:"2026-07-30T07:38:00Z", durationMin:53, kwhDelivered:8.5,  costKES:425,  status:"completed", region:"nbo" },
  { id:"FCS-0010", stationId:"FC-NYR-01", stationName:"Kimathi Way Hub",          unitNo:1, phone:"0712 234 567", customerName:"Vincent King'oo",   startTime:"2026-07-30T05:30:00Z", endTime:"2026-07-30T06:22:00Z", durationMin:52, kwhDelivered:8.3,  costKES:415,  status:"completed", region:"nyeri" },
  { id:"FCS-0011", stationId:"FC-NBO-08", stationName:"Lang'ata Crossing",       unitNo:1, phone:"0723 345 678", customerName:"Moses Mwangi",      startTime:"2026-07-30T05:00:00Z", endTime:"2026-07-30T06:05:00Z", durationMin:65, kwhDelivered:10.4, costKES:520,  status:"completed", region:"nbo" },
  { id:"FCS-0012", stationId:"FC-NBO-09", stationName:"Kasarani Arena",          unitNo:4, phone:"0734 456 789", customerName:"Ruth Akinyi",       startTime:"2026-07-30T04:45:00Z", endTime:"2026-07-30T05:58:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0013", stationId:"FC-NAN-02", stationName:"Nanyuki Shopping Mall",   unitNo:2, phone:"0745 567 890", customerName:"Charles Mutua",     startTime:"2026-07-30T05:55:00Z", endTime:"2026-07-30T07:00:00Z", durationMin:65, kwhDelivered:10.4, costKES:520,  status:"completed", region:"nanyuki" },
  { id:"FCS-0014", stationId:"FC-NYR-02", stationName:"Outspan Hotel",           unitNo:1, phone:"0756 678 901", customerName:"Esther Nafula",     startTime:"2026-07-30T06:10:00Z", endTime:"2026-07-30T07:08:00Z", durationMin:58, kwhDelivered:9.3,  costKES:465,  status:"completed", region:"nyeri" },
  { id:"FCS-0015", stationId:"FC-NBO-01", stationName:"Zeno Hub — Westlands",    unitNo:3, phone:"0767 789 012", customerName:"Samuel Odhiambo",   startTime:"2026-07-30T04:30:00Z", endTime:"2026-07-30T05:45:00Z", durationMin:75, kwhDelivered:12.0, costKES:600,  status:"completed", region:"nbo" },
  { id:"FCS-0016", stationId:"FC-NBO-02", stationName:"Upperhill Medical Ctr",   unitNo:1, phone:"0778 890 123", customerName:"Faith Chebet",      startTime:"2026-07-30T04:15:00Z", endTime:"2026-07-30T05:28:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0017", stationId:"FC-NAN-03", stationName:"Delamere Camp",           unitNo:1, phone:"0789 901 234", customerName:"Brian Otieno",      startTime:"2026-07-30T05:20:00Z", endTime:"2026-07-30T06:15:00Z", durationMin:55, kwhDelivered:8.8,  costKES:440,  status:"completed", region:"nanyuki" },
  { id:"FCS-0018", stationId:"FC-NBO-03", stationName:"Parklands Retail Park",   unitNo:4, phone:"0712 456 789", customerName:"Margaret Waweru",   startTime:"2026-07-30T04:00:00Z", endTime:"2026-07-30T05:12:00Z", durationMin:72, kwhDelivered:11.5, costKES:575,  status:"completed", region:"nbo" },
  { id:"FCS-0019", stationId:"FC-NBO-05", stationName:"Kilimani Business Ctr",   unitNo:3, phone:"0723 567 890", customerName:"Kevin Njoroge",     startTime:"2026-07-30T03:45:00Z", endTime:"2026-07-30T04:58:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0020", stationId:"FC-NYR-03", stationName:"Dedan Kimathi University",unitNo:2, phone:"0734 678 901", customerName:"Irene Muthoni",     startTime:"2026-07-30T06:00:00Z", endTime:"2026-07-30T07:04:00Z", durationMin:64, kwhDelivered:10.2, costKES:510,  status:"completed", region:"nyeri" },

  // Error session
  { id:"FCS-0021", stationId:"FC-NBO-07", stationName:"Ruaka Supercentre",       unitNo:4, phone:"0745 789 012", customerName:"MUVUNYI JEAN",      startTime:"2026-07-30T06:55:00Z", endTime:"2026-07-30T07:01:00Z", durationMin:6,  kwhDelivered:0.2,  costKES:0,    status:"error",     region:"nbo" },

  // Yesterday's sessions
  { id:"FCS-0022", stationId:"FC-NBO-01", stationName:"Zeno Hub — Westlands",    unitNo:1, phone:"0756 890 123", customerName:"NICKSON MWITI",    startTime:"2026-07-29T18:30:00Z", endTime:"2026-07-29T19:45:00Z", durationMin:75, kwhDelivered:12.0, costKES:600,  status:"completed", region:"nbo" },
  { id:"FCS-0023", stationId:"FC-NBO-02", stationName:"Upperhill Medical Ctr",   unitNo:3, phone:"0767 901 234", customerName:"Fredrick Ochieng",  startTime:"2026-07-29T17:15:00Z", endTime:"2026-07-29T18:28:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0024", stationId:"FC-NBO-04", stationName:"Karen Country Club",      unitNo:2, phone:"0778 012 345", customerName:"Grace Wanjiru",     startTime:"2026-07-29T16:00:00Z", endTime:"2026-07-29T17:08:00Z", durationMin:68, kwhDelivered:10.9, costKES:545,  status:"completed", region:"nbo" },
  { id:"FCS-0025", stationId:"FC-NAN-01", stationName:"Nanyuki Town Centre",      unitNo:2, phone:"0789 123 456", customerName:"David Kimani",      startTime:"2026-07-29T15:30:00Z", endTime:"2026-07-29T16:42:00Z", durationMin:72, kwhDelivered:11.5, costKES:575,  status:"completed", region:"nanyuki" },
  { id:"FCS-0026", stationId:"FC-NBO-06", stationName:"Eastleigh Mall",          unitNo:1, phone:"0712 567 890", customerName:"Ruth Akinyi",       startTime:"2026-07-29T14:45:00Z", endTime:"2026-07-29T15:58:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0027", stationId:"FC-NYR-01", stationName:"Kimathi Way Hub",          unitNo:3, phone:"0723 678 901", customerName:"Esther Nafula",     startTime:"2026-07-29T13:20:00Z", endTime:"2026-07-29T14:28:00Z", durationMin:68, kwhDelivered:10.9, costKES:545,  status:"completed", region:"nyeri" },
  { id:"FCS-0028", stationId:"FC-NBO-08", stationName:"Lang'ata Crossing",       unitNo:2, phone:"0734 789 012", customerName:"Charles Mutua",     startTime:"2026-07-29T12:00:00Z", endTime:"2026-07-29T13:15:00Z", durationMin:75, kwhDelivered:12.0, costKES:600,  status:"completed", region:"nbo" },
  { id:"FCS-0029", stationId:"FC-NBO-09", stationName:"Kasarani Arena",          unitNo:1, phone:"0745 890 123", customerName:"Brian Otieno",      startTime:"2026-07-29T11:10:00Z", endTime:"2026-07-29T12:22:00Z", durationMin:72, kwhDelivered:11.5, costKES:575,  status:"completed", region:"nbo" },
  { id:"FCS-0030", stationId:"FC-NBO-03", stationName:"Parklands Retail Park",   unitNo:2, phone:"0756 901 234", customerName:"Samuel Odhiambo",   startTime:"2026-07-29T10:30:00Z", endTime:"2026-07-29T11:44:00Z", durationMin:74, kwhDelivered:11.8, costKES:590,  status:"completed", region:"nbo" },
  { id:"FCS-0031", stationId:"FC-NAN-02", stationName:"Nanyuki Shopping Mall",   unitNo:1, phone:"0767 012 345", customerName:"Faith Chebet",      startTime:"2026-07-29T09:15:00Z", endTime:"2026-07-29T10:28:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nanyuki" },
  { id:"FCS-0032", stationId:"FC-NBO-05", stationName:"Kilimani Business Ctr",   unitNo:2, phone:"0778 123 456", customerName:"Augustine Mbevi",   startTime:"2026-07-29T08:45:00Z", endTime:"2026-07-29T09:58:00Z", durationMin:73, kwhDelivered:11.7, costKES:585,  status:"completed", region:"nbo" },
  { id:"FCS-0033", stationId:"FC-NYR-02", stationName:"Outspan Hotel",           unitNo:2, phone:"0789 234 567", customerName:"Moses Mwangi",      startTime:"2026-07-29T08:00:00Z", endTime:"2026-07-29T09:12:00Z", durationMin:72, kwhDelivered:11.5, costKES:575,  status:"completed", region:"nyeri" },
  { id:"FCS-0034", stationId:"FC-NBO-07", stationName:"Ruaka Supercentre",       unitNo:1, phone:"0712 678 901", customerName:"Kevin Njoroge",     startTime:"2026-07-29T07:30:00Z", endTime:"2026-07-29T08:42:00Z", durationMin:72, kwhDelivered:11.5, costKES:575,  status:"completed", region:"nbo" },
  { id:"FCS-0035", stationId:"FC-NBO-01", stationName:"Zeno Hub — Westlands",    unitNo:4, phone:"0723 789 012", customerName:"Zechariah Anita",   startTime:"2026-07-29T07:00:00Z", endTime:"2026-07-29T08:15:00Z", durationMin:75, kwhDelivered:12.0, costKES:600,  status:"completed", region:"nbo" },
];

const STATUS_META = {
  active:    { label: "Active",    badge: "bg-emerald-50 text-emerald-700 animate-pulse" },
  completed: { label: "Completed", badge: "bg-blue-50 text-blue-700" },
  error:     { label: "Error",     badge: "bg-red-50 text-red-600" },
};

const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", nyeri: "Nyeri" };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SocBar({ kwh, maxKwh = 12 }: { kwh: number; maxKwh?: number }) {
  const pct = Math.min(100, (kwh / maxKwh) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#003B49] rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-slate-700 tabular-nums">{kwh.toFixed(1)} kWh</span>
    </div>
  );
}

function exportCSV(sessions: FCSession[]) {
  const headers = ["SessionID","StationID","StationName","Unit","Phone","Customer","Start","End","DurationMin","kWh","CostKES","Status","Region"];
  const rows = sessions.map(s => [s.id, s.stationId, s.stationName, s.unitNo, s.phone, s.customerName, s.startTime, s.endTime ?? "", s.durationMin ?? "", s.kwhDelivered ?? "", s.costKES ?? "", s.status, s.region]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `fc-sessions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function FastChargersDataPage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const sorted = [...SESSIONS].sort((a, b) => b.startTime.localeCompare(a.startTime));

  const filtered = useMemo(() => sorted.filter(s => {
    if (regionFilter && s.region !== regionFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.id.toLowerCase().includes(q) || s.stationName.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) || s.phone.includes(q) || s.stationId.toLowerCase().includes(q);
    }
    return true;
  }), [sorted, search, regionFilter, statusFilter]);

  const todaySessions = SESSIONS.filter(s => s.startTime.startsWith("2026-07-30"));
  const activeNow     = SESSIONS.filter(s => s.status === "active");
  const totalKwh      = todaySessions.reduce((acc, s) => acc + (s.kwhDelivered ?? 0), 0);
  const revenue       = todaySessions.reduce((acc, s) => acc + (s.costKES ?? 0), 0);

  const pageWidgets = [
    { title: "Total Sessions", snapshotValue: SESSIONS.length, snapshotLabel: "all time sessions", snapshotSource: "Fast Charger Sessions" },
    { title: "Active Now", snapshotValue: activeNow.length, snapshotLabel: "sessions in progress", snapshotSource: "Fast Charger Sessions" },
    { title: "Today's kWh", snapshotValue: `${totalKwh.toFixed(1)} kWh`, snapshotLabel: "energy delivered today", snapshotSource: "Fast Charger Sessions" },
    { title: "Today's Revenue", snapshotValue: `KES ${revenue.toLocaleString()}`, snapshotLabel: "fast charge revenue", snapshotSource: "Fast Charger Sessions" },
  ];

  // Sessions by station
  const byStation = Object.values(
    SESSIONS.reduce<Record<string, { name: string; sessions: number; kwh: number }>>((acc, s) => {
      if (!acc[s.stationId]) acc[s.stationId] = { name: s.stationId, sessions: 0, kwh: 0 };
      acc[s.stationId].sessions++;
      acc[s.stationId].kwh += s.kwhDelivered ?? 0;
      return acc;
    }, {})
  ).sort((a, b) => b.sessions - a.sessions).slice(0, 8);

  const regionPie = [
    { name: "NBO",     value: SESSIONS.filter(s => s.region === "nbo").length,     color: "#003B49" },
    { name: "Nanyuki", value: SESSIONS.filter(s => s.region === "nanyuki").length, color: "#FF3B06" },
    { name: "Nyeri",   value: SESSIONS.filter(s => s.region === "nyeri").length,   color: "#10b981" },
  ];

  return (
    <>
      <Topbar
        title="Fast Charger Sessions"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-slate-400 font-medium">{filtered.length} sessions</span>
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
          <StatCard label="Sessions Today"      value={todaySessions.length} />
          <StatCard label="Active Right Now"    value={activeNow.length}              valueColor={activeNow.length > 0 ? "text-emerald-600" : "text-slate-400"} />
          <StatCard label="kWh Delivered Today" value={`${totalKwh.toFixed(1)} kWh`} valueColor="text-zeno-teal" />
          <StatCard label="Revenue Today (KES)" value={revenue.toLocaleString()}      valueColor="text-emerald-600" />
        </StatGrid>

        {/* Active sessions strip */}
        {activeNow.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" />
              Live Sessions
            </div>
            {activeNow.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-medium text-slate-700">{s.stationId}</span>
                <span className="text-slate-400">U{s.unitNo}</span>
                <span className="text-slate-500">{s.customerName.split(" ")[0]}</span>
                <span className="text-slate-400">{fmtTime(s.startTime)} →</span>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sessions by Station</p>
            <div style={{ height: 220 }}>
              <BarChart
                data={byStation}
                series={[{ key: "sessions", label: "Sessions", color: "#003B49" }]}
                xKey="name"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">By Region</p>
            <div style={{ height: 220 }}>
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
              placeholder="Search session ID, station, customer…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60"
            />
          </div>
          {([
            ["Region", regionFilter, setRegionFilter, [["","All Regions"],["nbo","NBO"],["nanyuki","Nanyuki"],["nyeri","Nyeri"]]],
            ["Status", statusFilter, setStatusFilter, [["","All Status"],["active","Active"],["completed","Completed"],["error","Error"]]],
          ] as [string, string, (v:string)=>void, [string,string][]][]).map(([label, val, setter, opts]) => (
            <select key={label} value={val} onChange={e => setter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {(regionFilter || statusFilter || search) && (
            <button onClick={() => { setRegionFilter(""); setStatusFilter(""); setSearch(""); }}
              className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Session ID","Station","Unit","Customer","Start","End","Duration","kWh Delivered","Cost (KES)","Status"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">No sessions match your filters</td></tr>
                )}
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{s.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-700 text-[12px]">{s.stationId}</div>
                      <div className="text-slate-400 text-[11px] truncate max-w-[140px]">{s.stationName.split("—")[1]?.trim() ?? s.stationName}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-center">U{s.unitNo}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-700">{s.customerName}</div>
                      <div className="text-slate-400 text-[11px]">{s.phone}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(s.startTime)}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {s.endTime ? fmtDateTime(s.endTime) : <span className="text-emerald-600 font-medium">ongoing</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 tabular-nums">
                      {s.durationMin != null ? `${s.durationMin} min` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.kwhDelivered != null
                        ? <SocBar kwh={s.kwhDelivered} />
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 text-right tabular-nums">
                      {s.costKES != null ? `KES ${s.costKES.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[s.status].badge)}>
                        {STATUS_META[s.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <AddToDashboardModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widgets={pageWidgets} />
    </>
  );
}
