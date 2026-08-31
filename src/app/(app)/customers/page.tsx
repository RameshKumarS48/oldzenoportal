"use client";

import { useMemo, useState } from "react";
import { Search, Download, Plus, Pencil, Trash2, RefreshCw, AlertTriangle, ChevronDown } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCustomersStore } from "@/store/customers";
import { usePartnersStore } from "@/store/partners";
import { useAuthStore } from "@/store/auth";
import { isPartnerRole } from "@/lib/mock/users";
import type { Customer, CustomerStatus, CustomerType } from "@/store/customers";
import type { UserRole } from "@/lib/mock/users";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { Pagination } from "@/components/ui/Pagination";
import { usePromoRulesStore } from "@/store/promo-rules";

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
  customer_app:   "App",
  website:        "Web",
  onboarding_app: "Scanner",
  dashboard:      "Dashboard",
};

const TYPE_BADGE: Record<CustomerType, string> = {
  retail:  "bg-indigo-50 text-indigo-700",
  partner: "bg-[#003B49]/10 text-[#003B49]",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function exportCSV(customers: Customer[]) {
  const headers = ["ID","Name","Phone","Type","Partner","Status","Onboarding Source","Vehicle","Promo Points","Referral Points","Activated","Created"];
  const rows = customers.map(c => [c.id, c.name, c.phone, c.customerType, c.partner, c.status, c.onboardingSource, c.vehicleId ?? "", c.promoPointsAllocated, c.referralPointsBalance, c.activationDate ?? "", c.createdAt]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deactivateCustomer, restoreCustomer, softDeleteCustomer, hardDeleteCustomer } = useCustomersStore();
  const partners = usePartnersStore((s) => s.partners);
  const rules = usePromoRulesStore((s) => s.rules);
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;
  const isPartner = isPartnerRole(role);
  const isSuperAdmin = role === "zeno_super_admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [referralFilter, setReferralFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Customer | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Customer | null>(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState("");

  const baseCustomers = useMemo(() => {
    let list = customers.filter((c) => !c.isDeleted);
    if (isPartner && user?.partnerId) {
      list = list.filter((c) => c.partner === user.partnerId);
    }
    return list;
  }, [customers, isPartner, user?.partnerId]);

  const filtered = useMemo(() => baseCustomers.filter((c) => {
    if (statusFilter  && c.status       !== statusFilter)                                    return false;
    if (typeFilter    && c.customerType !== typeFilter)                                      return false;
    if (partnerFilter && c.partner      !== partnerFilter)                                   return false;
    if (sourceFilter  && c.onboardingSource !== sourceFilter)                                return false;
    if (referralFilter && !c.referralCodeUsed)                                               return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.vehicleId ?? "").toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  }), [baseCustomers, search, statusFilter, typeFilter, partnerFilter, sourceFilter, referralFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const counts = useMemo(() => ({
    total:    baseCustomers.length,
    active:   baseCustomers.filter((c) => c.status === "active" || c.status === "zeno_paid").length,
    preOrder: baseCustomers.filter((c) => c.status === "pre_order").length,
    inactive: baseCustomers.filter((c) => c.status === "inactive").length,
    noAcct:   baseCustomers.filter((c) => c.status === "no_account").length,
    invalid:  baseCustomers.filter((c) => c.status === "invalid").length,
    retail:   baseCustomers.filter((c) => c.customerType === "retail").length,
    partner:  baseCustomers.filter((c) => c.customerType === "partner").length,
  }), [baseCustomers]);

  const partnerMap = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p.name])), [partners]);

  const computePromoPreview = (type: string, referralCode?: string) => ({
    points: type === "retail" ? rules.freshRetailPromo : rules.partnerPromo,
    referralBonus: referralCode ? (type === "retail" ? rules.freshRetailReferralBonus : rules.partnerReferralBonus) : 0,
  });

  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setTypeFilter(""); setPartnerFilter(""); setSourceFilter(""); setReferralFilter(false); setPage(1);
  };
  const hasFilters = !!(search || statusFilter || typeFilter || partnerFilter || sourceFilter || referralFilter);

  return (
    <>
      <Topbar
        title="Customers"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-white/50 font-medium">{filtered.length} customers</span>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Customer
            </Button>
            <Button size="sm" variant="ghost-dark" onClick={() => exportCSV(filtered)}>
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid cols={8} className="gap-3">
          <StatCard compact label="Total"      value={counts.total} />
          <StatCard compact label="Active"     value={counts.active}   valueColor="text-emerald-600" />
          <StatCard compact label="Pre-order"  value={counts.preOrder} valueColor="text-purple-600" />
          <StatCard compact label="Inactive"   value={counts.inactive} valueColor="text-slate-500" />
          <StatCard compact label="No Account" value={counts.noAcct}   valueColor="text-amber-600" />
          <StatCard compact label="Invalid"    value={counts.invalid}  valueColor="text-red-500" />
          <StatCard compact label="Retail"     value={counts.retail}   valueColor="text-indigo-600" />
          <StatCard compact label="Partner"    value={counts.partner}  valueColor="text-zeno-teal" />
        </StatGrid>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone, VIN…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
            />
          </div>
          {([
            ["Status",   statusFilter,  setStatusFilter,  [["","All Status"],["active","Active"],["zeno_paid","Zeno Paid"],["pre_order","Pre-order"],["pre_offer","Pre-offer"],["inactive","Inactive"],["no_account","No Account"],["invalid","Invalid"],["free","Free"]]],
            ["Type",     typeFilter,    setTypeFilter,    [["","All Types"],["retail","Retail"],["partner","Partner"]]],
            ["Partner",  partnerFilter, setPartnerFilter, [["","All Partners"], ...partners.map((p) => [p.id, p.name])]],
            ["Source",   sourceFilter,  setSourceFilter,  [["","All Sources"],["customer_app","App"],["website","Web"],["onboarding_app","Scanner"],["dashboard","Dashboard"]]],
          ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
            <select key={label} value={val} onChange={(e) => { setter(e.target.value); setPage(1); }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={referralFilter} onChange={(e) => { setReferralFilter(e.target.checked); setPage(1); }} className="rounded" />
            Has Referral
          </label>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["ID","Name / Phone","Type","Partner","Status","Source","Vehicle","Points","Activated","Actions"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">No customers match your filters</td></tr>
                )}
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{c.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-700">{c.name}</div>
                      <div className="text-slate-400 text-[11px]">{c.phone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", TYPE_BADGE[c.customerType])}>
                        {c.customerType === "retail" ? "Retail" : "Partner"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                      {c.partner ? (partnerMap[c.partner] ?? c.partner) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[c.status]?.badge ?? "bg-slate-100 text-slate-500")}>
                        {STATUS_META[c.status]?.label ?? c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                      {SOURCE_LABELS[c.onboardingSource] ?? c.onboardingSource}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">
                      {c.vehicleId ? c.vehicleId.slice(-8) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[11px]">
                        {c.promoPointsAllocated > 0 && <span className="text-indigo-600 font-medium">{c.promoPointsAllocated.toLocaleString()}p</span>}
                        {c.referralPointsBalance > 0 && <span className="text-emerald-600 font-medium ml-1">+{c.referralPointsBalance.toLocaleString()}r</span>}
                        {c.promoPointsAllocated === 0 && c.referralPointsBalance === 0 && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">{fmtDate(c.activationDate)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditCustomer(c)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {(c.status === "active" || c.status === "zeno_paid") && (
                          <button
                            onClick={() => deactivateCustomer(c.id)}
                            className="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600"
                            title="Deactivate"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {c.status === "inactive" && (
                          <button
                            onClick={() => restoreCustomer(c.id)}
                            className="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                            title="Restore"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSoftDeleteTarget(c)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                          title="Soft Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setHardDeleteTarget(c); setHardDeleteConfirm(""); }}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-700"
                            title="Hard Delete (Super Admin)"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      </main>

      {/* Add Customer Modal */}
      <CustomerFormModal
        mode="add"
        open={addOpen}
        onClose={() => setAddOpen(false)}
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
      />

      {/* Edit Customer Modal */}
      {editCustomer && (
        <CustomerFormModal
          mode="edit"
          open={!!editCustomer}
          onClose={() => setEditCustomer(null)}
          initialValues={editCustomer}
          onSubmit={(data) => updateCustomer(editCustomer.id, data)}
        />
      )}

      {/* Soft Delete Confirm */}
      <Modal open={!!softDeleteTarget} onClose={() => setSoftDeleteTarget(null)} title="Deactivate Customer">
        <p className="text-sm text-slate-600 mb-5">
          Soft-delete <strong>{softDeleteTarget?.name}</strong>? The record will be hidden but preserved with all history intact. You can restore it later.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setSoftDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => { if (softDeleteTarget) softDeleteCustomer(softDeleteTarget.id); setSoftDeleteTarget(null); }}>
            Soft Delete
          </Button>
        </div>
      </Modal>

      {/* Hard Delete Confirm (double-confirm) */}
      <Modal open={!!hardDeleteTarget} onClose={() => setHardDeleteTarget(null)} title="⚠️ Permanent Delete">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-semibold text-red-700">This cannot be undone.</p>
          <p className="text-xs text-red-600 mt-1">
            Permanently deleting <strong>{hardDeleteTarget?.name}</strong> will destroy all connected referral, points, and partner history.
          </p>
        </div>
        <p className="text-xs text-slate-600 mb-3">Type the customer ID <strong>{hardDeleteTarget?.id}</strong> to confirm:</p>
        <input
          value={hardDeleteConfirm}
          onChange={(e) => setHardDeleteConfirm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
          placeholder={hardDeleteTarget?.id}
        />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setHardDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={hardDeleteConfirm !== hardDeleteTarget?.id}
            onClick={() => { if (hardDeleteTarget) hardDeleteCustomer(hardDeleteTarget.id); setHardDeleteTarget(null); }}
          >
            Permanently Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
