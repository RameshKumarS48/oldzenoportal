"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ArrowLeft, CheckCircle, PlusSquare } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

// ── Provisioning Records ────────────────────────────────────────────────────

interface VehicleProvRecord {
  id: string;
  vin: string;
  customer: string;
  partner: string;
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
  storeCode: string;
  orderedDate: string;
  deliveredDate?: string;
  commissionedDate?: string;
  activatedDate?: string;
  status: "ordered" | "delivered" | "commissioned" | "active" | "on_hold";
  technician?: string;
  notes?: string;
}

const RECORDS: VehicleProvRecord[] = [
  { id:"vp-01", vin:"ME92ZPSFB1J001988", customer:"NICKSON MWITI",       partner:"watu",    region:"nbo",      storeCode:"ke-nbo-zhq", orderedDate:"2025-10-12", deliveredDate:"2025-10-28", commissionedDate:"2025-11-04", activatedDate:"2025-11-06", status:"active",       technician:"James K." },
  { id:"vp-02", vin:"ME92ZPSEB1J001526", customer:"MUVUNYI JEAN",         partner:"mkopa",   region:"nbo",      storeCode:"ke-nbo-ksr", orderedDate:"2025-11-01", deliveredDate:"2025-11-15", commissionedDate:"2025-11-20", activatedDate:"2025-11-22", status:"active",       technician:"Sarah M." },
  { id:"vp-03", vin:"ME92ZPSEB1J001547", customer:"James Ng'ang'a",        partner:"gw",      region:"nbo",      storeCode:"ke-nbo-wst", orderedDate:"2025-11-08", deliveredDate:"2025-11-22", commissionedDate:"2025-11-28", activatedDate:"2025-12-01", status:"active",       technician:"Peter O." },
  { id:"vp-04", vin:"ME92ZPSFB1J001905", customer:"Fredrick Ochieng",      partner:"watu",    region:"nanyuki",  storeCode:"ke-nan-001", orderedDate:"2025-11-20", deliveredDate:"2025-12-05", commissionedDate:"2025-12-10", activatedDate:"2025-12-12", status:"active",       technician:"James K." },
  { id:"vp-05", vin:"ME92ZPSFB1J001934", customer:"Erick Nganda",          partner:"captive", region:"nbo",      storeCode:"ke-nbo-kbn", orderedDate:"2025-12-01", deliveredDate:"2025-12-18", commissionedDate:"2025-12-22", activatedDate:"2025-12-24", status:"active",       technician:"Alice W." },
  { id:"vp-06", vin:"ME92ZPSEB1J001616", customer:"Augustine Mbevi",       partner:"mkopa",   region:"naromoru", storeCode:"ke-nar-001", orderedDate:"2025-12-10", deliveredDate:"2026-01-04", commissionedDate:"2026-01-09", activatedDate:"2026-01-11", status:"active",       technician:"Sarah M." },
  { id:"vp-07", vin:"ME92ZPSFB1J001942", customer:"Zechariah Anita",       partner:"watu",    region:"nanyuki",  storeCode:"ke-nan-002", orderedDate:"2026-01-05", deliveredDate:"2026-01-20", commissionedDate:"2026-01-25", activatedDate:"2026-01-27", status:"active",       technician:"James K." },
  { id:"vp-08", vin:"ME92ZPSEB1J001423", customer:"Vincent King'oo Kau",   partner:"fortune", region:"nyeri",    storeCode:"ke-nyr-001", orderedDate:"2026-01-14", deliveredDate:"2026-01-29", commissionedDate:"2026-02-03", activatedDate:"2026-02-05", status:"active",       technician:"Peter O." },
  { id:"vp-09", vin:"ME92ZPSFB1J001938", customer:"Moses Mwangi",          partner:"watu",    region:"nbo",      storeCode:"ke-nbo-ksr", orderedDate:"2026-02-03", deliveredDate:"2026-02-18", commissionedDate:"2026-02-23", activatedDate:"2026-02-25", status:"active",       technician:"Alice W." },
  { id:"vp-10", vin:"ME92ZPSEB1J001820", customer:"Grace Wanjiru",         partner:"mkopa",   region:"nbo",      storeCode:"ke-nbo-lng", orderedDate:"2026-02-20", deliveredDate:"2026-03-07", commissionedDate:"2026-03-12", activatedDate:"2026-03-14", status:"active",       technician:"Sarah M." },
  { id:"vp-11", vin:"ME92ZPSFB1J001856", customer:"David Kimani",          partner:"gw",      region:"nanyuki",  storeCode:"ke-nan-003", orderedDate:"2026-03-01", deliveredDate:"2026-03-16", commissionedDate:"2026-03-21", activatedDate:"2026-03-23", status:"active",       technician:"James K." },
  { id:"vp-12", vin:"ME92ZPSEB1J001712", customer:"Ruth Akinyi",           partner:"watu",    region:"nbo",      storeCode:"ke-nbo-wst", orderedDate:"2026-03-15", deliveredDate:"2026-03-30", commissionedDate:"2026-04-04", activatedDate:"2026-04-06", status:"active",       technician:"Peter O." },
  { id:"vp-13", vin:"ME92ZPSFB1J001677", customer:"Charles Mutua",         partner:"4g",      region:"naromoru", storeCode:"ke-nar-002", orderedDate:"2026-04-02", deliveredDate:"2026-04-17", commissionedDate:"2026-04-22", activatedDate:"2026-04-24", status:"active",       technician:"Alice W." },
  { id:"vp-14", vin:"ME92ZPSEB1J001543", customer:"Esther Nafula",         partner:"mkopa",   region:"nyeri",    storeCode:"ke-nyr-002", orderedDate:"2026-04-20", deliveredDate:"2026-05-05", commissionedDate:"2026-05-10", activatedDate:"2026-05-12", status:"active",       technician:"Sarah M." },
  { id:"vp-15", vin:"ME92ZPSFB1J001590", customer:"Samuel Odhiambo",       partner:"watu",    region:"nbo",      storeCode:"ke-nbo-kbn", orderedDate:"2026-05-08", deliveredDate:"2026-05-23", commissionedDate:"2026-05-28", activatedDate:"2026-05-30", status:"active",       technician:"James K." },
  { id:"vp-16", vin:"ME92ZPSEB1J001448", customer:"Faith Chebet",          partner:"captive", region:"nanyuki",  storeCode:"ke-nan-004", orderedDate:"2026-06-01", deliveredDate:"2026-06-16", commissionedDate:"2026-06-21", status:"commissioned", technician:"Peter O." },
  { id:"vp-17", vin:"ME92ZPSFB1J001423", customer:"Brian Otieno",          partner:"fortune", region:"nbo",      storeCode:"ke-nbo-ksr", orderedDate:"2026-06-15", deliveredDate:"2026-06-30", status:"delivered",    technician:"Alice W." },
  { id:"vp-18", vin:"ME92ZPSEB1J001388", customer:"Margaret Waweru",       partner:"mkopa",   region:"naromoru", storeCode:"ke-nar-003", orderedDate:"2026-07-01", deliveredDate:"2026-07-16", status:"delivered",    technician:"James K." },
  { id:"vp-19", vin:"ME92ZPSFB1J001344", customer:"Kevin Njoroge",         partner:"watu",    region:"nyeri",    storeCode:"ke-nyr-003", orderedDate:"2026-07-10", status:"ordered" },
  { id:"vp-20", vin:"ME92ZPSEB1J001301", customer:"Irene Muthoni",         partner:"gw",      region:"nbo",      storeCode:"ke-nbo-wst", orderedDate:"2026-07-15", status:"on_hold",  notes:"Finance approval pending" },
];

