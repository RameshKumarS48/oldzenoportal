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

interface StationProvRecord {
  id: string;
  name: string;
  location: string;
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
  partner: string;
  plannedDate: string;
  surveyDate?: string;
  installDate?: string;
  wiringDate?: string;
  powerOnDate?: string;
  commissionDate?: string;
  liveDate?: string;
  status: "planned" | "site_survey" | "installed" | "wiring_done" | "powered_on" | "commissioned" | "live";
  installType: "three_phase" | "single_phase";
  capacity: number;
  technician?: string;
  notes?: string;
}

const STATION_RECORDS: StationProvRecord[] = [
  { id:"sp-01", name:"Zeno Hub — Kasarani",      location:"Kasarani, Nairobi",       region:"nbo",      partner:"zeno",    plannedDate:"2024-08-01", surveyDate:"2024-08-10", installDate:"2024-09-01", wiringDate:"2024-09-12", powerOnDate:"2024-09-15", commissionDate:"2024-09-20", liveDate:"2024-09-22", status:"live",        installType:"three_phase", capacity:8,  technician:"James K." },
  { id:"sp-02", name:"Zeno Hub — Githurai",      location:"Githurai 44, Nairobi",    region:"nbo",      partner:"zeno",    plannedDate:"2024-09-05", surveyDate:"2024-09-15", installDate:"2024-10-10", wiringDate:"2024-10-20", powerOnDate:"2024-10-24", commissionDate:"2024-10-28", liveDate:"2024-11-01", status:"live",        installType:"three_phase", capacity:8,  technician:"Sarah M." },
  { id:"sp-03", name:"Watu Hub — Roysambu",      location:"Roysambu, Nairobi",       region:"nbo",      partner:"watu",    plannedDate:"2024-10-01", surveyDate:"2024-10-10", installDate:"2024-11-05", wiringDate:"2024-11-15", powerOnDate:"2024-11-18", commissionDate:"2024-11-22", liveDate:"2024-11-25", status:"live",        installType:"three_phase", capacity:12, technician:"Peter O." },
  { id:"sp-04", name:"MKopa Hub — Kahawa West",  location:"Kahawa West, Nairobi",    region:"nbo",      partner:"mkopa",   plannedDate:"2024-11-01", surveyDate:"2024-11-12", installDate:"2024-12-08", wiringDate:"2024-12-16", powerOnDate:"2024-12-19", commissionDate:"2024-12-22", liveDate:"2024-12-24", status:"live",        installType:"three_phase", capacity:8,  technician:"Alice W." },
  { id:"sp-05", name:"Zeno Hub — Ruiru",         location:"Ruiru Town, Kiambu",      region:"nbo",      partner:"zeno",    plannedDate:"2025-01-10", surveyDate:"2025-01-20", installDate:"2025-02-15", wiringDate:"2025-02-22", powerOnDate:"2025-02-25", commissionDate:"2025-03-01", liveDate:"2025-03-04", status:"live",        installType:"single_phase",capacity:6,  technician:"James K." },
  { id:"sp-06", name:"GW Hub — Westlands",       location:"Westlands, Nairobi",      region:"nbo",      partner:"gw",      plannedDate:"2025-02-01", surveyDate:"2025-02-12", installDate:"2025-03-10", wiringDate:"2025-03-18", powerOnDate:"2025-03-20", commissionDate:"2025-03-24", liveDate:"2025-03-26", status:"live",        installType:"three_phase", capacity:10, technician:"Sarah M." },
  { id:"sp-07", name:"Zeno Hub — Nanyuki Town",  location:"Nanyuki Town Centre",     region:"nanyuki",  partner:"zeno",    plannedDate:"2025-03-15", surveyDate:"2025-03-25", installDate:"2025-04-20", wiringDate:"2025-04-28", powerOnDate:"2025-05-02", commissionDate:"2025-05-06", liveDate:"2025-05-10", status:"live",        installType:"three_phase", capacity:8,  technician:"Peter O." },
  { id:"sp-08", name:"Watu Hub — Nanyuki South", location:"Nanyuki South, Laikipia", region:"nanyuki",  partner:"watu",    plannedDate:"2025-06-01", surveyDate:"2025-06-12", installDate:"2025-07-08", wiringDate:"2025-07-15", powerOnDate:"2025-07-18", commissionDate:"2025-07-22", liveDate:"2025-07-25", status:"live",        installType:"single_phase",capacity:6,  technician:"Alice W." },
  { id:"sp-09", name:"Zeno Hub — Naro Moru",     location:"Naro Moru, Nyeri County", region:"naromoru", partner:"zeno",    plannedDate:"2025-07-01", surveyDate:"2025-07-10", installDate:"2025-08-05", wiringDate:"2025-08-12", powerOnDate:"2025-08-15", commissionDate:"2025-08-19", liveDate:"2025-08-22", status:"live",        installType:"three_phase", capacity:8,  technician:"James K." },
  { id:"sp-10", name:"GW Hub — Nyeri Central",   location:"Nyeri Town, Nyeri County",region:"nyeri",    partner:"gw",      plannedDate:"2025-09-01", surveyDate:"2025-09-12", installDate:"2025-10-08", wiringDate:"2025-10-16", powerOnDate:"2025-10-19", commissionDate:"2025-10-23", liveDate:"2025-10-26", status:"live",        installType:"three_phase", capacity:8,  technician:"Sarah M." },
  { id:"sp-11", name:"MKopa Hub — Nyeri South",  location:"Karatina, Nyeri County",  region:"nyeri",    partner:"mkopa",   plannedDate:"2025-11-01", surveyDate:"2025-11-12", installDate:"2025-12-05", wiringDate:"2025-12-13", powerOnDate:"2025-12-16", commissionDate:"2025-12-20", liveDate:"2025-12-22", status:"live",        installType:"single_phase",capacity:6,  technician:"Peter O." },
  { id:"sp-12", name:"Zeno Hub — Kenyatta Ave",  location:"Kenyatta Ave, Nairobi CBD",region:"nbo",     partner:"zeno",    plannedDate:"2026-03-01", surveyDate:"2026-03-15", installDate:"2026-04-12", wiringDate:"2026-04-20", powerOnDate:"2026-04-23", commissionDate:"2026-04-28", liveDate:"2026-05-01", status:"live",        installType:"three_phase", capacity:12, technician:"Alice W." },
  { id:"sp-13", name:"Watu Hub — Langata",       location:"Langata Road, Nairobi",   region:"nbo",      partner:"watu",    plannedDate:"2026-05-10", surveyDate:"2026-05-22", installDate:"2026-06-18", wiringDate:"2026-06-25", powerOnDate:"2026-06-28", commissionDate:"2026-07-02", status:"commissioned", installType:"three_phase", capacity:8,  technician:"James K." },
  { id:"sp-14", name:"GW Hub — Embakasi",        location:"Embakasi, Nairobi",       region:"nbo",      partner:"gw",      plannedDate:"2026-06-01", surveyDate:"2026-06-14", installDate:"2026-07-10", wiringDate:"2026-07-18", powerOnDate:"2026-07-22", status:"powered_on", installType:"three_phase", capacity:10, technician:"Sarah M." },
  { id:"sp-15", name:"Zeno Hub — Isiolo Rd",     location:"Isiolo Rd, Nanyuki",      region:"nanyuki",  partner:"zeno",    plannedDate:"2026-07-01", status:"planned", installType:"three_phase", capacity:8 },
];

