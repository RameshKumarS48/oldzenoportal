"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ArrowLeft, CheckCircle, PlusSquare } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { useBatteriesStore } from "@/store/batteries";
import type { Battery, BatteryStatus } from "@/store/batteries";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { AddToDashboardModal } from "@/components/widgets/AddToDashboardModal";

// Bring-up checklist step counts by status
const STEPS_BY_STATUS: Record<BatteryStatus, number> = {
  pre_bringup:      0,
  pd_testing:       2,
  deployment_ready: 6,
  active_network:   6,
  quarantine:       0,
  retired:          0,
};

const STATUS_META: Record<BatteryStatus, { label: string; badge: string }> = {
  pre_bringup:      { label: "Pre Bring-up",     badge: "bg-slate-100 text-slate-600" },
  deployment_ready: { label: "Deployment Ready", badge: "bg-blue-50 text-blue-700" },
  active_network:   { label: "Active Network",   badge: "bg-emerald-50 text-emerald-700" },
  pd_testing:       { label: "PD Testing",       badge: "bg-yellow-50 text-yellow-700" },
  quarantine:       { label: "Quarantine",       badge: "bg-red-50 text-red-600" },
  retired:          { label: "Retired",          badge: "bg-slate-100 text-slate-400" },
};

const CHECKLIST_ITEMS = [
  "Battery Powered On",
  "SCUD Connected",
  "Firmware Verified",
  "Firmware Updated (if required)",
  "Cycler Test Passed",
  "Visual Inspection Passed",
];

