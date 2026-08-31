"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronDown, ChevronUp, Info, CheckCircle2, XCircle,
  AlertTriangle, Ban, Bell, Unlock, RotateCcw, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useTamperingAlertsStore } from "@/store/tampering-alerts";
import type { TamperingAlert, ViolationType, AlertStatus } from "@/store/tampering-alerts";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

// ── Labels & styles ─────────────────────────────────────────────────────────

const VIOLATION_LABELS: Record<ViolationType, string> = {
  battery_mismatch:              "Battery Mismatch",
  unexpected_battery_movement:   "Unexpected Movement",
  swap_validation_failure:       "Validation Failure",
  twin_station_abuse:            "Twin-Station Abuse",
  suspected_tampering:           "Suspected Tampering",
};

const VIOLATION_COLORS: Record<ViolationType, string> = {
  battery_mismatch:              "bg-amber-50 text-amber-700",
  unexpected_battery_movement:   "bg-blue-50 text-blue-700",
  swap_validation_failure:       "bg-orange-50 text-orange-700",
  twin_station_abuse:            "bg-red-50 text-red-700",
  suspected_tampering:           "bg-rose-100 text-rose-800",
};

const STATUS_COLORS: Record<AlertStatus, string> = {
  pending:      "bg-amber-50 text-amber-700 border border-amber-200",
  approved:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected:     "bg-slate-100 text-slate-500 border border-slate-200",
  investigating:"bg-blue-50 text-blue-700 border border-blue-200",
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  pending:      "Pending",
  approved:     "Approved",
  rejected:     "Rejected",
  investigating:"Investigating",
};

const OFFENCE_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

function escalationText(offenceCount: number): { label: string; color: string } {
  if (offenceCount === 1) return { label: "1st offence — Warning only", color: "text-amber-600" };
  if (offenceCount === 2) return { label: "2nd offence — Repeat behaviour warning", color: "text-orange-600" };
  if (offenceCount === 3) return { label: "3rd offence — RFID will be auto-disabled", color: "text-red-600" };
  return { label: "4th+ offence — Escalated for review", color: "text-rose-700" };
}

