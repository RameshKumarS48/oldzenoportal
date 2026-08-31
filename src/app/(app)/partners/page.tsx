"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Pencil, X, Users, Bike } from "lucide-react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { usePartnersStore } from "@/store/partners";
import { useCustomersStore } from "@/store/customers";
import { useUsersStore } from "@/store/users";
import { AdminGuard } from "@/components/ui/AdminGuard";
import type { Partner, PartnerType, PartnerStatus } from "@/store/partners";
// PartnerType used in edit form selects
import { cn } from "@/lib/utils";

const STATUS_META: Record<PartnerStatus, { label: string; badge: string }> = {
  active:   { label: "Active",   badge: "bg-emerald-50 text-emerald-700" },
  inactive: { label: "Inactive", badge: "bg-slate-100 text-slate-500" },
  pending:  { label: "Pending",  badge: "bg-amber-50 text-amber-700" },
};

const TYPE_LABELS: Record<PartnerType, string> = {
  credit:      "Credit",
  distributor: "Distributor",
  captive:     "Captive",
  corporate:   "Corporate",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";
const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

export default function PartnersPage() {
  const router = useRouter();
  const { partners, updatePartner, deactivatePartner } = usePartnersStore();
  const customers = useCustomersStore((s) => s.customers);
  const { users } = useUsersStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "customers" | "users">("overview");
  const [deactivateTarget, setDeactivateTarget] = useState<Partner | null>(null);

  const filtered = useMemo(() => partners.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.primaryEmail.toLowerCase().includes(q) || p.emailDomain.toLowerCase().includes(q);
    }
    return true;
  }), [partners, search, statusFilter]);

  const counts = useMemo(() => ({
    total:    partners.length,
    active:   partners.filter((p) => p.status === "active").length,
    inactive: partners.filter((p) => p.status === "inactive").length,
    pending:  partners.filter((p) => p.status === "pending").length,
  }), [partners]);

  const getPartnerCustomers = (id: string) => customers.filter((c) => c.partner === id && !c.isDeleted);
  const getPartnerUsers = (p: Partner) => users.filter((u) => p.partnerUsers.includes(u.id));

  const handleEdit = () => {
    if (!editPartner) return;
    updatePartner(editPartner.id, editPartner);
    setEditPartner(null);
  };

  return (
    <AdminGuard>
      <Topbar
        title="Partners"
        actions={
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xs text-white/50">{filtered.length} partners</span>
            <Button size="sm" onClick={() => router.push("/partners/onboard")}>
              <Plus className="w-4 h-4" /> Onboard Partner
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Partners" value={counts.total}    />
          <StatCard label="Active"         value={counts.active}   valueColor="text-emerald-600" />
          <StatCard label="Inactive"       value={counts.inactive} valueColor="text-slate-500" />
          <StatCard label="Pending"        value={counts.pending}  valueColor="text-amber-600" />
        </StatGrid>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partners…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 w-52"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-slate-600"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          {(search || statusFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200">
              <tr>
                {["Partner","Type","Status","Customers","Users","Created","Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No partners found</td></tr>
              )}
              {filtered.map((p) => {
                const pCustomers = getPartnerCustomers(p.id);
                const pUsers = getPartnerUsers(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => { setDetailPartner(p); setDetailTab("overview"); }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.emailDomain}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{TYPE_LABELS[p.partnerType]}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[p.status].badge)}>
                        {STATUS_META[p.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{pCustomers.length}</td>
                    <td className="px-4 py-3 text-slate-600">{pUsers.length}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditPartner({ ...p })} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {p.status !== "inactive" && (
                          <button onClick={() => setDeactivateTarget(p)} className="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Partner Modal */}
      {editPartner && (
        <Modal open={!!editPartner} onClose={() => setEditPartner(null)} title="Edit Partner">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Partner Name</label>
              <input className={fieldClass} value={editPartner.name} onChange={(e) => setEditPartner((p) => p ? { ...p, name: e.target.value } : p)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <select className={fieldClass} value={editPartner.partnerType} onChange={(e) => setEditPartner((p) => p ? { ...p, partnerType: e.target.value as PartnerType } : p)}>
                  <option value="credit">Credit</option>
                  <option value="distributor">Distributor</option>
                  <option value="captive">Captive</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={fieldClass} value={editPartner.status} onChange={(e) => setEditPartner((p) => p ? { ...p, status: e.target.value as PartnerStatus } : p)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Primary Email</label>
              <input className={fieldClass} value={editPartner.primaryEmail} onChange={(e) => setEditPartner((p) => p ? { ...p, primaryEmail: e.target.value } : p)} />
            </div>
            <div>
              <label className={labelClass}>Email Domain</label>
              <input className={fieldClass} value={editPartner.emailDomain} onChange={(e) => setEditPartner((p) => p ? { ...p, emailDomain: e.target.value } : p)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditPartner(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEdit}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Partner Detail Modal */}
      {detailPartner && (
        <Modal open={!!detailPartner} onClose={() => setDetailPartner(null)} title={detailPartner.name}>
          <Tabs
            className="mb-4"
            tabs={[
              { key: "overview",   label: "Overview" },
              { key: "customers",  label: "Customers" },
              { key: "users",      label: "Users" },
            ]}
            active={detailTab}
            onChange={(k) => setDetailTab(k as typeof detailTab)}
          />

          {detailTab === "overview" && (
            <div className="space-y-3 text-sm">
              {[
                ["Type",          TYPE_LABELS[detailPartner.partnerType]],
                ["Status",        STATUS_META[detailPartner.status].label],
                ["Primary Email", detailPartner.primaryEmail],
                ["Email Domain",  detailPartner.emailDomain],
                ["Created",       fmtDate(detailPartner.createdAt)],
                ["Vehicles",      detailPartner.assignedVehicles.length.toString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          )}

          {detailTab === "customers" && (() => {
            const pc = getPartnerCustomers(detailPartner.id);
            return (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pc.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No customers assigned</p>}
                {pc.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.phone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] text-slate-500">{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {detailTab === "users" && (() => {
            const pu = getPartnerUsers(detailPartner);
            return (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pu.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No users assigned</p>}
                {pu.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDetailPartner(null)}>Close</Button>
            <Button className="flex-1" onClick={() => { setEditPartner({ ...detailPartner }); setDetailPartner(null); }}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          </div>
        </Modal>
      )}

      {/* Deactivate Confirm */}
      <Modal open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Deactivate Partner">
        <p className="text-sm text-slate-600 mb-5">
          Deactivate <strong>{deactivateTarget?.name}</strong>? Partner users will lose access. Customers and vehicle data are preserved.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => { if (deactivateTarget) deactivatePartner(deactivateTarget.id); setDeactivateTarget(null); }}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </AdminGuard>
  );
}