const STATUS_META: Record<VehicleProvRecord["status"], { label: string; badge: string }> = {
  ordered:       { label: "Ordered",       badge: "bg-amber-50 text-amber-700" },
  delivered:     { label: "Delivered",     badge: "bg-blue-50 text-blue-700" },
  commissioned:  { label: "Commissioned",  badge: "bg-purple-50 text-purple-700" },
  active:        { label: "Active",        badge: "bg-emerald-50 text-emerald-700" },
  on_hold:       { label: "On Hold",       badge: "bg-slate-100 text-slate-500" },
};

const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", naromoru: "Naro Moru", nyeri: "Nyeri" };

function fmtDate(d?: string) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── Wizard (preserved from original) ────────────────────────────────────────

const STEPS = ["Basic Info", "Serials & IDs", "Assignment", "Review"];
const PARTNERS = ["gw", "mkopa", "watu", "captive", "fortune", "4g", "cash", "zeno", "hustle"];

const INIT = {
  vin: "", plate: "", dateOfSale: "", partner: "", storeCode: "",
  imei: "", vcuSerial: "", evccSerial: "", zeConnectSerial: "", motorSerial: "",
  region: "", tenant: "", initialStatus: "provisioning", notes: "",
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
      <span className="text-sm text-slate-700 font-medium">{value || "–"}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ProvisionVehiclePage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "wizard">("list");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INIT });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => RECORDS.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.vin.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.partner.includes(q);
    }
    return true;
  }), [search, statusFilter]);

  const set = (k: keyof typeof INIT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setDone(true); }, 1000);
  };

  const resetWizard = () => { setForm({ ...INIT }); setStep(0); setDone(false); setView("list"); };

  const thisMonth = RECORDS.filter(r => r.orderedDate.startsWith("2026-07")).length;
  const activeCount = RECORDS.filter(r => r.status === "active").length;
  const pendingCount = RECORDS.filter(r => r.status === "delivered" || r.status === "commissioned").length;

  // ── Success state ────────────────────────────────────────────────────────
  if (done) {
    return (
      <AdminGuard>
        <Topbar title="Vehicle Provisioning" />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>Successfully Provisioned!</h2>
            <p className="text-sm text-slate-500 mb-6">Vehicle has been added to the fleet.</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-1">
              <ReviewRow label="VIN" value={form.vin} />
              <ReviewRow label="Plate" value={form.plate} />
              <ReviewRow label="Partner" value={form.partner} />
              <ReviewRow label="Status" value={form.initialStatus} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setForm({ ...INIT }); setStep(0); setDone(false); }}>Provision Another</Button>
              <Button className="flex-1" onClick={resetWizard}>View All Records</Button>
            </div>
          </div>
        </main>
      </AdminGuard>
    );
  }

  // ── Wizard view ──────────────────────────────────────────────────────────
  if (view === "wizard") {
    return (
      <AdminGuard>
        <Topbar
          title="Vehicle Provisioning"
          actions={
            <Button variant="ghost-dark" size="sm" onClick={() => setView("list")}>
              <ArrowLeft className="w-4 h-4" /> Back to Records
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
          <div className="max-w-xl mx-auto">
            <StepIndicator steps={STEPS} current={step} />
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Basic Info</h3>
                  <Field label="VIN" required><input value={form.vin} onChange={set("vin")} placeholder="ME92ZPSFB1J00XXXX" className={fieldCls} /></Field>
                  <Field label="Registration Plate" required><input value={form.plate} onChange={set("plate")} placeholder="KMHB123A" className={fieldCls} /></Field>
                  <Field label="Date of Sale"><input type="date" value={form.dateOfSale} onChange={set("dateOfSale")} className={fieldCls} /></Field>
                  <Field label="Partner">
                    <select value={form.partner} onChange={set("partner")} className={selectCls}>
                      <option value="">Select partner…</option>
                      {PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Store Code"><input value={form.storeCode} onChange={set("storeCode")} placeholder="ke-nbo-zhq" className={fieldCls} /></Field>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Serials & IDs</h3>
                  <Field label="IMEI" required><input value={form.imei} onChange={set("imei")} placeholder="860300087XXXXXXX" maxLength={15} className={fieldCls} /></Field>
                  <Field label="VCU Serial"><input value={form.vcuSerial} onChange={set("vcuSerial")} placeholder="ZVU-2026-XXXX" className={fieldCls} /></Field>
                  <Field label="EVCC Serial"><input value={form.evccSerial} onChange={set("evccSerial")} placeholder="ZEC-2026-XXXX" className={fieldCls} /></Field>
                  <Field label="ZeConnect Serial"><input value={form.zeConnectSerial} onChange={set("zeConnectSerial")} placeholder="ZZC-2026-XXXX" className={fieldCls} /></Field>
                  <Field label="Motor Serial"><input value={form.motorSerial} onChange={set("motorSerial")} placeholder="ZMT-2026-XXXX" className={fieldCls} /></Field>
                  <Field label="Chassis No">
                    <input value={form.vin ? `CHF-${form.vin.slice(-6)}` : ""} readOnly className={fieldCls + " bg-slate-50 text-slate-400 cursor-default"} />
                    <p className="text-[11px] text-slate-400 mt-1">Auto-derived from VIN</p>
                  </Field>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Assignment</h3>
                  <Field label="Region">
                    <select value={form.region} onChange={set("region")} className={selectCls}>
                      <option value="">Select region…</option>
                      <option value="nbo">Nairobi (NBO)</option>
                      <option value="nanyuki">Nanyuki</option>
                      <option value="naromoru">Naro Moru</option>
                      <option value="nyeri">Nyeri</option>
                    </select>
                  </Field>
                  <Field label="Tenant"><input value={form.tenant} onChange={set("tenant")} placeholder="retail/tireproz" className={fieldCls} /></Field>
                  <Field label="Initial Status">
                    <select value={form.initialStatus} onChange={set("initialStatus")} className={selectCls}>
                      <option value="provisioning">Provisioning</option>
                      <option value="active">Active</option>
                    </select>
                  </Field>
                  <Field label="Notes"><textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Optional notes…" className={fieldCls + " resize-none"} /></Field>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Review & Confirm</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Basic Info</p>
                      <ReviewRow label="VIN" value={form.vin} />
                      <ReviewRow label="Plate" value={form.plate} />
                      <ReviewRow label="Date of Sale" value={form.dateOfSale} />
                      <ReviewRow label="Partner" value={form.partner} />
                      <ReviewRow label="Store Code" value={form.storeCode} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignment</p>
                      <ReviewRow label="Region" value={form.region} />
                      <ReviewRow label="Tenant" value={form.tenant} />
                      <ReviewRow label="Status" value={form.initialStatus} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">Serials</p>
                      <ReviewRow label="IMEI" value={form.imei} />
                      <ReviewRow label="VCU" value={form.vcuSerial} />
                      <ReviewRow label="EVCC" value={form.evccSerial} />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                {step < 3 && <Button className="ml-auto" onClick={() => setStep(s => s + 1)}>Next</Button>}
                {step === 3 && (
                  <Button className="ml-auto" onClick={handleSubmit} loading={submitting} disabled={submitting}>
                    {submitting ? "Provisioning…" : "Provision Vehicle"}
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
    { title: "Vehicles Provisioned", snapshotValue: RECORDS.length, snapshotLabel: "total in system", snapshotSource: "Vehicle Provisioning" },
    { title: "Active in Fleet", snapshotValue: activeCount, snapshotLabel: "fully commissioned", snapshotSource: "Vehicle Provisioning" },
    { title: "Pending Steps", snapshotValue: pendingCount, snapshotLabel: "awaiting completion", snapshotSource: "Vehicle Provisioning" },
    { title: "Ordered This Month", snapshotValue: thisMonth, snapshotLabel: "Jul 2026 orders", snapshotSource: "Vehicle Provisioning" },
  ];

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <Topbar
        title="Vehicle Provisioning"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost-dark" size="sm" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" onClick={() => setView("wizard")}>
              <Plus className="w-4 h-4" /> Provision New Vehicle
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Provisioned"  value={RECORDS.length} />
          <StatCard label="Active in Fleet"    value={activeCount}  valueColor="text-emerald-600" />
          <StatCard label="Pending Steps"      value={pendingCount} valueColor="text-amber-600" />
          <StatCard label="Ordered This Month" value={thisMonth}    valueColor="text-zeno-teal" />
        </StatGrid>

        {/* Live Operations */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Operations</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Batch Onboarding #47, 5 vehicles", progress: 72, done: false },
              { label: "Firmware Push v2.3.1", progress: 45, done: false },
              { label: "QC Inspection Run, Nairobi", progress: 100, done: true },
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

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search VIN, customer, partner…"
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
          <span className="ml-auto text-xs text-slate-400">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["VIN","Customer","Partner","Region","Ordered","Delivered","Commissioned","Activated","Status","Technician"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">No records match your filters</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">{r.vin}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{r.customer}</td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{r.partner}</td>
                    <td className="px-3 py-2.5 text-slate-500">{REGION_LABELS[r.region]}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.orderedDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.deliveredDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.commissionedDate)}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.activatedDate)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", STATUS_META[r.status].badge)}>
                        {STATUS_META[r.status].label}
                      </span>
                      {r.notes && <div className="text-[10px] text-slate-400 mt-0.5">{r.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{r.technician ?? "–"}</td>
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