function defaultPenalty(alert: TamperingAlert): number {
  return alert.isDoubleBill ? 560 : 280;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ── Escalation Reference Banner ─────────────────────────────────────────────

function EscalationBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#7c3aed]" />
          <span className="text-xs font-semibold text-slate-700">Escalation Policy Reference</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-left">
                {["Offence", "Financial Penalty", "Operational Action"].map((h) => (
                  <th key={h} className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { o: "1st", penalty: "Debit KES X (swap amount)", action: "Warning only" },
                { o: "2nd", penalty: "Debit KES X (swap amount)", action: "Second warning — repeated behaviour" },
                { o: "3rd", penalty: "Debit KES X (swap amount)", action: "RFID Tag Disabled — customer must contact Support" },
                { o: "4th+", penalty: "Debit KES X (swap amount)", action: "Escalated — review for blacklist / risk scoring" },
              ].map((row) => (
                <tr key={row.o}>
                  <td className="py-1.5 font-semibold text-slate-600 pr-8">{row.o}</td>
                  <td className="py-1.5 text-slate-600 pr-8">{row.penalty}</td>
                  <td className="py-1.5 text-slate-500">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-slate-400">
            Twin-station abuse: apply <strong>double bill</strong> (2× swap amount). RFID re-enable requires Support Agent action.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Audit Trail Row ──────────────────────────────────────────────────────────

function AuditTrail({ alert }: { alert: TamperingAlert }) {
  const events: { label: string; time?: string; note?: string; color: string }[] = [
    { label: "Alert detected", time: alert.detectedAt, note: alert.detectionReason, color: "bg-slate-400" },
    ...(alert.reviewedAt ? [{ label: `Status → ${STATUS_LABELS[alert.status]}`, time: alert.reviewedAt, note: alert.reviewNote, color: alert.status === "approved" ? "bg-emerald-500" : alert.status === "rejected" ? "bg-slate-400" : "bg-blue-500" }] : []),
    ...(alert.penaltyAppliedAt ? [{ label: `Penalty applied — KES ${alert.penaltyAmountKES?.toLocaleString()}`, time: alert.penaltyAppliedAt, color: "bg-[#FF3B06]" }] : []),
    ...(alert.notificationSentAt ? [{ label: "Customer notification sent", time: alert.notificationSentAt, color: "bg-teal-500" }] : []),
    ...(alert.rfidDisabledAt ? [{ label: "RFID tag disabled", time: alert.rfidDisabledAt, color: "bg-red-500" }] : []),
    ...(alert.rfidReenabledAt ? [{ label: "RFID tag re-enabled", time: alert.rfidReenabledAt, color: "bg-emerald-500" }] : []),
  ];

  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Audit Trail</p>
      <div className="space-y-3">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", ev.color)} />
              {i < events.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" style={{ minHeight: 12 }} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">{ev.label}</span>
                {ev.time && <span className="text-[10px] text-slate-400">{fmtDate(ev.time)}</span>}
              </div>
              {ev.note && <p className="text-[11px] text-slate-500 mt-0.5">{ev.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Approve Modal ────────────────────────────────────────────────────────────

function ApproveModal({
  alert, onClose, onConfirm,
}: {
  alert: TamperingAlert | null;
  onClose: () => void;
  onConfirm: (penaltyKES: number, note: string) => void;
}) {
  const [penalty, setPenalty] = useState<string>("");
  const [note, setNote] = useState("");

  const effectivePenalty = alert
    ? penalty === "" ? defaultPenalty(alert) : Number(penalty)
    : 0;

  if (!alert) return null;
  const esc = escalationText(alert.offenceCount);

  return (
    <Modal open title={`Approve Alert ${alert.id}`} onClose={onClose} className="max-w-lg">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer</span>
            <span className="font-medium text-slate-700">{alert.customerName} ({alert.customerId})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Violation</span>
            <span className="font-medium text-slate-700">{VIOLATION_LABELS[alert.violationType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Station</span>
            <span className="font-medium text-slate-700">{alert.swapStationName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Detected</span>
            <span className="font-medium text-slate-700">{fmtDate(alert.detectedAt)}</span>
          </div>
        </div>

        <div className={cn("text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50", esc.color)}>
          {esc.label}
          {alert.offenceCount >= 3 && (
            <span className="block font-normal text-red-500 mt-0.5">
              RFID tag will be automatically disabled on approval.
            </span>
          )}
        </div>

        {alert.isDoubleBill && (
          <div className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg font-medium">
            Twin-station abuse — double billing applies (2× swap amount).
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Penalty Amount (KES)
          </label>
          <input
            type="number"
            value={penalty === "" ? defaultPenalty(alert) : penalty}
            onChange={(e) => setPenalty(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Pre-filled: {alert.isDoubleBill ? "double bill (2× 280 KES)" : "standard swap amount (280 KES)"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Review Note (optional)</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context or observations…"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => { onConfirm(effectivePenalty, note); onClose(); }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Approve & Apply Debit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Simple Note Modal ────────────────────────────────────────────────────────

function NoteModal({
  open, title, label, confirmLabel, confirmClass, onClose, onConfirm,
}: {
  open: boolean; title: string; label: string; confirmLabel: string; confirmClass: string;
  onClose: () => void; onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal open={open} title={title} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] resize-none"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => { onConfirm(note); onClose(); }} className={cn("flex-1 text-white", confirmClass)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

export function TamperingAlertsView() {
  const user = useAuthStore((s) => s.user);
  const { alerts, approveAlert, rejectAlert, markInvestigating, sendNotification, toggleRfid, reopenAlert } =
    useTamperingAlertsStore();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [violationFilter, setViolFilter]  = useState("");
  const [offenceFilter, setOffenceFilter] = useState("");
  const [dateFilter, setDateFilter]       = useState("");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<TamperingAlert | null>(null);
  const [rejectTarget, setRejectTarget]   = useState<TamperingAlert | null>(null);
  const [investTarget, setInvestTarget]   = useState<TamperingAlert | null>(null);
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const cutoff =
      dateFilter === "today"  ? now - 86_400_000 :
      dateFilter === "7d"     ? now - 7 * 86_400_000 :
      dateFilter === "30d"    ? now - 30 * 86_400_000 : 0;

    return alerts.filter((a) => {
      if (statusFilter    && a.status          !== statusFilter)          return false;
      if (violationFilter && a.violationType   !== violationFilter)       return false;
      if (offenceFilter   && String(a.offenceCount) !== offenceFilter)    return false;
      if (cutoff          && new Date(a.detectedAt).getTime() < cutoff)   return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.id.toLowerCase().includes(q) ||
          a.customerName.toLowerCase().includes(q) ||
          a.customerId.toLowerCase().includes(q) ||
          a.vehicleId.toLowerCase().includes(q) ||
          a.swapStationName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, search, statusFilter, violationFilter, offenceFilter, dateFilter, now]);

  const pending        = alerts.filter((a) => a.status === "pending").length;
  const approvedWeek    = alerts.filter((a) => a.status === "approved" && new Date(a.reviewedAt ?? "").getTime() >= startOfWeek().getTime()).length;
  const totalDebited   = alerts.filter((a) => a.penaltyApplied).reduce((s, a) => s + (a.penaltyAmountKES ?? 0), 0);
  const rfidDisabled   = alerts.filter((a) => a.rfidDisabled && !a.rfidReenabledAt).length;

  const clearFilters = () => { setSearch(""); setStatusFilter(""); setViolFilter(""); setOffenceFilter(""); setDateFilter(""); };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <StatGrid>
        <StatCard label="Pending Review"       value={pending}    valueColor={pending > 0 ? "text-amber-600" : undefined} />
        <StatCard label="Approved This Week"   value={approvedWeek} valueColor="text-emerald-600" />
        <StatCard label="Total KES Debited"    value={`KES ${totalDebited.toLocaleString()}`} valueColor="text-[#003B49]" />
        <StatCard label="RFID Currently Disabled" value={rfidDisabled} valueColor={rfidDisabled > 0 ? "text-red-600" : undefined} />
      </StatGrid>

      {/* Escalation reference */}
      <EscalationBanner />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, ID, station…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] w-52"
          />
        </div>

        {([
          ["Status", statusFilter, setStatusFilter, [
            ["", "All Status"], ["pending", "Pending"], ["approved", "Approved"],
            ["rejected", "Rejected"], ["investigating", "Investigating"],
          ]],
          ["Violation", violationFilter, setViolFilter, [
            ["", "All Violations"],
            ["battery_mismatch", "Battery Mismatch"],
            ["unexpected_battery_movement", "Unexpected Movement"],
            ["swap_validation_failure", "Validation Failure"],
            ["twin_station_abuse", "Twin-Station Abuse"],
            ["suspected_tampering", "Suspected Tampering"],
          ]],
          ["Offence", offenceFilter, setOffenceFilter, [
            ["", "All Offences"], ["1", "1st"], ["2", "2nd"], ["3", "3rd"], ["4", "4th+"],
          ]],
          ["Date", dateFilter, setDateFilter, [
            ["", "All Time"], ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"],
          ]],
        ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
          <select
            key={label} value={val} onChange={(e) => setter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 text-slate-600"
          >
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}

        {(search || statusFilter || violationFilter || offenceFilter || dateFilter) && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} alert{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Alert ID", "Customer / Vehicle", "Battery(s)", "Station", "Detected", "Violation", "Offence", "Penalty", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No alerts match your filters</p>
                  </td>
                </tr>
              )}
              {filtered.map((alert) => {
                const expanded = expandedId === alert.id;
                const rfidActive = alert.rfidDisabled && !alert.rfidReenabledAt;
                return (
                  <>
                    <tr
                      key={alert.id}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        expanded && "bg-slate-50"
                      )}
                      onClick={() => setExpandedId(expanded ? null : alert.id)}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {alert.id}
                        {rfidActive && <Ban className="w-3 h-3 text-red-500 inline ml-1.5" />}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-700">{alert.customerName}</p>
                        <p className="text-slate-400 text-[11px]">{alert.customerId} · {alert.vehicleId.slice(-8)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {alert.batteryIds.map((b) => (
                          <p key={b} className="font-mono text-[10px]">{b}</p>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[140px]">
                        <p className="truncate">{alert.swapStationName.split("—")[0].trim()}</p>
                        <p className="text-slate-400 text-[10px]">{alert.swapStationId}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(alert.detectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        <br />
                        <span className="text-slate-400">{new Date(alert.detectedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", VIOLATION_COLORS[alert.violationType])}>
                          {VIOLATION_LABELS[alert.violationType]}
                        </span>
                        {alert.isDoubleBill && (
                          <span className="block text-[10px] text-red-500 font-semibold mt-0.5">Double Bill</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                          alert.offenceCount >= 3 ? "bg-red-100 text-red-700" :
                          alert.offenceCount === 2 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {OFFENCE_LABEL[alert.offenceCount] ?? `${alert.offenceCount}th`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {alert.penaltyApplied
                          ? <span className="font-semibold text-emerald-700">KES {alert.penaltyAmountKES?.toLocaleString()}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", STATUS_COLORS[alert.status])}>
                          {STATUS_LABELS[alert.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Pending actions */}
                          {alert.status === "pending" && (
                            <>
                              <button
                                onClick={() => setApproveTarget(alert)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(alert)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                              <button
                                onClick={() => setInvestTarget(alert)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <AlertTriangle className="w-3 h-3" /> Investigate
                              </button>
                            </>
                          )}

                          {/* Post-approval actions */}
                          {alert.status === "approved" && (
                            <>
                              {!alert.notificationSent && (
                                <button
                                  onClick={() => sendNotification(alert.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                  <Bell className="w-3 h-3" /> Notify
                                </button>
                              )}
                              {alert.offenceCount >= 3 && !rfidActive && (
                                <button
                                  onClick={() => toggleRfid(alert.id, true)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  <Ban className="w-3 h-3" /> Disable RFID
                                </button>
                              )}
                            </>
                          )}

                          {/* RFID re-enable */}
                          {rfidActive && (
                            <button
                              onClick={() => toggleRfid(alert.id, false)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <Unlock className="w-3 h-3" /> Re-enable RFID
                            </button>
                          )}

                          {/* Reopen */}
                          {(alert.status === "rejected" || alert.status === "investigating") && (
                            <button
                              onClick={() => reopenAlert(alert.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Reopen
                            </button>
                          )}

                          {/* Expand */}
                          <button
                            onClick={() => setExpandedId(expanded ? null : alert.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Trail
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded audit trail */}
                    {expanded && (
                      <tr key={`${alert.id}-audit`}>
                        <td colSpan={10} className="p-0">
                          <AuditTrail alert={alert} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      <ApproveModal
        alert={approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(penaltyKES, note) => {
          if (!approveTarget || !user) return;
          approveAlert(approveTarget.id, user.id, note, penaltyKES);
        }}
      />

      {/* Reject Modal */}
      <NoteModal
        open={!!rejectTarget}
        title={`Reject Alert ${rejectTarget?.id ?? ""}`}
        label="Reason for rejection"
        confirmLabel="Reject Alert"
        confirmClass="bg-slate-600 hover:bg-slate-700"
        onClose={() => setRejectTarget(null)}
        onConfirm={(note) => {
          if (!rejectTarget || !user) return;
          rejectAlert(rejectTarget.id, user.id, note);
          setRejectTarget(null);
        }}
      />

      {/* Investigate Modal */}
      <NoteModal
        open={!!investTarget}
        title={`Mark for Investigation — ${investTarget?.id ?? ""}`}
        label="Investigation notes"
        confirmLabel="Mark Investigating"
        confirmClass="bg-blue-600 hover:bg-blue-700"
        onClose={() => setInvestTarget(null)}
        onConfirm={(note) => {
          if (!investTarget || !user) return;
          markInvestigating(investTarget.id, user.id, note);
          setInvestTarget(null);
        }}
      />
    </div>
  );
}
