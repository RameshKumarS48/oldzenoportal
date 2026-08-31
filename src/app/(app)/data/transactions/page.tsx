"use client";

import { useMemo, useState } from "react";
import { Search, Download, PlusSquare, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useTransactionsStore } from "@/store/transactions";
import type { Transaction, TransactionType, TransactionStatus, PaymentMethod } from "@/store/transactions";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";
import { Pagination } from "@/components/ui/Pagination";
import { TimeRangePicker, type TimeRange } from "@/components/ui/TimeRangePicker";

const TYPE_META: Record<TransactionType, { label: string; badge: string; color: string }> = {
  swap:           { label: "Swap",           badge: "bg-[#003B49]/10 text-[#003B49]",  color: "#003B49" },
  fast_charge:    { label: "Fast Charge",    badge: "bg-[#FF3B06]/10 text-[#FF3B06]",  color: "#FF3B06" },
  payment:        { label: "Payment",        badge: "bg-emerald-50 text-emerald-700",   color: "#10b981" },
  referral_bonus: { label: "Referral Bonus", badge: "bg-amber-50 text-amber-700",       color: "#f59e0b" },
  penalty:        { label: "Penalty",        badge: "bg-slate-100 text-slate-500",      color: "#94a3b8" },
};

const STATUS_META: Record<TransactionStatus, { label: string; badge: string }> = {
  completed: { label: "Completed", badge: "bg-emerald-50 text-emerald-700" },
  pending:   { label: "Pending",   badge: "bg-amber-50 text-amber-700" },
  failed:    { label: "Failed",    badge: "bg-red-50 text-red-600" },
  reversed:  { label: "Reversed",  badge: "bg-slate-100 text-slate-500" },
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa", cash: "Cash", wallet: "Wallet", bank_transfer: "Bank",
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function exportCSV(txns: Transaction[]) {
  const headers = ["ID","Customer","Type","AmountKES","PaymentMethod","Status","StationID","VehicleID","Reference","OccurredAt"];
  const rows = txns.map(t => [t.id, t.customerName, t.type, t.amountKES, t.paymentMethod, t.status, t.stationId ?? "", t.vehicleId ?? "", t.reference ?? "", t.occurredAt]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function getTimeRangeFilter(range: TimeRange): (iso: string) => boolean {
  const now = new Date("2026-07-29T23:59:59Z");
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d7 = new Date(today); d7.setDate(today.getDate() - 7);
  const d30 = new Date(today); d30.setDate(today.getDate() - 30);

  return (iso: string) => {
    const d = new Date(iso);
    if (range === "today")     return d >= today;
    if (range === "yesterday") return d >= yesterday && d < today;
    if (range === "7d")        return d >= d7;
    if (range === "30d")       return d >= d30;
    return true;
  };
}

export default function TransactionsPage() {
  const { transactions } = useTransactionsStore();
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState<"all" | "issues">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const inRange = useMemo(() => getTimeRangeFilter(timeRange), [timeRange]);

  const sorted = useMemo(() =>
    [...transactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [transactions]
  );

  const filtered = useMemo(() => sorted.filter(t => {
    if (!inRange(t.occurredAt))                          return false;
    if (typeFilter   && t.type          !== typeFilter)  return false;
    if (statusFilter && t.status        !== statusFilter) return false;
    if (methodFilter && t.paymentMethod !== methodFilter) return false;
    if (activeTab === "issues" && t.status !== "failed" && t.status !== "reversed") return false;
    if (search) {
      const q = search.toLowerCase();
      return t.id.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q) || (t.reference ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [sorted, search, typeFilter, statusFilter, methodFilter, timeRange, activeTab, inRange]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Summary stats
  const totalRevenue = transactions
    .filter(t => t.status === "completed" && (t.type === "swap" || t.type === "fast_charge" || t.type === "payment"))
    .reduce((s, t) => s + t.amountKES, 0);
  const swaps = transactions.filter(t => t.type === "swap");
  const avgSwap = swaps.length ? Math.round(swaps.reduce((s, t) => s + t.amountKES, 0) / swaps.length) : 0;
  const failed = transactions.filter(t => t.status === "failed").length;
  const issueCount = transactions.filter(t => t.status === "failed" || t.status === "reversed").length;

  // Daily volume last 14 days
  const dailyData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const base = new Date("2026-07-16");
    for (let i = 0; i < 14; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      days.push({ date: label, count: transactions.filter(t => t.occurredAt.startsWith(key)).length });
    }
    return days;
  }, [transactions]);

  const typePie = (Object.keys(TYPE_META) as TransactionType[]).map(t => ({
    name: TYPE_META[t].label,
    value: transactions.filter(tx => tx.type === t).length,
    color: TYPE_META[t].color,
  }));

  const pageWidgets = [
    { title: "Total Transactions", snapshotValue: transactions.length, snapshotLabel: "all time", snapshotSource: "Transactions" },
    { title: "Total Revenue", snapshotValue: `KES ${(totalRevenue / 1000).toFixed(0)}k`, snapshotLabel: "completed transactions", snapshotSource: "Transactions" },
    { title: "Swap Sessions", snapshotValue: swaps.length, snapshotLabel: "battery swaps", snapshotSource: "Transactions" },
    { title: "Avg Swap Value", snapshotValue: `KES ${avgSwap}`, snapshotLabel: "per swap session", snapshotSource: "Transactions" },
    { title: "Failed Transactions", snapshotValue: failed, snapshotLabel: "payment failures", snapshotSource: "Transactions" },
  ];

  return (
    <>
      <Topbar
        title="Transactions"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <TimeRangePicker value={timeRange} onChange={v => { setTimeRange(v); setPage(1); }} />
            <span className="text-xs text-slate-400 font-medium">{filtered.length} / {transactions.length}</span>
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
          <StatCard label="Total Transactions"  value={transactions.length} />
          <StatCard label="Total Revenue (KES)" value={`${(totalRevenue/1000).toFixed(1)}K`} valueColor="text-emerald-600" />
          <StatCard label="Avg Swap (KES)"      value={avgSwap}                               valueColor="text-zeno-teal" />
          <StatCard label="Failed"              value={failed}                                valueColor="text-red-500" />
        </StatGrid>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Daily Transaction Volume (Last 14 days)</p>
            <div style={{ height: 220 }}>
              <BarChart
                data={dailyData}
                series={[{ key: "count", label: "Transactions", color: "#003B49" }]}
                xKey="date"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">By Transaction Type</p>
            <div style={{ height: 220 }}>
              <PieChart data={typePie} />
            </div>
          </div>
        </div>

        {/* Tabs + Filters */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-slate-200 px-4">
            <button
              onClick={() => { setActiveTab("all"); setPage(1); }}
              className={cn(
                "px-4 py-3 text-xs font-semibold border-b-2 transition-colors",
                activeTab === "all"
                  ? "border-[#FF3B06] text-[#FF3B06]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              All Transactions
            </button>
            <button
              onClick={() => { setActiveTab("issues"); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors",
                activeTab === "issues"
                  ? "border-[#FF3B06] text-[#FF3B06]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Issues
              {issueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {issueCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search TXN ID, customer, ref…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
              />
            </div>
            {([
              ["Type",    typeFilter,   setTypeFilter,   [["","All Types"],   ["swap","Swap"],["fast_charge","Fast Charge"],["payment","Payment"],["referral_bonus","Referral Bonus"],["penalty","Penalty"]]],
              ["Status",  statusFilter, setStatusFilter, [["","All Status"],  ["completed","Completed"],["pending","Pending"],["failed","Failed"],["reversed","Reversed"]]],
              ["Method",  methodFilter, setMethodFilter, [["","All Methods"], ["mpesa","M-Pesa"],["cash","Cash"],["wallet","Wallet"],["bank_transfer","Bank Transfer"]]],
            ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
              <select key={label} value={val} onChange={e => { setter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
              >
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {(typeFilter || statusFilter || methodFilter || search) && (
              <button onClick={() => { setTypeFilter(""); setStatusFilter(""); setMethodFilter(""); setSearch(""); setPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["TXN ID","Customer","Type","Amount","Method","Status","Station / Vehicle","Reference","Date & Time"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      {activeTab === "issues" ? "No transaction issues found" : "No transactions match your filters"}
                    </td>
                  </tr>
                )}
                {paginated.map(t => (
                  <tr key={t.id} className={cn("hover:bg-slate-50 transition-colors", (t.status === "failed" || t.status === "reversed") && "bg-red-50/30")}>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{t.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{t.customerName}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", TYPE_META[t.type].badge)}>
                        {TYPE_META[t.type].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                      KES {t.amountKES.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{PAYMENT_LABELS[t.paymentMethod]}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[t.status].badge)}>
                        {STATUS_META[t.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">
                      {t.stationId ?? t.vehicleId?.slice(-6) ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{t.reference ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(t.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      </main>
      <AddToDashboardModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widgets={pageWidgets} />
    </>
  );
}
