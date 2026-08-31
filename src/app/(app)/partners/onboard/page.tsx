"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Bike, UserPlus, ClipboardCheck,
  Search, AlertCircle, Mail, Check, Users, Zap, CheckCircle2,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { usePartnersStore } from "@/store/partners";
import { useVehiclesStore } from "@/store/vehicles";
import { usePromoRulesStore } from "@/store/promo-rules";
import { useUsersStore } from "@/store/users";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import type { PartnerType, PartnerStatus } from "@/store/partners";

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Organisation", icon: Building2,     desc: "Partner identity & type" },
  { id: 2, label: "Fleet",        icon: Bike,          desc: "Assign vehicles" },
  { id: 3, label: "Admin User",   icon: UserPlus,      desc: "Invite first admin" },
  { id: 4, label: "Review",       icon: ClipboardCheck, desc: "Confirm & create" },
];

const PARTNER_TYPE_INFO: Record<PartnerType, { label: string; desc: string }> = {
  credit:      { label: "Credit",      desc: "Provides financing — customers pay over time (e.g. M-KOPA, Watu)" },
  corporate:   { label: "Corporate",   desc: "Fleet for a corporate employer (e.g. Greenwheels)" },
  captive:     { label: "Captive",     desc: "Zeno-operated internal fleet" },
  distributor: { label: "Distributor", desc: "Distributes bikes to sub-dealers or agents" },
};

const REGION_LABELS: Record<string, string> = {
  nbo: "NBO", nanyuki: "Nanyuki", nyeri: "Nyeri", naromoru: "Naro Moru",
};

const field = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";
const label = "block text-xs font-semibold text-slate-600 mb-1.5";

// ─── Component ───────────────────────────────────────────────────────────────