function StepsProgress({ status }: { status: BatteryStatus }) {
  if (status === "quarantine") return <span className="text-xs text-red-500">Quarantined</span>;
  if (status === "retired")    return <span className="text-xs text-slate-400">Retired</span>;
  const done = STEPS_BY_STATUS[status];
  const total = 6;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", done === total ? "bg-emerald-500" : done > 0 ? "bg-amber-400" : "bg-slate-200")}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <span className="text-[11px] text-slate-500 tabular-nums">{done} / {total}</span>
      {done === total && <span className="text-emerald-600 text-[10px]">✓</span>}
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── Wizard ───────────────────────────────────────────────────────────────────

const WIZ_STEPS = ["Receive", "Bring-up", "Assignment", "Review"];
const PARTNERS = ["gw", "mkopa", "watu", "captive", "fortune", "4g", "cash", "zeno", "hustle"];

const today = new Date().toISOString().slice(0, 10);
const INIT = {
  shipmentNumber: "", serial: "", warehouse: "Babadogo", dateReceived: today, receiveNotes: "",
  firmwareVersion: "",
  checks: [false, false, false, false, false, false] as boolean[],
  partner: "", initialStatus: "deployment_ready", quarantineReason: "", technician: "", assignNotes: "",
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

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProvisionBatteryPage() {
  const { batteries } = useBatteriesStore();
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "wizard">("list");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INIT, checks: [...INIT.checks] });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatteryStatus | "">("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const filtered = useMemo(() => batteries.filter(b => {
    if (statusFilter    && b.status    !== statusFilter)    return false;
    if (warehouseFilter && b.warehouse !== warehouseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.serial.toLowerCase().includes(q) || b.shipmentNumber.toLowerCase().includes(q);
    }
    return true;
  }), [batteries, search, statusFilter, warehouseFilter]);

  const set = (k: keyof Omit<typeof INIT, "checks">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleCheck = (i: number) =>
    setForm(f => { const checks = [...f.checks]; checks[i] = !checks[i]; return { ...f, checks }; });

  const checkedCount = form.checks.filter(Boolean).length;
  const allChecked = checkedCount === 6;

  const handleSubmit = () => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setDone(true); }, 1000); };
  const resetWizard = () => { setForm({ ...INIT, checks: [...INIT.checks] }); setStep(0); setDone(false); setView("list"); };

  const deploymentReady = batteries.filter(b => b.status === "deployment_ready").length;
  const activeNetwork = batteries.filter(b => b.status === "active_network").length;
  const issues = batteries.filter(b => b.status === "quarantine" || b.status === "retired").length;

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <AdminGuard>
        <Topbar title="Battery Provisioning" />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>Successfully Provisioned!</h2>
            <p className="text-sm text-slate-500 mb-6">Battery has been registered in the inventory.</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-1">
              <ReviewRow label="Serial" value={form.serial} />
              <ReviewRow label="Shipment" value={form.shipmentNumber} />
              <ReviewRow label="Warehouse" value={form.warehouse} />
              <ReviewRow label="Status" value={form.initialStatus === "deployment_ready" ? "Deployment Ready" : "Quarantine"} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setForm({ ...INIT, checks: [...INIT.checks] }); setStep(0); setDone(false); }}>Provision Another</Button>
              <Button className="flex-1" onClick={resetWizard}>View All Records</Button>
            </div>
          </div>
        </main>
      </AdminGuard>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  if (view === "wizard") {
    return (
      <AdminGuard>
        <Topbar
          title="Battery Provisioning"
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
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Receive Battery</h3>
                  <Field label="Shipment Number" required><input value={form.shipmentNumber} onChange={set("shipmentNumber")} placeholder="SHP-2026-XXX" className={fieldCls} /></Field>
                  <Field label="Battery Serial" required><input value={form.serial} onChange={set("serial")} placeholder="ZBT-2026-XXXX" className={fieldCls} /></Field>
                  <Field label="Warehouse">
                    <select value={form.warehouse} onChange={set("warehouse")} className={selectCls}>
                      <option value="Babadogo">Babadogo</option>
                      <option value="Ruaraka">Ruaraka</option>
                    </select>
                  </Field>
                  <Field label="Date Received"><input type="date" value={form.dateReceived} onChange={set("dateReceived")} className={fieldCls} /></Field>
                  <Field label="Notes"><textarea value={form.receiveNotes} onChange={set("receiveNotes")} rows={2} placeholder="Optional notes…" className={fieldCls + " resize-none"} /></Field>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Bring-up Checklist</h3>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{checkedCount} / 6 checks complete</span>
                      {allChecked && <span className="text-emerald-600 font-semibold">All passed ✓</span>}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#003B49] rounded-full transition-all" style={{ width: `${(checkedCount / 6) * 100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item, i) => (
                      <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={form.checks[i]} onChange={() => toggleCheck(i)} className="w-4 h-4 accent-[#003B49] rounded" />
                        <span className={cn("text-sm", form.checks[i] ? "text-slate-700 line-through opacity-60" : "text-slate-700")}>{item}</span>
                      </label>
                    ))}
                  </div>
                  <Field label="Firmware Version">
                    <input value={form.firmwareVersion} onChange={set("firmwareVersion")} placeholder="2.1.4" className={fieldCls} />
                  </Field>
                  {!allChecked && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                      Complete all checks to mark as Deployment Ready, or move to Quarantine if a check fails.
                    </div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Assignment</h3>
                  <Field label="Partner">
                    <select value={form.partner} onChange={set("partner")} className={selectCls}>
                      <option value="">Select partner…</option>
                      {PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Initial Status">
                    <select value={form.initialStatus} onChange={set("initialStatus")} className={selectCls}>
                      <option value="deployment_ready">Deployment Ready</option>
                      <option value="quarantine">Quarantine</option>
                    </select>
                  </Field>
                  {form.initialStatus === "quarantine" && (
                    <Field label="Quarantine Reason" required>
                      <select value={form.quarantineReason} onChange={set("quarantineReason")} className={selectCls}>
                        <option value="">Select reason…</option>
                        <option value="Capacity Failure">Capacity Failure</option>
                        <option value="Firmware Failure">Firmware Failure</option>
                        <option value="Physical Damage">Physical Damage</option>
                        <option value="Safety Issue">Safety Issue</option>
                        <option value="Communication Failure">Communication Failure</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Technician"><input value={form.technician} onChange={set("technician")} placeholder="Technician name" className={fieldCls} /></Field>
                  <Field label="Notes"><textarea value={form.assignNotes} onChange={set("assignNotes")} rows={2} placeholder="Optional notes…" className={fieldCls + " resize-none"} /></Field>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-4" style={{ fontFamily: "var(--font-display)" }}>Review & Confirm</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Receipt</p>
                  <ReviewRow label="Serial" value={form.serial} />
                  <ReviewRow label="Shipment" value={form.shipmentNumber} />
                  <ReviewRow label="Warehouse" value={form.warehouse} />
                  <ReviewRow label="Date Received" value={form.dateReceived} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">Bring-up</p>
                  <ReviewRow label="Checks Passed" value={`${checkedCount} / 6`} />
                  <ReviewRow label="Firmware" value={form.firmwareVersion} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">Assignment</p>
                  <ReviewRow label="Partner" value={form.partner} />
                  <ReviewRow label="Status" value={form.initialStatus === "deployment_ready" ? "Deployment Ready" : "Quarantine"} />
                  {form.initialStatus === "quarantine" && <ReviewRow label="Quarantine Reason" value={form.quarantineReason} />}
                  <ReviewRow label="Technician" value={form.technician} />
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                {step === 1 && !allChecked && (
                  <Button variant="danger" className="ml-auto" onClick={() => { setForm(f => ({ ...f, initialStatus: "quarantine" })); setStep(2); }}>
                    Move to Quarantine
                  </Button>
                )}
                {step < 3 && (step !== 1 || allChecked) && (
                  <Button className="ml-auto" onClick={() => setStep(s => s + 1)}>
                    {step === 1 ? "Complete Bring-up" : "Next"}
                  </Button>
                )}
                {step === 3 && (
                  <Button className="ml-auto" onClick={handleSubmit} loading={submitting} disabled={submitting}>
                    {submitting ? "Registering…" : "Register Battery"}
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
    { title: "Total Batteries", snapshotValue: batteries.length, snapshotLabel: "in inventory", snapshotSource: "Battery Provisioning" },
    { title: "Deployment Ready", snapshotValue: deploymentReady, snapshotLabel: "ready to deploy", snapshotSource: "Battery Provisioning" },
    { title: "Active Network", snapshotValue: activeNetwork, snapshotLabel: "live in network", snapshotSource: "Battery Provisioning" },
    { title: "Issues", snapshotValue: issues, snapshotLabel: "quarantine / retired", snapshotSource: "Battery Provisioning" },
  ];

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <Topbar
        title="Battery Provisioning"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost-dark" size="sm" onClick={() => setWidgetModalOpen(true)}>
              <PlusSquare className="w-4 h-4" /> Add Widget
            </Button>
            <Button size="sm" onClick={() => setView("wizard")}>
              <Plus className="w-4 h-4" /> Provision New Battery
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">

        <StatGrid>
          <StatCard label="Total"                value={batteries.length} />
          <StatCard label="Deployment Ready"     value={deploymentReady}  valueColor="text-blue-600" />
          <StatCard label="Active Network"       value={activeNetwork}    valueColor="text-emerald-600" />
          <StatCard label="Quarantine / Retired" value={issues}           valueColor={issues > 0 ? "text-red-500" : "text-slate-400"} />
        </StatGrid>

        {/* Live Operations */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Operations</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Bring-up Batch SHP-2026-047 (12 units)", progress: 58, done: false },
              { label: "Cycler Test Run, Babadogo", progress: 83, done: false },
              { label: "Shipment SHP-2026-041 Received", progress: 100, done: true },
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
              placeholder="Search serial or shipment…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as BatteryStatus | "")}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Status</option>
            {(Object.keys(STATUS_META) as BatteryStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600">
            <option value="">All Warehouses</option>
            <option value="Babadogo">Babadogo</option>
            <option value="Ruaraka">Ruaraka</option>
          </select>
          {(search || statusFilter || warehouseFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setWarehouseFilter(""); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} records</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Serial","Warehouse","Shipment","Received","Status","Bring-up Progress","Firmware","Technician","Repairs"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No batteries match your filters</td></tr>
                )}
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-700">{b.serial}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b.warehouse}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{b.shipmentNumber}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(b.dateReceived)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", STATUS_META[b.status].badge)}>
                        {STATUS_META[b.status].label}
                      </span>
                      {b.quarantineReason && <div className="text-[10px] text-red-400 mt-0.5">{b.quarantineReason}</div>}
                      {b.retireReason    && <div className="text-[10px] text-slate-400 mt-0.5">{b.retireReason}</div>}
                    </td>
                    <td className="px-3 py-2.5"><StepsProgress status={b.status} /></td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{b.firmwareVersion}</td>
                    <td className="px-3 py-2.5 text-slate-500">{b.technician ?? "–"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {b.repairCount > 0
                        ? <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-semibold text-[10px]">{b.repairCount}</span>
                        : <span className="text-slate-300">–</span>
                      }
                    </td>
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
