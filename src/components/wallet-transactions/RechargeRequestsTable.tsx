"use client";

import { Fragment, useMemo, useState } from "react";
import { Search, Download, ChevronDown, ChevronUp, PackageOpen, RotateCw } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/Pagination";
import {
  useWalletTransactionsStore,
  rechargeStatus,
  RECHARGE_STATUS_META,
  vehicleFor,
  type RechargeRequest,
  type RechargeStatus,
} from "@/store/wallet-transactions";
import { cn } from "@/lib/utils";
import { useAccess } from "@/lib/access";

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

/** daraja TransactionDate: YYYYMMDDHHmmss → readable */
function fmtDaraja(s?: string) {
  if (!s || s.length < 14) return "—";
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

// ── CSV export (mirrors the daraja callback columns) ─────────────────────────

function exportCSV(rows: RechargeRequest[]) {
  const headers = [
    "MPesa_ID", "Timestamp", "CheckoutRequestID", "MerchantRequestID", "UserID", "UserKey",
    "Amount", "OrderID", "PaymentType", "ResultCode", "ResultDescription", "MpesaReceiptNumber",
    "PhoneNumber", "VIN", "IMEI", "TransactionDate", "Balance", "ReferralUser", "TransactionKey", "StatusCount",
    "InitialResponseCode", "InitialResponseDescription", "CustomerMessage",
  ];
  const data = rows.map((r) => {
    const v = vehicleFor(r.customerId);
    return [
      r.id, r.timestamp, r.checkoutRequestId, r.merchantRequestId, r.userId, r.userKey,
      r.amountKES, r.orderId, r.paymentType, r.resultCode, r.resultDescription, r.mpesaReceiptNumber ?? "",
      r.phone, v?.vin ?? "", v?.imei ?? "", r.transactionDate ?? "", r.balance ?? "", r.referralUser ?? "", r.transactionKey, r.statusCount,
      r.initialResponseCode, r.initialResponseDescription, r.customerMessage,
    ];
  });
  const csv = [headers, ...data].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallet-recharges-${new Date().toISOString().slice(0, 10)}.csv`;
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

function RequestDetail({ r }: { r: RechargeRequest }) {
  const vehicle = vehicleFor(r.customerId);
  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <DetailField label="VIN" value={vehicle?.vin ? <span className="font-mono">{vehicle.vin}</span> : "—"} />
        <DetailField label="IMEI" value={vehicle?.imei ? <span className="font-mono">{vehicle.imei}</span> : "—"} />
        <DetailField label="M-Pesa ID" value={<span className="font-mono">{r.id}</span>} />
        <DetailField label="Checkout Request ID" value={<span className="font-mono">{r.checkoutRequestId}</span>} />
        <DetailField label="Merchant Request ID" value={<span className="font-mono">{r.merchantRequestId}</span>} />
        <DetailField label="Transaction Key" value={<span className="font-mono">{r.transactionKey}</span>} />
        <DetailField label="User ID" value={<span className="font-mono">{r.userId}</span>} />
        <DetailField label="User Key" value={<span className="font-mono">{r.userKey}</span>} />
        <DetailField label="Order ID" value={<span className="font-mono">{r.orderId}</span>} />
        <DetailField label="Payment Type" value={r.paymentType} />
        <DetailField label="Result Code" value={r.resultCode} />
        <DetailField label="Result Description" value={r.resultDescription} />
        <DetailField label="M-Pesa Receipt" value={r.mpesaReceiptNumber ? <span className="font-mono">{r.mpesaReceiptNumber}</span> : "—"} />
        <DetailField label="Transaction Date" value={fmtDaraja(r.transactionDate)} />
        <DetailField label="Wallet Balance" value={r.balance != null ? `KES ${r.balance.toLocaleString()}` : "—"} />
        <DetailField label="Referral User" value={r.referralUser || "—"} />
        <DetailField label="Status Count" value={r.statusCount} />
        <DetailField label="Initial Response" value={`${r.initialResponseCode} — ${r.initialResponseDescription}`} />
        <div className="col-span-4">
          <DetailField label="Customer Message" value={r.customerMessage} />
        </div>
      </div>
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: [RechargeStatus | "", string][] = [
  ["", "All Status"],
  ["success", "Success"],
  ["pending", "Pending"],
  ["failed", "Failed"],
];

export function RechargeRequestsTable() {
  const recharges = useWalletTransactionsStore((s) => s.recharges);
  const reinitiate = useWalletTransactionsStore((s) => s.reinitiateRecharge);
  const canWrite = useAccess().canWrite("wallet_info");

  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<RechargeStatus | "">("");
  const [dateFilter, setDate]       = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(25);
  // Captured once on mount — the relative-date filters are bucketed (today/7d/30d).
  const [now] = useState(() => Date.now());

  const sorted = useMemo(
    () => [...recharges].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [recharges]
  );

  const filtered = useMemo(() => {
    const cutoff =
      dateFilter === "today" ? now - 86_400_000 :
      dateFilter === "7d"    ? now - 7 * 86_400_000 :
      dateFilter === "30d"   ? now - 30 * 86_400_000 : 0;

    return sorted.filter((r) => {
      if (statusFilter && rechargeStatus(r) !== statusFilter) return false;
      if (cutoff && new Date(r.timestamp).getTime() < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        const v = vehicleFor(r.customerId);
        return (
          r.customerName.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.mpesaReceiptNumber?.toLowerCase().includes(q) ?? false) ||
          r.orderId.toLowerCase().includes(q) ||
          (v?.vin.toLowerCase().includes(q) ?? false) ||
          (v?.imei.includes(q) ?? false)
        );
      }
      return true;
    });
  }, [sorted, search, statusFilter, dateFilter, now]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Summary stats
  const total = recharges.length;
  const success = recharges.filter((r) => rechargeStatus(r) === "success").length;
  const failed = recharges.filter((r) => rechargeStatus(r) === "failed").length;
  const successRate = total > 0 ? (success / total) * 100 : 0;
  const totalRecharged = recharges
    .filter((r) => rechargeStatus(r) === "success")
    .reduce((s, r) => s + r.amountKES, 0);

  const clearFilters = () => {
    setSearch(""); setStatus(""); setDate(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <StatGrid cols={4}>
        <StatCard label="Recharge Requests" value={total} />
        <StatCard label="Total Recharged" value={`KES ${totalRecharged.toLocaleString()}`} valueColor="text-emerald-600" />
        <StatCard label="Success Rate" value={`${successRate.toFixed(0)}%`} valueColor={successRate >= 80 ? "text-emerald-600" : "text-amber-600"} sublabel={`${success} success · ${failed} failed`} />
        <StatCard label="Failed / Pending" value={total - success} valueColor={total - success > 0 ? "text-red-600" : undefined} />
      </StatGrid>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customer, phone, VIN, IMEI, receipt, order…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-64"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value as RechargeStatus | ""); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

        {(search || statusFilter || dateFilter) && (
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
          <table className="w-full text-xs min-w-[1320px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Timestamp", "Customer", "Phone", "VIN", "IMEI", "Amount", "M-Pesa Receipt", "Result", "Tries", "Status", "Action", ""].map((h) => (
                  <th key={h} className={cn(
                    "px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap",
                    h === "Amount" ? "text-right" : "text-left"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No recharge requests match your filters</p>
                  </td>
                </tr>
              )}
              {paginated.map((r) => {
                const expanded = expandedId === r.id;
                const status = rechargeStatus(r);
                const canRetry = canWrite && status !== "success";
                const vehicle = vehicleFor(r.customerId);
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        expanded && "bg-slate-50",
                        status === "failed" && "bg-red-50/30"
                      )}
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(r.timestamp)}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{r.customerName}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{r.phone}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{vehicle?.vin ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{vehicle?.imei ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">KES {r.amountKES.toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{r.mpesaReceiptNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate" title={r.resultDescription}>{r.resultDescription}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{r.statusCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", RECHARGE_STATUS_META[status].badge)}>
                          {RECHARGE_STATUS_META[status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          disabled={!canRetry}
                          onClick={(ev) => { ev.stopPropagation(); reinitiate(r.id); }}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                            canRetry
                              ? "bg-[#003B49] text-white hover:bg-[#00505f]"
                              : "bg-slate-100 text-slate-300 cursor-not-allowed"
                          )}
                          title={canRetry ? "Re-initiate STK push" : "Already completed"}
                        >
                          <RotateCw className="w-3 h-3" /> Re-initiate
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={12} className="p-0">
                          <RequestDetail r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
