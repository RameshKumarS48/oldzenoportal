"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ArrowLeft, CheckCircle, PlusSquare } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

// ── Mock Provisioning Records ────────────────────────────────────────────────

interface ChargerProvRecord {
  id: string;
  name: string;
  location: string;
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
  partner: string;
  plannedDate: string;
  installDate?: string;
  wiringDate?: string;
  powerOnDate?: string;
  liveDate?: string;
  status: "planned" | "installed" | "wiring_done" | "powered_on" | "live";
  installType: "three_phase" | "single_phase";
  units: number;
  billingType: "pre_paid" | "post_paid";
  technician?: string;
}

const CHARGER_RECORDS: ChargerProvRecord[] = [
  { id:"fc-01", name:"Zeno FC — Westlands",      location:"Westlands, Nairobi",        region:"nbo",      partner:"zeno",  plannedDate:"2024-10-01", installDate:"2024-11-05", wiringDate:"2024-11-12", powerOnDate:"2024-11-15", liveDate:"2024-11-20", status:"live",      installType:"three_phase", units:2, billingType:"pre_paid",  technician:"James K." },
  { id:"fc-02", name:"Watu FC — Westlands",       location:"Westlands, Nairobi",        region:"nbo",      partner:"watu", plannedDate:"2024-11-01", installDate:"2024-12-03", wiringDate:"2024-12-10", powerOnDate:"2024-12-13", liveDate:"2024-12-16", status:"live",      installType:"three_phase", units:2, billingType:"post_paid", technician:"Sarah M." },
  { id:"fc-03", name:"Zeno FC — Karen",           location:"Karen, Nairobi",            region:"nbo",      partner:"zeno",  plannedDate:"2025-01-10", installDate:"2025-02-12", wiringDate:"2025-02-18", powerOnDate:"2025-02-21", liveDate:"2025-02-25", status:"live",      installType:"three_phase", units:4, billingType:"pre_paid",  technician:"Peter O." },
  { id:"fc-04", name:"MKopa FC — Kasarani",       location:"Kasarani, Nairobi",         region:"nbo",      partner:"mkopa",plannedDate:"2025-02-15", installDate:"2025-03-18", wiringDate:"2025-03-24", powerOnDate:"2025-03-27", liveDate:"2025-03-30", status:"live",      installType:"three_phase", units:2, billingType:"pre_paid",  technician:"Alice W." },
  { id:"fc-05", name:"Zeno FC — Nanyuki Centre",  location:"Nanyuki Town Centre",       region:"nanyuki",  partner:"zeno",  plannedDate:"2025-04-01", installDate:"2025-05-05", wiringDate:"2025-05-12", powerOnDate:"2025-05-15", liveDate:"2025-05-18", status:"live",      installType:"three_phase", units:2, billingType:"pre_paid",  technician:"James K." },
  { id:"fc-06", name:"GW FC — Nanyuki Mall",      location:"Nanyuki Mall, Laikipia",    region:"nanyuki",  partner:"gw",    plannedDate:"2025-05-10", installDate:"2025-06-12", wiringDate:"2025-06-18", powerOnDate:"2025-06-21", liveDate:"2025-06-24", status:"live",      installType:"single_phase",units:2, billingType:"post_paid", technician:"Sarah M." },
  { id:"fc-07", name:"Zeno FC — Naro Moru",       location:"Naro Moru, Nyeri County",   region:"naromoru", partner:"zeno",  plannedDate:"2025-06-01", installDate:"2025-07-08", wiringDate:"2025-07-14", powerOnDate:"2025-07-17", liveDate:"2025-07-20", status:"live",      installType:"three_phase", units:2, billingType:"pre_paid",  technician:"Peter O." },
  { id:"fc-08", name:"Zeno FC — Nyeri Central",   location:"Nyeri Town, Nyeri County",  region:"nyeri",    partner:"zeno",  plannedDate:"2025-08-01", installDate:"2025-09-04", wiringDate:"2025-09-10", powerOnDate:"2025-09-13", liveDate:"2025-09-16", status:"live",      installType:"three_phase", units:4, billingType:"pre_paid",  technician:"Alice W." },
  { id:"fc-09", name:"Fortune FC — Ruiru",        location:"Ruiru Town, Kiambu",        region:"nbo",      partner:"fortune",plannedDate:"2025-10-01",installDate:"2025-11-05", wiringDate:"2025-11-11", powerOnDate:"2025-11-14", liveDate:"2025-11-18", status:"live",      installType:"three_phase", units:2, billingType:"post_paid", technician:"James K." },
  { id:"fc-10", name:"Zeno FC — Langata",         location:"Langata Rd, Nairobi",       region:"nbo",      partner:"zeno",  plannedDate:"2026-05-01", installDate:"2026-06-04", wiringDate:"2026-06-10", powerOnDate:"2026-06-13", liveDate:"2026-06-17", status:"live",      installType:"three_phase", units:4, billingType:"pre_paid",  technician:"Sarah M." },
  { id:"fc-11", name:"Watu FC — Embakasi",        location:"Embakasi, Nairobi",         region:"nbo",      partner:"watu", plannedDate:"2026-06-15", installDate:"2026-07-18", wiringDate:"2026-07-24", powerOnDate:"2026-07-27", status:"powered_on", installType:"three_phase", units:2, billingType:"post_paid", technician:"Peter O." },
  { id:"fc-12", name:"Zeno FC — Nyahururu",       location:"Nyahururu, Laikipia",       region:"nanyuki",  partner:"zeno",  plannedDate:"2026-07-01", status:"planned", installType:"three_phase", units:2, billingType:"pre_paid" },
];