const STATUS_META: Record<StationProvRecord["status"], { label: string; badge: string; step: number }> = {
  planned:     { label: "Planned",     badge: "bg-slate-100 text-slate-500", step: 0 },
  site_survey: { label: "Site Survey", badge: "bg-amber-50 text-amber-700",  step: 1 },
  installed:   { label: "Installed",   badge: "bg-blue-50 text-blue-700",    step: 2 },
  wiring_done: { label: "Wiring Done", badge: "bg-purple-50 text-purple-700",step: 3 },
  powered_on:  { label: "Powered On",  badge: "bg-orange-50 text-orange-700",step: 4 },
  commissioned:{ label: "Commissioned",badge: "bg-cyan-50 text-cyan-700",    step: 5 },
  live:        { label: "Live",        badge: "bg-emerald-50 text-emerald-700",step: 6 },
};

const TOTAL_STEPS = 6;

const REGION_LABELS: Record<string, string> = { nbo: "NBO", nanyuki: "Nanyuki", naromoru: "Naro Moru", nyeri: "Nyeri" };

function CommissionProgress({ status }: { status: StationProvRecord["status"] }) {
  const step = STATUS_META[status].step;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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

const WIZ_STEPS = ["Station Details", "Hardware", "Review"];
const PARTNERS_LIST = ["gw", "mkopa", "watu", "captive", "fortune", "4g", "cash", "zeno", "hustle"];

const INIT = {
  name: "", location: "", region: "", rentKes: "0", startDate: "", partner: "",
  installType: "three_phase", batteriesInstalled: "8", batteriesAvailable: "8", rating: "M", hwNotes: "",
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

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
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

export default function ProvisionSwapStationPage() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "wizard">("list");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INIT });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => STATION_RECORDS.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.partner.includes(q);
    }
    return true;
  }), [search, statusFilter]);

  const set = (k: keyof typeof INIT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setDone(true); }, 1000); };
  const resetWizard = () => { setForm({ ...INIT }); setStep(0); setDone(false); setView("list"); };

  const liveCount = STATION_RECORDS.filter(r => r.status === "live").length;
  const inProgressCount = STATION_RECORDS.filter(r => r.status !== "live" && r.status !== "planned").length;
  const plannedCount = STATION_RECORDS.filter(r => r.status === "planned").length;

  if (done) {
    return (
      <AdminGuard>
        <Topbar title="Swap Station Provisioning" />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>Successfully Added!</h2>
            <p className="text-sm text-slate-500 mb-6">Swap station has been registered.</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-1">
              <ReviewRow label="Station Name" value={form.name} />
              <ReviewRow label="Location" value={form.location} />
              <ReviewRow label="Batteries" value={`${form.batteriesInstalled} installed`} />
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
          title="Swap Station Provisioning"
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
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Station Details</h3>
                  <Field label="Station Name" required><input value={form.name} onChange={set("name")} placeholder="e.g. Kasarani Hub — Nairobi" className={fieldCls} /></Field>
                  <Field label="Location / Address" required><input value={form.location} onChange={set("location")} placeholder="e.g. Kasarani, Nairobi" className={fieldCls} /></Field>
                  <Field label="Region">
                    <select value={form.region} onChange={set("region")} className={selectCls}>
                      <option value="">Select region…</option>
                      <option value="nbo">Nairobi (NBO)</option>
                      <option value="nanyuki">Nanyuki</option>
                      <option value="naromoru">Naro Moru</option>
                      <option value="nyeri">Nyeri</option>
                    </select>
                  </Field>
                  <Field label="Rent (KES/month)" hint="Enter 0 for Zeno-owned stations">
                    <input type="number" min="0" value={form.rentKes} onChange={set("rentKes")} className={fieldCls} />
                  </Field>
                  <Field label="Start Date"><input type="date" value={form.startDate} onChange={set("startDate")} className={fieldCls} /></Field>
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
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Hardware</h3>
                  <Field label="Install Type">
                    <select value={form.installType} onChange={set("installType")} className={selectCls}>
                      <option value="single_phase">Single Phase</option>
                      <option value="three_phase">Three Phase</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Batteries Installed">
                      <input type="number" min="0" max="12" value={form.batteriesInstalled} onChange={set("batteriesInstalled")} className={fieldCls} />
                    </Field>
                    <Field label="Batteries Available" hint="Must be ≤ Installed">
                      <input type="number" min="0" max={form.batteriesInstalled} value={form.batteriesAvailable} onChange={set("batteriesAvailable")} className={fieldCls} />
                    </Field>
                  </div>
                  <Field label="Rating">
                    <select value={form.rating} onChange={set("rating")} className={selectCls}>
                      <option value="H">H — High utilisation</option>
                      <option value="M">M — Medium utilisation</option>
                      <option value="L">L — Low utilisation</option>
                    </select>
                  </Field>
                  <Field label="Notes"><textarea value={form.hwNotes} onChange={set("hwNotes")} rows={2} placeholder="Optional notes…" className={fieldCls + " resize-none"} /></Field>
                </div>
              )}
              {step === 2 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Review & Confirm</h3>
                  <ReviewRow label="Station Name" value={form.name} />
                  <ReviewRow label="Location" value={form.location} />
                  <ReviewRow label="Region" value={form.region} />
                  <ReviewRow label="Rent KES/mo" value={form.rentKes === "0" ? "Zeno-owned" : `KES ${Number(form.rentKes).toLocaleString()}`} />
                  <ReviewRow label="Start Date" value={form.startDate} />
                  <ReviewRow label="Partner" value={form.partner || "None"} />
                  <ReviewRow label="Install Type" value={form.installType === "three_phase" ? "Three Phase" : "Single Phase"} />
                  <ReviewRow label="Batteries Installed" value={form.batteriesInstalled} />
                  <ReviewRow label="Rating" value={form.rating} />
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                {step < 2 && <Button className="ml-auto" onClick={() => setStep(s => s + 1)}>Next</Button>}
                {step === 2 && (
                  <Button className="ml-auto" onClick={handleSubmit} loading={submitting} disabled={submitting}>
                    {submitting ? "Adding…" : "Add Station"}
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
    { title: "Total Stations", snapshotValue: STATION_RECORDS.length, snapshotLabel: "in system", snapshotSource: "Swap Station Provisioning" },
    { title: "Live Stations", snapshotValue: liveCount, snapshotLabel: "fully operational", snapshotSource: "Swap Station Provisioning" },
    { title: "In Progress", snapshotValue: inProgressCount, snapshotLabel: "commissioning", snapshotSource: "Swap Station Provisioning" },
    { title: "Planned", snapshotValue: plannedCount, snapshotLabel: "sites planned", snapshotSource: "Swap Station Provisioning" },
  ];

  return (
    <AdminGuard>
      <Topbar
        title="Swap Station Provisioning"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost-dark" size="sm" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" onClick={() => setView("wizard")}>
              <Plus className="w-4 h-4" /> Add New Station
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total Stations" value={STATION_RECORDS.length} />
          <StatCard label="Live"           value={liveCount}       valueColor="text-emerald-600" />
          <StatCard label="In Progress"    value={inProgressCount} valueColor="text-amber-600" />
          <StatCard label="Planned"        value={plannedCount}    valueColor="text-zeno-teal" />
        </StatGrid>

        {/* Live Operations */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Operations</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Langata Hub Commissioning — Final Steps", progress: 88, done: false },
              { label: "Embakasi Hub Power-On & Wiring Checks", progress: 62, done: false },
              { label: "Kasarani Hub Firmware Upgrade v3.1", progress: 100, done: true },
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
          <span className="ml-auto text-xs text-slate-400">{filtered.length} stations</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Name","Location","Region","Partner","Type","Capacity","Status","Commission Progress","Live Since","Technician"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">No stations match your filters</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[160px] truncate">{r.location}</td>
                    <td className="px-3 py-2.5 text-slate-500">{REGION_LABELS[r.region]}</td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{r.partner}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.installType === "three_phase" ? "3-Phase" : "1-Phase"}</td>
                    <td className="px-3 py-2.5 text-slate-600 font-medium">{r.capacity}</td>
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
