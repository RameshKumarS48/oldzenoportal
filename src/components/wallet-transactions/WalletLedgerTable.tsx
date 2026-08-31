"use client";

import { useMemo, useState } from "react";
import { Search, Download, ChevronDown, ChevronUp, PackageOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/Pagination";
import {
  useWalletTransactionsStore,
  CATEGORY_META,
  LEDGER_STATUS_META,
  signedAmount,
  type WalletLedgerEntry,
  type LedgerCategory,
  type LedgerDirection,
} from "@/store/wallet-transactions";
import { cn } from "@/lib/utils";

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtKES(n: number) {
  return `${n < 0 ? "-" : ""}KES ${Math.abs(n).toLocaleString()}`;
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(entries: WalletLedgerEntry[]) {
  const headers = [
    "LedgerID", "OccurredAt", "Customer", "Phone", "Direction", "Category",
    "AmountKES", "SignedKES", "BalanceAfterKES", "Status", "Reference", "RechargeID", "Notes",
  ];
  const rows = entries.map((e) => [
    e.id, e.occurredAt, e.customerName, e.phone, e.direction, CATEGORY_META[e.category].label,
    e.amountKES, signedAmount(e), e.balanceAfterKES, LEDGER_STATUS_META[e.status].label,
    e.reference ?? "", e.rechargeId ?? "", e.notes ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Expanded detail row ───────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-slate-700 mt-0.5 break-all">{value ?? "—"}</p>
    </div>
  );
}

function EntryDetail({ entry }: { entry: WalletLedgerEntry }) {
  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <div className="grid grid-cols-4 gap-4">
        <DetailField label="Ledger ID" value={<span className="font-mono">{entry.id}</span>} />
        <DetailField label="Customer ID" value={<span className="font-mono">{entry.customerId}</span>} />
        <DetailField label="Direction" value={entry.direction === "credit" ? "Credit (+)" : "Debit (−)"} />
        <DetailField label="Category" value={CATEGORY_META[entry.category].label} />
        <DetailField label="Amount" value={fmtKES(entry.amountKES)} />
        <DetailField label="Balance After" value={fmtKES(entry.balanceAfterKES)} />
        <DetailField label="Status" value={LEDGER_STATUS_META[entry.status].label} />
        <DetailField label="Reference" value={entry.reference ? <span className="font-mono">{entry.reference}</span> : "—"} />
        {entry.rechargeId && (
          <div className="col-span-2">
            <DetailField label="Linked Recharge Request" value={<span className="font-mono">{entry.rechargeId}</span>} />
          </div>
        )}
        {entry.notes && (
          <div className="col-span-4">
            <DetailField label="Notes" value={entry.notes} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: [LedgerCategory | "", string][] = [
  ["", "All Categories"],
  ["recharge", "Wallet Recharge"],
  ["swap", "Battery Swap"],
  ["fast_charge", "Fast Charge"],
  ["home_charge", "Home Charge"],
  ["promo_points", "Promo Points"],
  ["referral_bonus", "Referral Bonus"],
  ["referree_bonus", "Referree Bonus"],
  ["exit_refund", "Exit Refund"],
];

export function WalletLedgerTable() {
  const ledger = useWalletTransactionsStore((s) => s.ledger);

  const [search, setSearch]         = useState("");
  const [dirFilter, setDir]         = useState<LedgerDirection | "">("");
  const [catFilter, setCat]         = useState<LedgerCategory | "">("");
  const [dateFilter, setDate]       = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(25);
  // Captured once on mount — the relative-date filters are bucketed (today/7d/30d).
  const [now] = useState(() => Date.now());

  const sorted = useMemo(
    () => [...ledger].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [ledger]
  );

  const filtered = useMemo(() => {
    const cutoff =
      dateFilter === "today" ? now - 86_400_000 :
      dateFilter === "7d"    ? now - 7 * 86_400_000 :
      dateFilter === "30d"   ? now - 30 * 86_400_000 : 0;

    return sorted.filter((e) => {
      if (dirFilter && e.direction !== dirFilter) return false;
      if (catFilter && e.category !== catFilter) return false;
      if (cutoff && new Date(e.occurredAt).getTime() < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.customerName.toLowerCase().includes(q) ||
          e.phone.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.reference?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [sorted, search, dirFilter, catFilter, dateFilter, now]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Summary stats (over completed entries only)
  const completed = ledger.filter((e) => e.status === "completed");
  const totalCredited = completed.filter((e) => e.direction === "credit").reduce((s, e) => s + e.amountKES, 0);
  const totalDebited  = completed.filter((e) => e.direction === "debit").reduce((s, e) => s + e.amountKES, 0);
  const netBalance    = totalCredited - totalDebited;

  const clearFilters = () => {
    setSearch(""); setDir(""); setCat(""); setDate(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <StatGrid>
        <StatCard label="Total Credited" value={fmtKES(totalCredited)} valueColor="text-emerald-600" />
        <StatCard label="Total Debited" value={fmtKES(totalDebited)} valueColor="text-red-600" />
        <StatCard label="Net Wallet Balance" value={fmtKES(netBalance)} valueColor={netBalance < 0 ? "text-red-600" : "text-slate-700"} />
        <StatCard label="Ledger Entries" value={ledger.length} />
      </StatGrid>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customer, phone, ref…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-56"
          />
        </div>

        <select
          value={dirFilter}
          onChange={(e) => { setDir(e.target.value as LedgerDirection | ""); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          <option value="">All Directions</option>
          <option value="credit">Credit only</option>
          <option value="debit">Debit only</option>
        </select>

        <select
          value={catFilter}
          onChange={(e) => { setCat(e.target.value as LedgerCategory | ""); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {(search || dirFilter || catFilter || dateFilter) && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        )}

        <button
          onClick={() => exportCSV(filtered)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Date", "Customer", "Phone", "Category", "Amount (KES)", "Balance After", "Status", ""].map((h) => (
                  <th key={h} className={cn(
                    "px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap",
                    h === "Amount (KES)" || h === "Balance After" ? "text-right" : "text-left"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No wallet transactions match your filters</p>
                  </td>
                </tr>
              )}
              {paginated.map((e) => {
                const expanded = expandedId === e.id;
                const isCredit = e.direction === "credit";
                return (
                  <>
                    <tr
                      key={e.id}
                      className={cn("hover:bg-slate-50 transition-colors cursor-pointer", expanded && "bg-slate-50")}
                      onClick={() => setExpandedId(expanded ? null : e.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(e.occurredAt)}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{e.customerName}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{e.phone}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", CATEGORY_META[e.category].badge)}>
                          {CATEGORY_META[e.category].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1 font-semibold", isCredit ? "text-emerald-600" : "text-red-600")}>
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isCredit ? "+" : "−"}{e.amountKES.toLocaleString()}
                        </span>
                      </td>
                      <td className={cn("px-3 py-2.5 text-right font-medium whitespace-nowrap", e.balanceAfterKES < 0 ? "text-red-600" : "text-slate-600")}>
                        {e.balanceAfterKES.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", LEDGER_STATUS_META[e.status].badge)}>
                          {LEDGER_STATUS_META[e.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${e.id}-detail`}>
                        <td colSpan={8} className="p-0">
                          <EntryDetail entry={e} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>
    </div>
  );
}