const STATUS_META: Record<ChargerProvRecord["status"], { label: string; badge: string; step: number }> = {
  planned:    { label: "Planned",    badge: "bg-slate-100 text-slate-500",   step: 0 },
  installed:  { label: "Installed",  badge: "bg-blue-50 text-blue-700",      step: 1 },
  wiring_done:{ label: "Wiring Done",badge: "bg-purple-50 text-purple-700",  step: 2 },
  powered_on: { label: "Powered On", badge: "bg-orange-50 text-orange-700",  step: 3 },
  live:       { label: "Live",       badge: "bg-emerald-50 text-emerald-700",step: 4 },
};

const TOTAL_STEPS = 4;
const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", naromoru: "Naro Moru", nyeri: "Nyeri" };

function CommissionProgress({ status }: { status: ChargerProvRecord["status"] }) {
  const step = STATUS_META[status].step;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", step === TOTAL_STEPS ? "bg-emerald-500" : step > 0 ? "bg-amber-400" : "bg-slate-200")}
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <span className="text-[11px] text-slate-500">{step}/{TOTAL_STEPS}</span>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── Wizard ───────────────────────────────────────────────────────────────────

const WIZ_STEPS = ["Charger Details", "Setup", "Review"];
const PARTNERS_LIST = ["gw", "mkopa", "watu", "captive", "fortune", "4g", "cash", "zeno", "hustle"];

const INIT = {
  name: "", location: "", region: "", installDate: "", partner: "",
  installType: "three_phase", chargersCount: "2", billingType: "pre_paid",
  wired: false, poweredOn: false, setupNotes: "",
};

const fieldCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";
const selectCls = fieldCls + " bg-white text-slate-700";

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              i < current ? "bg-[#003B49] border-[#003B49] text-white" : i === current ? "bg-white border-[#003B49] text-[#003B49]" : "bg-white border-slate-200 text-slate-400"
            )}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={cn("text-[10px] mt-1 font-medium whitespace-nowrap", i === current ? "text-[#003B49]" : "text-slate-400")}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={cn("w-16 h-0.5 mb-4 mx-1", i < current ? "bg-[#003B49]" : "bg-slate-200")} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b border-slate-100 flex gap-4">
      <span className="text-xs text-slate-400 w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value || "—"}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProvisionFastChargerPage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "wizard">("list");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INIT });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => CHARGER_RECORDS.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.partner.includes(q);
    }
    return true;
  }), [search, statusFilter]);

  const set = (k: keyof Omit<typeof INIT, "wired" | "poweredOn">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const toggle = (k: "wired" | "poweredOn") => setForm(f => ({ ...f, [k]: !f[k] }));
  const handleSubmit = () => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setDone(true); }, 1000); };
  const resetWizard = () => { setForm({ ...INIT }); setStep(0); setDone(false); setView("list"); };

  const liveCount = CHARGER_RECORDS.filter(r => r.status === "live").length;
  const inProgressCount = CHARGER_RECORDS.filter(r => r.status !== "live" && r.status !== "planned").length;
  const plannedCount = CHARGER_RECORDS.filter(r => r.status === "planned").length;

  if (done) {
    return (
      <AdminGuard>
        <Topbar title="Fast Charger Provisioning" />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>Successfully Added!</h2>
            <p className="text-sm text-slate-500 mb-6">Fast charger has been registered.</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-1">
              <ReviewRow label="Charger Name" value={form.name} />
              <ReviewRow label="Location" value={form.location} />
              <ReviewRow label="Units" value={`${form.chargersCount} units`} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setForm({ ...INIT }); setStep(0); setDone(false); }}>Add Another</Button>
              <Button className="flex-1" onClick={resetWizard}>View All Records</Button>
            </div>
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (view === "wizard") {
    return (
      <AdminGuard>
        <Topbar
          title="Fast Charger Provisioning"
          actions={
            <Button variant="ghost-dark" size="sm" onClick={() => setView("list")}>
              <ArrowLeft className="w-4 h-4" /> Back to Records
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
          <div className="max-w-xl mx-auto">
            <StepIndicator steps={WIZ_STEPS} current={step} />
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Charger Details</h3>
                  <Field label="Charger Name" required><input value={form.name} onChange={set("name")} placeholder="e.g. Zeno FC — Westlands" className={fieldCls} /></Field>
                  <Field label="Location / Address" required><input value={form.location} onChange={set("location")} placeholder="e.g. Westlands, Nairobi" className={fieldCls} /></Field>
                  <Field label="Region">
                    <select value={form.region} onChange={set("region")} className={selectCls}>
                      <option value="">Select region…</option>
                      <option value="nbo">Nairobi (NBO)</option>
                      <option value="nanyuki">Nanyuki</option>
                      <option value="naromoru">Naro Moru</option>
                      <option value="nyeri">Nyeri</option>
                    </select>
                  </Field>
                  <Field label="Install Date"><input type="date" value={form.installDate} onChange={set("installDate")} className={fieldCls} /></Field>
                  <Field label="Partner (optional)">
                    <select value={form.partner} onChange={set("partner")} className={selectCls}>
                      <option value="">None (Zeno-operated)</option>
                      {PARTNERS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Setup</h3>
                  <Field label="Install Type">
                    <select value={form.installType} onChange={set("installType")} className={selectCls}>
                      <option value="single_phase">Single Phase</option>
                      <option value="three_phase">Three Phase</option>
                    </select>
                  </Field>
                  <Field label="Number of Charger Units">
                    <input type="number" min="1" max="12" value={form.chargersCount} onChange={set("chargersCount")} className={fieldCls} />
                  </Field>
                  <Field label="Billing Type">
                    <select value={form.billingType} onChange={set("billingType")} className={selectCls}>
                      <option value="pre_paid">Pre-paid</option>
                      <option value="post_paid">Post-paid</option>
                    </select>
                  </Field>
                  <div className="space-y-2 pt-1">
                    {([["wired", "Wiring complete"], ["poweredOn", "Unit powered on"]] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} className="w-4 h-4 accent-[#003B49] rounded" />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  <Field label="Notes">
                    <textarea value={form.setupNotes} onChange={set("setupNotes")} rows={2} placeholder="Optional notes…" className={fieldCls + " resize-none"} />
                  </Field>
                </div>
              )}
              {step === 2 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Review & Confirm</h3>
                  <ReviewRow label="Charger Name" value={form.name} />
                  <ReviewRow label="Location" value={form.location} />
                  <ReviewRow label="Region" value={form.region} />
                  <ReviewRow label="Install Date" value={form.installDate} />
                  <ReviewRow label="Partner" value={form.partner || "None"} />
                  <ReviewRow label="Install Type" value={form.installType === "three_phase" ? "Three Phase" : "Single Phase"} />
                  <ReviewRow label="Charger Units" value={form.chargersCount} />
                  <ReviewRow label="Billing Type" value={form.billingType === "pre_paid" ? "Pre-paid" : "Post-paid"} />
                  <ReviewRow label="Wired" value={form.wired ? "Yes" : "No"} />
                  <ReviewRow label="Powered On" value={form.poweredOn ? "Yes" : "No"} />
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                {step < 2 && <Button className="ml-auto" onClick={() => setStep(s => s + 1)}>Next</Button>}
                {step === 2 && (
                  <Button className="ml-auto" onClick={handleSubmit} loading={submitting} disabled={submitting}>
                    {submitting ? "Adding…" : "Add Charger"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </AdminGuard>
    );
  }

  const pageWidgets = [
    { title: "Total Chargers", snapshotValue: CHARGER_RECORDS.length, snapshotLabel: "in system", snapshotSource: "Fast Charger Provisioning" },
    { title: "Live Chargers", snapshotValue: liveCount, snapshotLabel: "fully operational", snapshotSource: "Fast Charger Provisioning" },
    { title: "In Progress", snapshotValue: inProgressCount, snapshotLabel: "being installed", snapshotSource: "Fast Charger Provisioning" },
    { title: "Planned", snapshotValue: plannedCount, snapshotLabel: "sites planned", snapshotSource: "Fast Charger Provisioning" },
  ];

  return (
    <AdminGuard>
      <Topbar
        title="Fast Charger Provisioning"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost-dark" size="sm" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" onClick={() => setView("wizard")}>
              <Plus className="w-4 h-4" /> Add New Charger
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Chargers" value={CHARGER_RECORDS.length} />
          <StatCard label="Live"           value={liveCount}       valueColor="text-emerald-600" />
          <StatCard label="In Progress"    value={inProgressCount} valueColor="text-amber-600" />
          <StatCard label="Planned"        value={plannedCount}    valueColor="text-zeno-teal" />
        </StatGrid>

        {/* Live Operations */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Operations</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Embakasi FC Power-On Testing", progress: 70, done: false },
              { label: "Nyahururu FC Site Survey", progress: 35, done: false },
              { label: "Langata FC Go-Live Verification", progress: 100, done: true },
            ].map(op => (
              <div key={op.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">{op.label}</span>
                  <span className={cn("text-[10px] font-semibold", op.done ? "text-emerald-600" : "text-amber-600")}>
                    {op.done ? "Complete" : "In Progress"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", op.done ? "bg-emerald-500" : "bg-[#FF3B06]")}
                    style={{ width: `${op.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{op.progress}% complete</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, location, partner…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-56"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Status</option>
            {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} chargers</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Name","Location","Region","Partner","Type","Units","Billing","Status","Commission Progress","Live Since","Technician"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-400">No chargers match your filters</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate">{r.location}</td>
                    <td className="px-3 py-2.5 text-slate-500">{REGION_LABELS[r.region]}</td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{r.partner}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.installType === "three_phase" ? "3-Phase" : "1-Phase"}</td>
                    <td className="px-3 py-2.5 text-slate-600 font-medium">{r.units}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold",
                        r.billingType === "pre_paid" ? "bg-[#003B49]/10 text-[#003B49]" : "bg-purple-50 text-purple-700"
                      )}>
                        {r.billingType === "pre_paid" ? "Pre-paid" : "Post-paid"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", STATUS_META[r.status].badge)}>
                        {STATUS_META[r.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><CommissionProgress status={r.status} /></td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.liveDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.technician ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <AddToDashboardModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} widgets={pageWidgets} />
    </AdminGuard>
  );
}