export default function PartnerOnboardPage() {
  const router = useRouter();
  const { addPartner } = usePartnersStore();
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const promoRules = usePromoRulesStore((s) => s.rules);
  const { createInvite } = useUsersStore();
  const currentUser = useAuthStore((s) => s.user);

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Step 1 — Organisation
  const [org, setOrg] = useState({
    name: "", partnerType: "credit" as PartnerType,
    primaryEmail: "", emailDomain: "", status: "pending" as PartnerStatus,
  });

  // Step 2 — Fleet
  const [selectedVINs, setSelectedVINs] = useState<string[]>([]);
  const [vSearch, setVSearch] = useState("");
  const [vRegion, setVRegion] = useState("");

  // Step 3 — Admin user
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [sendInvite, setSendInvite] = useState(true);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredVehicles = useMemo(() => vehicles.filter((v) => {
    if (vRegion && v.region !== vRegion) return false;
    if (vSearch) {
      const q = vSearch.toLowerCase();
      return (
        v.vin.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  }), [vehicles, vSearch, vRegion]);

  const selectedByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    vehicles
      .filter((v) => selectedVINs.includes(v.vin))
      .forEach((v) => { map[v.region] = (map[v.region] ?? 0) + 1; });
    return map;
  }, [vehicles, selectedVINs]);

  const step1Valid = org.name.trim() !== "" && org.primaryEmail.trim() !== "";
  const step3Valid = !sendInvite || adminEmail.trim() !== "";

  const toggleVIN = (vin: string) =>
    setSelectedVINs((prev) =>
      prev.includes(vin) ? prev.filter((v) => v !== vin) : [...prev, vin]
    );

  const goStep = (n: number) => { setInviteError(""); setStep(n); };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSaving(true);
    setInviteError("");
    try {
      addPartner({ ...org, assignedVehicles: selectedVINs });
      if (sendInvite && adminEmail.trim()) {
        await createInvite(adminEmail.trim(), "partner_super_admin", currentUser?.name ?? "Zeno Admin");
      }
      setDone(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setStep(1); setDone(false); setSaving(false); setInviteError("");
    setOrg({ name: "", partnerType: "credit", primaryEmail: "", emailDomain: "", status: "pending" });
    setSelectedVINs([]); setVSearch(""); setVRegion("");
    setAdminEmail(""); setAdminName(""); setSendInvite(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminGuard>
      {done ? (
        /* ── Success ── */
        <div className="flex flex-col flex-1 items-center justify-center p-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Partner Created
            </h2>
            <p className="text-slate-500 mb-5">
              <strong>{org.name}</strong> has been onboarded as a{" "}
              <span className="capitalize">{org.partnerType}</span> partner.
            </p>
            <div className="text-left bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 mb-6 text-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-500">Status</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-semibold capitalize",
                  org.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                )}>{org.status}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-500">Vehicles allocated</span>
                <span className="font-semibold text-slate-700">{selectedVINs.length}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-500">Admin invite</span>
                <span className="font-semibold text-slate-700">
                  {sendInvite && adminEmail ? adminEmail : "Not sent"}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/partners")}>
                View Partners
              </Button>
              <Button className="flex-1" onClick={resetAll}>
                Onboard Another
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Wizard ── */
        <>
          <Topbar
            title="Onboard New Partner"
            actions={
              <Button variant="ghost-dark" size="sm" onClick={() => router.push("/partners")}>
                <ArrowLeft className="w-4 h-4" /> Back to Partners
              </Button>
            }
          />
          <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
            <div className="max-w-5xl mx-auto flex gap-6 items-start">

              {/* ── Left: Step progress ── */}
              <div className="w-52 shrink-0 sticky top-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Steps</p>
                  <div className="space-y-0.5">
                    {STEPS.map((s) => {
                      const isComplete = step > s.id;
                      const isActive   = step === s.id;
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => isComplete ? goStep(s.id) : undefined}
                          disabled={!isComplete && !isActive}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                            isActive   && "bg-[#003B49]/10 text-[#003B49]",
                            isComplete && "text-slate-500 hover:bg-slate-50 cursor-pointer",
                            !isActive && !isComplete && "text-slate-300 cursor-default"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isActive   && "bg-[#003B49] text-white",
                            isComplete && "bg-emerald-500 text-white",
                            !isActive && !isComplete && "bg-slate-100"
                          )}>
                            {isComplete
                              ? <CheckCircle2 className="w-3.5 h-3.5" />
                              : <Icon className="w-3 h-3" />
                            }
                          </div>
                          <div>
                            <div className="text-xs font-semibold leading-tight">{s.label}</div>
                            <div className="text-[10px] mt-0.5 leading-tight opacity-60">{s.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Right: Form ── */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-xl border border-slate-200 p-7">

                  {/* ── Step 1: Organisation ── */}
                  {step === 1 && (
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                        Organisation Details
                      </h2>
                      <p className="text-sm text-slate-500 mb-6">Who is this partner and how do they operate?</p>

                      <div className="space-y-5">
                        <div>
                          <label className={label}>Partner Name *</label>
                          <input
                            className={field}
                            value={org.name}
                            onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                            placeholder="e.g. Apollo Agriculture"
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className={label}>Partner Type *</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(PARTNER_TYPE_INFO) as [PartnerType, typeof PARTNER_TYPE_INFO[PartnerType]][]).map(([type, info]) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setOrg((o) => ({ ...o, partnerType: type }))}
                                className={cn(
                                  "text-left px-4 py-3 rounded-lg border-2 transition-all",
                                  org.partnerType === type
                                    ? "border-[#003B49] bg-[#003B49]/5"
                                    : "border-slate-200 hover:border-slate-300"
                                )}
                              >
                                <div className="text-sm font-semibold text-slate-700">{info.label}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{info.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={label}>Primary Email *</label>
                            <input
                              className={field}
                              type="email"
                              value={org.primaryEmail}
                              onChange={(e) => setOrg((o) => ({ ...o, primaryEmail: e.target.value }))}
                              placeholder="ops@partner.com"
                            />
                          </div>
                          <div>
                            <label className={label}>Email Domain</label>
                            <input
                              className={field}
                              value={org.emailDomain}
                              onChange={(e) => setOrg((o) => ({ ...o, emailDomain: e.target.value }))}
                              placeholder="partner.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={label}>Initial Status</label>
                          <div className="flex gap-2">
                            {(["pending", "active"] as PartnerStatus[]).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setOrg((o) => ({ ...o, status: s }))}
                                className={cn(
                                  "px-5 py-2 rounded-lg text-sm border-2 transition-all capitalize font-medium",
                                  org.status === s && s === "active"  && "border-emerald-500 bg-emerald-50 text-emerald-700",
                                  org.status === s && s === "pending" && "border-amber-400 bg-amber-50 text-amber-700",
                                  org.status !== s && "border-slate-200 text-slate-500 hover:border-slate-300"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          {org.status === "pending" && (
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              Partner users won't have access until status is set to Active.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Fleet ── */}
                  {step === 2 && (
                    <div>
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>
                            Fleet Allocation
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Select vehicles to assign. You can update this at any time.
                          </p>
                        </div>
                        {selectedVINs.length > 0 && (
                          <span className="bg-[#003B49] text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
                            {selectedVINs.length} selected
                          </span>
                        )}
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-2 mt-5 mb-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            className="pl-8 pr-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
                            placeholder="Search VIN, plate, customer…"
                            value={vSearch}
                            onChange={(e) => setVSearch(e.target.value)}
                          />
                        </div>
                        <select
                          value={vRegion}
                          onChange={(e) => setVRegion(e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white"
                        >
                          <option value="">All Regions</option>
                          {Object.entries(REGION_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        {selectedVINs.length > 0 && (
                          <button
                            onClick={() => setSelectedVINs([])}
                            className="text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* Vehicle table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="max-h-[360px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                              <tr>
                                <th className="w-10 px-3 py-2.5" />
                                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">VIN · Plate</th>
                                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer</th>
                                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Region</th>
                                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
                                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Partner</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredVehicles.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="text-center py-10 text-slate-400">
                                    No vehicles match your filters
                                  </td>
                                </tr>
                              )}
                              {filteredVehicles.map((v) => {
                                const checked = selectedVINs.includes(v.vin);
                                return (
                                  <tr
                                    key={v.id}
                                    onClick={() => toggleVIN(v.vin)}
                                    className={cn(
                                      "cursor-pointer transition-colors select-none",
                                      checked ? "bg-[#003B49]/5" : "hover:bg-slate-50"
                                    )}
                                  >
                                    <td className="px-3 py-3">
                                      <div className={cn(
                                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                        checked ? "bg-[#003B49] border-[#003B49]" : "border-slate-300"
                                      )}>
                                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="font-mono text-[11px] text-slate-600 font-semibold">
                                        …{v.vin.slice(-8)}
                                      </div>
                                      <div className="text-slate-400 mt-0.5">{v.plate}</div>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">{v.customerName}</td>
                                    <td className="px-3 py-3 text-slate-500">
                                      {REGION_LABELS[v.region] ?? v.region}
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-semibold",
                                        v.status === "active"       && "bg-emerald-50 text-emerald-700",
                                        v.status === "provisioning" && "bg-blue-50 text-blue-600",
                                        v.status === "offroad"      && "bg-slate-100 text-slate-500"
                                      )}>
                                        {v.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                                      {v.partner || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        {vehicles.length} total · {filteredVehicles.length} shown · {selectedVINs.length} selected
                      </p>
                    </div>
                  )}

                  {/* ── Step 3: Admin User ── */}
                  {step === 3 && (
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                        Invite Admin User
                      </h2>
                      <p className="text-sm text-slate-500 mb-6">
                        Invite the partner's first admin so they can manage their team and customers.
                      </p>

                      <div className="space-y-5">
                        {/* Toggle */}
                        <button
                          type="button"
                          onClick={() => setSendInvite((v) => !v)}
                          className="flex items-center gap-3"
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                            sendInvite ? "bg-[#003B49] border-[#003B49]" : "border-slate-300"
                          )}>
                            {sendInvite && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-slate-700">Send invite now</span>
                        </button>

                        {sendInvite ? (
                          <div className="pl-8 space-y-4">
                            <div>
                              <label className={label}>Admin Email *</label>
                              <input
                                className={field}
                                type="email"
                                value={adminEmail}
                                onChange={(e) => { setAdminEmail(e.target.value); setInviteError(""); }}
                                placeholder={`admin@${org.emailDomain || "partner.com"}`}
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className={label}>Full Name <span className="font-normal text-slate-400">(optional)</span></label>
                              <input
                                className={field}
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="e.g. Jane Doe"
                              />
                            </div>
                            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                              <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-500 leading-relaxed">
                                They'll be assigned <strong>Partner Super Admin</strong> — full access to their
                                partner's customers, vehicles, and user management. Adjust their role any time
                                from Users & Permissions.
                              </p>
                            </div>
                            {inviteError && (
                              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {inviteError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="pl-8 text-sm text-slate-400">
                            No problem — you can invite partner users later from Users & Permissions.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Step 4: Review ── */}
                  {step === 4 && (
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                        Review & Confirm
                      </h2>
                      <p className="text-sm text-slate-500 mb-6">Everything looks right? Hit Create to go live.</p>

                      <div className="space-y-3">
                        {/* Organisation */}
                        <ReviewCard
                          icon={Building2}
                          title="Organisation"
                          onEdit={() => goStep(1)}
                        >
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                            {[
                              ["Name",    org.name],
                              ["Type",    PARTNER_TYPE_INFO[org.partnerType].label],
                              ["Status",  org.status],
                              ["Email",   org.primaryEmail],
                              ["Domain",  org.emailDomain || "—"],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}</div>
                                <div className="text-sm text-slate-700 font-medium capitalize mt-0.5">{v}</div>
                              </div>
                            ))}
                          </div>
                        </ReviewCard>

                        {/* Fleet */}
                        <ReviewCard
                          icon={Bike}
                          title="Fleet Allocation"
                          onEdit={() => goStep(2)}
                        >
                          {selectedVINs.length === 0 ? (
                            <p className="text-sm text-slate-400">No vehicles selected · can assign later</p>
                          ) : (
                            <div>
                              <div className="flex gap-4 mb-3">
                                {Object.entries(selectedByRegion).map(([r, count]) => (
                                  <div key={r} className="text-sm">
                                    <span className="font-semibold text-slate-700">{count}</span>
                                    <span className="text-slate-400 ml-1">{REGION_LABELS[r] ?? r}</span>
                                  </div>
                                ))}
                                <div className="text-sm ml-auto">
                                  <span className="font-semibold text-[#003B49]">{selectedVINs.length}</span>
                                  <span className="text-slate-400 ml-1">total</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedVINs.map((vin) => (
                                  <span key={vin} className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono text-[10px] rounded">
                                    …{vin.slice(-8)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </ReviewCard>

                        {/* Promo rules */}
                        <ReviewCard icon={Zap} title="Promo & Points" badge="Global rules">
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                            {[
                              ["Partner Promo",    `KES ${promoRules.partnerPromo.toLocaleString()}`],
                              ["Referral Bonus",   `KES ${promoRules.partnerReferralBonus.toLocaleString()}`],
                              ["Frequency",        promoRules.promoFrequency.replace(/_/g, " ")],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}</div>
                                <div className="text-sm text-slate-700 font-medium capitalize mt-0.5">{v}</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2">
                            Adjust these in Settings → Business Rules.
                          </p>
                        </ReviewCard>

                        {/* Admin user */}
                        <ReviewCard
                          icon={Users}
                          title="Admin User"
                          onEdit={() => goStep(3)}
                        >
                          {sendInvite && adminEmail ? (
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-700">{adminEmail}</div>
                                {adminName && <div className="text-xs text-slate-400 mt-0.5">{adminName}</div>}
                              </div>
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded ml-auto shrink-0">
                                Partner Super Admin
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">No invite · add users later</p>
                          )}
                        </ReviewCard>

                        {inviteError && (
                          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {inviteError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Navigation ── */}
                  <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                    <Button
                      variant="outline"
                      onClick={() => step > 1 ? goStep(step - 1) : router.push("/partners")}
                    >
                      {step === 1 ? "Cancel" : "← Back"}
                    </Button>

                    {step < 4 ? (
                      <Button
                        onClick={() => goStep(step + 1)}
                        disabled={step === 1 ? !step1Valid : step === 3 ? !step3Valid : false}
                      >
                        Continue →
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? "Creating…" : "Create Partner"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </main>
        </>
      )}
    </AdminGuard>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({
  icon: Icon,
  title,
  badge,
  onEdit,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
          {onEdit && (
            <button onClick={onEdit} className="text-[11px] text-[#003B49] hover:underline font-medium">
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
