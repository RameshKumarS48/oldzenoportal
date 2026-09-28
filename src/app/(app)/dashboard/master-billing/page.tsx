"use client";

import { useMemo, useState } from "react";
import { Search, Download, AlertTriangle, ArrowDownUp, Zap, Battery, Clock } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { BILLING_SESSIONS, BILLING_SUMMARY, type BillingSession, type SessionType } from "@/lib/mock/kpi-billing";
import { cn } from "@/lib/utils";

const TYPE_META: Record<SessionType, { label: string; badge: string; color: string }> = {
  swap:        { label: "Swap",        badge: "bg-[#003B49]/10 text-[#003B49]",  color: "#003B49" },
  fast_charge: { label: "Fast Charge", badge: "bg-[#FF3B06]/10 text-[#FF3B06]",  color: "#FF3B06" },
  home_charge: { label: "Home Charge", badge: "bg-indigo-50 text-indigo-700",     color: "#6366f1" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtLease(seconds?: number): string {
  if (!seconds) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function exportCSV(rows: BillingSession[]) {
  const hdrs = ["ID","Date","Type","Name","Phone","IMEI","Station","kWh","Points","Slab1kWh","Slab2kWh","Flagged","Skipped","RFIDMismatch","Multiday","AhDischarged1","AhRegen1","LeaseDur1","Bin1","ErrorNote"];
  const data = rows.map(s => [
    s.id, s.date, s.type, s.name, s.phone, s.imei ?? "",
    s.stationId, s.totalKwh, s.totalPoints, s.slab1Kwh, s.slab2Kwh,
    s.flagged, s.skipped, s.rfidMismatch, s.multiday,
    s.ahDischarged1 ?? "", s.ahRegen1 ?? "", s.leaseDuration1 ?? "",
    s.bin1 ?? "", s.errorNote ?? "",
  ]);
  const csv = [hdrs, ...data].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `master-billing-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Pre-compute derived analytics (stable, doesn't use random so safe to call once)
function buildChartData(sessions: BillingSession[]) {
  // Daily kWh, last 30 days ending 2026-07-29
  const base = new Date("2026-07-29T00:00:00Z");
  const dailyKwh: { date: string; kWh: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const total = sessions.filter(s => s.date.startsWith(key)).reduce((a, s) => a + s.totalKwh, 0);
    dailyKwh.push({ date: label, kWh: parseFloat(total.toFixed(2)) });
  }

  // Top customers by kWh
  const byCustomer: Record<string, number> = {};
  sessions.forEach(s => {
    if (!byCustomer[s.name]) byCustomer[s.name] = 0;
    byCustomer[s.name] += s.totalKwh;
  });
  const topCustomers = Object.entries(byCustomer)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, kWh]) => ({ name: name.split(" ")[0], kWh: parseFloat(kWh.toFixed(2)) }));

  // Sessions per station (swap only)
  const byStation: Record<string, number> = {};
  sessions.filter(s => s.type === "swap").forEach(s => {
    byStation[s.stationId] = (byStation[s.stationId] ?? 0) + 1;
  });
  const stationSessions = Object.entries(byStation)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([station, count]) => ({ station: station.toUpperCase(), count }));

  // Type pie
  const typePie = (["swap","fast_charge","home_charge"] as SessionType[]).map(t => ({
    name: TYPE_META[t].label,
    value: sessions.filter(s => s.type === t).length,
    color: TYPE_META[t].color,
  }));

  // Battery metrics (swap only)
  const swaps = sessions.filter(s => s.type === "swap" && s.ahDischarged1);
  const avgAhD = swaps.length ? swaps.reduce((a, s) => a + (s.ahDischarged1 ?? 0), 0) / swaps.length : 0;
  const avgAhR = swaps.length ? swaps.reduce((a, s) => a + (s.ahRegen1 ?? 0), 0) / swaps.length : 0;
  const regenRate = avgAhD > 0 ? (avgAhR / avgAhD) * 100 : 0;
  const avgLease = swaps.filter(s => s.leaseDuration1).reduce((a, s) => a + (s.leaseDuration1 ?? 0), 0) / Math.max(1, swaps.filter(s => s.leaseDuration1).length);

  return { dailyKwh, topCustomers, stationSessions, typePie, avgAhD, regenRate, avgLease };
}

const CHART_DATA = buildChartData(BILLING_SESSIONS);
const sorted = [...BILLING_SESSIONS].sort((a, b) => b.date.localeCompare(a.date));

export default function MasterBillingPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SessionType | "">("");
  const [flagFilter, setFlagFilter] = useState<"" | "flagged" | "skipped" | "rfid" | "multiday">("");
  const [stationFilter, setStationFilter] = useState("");

  const stations = useMemo(() => [...new Set(BILLING_SESSIONS.map(s => s.stationId))].sort(), []);

  const filtered = useMemo(() => sorted.filter(s => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (stationFilter && s.stationId !== stationFilter) return false;
    if (flagFilter === "flagged"  && !s.flagged)     return false;
    if (flagFilter === "skipped"  && !s.skipped)     return false;
    if (flagFilter === "rfid"     && !s.rfidMismatch) return false;
    if (flagFilter === "multiday" && !s.multiday)    return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.phone.includes(q) ||
             s.id.toLowerCase().includes(q) || (s.stationId).includes(q);
    }
    return true;
  }), [search, typeFilter, flagFilter, stationFilter]);

  const hasFilter = !!(search || typeFilter || flagFilter || stationFilter);

  return (
    <>
      <Topbar
        title="Master Billing Sheet"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-slate-400 font-medium">{filtered.length} of {BILLING_SESSIONS.length} sessions</span>
            <Button size="sm" variant="ghost-dark" onClick={() => exportCSV(filtered)}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Sessions",    value: BILLING_SUMMARY.totalSessions,      color: "text-slate-700",   icon: ArrowDownUp },
            { label: "Total kWh",         value: `${BILLING_SUMMARY.totalKwh} kWh`,  color: "text-[#003B49]",   icon: Zap },
            { label: "Total Points",      value: `${(BILLING_SUMMARY.totalPoints/1000).toFixed(1)}K`, color: "text-indigo-600", icon: Battery },
            { label: "Avg kWh / Session", value: `${BILLING_SUMMARY.avgKwhPerSession} kWh`, color: "text-emerald-600", icon: Zap },
            { label: "Issues",            value: BILLING_SUMMARY.flaggedCount + BILLING_SUMMARY.skippedCount + BILLING_SUMMARY.rfidMismatchCount, color: "text-red-500", icon: AlertTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50">
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className={cn("text-xl font-bold mt-0.5", color)} style={{ fontFamily: "var(--font-display)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Daily kWh Dispensed (Last 30 Days)</p>
            <div style={{ height: 200 }}>
              <LineChart
                data={CHART_DATA.dailyKwh}
                series={[{ key: "kWh", label: "kWh", color: "#003B49" }]}
                xKey="date"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sessions by Type</p>
            <div style={{ height: 200 }}>
              <PieChart data={CHART_DATA.typePie} />
            </div>
            <div className="mt-3 space-y-1">
              {CHART_DATA.typePie.map(t => (
                <div key={t.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="text-slate-500">{t.name}</span>
                  </span>
                  <span className="font-semibold text-slate-700">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Top Customers by kWh</p>
            <div style={{ height: 200 }}>
              <BarChart
                data={CHART_DATA.topCustomers}
                series={[{ key: "kWh", label: "kWh", color: "#FF3B06" }]}
                xKey="name"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Swap Sessions by Station</p>
            <div style={{ height: 200 }}>
              <BarChart
                data={CHART_DATA.stationSessions}
                series={[{ key: "count", label: "Sessions", color: "#003B49" }]}
                xKey="station"
              />
            </div>
          </div>
        </div>

        {/* Battery analytics strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Avg Ah Discharged",   value: `${CHART_DATA.avgAhD.toFixed(1)} Ah`,            icon: Battery, color: "text-[#003B49]" },
            { label: "Avg Regen Rate",       value: `${CHART_DATA.regenRate.toFixed(1)}%`,            icon: Zap,     color: "text-emerald-600" },
            { label: "Avg Lease Duration",   value: fmtLease(Math.round(CHART_DATA.avgLease)),        icon: Clock,   color: "text-indigo-600" },
            { label: "RFID Mismatches",      value: BILLING_SUMMARY.rfidMismatchCount,                icon: AlertTriangle, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-slate-50 shrink-0">
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className={cn("text-lg font-bold mt-0.5", color)} style={{ fontFamily: "var(--font-display)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, ID, station…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-56"
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as SessionType | "")}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Types</option>
            <option value="swap">Swap</option>
            <option value="fast_charge">Fast Charge</option>
            <option value="home_charge">Home Charge</option>
          </select>
          <select value={flagFilter} onChange={e => setFlagFilter(e.target.value as typeof flagFilter)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Sessions</option>
            <option value="flagged">Flagged</option>
            <option value="skipped">Skipped</option>
            <option value="rfid">RFID Mismatch</option>
            <option value="multiday">Multi-day</option>
          </select>
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Stations</option>
            {stations.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setTypeFilter(""); setFlagFilter(""); setStationFilter(""); }}
              className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} sessions</span>
        </div>

        {/* Raw data table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1300px]">
              <thead className="border-b border-slate-200 sticky top-0 bg-white z-10">
                <tr>
                  {["Date","Customer / Phone","Type","Station","kWh","Points","Slab 1","Slab 2","Battery Ah ↓/↑","Lease","Flags"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400">
                      No sessions match your filters
                    </td>
                  </tr>
                )}
                {filtered.map(s => (
                  <tr key={s.id} className={cn("hover:bg-slate-50 transition-colors", s.skipped && "opacity-50")}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-slate-600">{fmtDate(s.date)}</div>
                      <div className="text-slate-300 font-mono text-[10px]">{s.id}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-700">{s.name}</div>
                      <div className="text-slate-400 text-[11px]">{s.phone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", TYPE_META[s.type].badge)}>
                        {TYPE_META[s.type].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{s.stationId.toUpperCase()}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                      {s.totalKwh > 0 ? `${s.totalKwh}` : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {s.totalPoints > 0 ? s.totalPoints.toLocaleString() : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{s.slab1Kwh > 0 ? `${s.slab1Kwh} kWh` : "–"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.slab2Kwh > 0 ? `${s.slab2Kwh} kWh` : "–"}</td>
                    <td className="px-3 py-2.5">
                      {s.ahDischarged1 != null ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-orange-500 font-semibold">↓{s.ahDischarged1}Ah</span>
                          {s.ahRegen1 != null && <span className="text-emerald-500">↑{s.ahRegen1}Ah</span>}
                        </div>
                      ) : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {s.type === "swap"
                        ? <span>{fmtLease(s.leaseDuration1)}{s.leaseDuration2 ? ` / ${fmtLease(s.leaseDuration2)}` : ""}</span>
                        : fmtLease(s.leaseDuration1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {s.flagged     && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">Flag</span>}
                        {s.skipped     && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">Skip</span>}
                        {s.rfidMismatch && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600">RFID</span>}
                        {s.multiday    && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600">Multi</span>}
                        {!s.flagged && !s.skipped && !s.rfidMismatch && !s.multiday && <span className="text-slate-200">–</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
