"use client";

import { Fragment, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Search, ChevronDown, ChevronUp, Info, CheckCircle2, XCircle,
  AlertTriangle, Ban, Bell, Unlock, RotateCcw, ShieldAlert, ArrowRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/Pagination";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CopyButton } from "@/components/ui/CopyButton";
import { toast } from "@/store/toast";
import { useTamperingAlertsStore } from "@/store/tampering-alerts";
import type { TamperingAlert, ViolationType, AlertStatus } from "@/store/tampering-alerts";
import { useAuthStore } from "@/store/auth";
import { useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { DateRangeFilter, inEatRange, rangeLabel, type DayRange } from "./DateRangeFilter";
import { SWAP_TXNS } from "@/lib/mock/swap-audit";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { FilterChip, FilterChips } from "@/components/ui/FilterChip";

/** DateRangeFilter's preset labels, for the Date chip. */
const DATE_LABELS: Record<string, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

/** Swap Audit's session IDs: an alert opens its session there only when it is one of these. */
const SWAP_AUDIT_IDS = new Set(SWAP_TXNS.map((t) => t.id));

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
  pending:      "bg-amber-50 text-amber-700",
  approved:     "bg-emerald-50 text-emerald-700",
  rejected:     "bg-slate-100 text-slate-500",
  investigating:"bg-blue-50 text-blue-700",
};

/** Read-only labels (Violation, Status, Double Bill): flat tint, no border or shadow. */
const LABEL = "px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap";

/** Actions: the Swap Audit drawer's outline button. Meaning lives in the icon colour. */
const ACTION =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors";

/**
 * Approve and Reject, told apart at a glance: the Approved status label's green
 * and the red label tint (the light shade fills, the dark shade draws text, icon
 * and border). Text is 5.2:1 and 5.9:1, 4.8:1 and 5.3:1 on hover.
 */
const APPROVE =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-emerald-700 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors";
const REJECT =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-red-700 bg-red-50 text-red-700 hover:bg-red-100 transition-colors";

export const STATUS_LABELS: Record<AlertStatus, string> = {
  pending:      "Pending",
  approved:     "Approved",
  rejected:     "Rejected",
  investigating:"Investigating",
};

const OFFENCE_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

function escalationText(offenceCount: number): { label: string; color: string } {
  if (offenceCount === 1) return { label: "1st offence: warning only", color: "text-amber-600" };
  if (offenceCount === 2) return { label: "2nd offence: repeat behaviour warning", color: "text-orange-600" };
  if (offenceCount === 3) return { label: "3rd offence: RFID will be auto-disabled", color: "text-red-600" };
  return { label: "4th+ offence: escalated for review", color: "text-rose-700" };
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
                { o: "2nd", penalty: "Debit KES X (swap amount)", action: "Second warning: repeated behaviour" },
                { o: "3rd", penalty: "Debit KES X (swap amount)", action: "RFID Tag Disabled. Customer must contact Support" },
                { o: "4th+", penalty: "Debit KES X (swap amount)", action: "Escalated: review for blacklist / risk scoring" },
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

function AuditTrail({ alert, swapAuditHref }: { alert: TamperingAlert; swapAuditHref: string }) {
  const events: { label: string; time?: string; note?: string; color: string }[] = [
    { label: "Alert detected", time: alert.detectedAt, note: alert.detectionReason, color: "bg-slate-400" },
    ...(alert.reviewedAt ? [{ label: `Status → ${STATUS_LABELS[alert.status]}`, time: alert.reviewedAt, note: alert.reviewNote, color: alert.status === "approved" ? "bg-emerald-500" : alert.status === "rejected" ? "bg-slate-400" : "bg-blue-500" }] : []),
    ...(alert.penaltyAppliedAt ? [{ label: `Penalty applied: KES ${alert.penaltyAmountKES?.toLocaleString()}`, time: alert.penaltyAppliedAt, color: "bg-[#FF3B06]" }] : []),
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

      {/* Navigation only, for every alert whatever its status. Styled as the Swap
          Audit drawer's Previous/Next buttons. */}
      <div className="mt-3">
        <Link
          href={swapAuditHref}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          View in Swap Audit <ArrowRight className="w-3 h-3" />
        </Link>
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
            Twin-station abuse: double billing applies (2× swap amount).
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

  // The modal stays mounted between alerts, so without this the previous
  // alert's reason is still in the box when the next one opens.
  useEffect(() => { if (open) setNote(""); }, [open]);

  return (
    <Modal open={open} title={title} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
          <p className="text-[11px] text-slate-400 mb-1.5">Recorded on the alert&apos;s audit trail. Required.</p>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            autoFocus
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] resize-none"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => { onConfirm(note.trim()); onClose(); }}
            disabled={!note.trim()}
            className={cn("flex-1 text-white", confirmClass)}
          >
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
  const canWrite = useAccess().canWrite("swap_info");
  const { alerts, approveAlert, rejectAlert, markInvestigating, sendNotification, toggleRfid, reopenAlert } =
    useTamperingAlertsStore();

  // Swap Audit's "Back to alert" returns here with the filters and page it left with.
  const params   = useSearchParams();
  const pathname = usePathname();
  const [search, setSearch]               = useState(() => params.get("q") ?? "");
  const [statusFilter, setStatusFilter]   = useState(() => params.get("status") ?? "");
  const [violationFilter, setViolFilter]  = useState(() => params.get("violation") ?? "");
  const [offenceFilter, setOffenceFilter] = useState(() => params.get("offence") ?? "");
  const [dateRange, setDateRange]         = useState<DayRange | null>(() => {
    const from = params.get("from"), to = params.get("to");
    return from && to ? { from, to } : null;
  });
  const [dateFilter, setDateFilter]       = useState(() => {
    const d = params.get("date") ?? "";
    return d === "custom" && !(params.get("from") && params.get("to")) ? "" : d;
  });
  // Returning from Swap Audit opens the alert's Trail.
  const [expandedId, setExpandedId]       = useState<string | null>(() => params.get("focus"));
  const [approveTarget, setApproveTarget] = useState<TamperingAlert | null>(null);
  const [rejectTarget, setRejectTarget]   = useState<TamperingAlert | null>(null);
  const [investTarget, setInvestTarget]   = useState<TamperingAlert | null>(null);
  const [rfidTarget, setRfidTarget]       = useState<{ alert: TamperingAlert; disable: boolean } | null>(null);
  const [reopenTarget, setReopenTarget]   = useState<TamperingAlert | null>(null);
  const [now] = useState(() => Date.now());
  const [page, setPage]                   = useState(() => Number(params.get("page")) || 1);
  const [perPage, setPerPage]             = useState(() => Number(params.get("per")) || 25);
  /** The alert Swap Audit returned to: selected until another row is clicked or expanded. */
  const [focusId, setFocusId]             = useState(() => params.get("focus"));
  /** That alert, when the restored filters no longer include it. */
  const [missingId, setMissingId]         = useState<string | null>(null);
  /** Bumped to scroll to, focus and announce the returned alert again (after "Show it"). */
  const [revealTick, setRevealTick]       = useState(0);
  const liveRef = useRef<HTMLSpanElement>(null);

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
      if (dateFilter === "custom" && dateRange && !inEatRange(a.detectedAt, dateRange)) return false;
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
  }, [alerts, search, statusFilter, violationFilter, offenceFilter, dateFilter, dateRange, now]);

  // Reset to the first page whenever the filter set changes (adjust state during
  // render: React's recommended alternative to a setState-in-effect).
  const filterKey = `${search}|${statusFilter}|${violationFilter}|${offenceFilter}|${dateFilter}|${dateRange?.from}|${dateRange?.to}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // On return (and again after "Show it"), open the page that holds the alert, or
  // note that the restored filters leave it out. Same render-time pattern as above.
  const [pagedForTick, setPagedForTick] = useState(-1);
  if (focusId && pagedForTick !== revealTick) {
    setPagedForTick(revealTick);
    const i = filtered.findIndex((a) => a.id === focusId);
    if (i >= 0) setPage(Math.floor(i / perPage) + 1);
    else if (alerts.some((a) => a.id === focusId)) setMissingId(focusId);
  }

  // Once, on return: drop the restore parameters from the URL.
  useEffect(() => {
    if (focusId) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the list renders: centre the alert in the table, focus it, and tell
  // screen readers where they are. Instant, no animation.
  useEffect(() => {
    if (!focusId) return;
    const row = document.querySelector<HTMLElement>(`tr[data-alert="${CSS.escape(focusId)}"]`);
    if (!row) return;
    row.scrollIntoView({ block: "center" });
    row.focus({ preventScroll: true });
    const a = alerts.find((x) => x.id === focusId);
    if (a && liveRef.current) {
      liveRef.current.textContent =
        `Returned to alert ${a.id}, ${VIOLATION_LABELS[a.violationType]}, ${STATUS_LABELS[a.status]}. Trail expanded.`;
    }
    // Only on return and after "Show it", not on every edit to the alerts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealTick]);

  // Another row clicked or expanded: the returned alert stops being the selection.
  const toggleRow = (id: string) => {
    if (focusId && id !== focusId) setFocusId(null);
    setExpandedId(expandedId === id ? null : id);
  };

  // "Show it": drop every filter, then land on the alert as on return.
  const showMissing = () => {
    setSearch(""); setStatusFilter(""); setViolFilter(""); setOffenceFilter(""); setDateFilter(""); setDateRange(null);
    setMissingId(null);
    setExpandedId(focusId);
    setRevealTick((t) => t + 1);
  };

  /**
   * "View in Swap Audit": that alert's station and detected date (EAT, Swap
   * Audit's zone), its session when Swap Audit has it, and where to come back
   * to: this page, its filters and its page.
   */
  const swapAuditHref = (alert: TamperingAlert) => {
    const back = new URLSearchParams();
    if (search) back.set("q", search);
    if (statusFilter) back.set("status", statusFilter);
    if (violationFilter) back.set("violation", violationFilter);
    if (offenceFilter) back.set("offence", offenceFilter);
    if (dateFilter) back.set("date", dateFilter);
    if (dateFilter === "custom" && dateRange) { back.set("from", dateRange.from); back.set("to", dateRange.to); }
    if (pathname === "/swap-transactions") back.set("view", "tampering");
    back.set("page", String(page));
    back.set("per", String(perPage));
    const to = new URLSearchParams({
      from: "alert",
      alert: alert.id,
      station: alert.swapStationId,
      date: new Date(new Date(alert.detectedAt).getTime() + 3 * 3_600_000).toISOString().slice(0, 10),
      violation: VIOLATION_LABELS[alert.violationType],
      ret: `${pathname}?${back.toString()}`,
    });
    if (SWAP_AUDIT_IDS.has(alert.swapEventId)) to.set("txn", alert.swapEventId);
    return `/swap-audit?${to.toString()}`;
  };

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const pending        = alerts.filter((a) => a.status === "pending").length;
  const approvedWeek    = alerts.filter((a) => a.status === "approved" && new Date(a.reviewedAt ?? "").getTime() >= startOfWeek().getTime()).length;
  const totalDebited   = alerts.filter((a) => a.penaltyApplied).reduce((s, a) => s + (a.penaltyAmountKES ?? 0), 0);
  const rfidDisabled   = alerts.filter((a) => a.rfidDisabled && !a.rfidReenabledAt).length;

  // The three dropdowns: label, value, setter and options, shared by the bar and its chips.
  const filterSelects: [string, string, (v: string) => void, [string, string][]][] = [
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
  ];

  const clearFilters = () => { setSearch(""); setStatusFilter(""); setViolFilter(""); setOffenceFilter(""); setDateFilter(""); setDateRange(null); };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
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

        {filterSelects.map(([label, val, setter, opts]) => (
          <select
            key={label} value={val} onChange={(e) => setter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 text-slate-600"
          >
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}

        <DateRangeFilter
          value={dateFilter}
          range={dateRange}
          onChange={(v, r) => { setDateFilter(v); setDateRange(r); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 text-slate-600"
        />

        {(search || statusFilter || violationFilter || offenceFilter || dateFilter) && (
          <ClearFiltersButton onClick={clearFilters} />
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} alert{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* The active filters as chips; × removes one. The search shows in its own box. */}
      {(statusFilter || violationFilter || offenceFilter || dateFilter) && (
        <FilterChips>
          {filterSelects.map(([label, val, setter, opts]) => val && (
            <FilterChip
              key={label}
              label={label}
              value={opts.find(([v]) => v === val)?.[1] ?? val}
              removeLabel={`Remove ${label} filter`}
              onRemove={() => setter("")}
            />
          ))}
          {dateFilter && (
            <FilterChip
              label="Date"
              value={dateFilter === "custom" ? (dateRange ? rangeLabel(dateRange) : "Custom range") : DATE_LABELS[dateFilter] ?? dateFilter}
              removeLabel="Remove Date filter"
              onRemove={() => { setDateFilter(""); setDateRange(null); }}
            />
          )}
        </FilterChips>
      )}

      {/* Where the returned-to alert went, when the restored filters leave it out. */}
      {missingId && (
        <div role="status" className="shrink-0 bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs text-slate-600">{missingId} isn&apos;t in the current filters</span>
          <button onClick={showMissing} className="text-xs text-slate-400 hover:text-slate-600">Show it</button>
          <button
            onClick={() => setMissingId(null)}
            aria-label="Dismiss"
            className="ml-auto p-1 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <span ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Table */}
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Alert ID", "Customer / Vehicle", "Battery(s)", "Station", "Detected", "Violation", "Offence", "Penalty", "Status", "Actions"].map((h) => (
                  <th key={h} className={cn("text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap", h === "Actions" && "border-l border-slate-200")}>{h}</th>
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
              {paginated.map((alert) => {
                const expanded = expandedId === alert.id;
                const rfidActive = alert.rfidDisabled && !alert.rfidReenabledAt;
                return (
                  <Fragment key={alert.id}>
                    <tr
                      data-alert={alert.id}
                      tabIndex={-1}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        expanded && "bg-slate-50",
                        // Swap Audit's selected-row style, for the alert we came back to.
                        focusId === alert.id && "bg-zeno-teal/5 dark:bg-(--sidebar-text)/10"
                      )}
                      onClick={() => toggleRow(alert.id)}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {rfidActive && <Ban className="w-3 h-3 text-red-500 inline mr-1.5" />}
                        <CopyButton value={alert.id} label="Alert ID" />
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-700">
                          <CopyButton value={alert.customerName} label="Customer name" />
                        </p>
                        {/* The vehicle shows its last 8 characters but copies in full. */}
                        <p className="text-slate-400 text-[11px] whitespace-nowrap">
                          <CopyButton value={alert.customerId} label="Customer ID" />
                          <span className="mx-2.5">·</span>
                          <CopyButton value={alert.vehicleId} label="Vehicle ID">{alert.vehicleId.slice(-8)}</CopyButton>
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {alert.batteryIds.map((b) => (
                          <p key={b} className="font-mono text-[10px]">
                            <CopyButton value={b} label={`Battery ID ${b}`} />
                          </p>
                        ))}
                      </td>
                      {/* Station code leads, in the primary text style; the name sits under it, quieter. */}
                      <td className="px-3 py-2.5 max-w-[140px]">
                        <p className="font-mono text-slate-700">
                          <CopyButton value={alert.swapStationId} label="Station code" />
                        </p>
                        <p className="truncate text-slate-400 text-[10px]">{alert.swapStationName.split(",")[0].trim()}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(alert.detectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        <br />
                        <span className="text-slate-400">{new Date(alert.detectedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(LABEL, VIOLATION_COLORS[alert.violationType])}>
                          {VIOLATION_LABELS[alert.violationType]}
                        </span>
                        {alert.isDoubleBill && (
                          <span className={cn(LABEL, "mt-1 inline-block bg-red-50 text-red-700")}>Double Bill</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "text-xs font-semibold",
                          alert.offenceCount >= 3 ? "text-red-700" :
                          alert.offenceCount === 2 ? "text-amber-700" :
                          "text-slate-600"
                        )}>
                          {OFFENCE_LABEL[alert.offenceCount] ?? `${alert.offenceCount}th`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {alert.penaltyApplied
                          ? <span className="font-semibold text-emerald-700">KES {alert.penaltyAmountKES?.toLocaleString()}</span>
                          : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(LABEL, STATUS_COLORS[alert.status])}>
                          {STATUS_LABELS[alert.status]}
                        </span>
                      </td>
                      {/* A thin divider keeps information and actions apart. */}
                      <td className="px-3 py-2.5 border-l border-slate-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Pending actions */}
                          {canWrite && alert.status === "pending" && (
                            <>
                              <button
                                onClick={() => setApproveTarget(alert)}
                                className={APPROVE}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(alert)}
                                className={REJECT}
                              >
                                <XCircle className="w-3 h-3 text-red-700" /> Reject
                              </button>
                              <button
                                onClick={() => setInvestTarget(alert)}
                                className={cn(ACTION, "ml-2")}
                              >
                                <AlertTriangle className="w-3 h-3 text-blue-700" /> Investigate
                              </button>
                            </>
                          )}

                          {/* Post-approval actions */}
                          {canWrite && alert.status === "approved" && (
                            <>
                              {!alert.notificationSent && (
                                <button
                                  onClick={() => {
                                    sendNotification(alert.id);
                                    toast.success("Customer notified", `${alert.customerName} was sent the penalty notice for ${alert.id}.`);
                                  }}
                                  className={ACTION}
                                >
                                  <Bell className="w-3 h-3 text-teal-700" /> Notify
                                </button>
                              )}
                              {alert.offenceCount >= 3 && !rfidActive && (
                                <button
                                  onClick={() => setRfidTarget({ alert, disable: true })}
                                  className={ACTION}
                                >
                                  <Ban className="w-3 h-3 text-red-700" /> Disable RFID
                                </button>
                              )}
                            </>
                          )}

                          {/* RFID re-enable */}
                          {canWrite && rfidActive && (
                            <button
                              onClick={() => setRfidTarget({ alert, disable: false })}
                              className={ACTION}
                            >
                              <Unlock className="w-3 h-3 text-emerald-700" /> Re-enable RFID
                            </button>
                          )}

                          {/* Reopen */}
                          {canWrite && (alert.status === "rejected" || alert.status === "investigating") && (
                            <button
                              onClick={() => setReopenTarget(alert)}
                              className={ACTION}
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700" /> Reopen
                            </button>
                          )}

                          {/* Expand */}
                          <button
                            onClick={() => toggleRow(alert.id)}
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
                          <AuditTrail alert={alert} swapAuditHref={swapAuditHref(alert)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {/* Approve Modal */}
      <ApproveModal
        alert={approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(penaltyKES, note) => {
          if (!approveTarget || !user) return;
          approveAlert(approveTarget.id, user.id, note, penaltyKES);
          toast.success(
            "Alert approved",
            penaltyKES > 0
              ? `KES ${penaltyKES.toLocaleString()} debited from ${approveTarget.customerName}.`
              : `${approveTarget.id} closed with no penalty.`
          );
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
          toast.info("Alert rejected", `${rejectTarget.id} closed with no penalty.`);
          setRejectTarget(null);
        }}
      />

      {/* Investigate Modal */}
      <NoteModal
        open={!!investTarget}
        title={`Mark for Investigation: ${investTarget?.id ?? ""}`}
        label="Investigation notes"
        confirmLabel="Mark Investigating"
        confirmClass="bg-blue-600 hover:bg-blue-700"
        onClose={() => setInvestTarget(null)}
        onConfirm={(note) => {
          if (!investTarget || !user) return;
          markInvestigating(investTarget.id, user.id, note);
          toast.info("Marked for investigation", `${investTarget.id} stays open until a decision is recorded.`);
          setInvestTarget(null);
        }}
      />

      <ConfirmModal
        open={!!rfidTarget}
        title={rfidTarget?.disable ? "Disable RFID tag" : "Re-enable RFID tag"}
        confirmLabel={rfidTarget?.disable ? "Disable RFID" : "Re-enable RFID"}
        tone={rfidTarget?.disable ? "danger" : "neutral"}
        onClose={() => setRfidTarget(null)}
        onConfirm={() => {
          if (!rfidTarget) return;
          toggleRfid(rfidTarget.alert.id, rfidTarget.disable);
          if (rfidTarget.disable) {
            toast.info("RFID disabled", `${rfidTarget.alert.customerName} cannot swap until the tag is re-enabled.`);
          } else {
            toast.success("RFID re-enabled", `${rfidTarget.alert.customerName} can swap again.`);
          }
          setRfidTarget(null);
        }}
      >
        {rfidTarget?.disable ? (
          <>
            <strong className="font-semibold text-slate-800">{rfidTarget.alert.customerName}</strong> will
            not be able to start a swap at any station until someone re-enables the tag. They keep their
            wallet balance and their bike.
          </>
        ) : (
          <>
            <strong className="font-semibold text-slate-800">{rfidTarget?.alert.customerName}</strong> will
            be able to swap again immediately, including at the station where the offence was recorded.
          </>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={!!reopenTarget}
        title={`Reopen alert ${reopenTarget?.id ?? ""}`}
        confirmLabel="Reopen alert"
        tone="danger"
        onClose={() => setReopenTarget(null)}
        onConfirm={() => {
          if (!reopenTarget) return;
          reopenAlert(reopenTarget.id);
          toast.info("Alert reopened", `${reopenTarget.id} is back in the pending queue.`);
          setReopenTarget(null);
        }}
      >
        This clears the recorded decision and review note, and puts the alert back in the pending queue.
        The original note cannot be recovered.
      </ConfirmModal>
    </div>
  );
}
