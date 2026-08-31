"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useReferralsStore } from "@/store/referrals";
import { useCustomersStore } from "@/store/customers";
import type { ReferralStatus } from "@/store/referrals";
import { cn } from "@/lib/utils";

const STATUS_META: Record<ReferralStatus, { label: string; badge: string }> = {
  pending: { label: "Pending",  badge: "bg-amber-50 text-amber-700" },
  active:  { label: "Active",   badge: "bg-emerald-50 text-emerald-700" },
  expired: { label: "Expired",  badge: "bg-slate-100 text-slate-400" },
};

const TRIGGER_LABELS: Record<string, string> = {
  first_swap:           "First Swap",
  account_activation:   "Account Activation",
  first_payment:        "First Payment",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReferralsPage() {
  const { referrals } = useReferralsStore();
  const customers = useCustomersStore((s) => s.customers);
  const [statusFilter, setStatusFilter] = useState("");
  const [chainOpen, setChainOpen] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() =>
    referrals.filter((r) => !statusFilter || r.status === statusFilter),
  [referrals, statusFilter]);

  const counts = useMemo(() => ({
    total:    referrals.length,
    active:   referrals.filter((r) => r.status === "active").length,
    pending:  referrals.filter((r) => r.status === "pending").length,
    expired:  referrals.filter((r) => r.status === "expired").length,
    pointsDistributed: referrals
      .filter((r) => r.status === "active")
      .reduce((s, r) => s + r.pointsToReferee + r.pointsToReferrer, 0),
  }), [referrals]);

  // Group by referrer for chain view
  const chains = useMemo(() => {
    const map = new Map<string, typeof referrals>();
    referrals.filter((r) => r.status !== "expired").forEach((r) => {
      const list = map.get(r.referrerId) ?? [];
      list.push(r);
      map.set(r.referrerId, list);
    });
    return Array.from(map.entries()).map(([referrerId, refs]) => ({
      referrer: customerMap.get(referrerId),
      referrerId,
      referrals: refs,
    }));
  }, [referrals, customerMap]);

  return (
    <AdminGuard>
      <Topbar title="Referrals & Points" />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid cols={5}>
          <StatCard label="Total Referrals"    value={counts.total} />
          <StatCard label="Active"             value={counts.active}                    valueColor="text-emerald-600" />
          <StatCard label="Pending"            value={counts.pending}                   valueColor="text-amber-600" />
          <StatCard label="Expired"            value={counts.expired}                   valueColor="text-slate-400" />
          <StatCard label="Points Distributed" value={counts.pointsDistributed.toLocaleString()} valueColor="text-indigo-600" />
        </StatGrid>

        {/* Filter */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-slate-600"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
          {statusFilter && <button onClick={() => setStatusFilter("")} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} referrals</span>
        </div>

        {/* Referral Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["ID","Referrer","Referee","Referral Code","Date Used","Trigger","Status","→ Referrer","→ Referee","Activated"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-400">No referrals found</td></tr>
                )}
                {filtered.map((r) => {
                  const referrer = customerMap.get(r.referrerId);
                  const referee  = customerMap.get(r.refereeId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{r.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-700">{referrer?.name ?? <span className="text-slate-300 italic">Deleted Customer</span>}</div>
                        <div className="text-[11px] text-slate-400">{referrer?.phone}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-700">{referee?.name ?? <span className="text-slate-300 italic">Deleted Customer</span>}</div>
                        <div className="text-[11px] text-slate-400">{referee?.phone}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{r.referralCode}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.dateUsed)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{TRIGGER_LABELS[r.triggerEvent] ?? r.triggerEvent}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[r.status].badge)}>
                          {STATUS_META[r.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.status === "pending"
                          ? <span className="text-amber-600 font-medium">{r.pendingPoints.toLocaleString()} ⏳</span>
                          : r.status === "active"
                          ? <span className="text-emerald-600 font-medium">{r.pointsToReferrer.toLocaleString()} ✓</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.pointsToReferee > 0 && r.status !== "expired"
                          ? <span className="text-indigo-600 font-medium">{r.pointsToReferee.toLocaleString()}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.activationDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral Chain View */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setChainOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>Referral Chains</p>
              <p className="text-xs text-slate-400 mt-0.5">Active & pending referral relationships grouped by referrer</p>
            </div>
            {chainOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {chainOpen && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {chains.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No active referral chains</p>
              )}
              {chains.map(({ referrer, referrerId, referrals: refs }) => (
                <div key={referrerId} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#FF3B06] flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-white">{referrer?.name?.[0] ?? "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{referrer?.name ?? referrerId}</p>
                      <p className="text-[11px] text-slate-400">Code: {refs[0]?.referralCode}</p>
                    </div>
                    <span className="ml-auto text-[11px] text-slate-400">{refs.length} referral{refs.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="ml-9 pl-3 border-l border-slate-200 space-y-1.5">
                    {refs.map((r) => {
                      const referee = customerMap.get(r.refereeId);
                      return (
                        <div key={r.id} className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span className="font-medium">{referee?.name ?? r.refereeId}</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", STATUS_META[r.status].badge)}>
                            {STATUS_META[r.status].label}
                          </span>
                          <span className="text-slate-400 ml-auto">{fmtDate(r.dateUsed)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}
