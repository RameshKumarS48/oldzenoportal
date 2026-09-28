"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useCustomersStore } from "@/store/customers";
import { usePartnersStore } from "@/store/partners";
import { useAuthStore } from "@/store/auth";
import { usePromoRulesStore } from "@/store/promo-rules";
import { isPartnerRole } from "@/lib/mock/users";
import type { CustomerStatus } from "@/store/customers";
import type { UserRole } from "@/lib/mock/users";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { cn } from "@/lib/utils";

const STATUS_META: Record<CustomerStatus, { label: string; badge: string }> = {
  free:       { label: "Free",       badge: "bg-blue-50 text-blue-700" },
  active:     { label: "Active",     badge: "bg-emerald-50 text-emerald-700" },
  inactive:   { label: "Inactive",   badge: "bg-slate-100 text-slate-500" },
  no_account: { label: "No Account", badge: "bg-amber-50 text-amber-700" },
  invalid:    { label: "Invalid",    badge: "bg-red-50 text-red-600" },
  pre_order:  { label: "Pre-order",  badge: "bg-purple-50 text-purple-700" },
  pre_offer:  { label: "Pre-offer",  badge: "bg-orange-50 text-orange-700" },
  zeno_paid:  { label: "Zeno Paid",  badge: "bg-teal-50 text-teal-700" },
};

const SOURCE_LABELS: Record<string, string> = {
  customer_app:   "Customer App",
  website:        "Website",
  onboarding_app: "Onboarding / Scanner App",
  dashboard:      "Dashboard",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function OnboardingPage() {
  const { customers, addCustomer } = useCustomersStore();
  const partners = usePartnersStore((s) => s.partners);
  const rules = usePromoRulesStore((s) => s.rules);
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;
  const isPartner = isPartnerRole(role);

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const partnerMap = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p.name])), [partners]);

  const sorted = useMemo(() => {
    let list = [...customers].filter((c) => !c.isDeleted);
    if (isPartner && user?.partnerId) {
      list = list.filter((c) => c.partner === user.partnerId);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [customers, isPartner, user?.partnerId]);

  const paginated = useMemo(() => sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE), [sorted, page]);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);

  const computePromoPreview = (type: string, referralCode?: string) => ({
    points: type === "retail" ? rules.freshRetailPromo : rules.partnerPromo,
    referralBonus: referralCode ? (type === "retail" ? rules.freshRetailReferralBonus : rules.partnerReferralBonus) : 0,
  });

  return (
    <>
      <Topbar
        title="Onboarding"
        actions={
          <div className="ml-4">
            <Button size="sm" onClick={() => setOnboardOpen(true)}>
              <Plus className="w-4 h-4" /> Onboard New Customer
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Onboarded" value={sorted.length} />
          <StatCard label="Pre-orders"      value={sorted.filter((c) => c.status === "pre_order").length}                         valueColor="text-purple-600" />
          <StatCard label="This Month"      value={sorted.filter((c) => c.createdAt >= "2026-08-01").length}                      valueColor="text-zeno-teal" />
          <StatCard label="Via App"         value={sorted.filter((c) => c.onboardingSource === "customer_app").length}            valueColor="text-indigo-600" />
        </StatGrid>

        {/* Onboarding log */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>
              Onboarding Log
            </p>
            <span className="text-xs text-slate-400">{sorted.length} customers, newest first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead className="border-b border-slate-100">
                <tr>
                  {["Customer","Phone","Partner","Onboarding Source","Date Added","Status","Points Allocated"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No customers yet</td></tr>
                )}
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-700">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.id}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{c.phone}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {c.partner ? (partnerMap[c.partner] ?? c.partner) : <span className="text-slate-300">Retail</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {SOURCE_LABELS[c.onboardingSource] ?? c.onboardingSource}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[c.status]?.badge ?? "bg-slate-100 text-slate-500")}>
                        {STATUS_META[c.status]?.label ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {(c.promoPointsAllocated + c.referralPointsBalance) > 0
                        ? <span className="font-medium text-indigo-600">{(c.promoPointsAllocated + c.referralPointsBalance).toLocaleString()} pts</span>
                        : <span className="text-slate-300">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-30">← Prev</button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      </main>

      <CustomerFormModal
        mode="onboard"
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onSubmit={(data) => {
          const preview = computePromoPreview(data.customerType, data.referralCodeUsed);
          addCustomer({
            ...data,
            source: "walk_in",
            promoPointsAllocated: preview.points,
            referralPointsBalance: preview.referralBonus,
            promoEverAllocated: preview.points > 0,
          });
        }}
        promoPreview={undefined}
      />
    </>
  );
}
