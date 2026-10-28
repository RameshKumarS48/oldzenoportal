"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTamperingAlertsStore } from "@/store/tampering-alerts";
import { STATUS_LABELS } from "@/components/swap-transactions/TamperingAlertsView";
import { Search, Download, ChevronRight, PackageOpen, AlertTriangle, ArrowLeft } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/Pagination";
import { CopyButton } from "@/components/ui/CopyButton";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import {
  SWAP_TXNS, STATIONS, SCENARIOS, fmtClock,
  type SwapTxn, type VerdictStatus,
} from "@/lib/mock/swap-audit";
import { VERDICT_META } from "./tokens";
import { SessionDrawer } from "./SessionDrawer";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { FilterChip, FilterChips } from "@/components/ui/FilterChip";

// ── CSV export (mirrors the wallet / swap-records pattern) ───────────────────

function exportCSV(rows: SwapTxn[]) {
  const headers = [
    "SwapTxnID", "Date", "Time", "Customer", "Phone", "RFID", "CustomerID", "Vehicle",
    "StationName", "StationID", "Scenario", "RecordedCollects", "ConfirmedCollects",
    "Dispensed", "BatteryBalance", "DurationSec", "Verdict", "Flags",
  ];
  const body = rows.map((t) => [
    t.id, "2026-10-06", fmtClock(t.startMinute), t.cust.name, t.cust.phone, t.cust.rfid, t.cust.id, t.vehicle,
    t.station.name, t.station.id, t.sc.name, t.verdict.Rc, t.verdict.Pc,
    t.verdict.Dn, t.verdict.bal, t.endT, t.verdict.status,
    t.verdict.flags.map((f) => f.t).join(" | "),
  ]);
  const csv = [headers, ...body].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "swap-audit-20261006.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes ?txn= straight to the history API. Next 16 syncs useSearchParams with
 * pushState/replaceState, so this needs no navigation and no server round trip.
 */
function writeTxnParam(id: string | null, mode: "push" | "replace") {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set("txn", id);
  else params.delete("txn");
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";

/** The one day the sample data covers. Every session is on it. */
const AUDIT_DAY = "2026-10-06";

/** "2026-08-24" → "24 Aug". */
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Where "Back to alert" may return to: only the two Tampering Alerts pages. */
const ALERT_PAGES = /^\/(swap-transactions|support\/tampering-alerts)(\?|$)/;

interface AlertOrigin {
  alert: string;
  station: string;
  /** The alert's detected date, EAT, as YYYY-MM-DD. */
  date: string;
  violation: string;
  /** The alerts page, with its filters and page, to return to. */
  ret: string;
}

/**
 * The small way back to the Tampering Alert that opened this page, with its
 * violation. Navigation only: no review actions here.
 */
/** The alerts page to return to, told which alert to scroll to, select and focus. */
const backHref = (origin: AlertOrigin) =>
  `${origin.ret}${origin.ret.includes("?") ? "&" : "?"}focus=${encodeURIComponent(origin.alert)}`;

export function BackToAlert({ origin }: { origin: AlertOrigin }) {
  const href = backHref(origin);
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <Link
        href={href}
        aria-label={`Back to alert ${origin.alert}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to alert {origin.alert}
      </Link>
      <span className="text-[11px] text-slate-400">{origin.violation}</span>
    </span>
  );
}

/** The sessions of 6 Oct 2026, one row each, opened in a drawer for the evidence behind the verdict. */
export function SwapAuditTable() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  // Opened from a Tampering Alert: start filtered to that alert's station and day.
  // The day has no control of its own; the empty state names it and Clear drops it.
  const [station, setStation] = useState(() => params.get("station") ?? "");
  const [day, setDay] = useState(() => params.get("date") ?? "");
  const [scenario, setScenario] = useState("");
  const [verdict, setVerdict] = useState<VerdictStatus | "">("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Everything but the verdict, so the dropdown can count each verdict within it.
  const beforeVerdict = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (day && day !== AUDIT_DAY) return [];
    return SWAP_TXNS.filter((t) => {
      if (q && !t.haystack.includes(q)) return false;
      if (station && t.station.id !== station) return false;
      if (scenario && t.sc.key !== scenario) return false;
      return true;
    });
  }, [search, station, scenario, day]);

  const filtered = useMemo(
    () => (verdict ? beforeVerdict.filter((t) => t.verdict.status === verdict) : beforeVerdict),
    [beforeVerdict, verdict]
  );

  const verdictCount = (v: VerdictStatus, rows: SwapTxn[]) => rows.filter((t) => t.verdict.status === v).length;

  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage),
    [filtered, page, perPage]
  );

  // The cards follow the filters. Batteries short is the number the fraud costs.
  const short = filtered.reduce((s, t) => s + (t.verdict.bal < 0 ? -t.verdict.bal : 0), 0);
  const summary: { label: string; value: number; valueColor?: string }[] = [
    { label: "Sessions",      value: filtered.length },
    { label: "Compliant",     value: verdictCount("COMPLIANT", filtered),     valueColor: "text-emerald-600" },
    { label: "Non-compliant", value: verdictCount("NON-COMPLIANT", filtered), valueColor: "text-red-600" },
  ];

  // The open swap lives in the URL, so a link reopens it and Back closes it.
  const openId = params.get("txn");

  // Only a "View in Swap Audit" link sets these, so any other way in shows no back bar.
  const ret = params.get("ret") ?? "";
  const origin: AlertOrigin | null =
    params.get("from") === "alert" && params.get("alert") && ALERT_PAGES.test(ret)
      ? {
          alert: params.get("alert")!,
          station: params.get("station") ?? "",
          date: params.get("date") ?? "",
          violation: params.get("violation") ?? "",
          ret,
        }
      : null;
  const openTxn = openId ? SWAP_TXNS.find((t) => t.id === openId) ?? null : null;

  // The alert's status, read live from Tampering Alerts, so it is current even
  // if the alert was decided in another tab.
  const alertStatus = useTamperingAlertsStore((st) => st.alerts.find((a) => a.id === origin?.alert)?.status);
  const alertNav = origin
    ? {
        id: origin.alert,
        violation: origin.violation,
        status: alertStatus ? STATUS_LABELS[alertStatus] : "",
        pending: alertStatus === "pending",
        href: backHref(origin),
      }
    : null;
  const openIndex = openTxn ? filtered.findIndex((t) => t.id === openTxn.id) : -1;

  // True when this visit pushed the ?txn= entry, so closing can pop it instead
  // of stacking a duplicate. A shared link arrives without one.
  const pushedRef = useRef(false);

  const openRow = (id: string) => {
    writeTxnParam(id, "push");
    pushedRef.current = true;
  };

  // Previous/Next replace the entry, so one Back still closes the drawer.
  const goTo = (i: number) => {
    const t = filtered[i];
    if (t) writeTxnParam(t.id, "replace");
  };

  const closeDrawer = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      writeTxnParam(null, "replace");
    }
  }, []);

  // Keep the open swap's row on the visible page, for links and Previous/Next.
  // Adjusted during render, React's pattern for state that follows other state.
  const [pagedFor, setPagedFor] = useState(-1);
  if (openIndex !== pagedFor) {
    setPagedFor(openIndex);
    if (openIndex >= 0) setPage(Math.floor(openIndex / perPage) + 1);
  }

  // However the drawer closes (X, Esc, backdrop, browser Back), focus returns
  // to the row of the swap that was last shown.
  const lastShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (openTxn) {
      lastShownRef.current = openTxn.id;
      return;
    }
    const id = lastShownRef.current;
    lastShownRef.current = null;
    if (id) document.querySelector<HTMLElement>(`tr[data-txn="${id}"]`)?.focus();
  }, [openTxn]);

  // A link to an unknown swap: say so once, then drop it from the URL.
  const warnedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || openTxn || warnedRef.current === openId) return;
    warnedRef.current = openId;
    toast.error("Swap not found", `No swap session matches ${openId}.`);
    writeTxnParam(null, "replace");
  }, [openId, openTxn]);

  // A verdict change always returns to page 1.
  const selectVerdict = (v: VerdictStatus | "") => { setVerdict(v); setPage(1); };

  const clearFilters = () => {
    setSearch(""); setStation(""); setScenario(""); setVerdict(""); setDay(""); setPage(1);
  };

  const dirty = search || station || scenario || verdict || day;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Summary */}
      <StatGrid cols={4}>
        {summary.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} valueColor={c.valueColor} />
        ))}
        <StatCard label="Batteries short" value={short} valueColor={short > 0 ? "text-red-600" : undefined} />
      </StatGrid>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, RFID, phone, S/N, txn…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60"
          />
        </div>

        <select value={station} onChange={(e) => { setStation(e.target.value); setPage(1); }} className={CONTROL}>
          <option value="">All Stations</option>
          {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
          {station && !STATIONS.some((s) => s.id === station) && <option value={station}>{station}</option>}
        </select>

        <select value={scenario} onChange={(e) => { setScenario(e.target.value); setPage(1); }} className={CONTROL}>
          <option value="">All Scenarios</option>
          {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>

        <select
          value={verdict}
          onChange={(e) => selectVerdict(e.target.value as VerdictStatus | "")}
          className={CONTROL}
        >
          <option value="">All Verdicts</option>
          {(Object.keys(VERDICT_META) as VerdictStatus[]).map((v) => (
            <option key={v} value={v}>{VERDICT_META[v].label} ({verdictCount(v, beforeVerdict)})</option>
          ))}
        </select>

        {dirty && (
          <ClearFiltersButton onClick={clearFilters} />
        )}

        <button
          onClick={() => {
            if (filtered.length === 0) {
              toast.error("Nothing to export", "No swap session matches the current filters. Clear a filter and try again.");
              return;
            }
            exportCSV(filtered);
            toast.success("Export downloaded", `${filtered.length.toLocaleString()} swap sessions written to CSV.`);
          }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* The active filters as chips; × removes one. The search shows in its own box. */}
      {(station || scenario || verdict || day) && (
        <FilterChips>
          {station && (
            <FilterChip
              label="Station"
              value={[station, STATIONS.find((s) => s.id === station)?.name].filter(Boolean).join(" · ")}
              removeLabel="Remove Station filter"
              onRemove={() => { setStation(""); setPage(1); }}
            />
          )}
          {scenario && (
            <FilterChip
              label="Scenario"
              value={SCENARIOS.find((s) => s.key === scenario)?.name ?? scenario}
              removeLabel="Remove Scenario filter"
              onRemove={() => { setScenario(""); setPage(1); }}
            />
          )}
          {verdict && (
            <FilterChip
              label="Verdict"
              value={VERDICT_META[verdict].label}
              removeLabel="Remove Verdict filter"
              onRemove={() => selectVerdict("")}
            />
          )}
          {day && (
            <FilterChip label="Date" value={fmtDay(day)} removeLabel="Remove Date filter" onRemove={() => { setDay(""); setPage(1); }} />
          )}
        </FilterChips>
      )}

      {/* Table */}
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-xs min-w-[1180px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "Time (EAT)", "Swap Txn ID", "Customer", "Phone", "Station", "Scenario", "Verdict", "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    {origin ? (
                      // Opened from an alert with nothing to show: say what was looked for, and the way back.
                      <>
                        <p className="text-slate-400">
                          No sessions found for {origin.station}{origin.date ? ` on ${fmtDay(origin.date)}` : ""}.
                        </p>
                        <p className="mt-2"><BackToAlert origin={origin} /></p>
                      </>
                    ) : (
                      <p className="text-slate-400">No swap sessions match your filters</p>
                    )}
                  </td>
                </tr>
              )}
              {paginated.map((t) => {
                const selected = openId === t.id;
                const v = t.verdict;
                const meta = VERDICT_META[v.status];
                const faked = v.status === "NON-COMPLIANT";
                return (
                  <tr
                    key={t.id}
                    data-txn={t.id}
                    tabIndex={0}
                    aria-haspopup="dialog"
                    className={cn(
                      "hover:bg-slate-50 transition-colors cursor-pointer",
                      selected && "bg-zeno-teal/5 dark:bg-(--sidebar-text)/10"
                    )}
                    onClick={() => openRow(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(t.id); }
                    }}
                  >
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">6 Oct, {fmtClock(t.startMinute)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <CopyButton value={t.id} label="Swap Txn ID" />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                      <CopyButton value={t.cust.name} label="Customer name" />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <CopyButton value={t.cust.phone} label="Phone" />
                    </td>
                    {/* Station ID leads, in the table's ID style; the name sits under it, quieter. */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <CopyButton value={t.station.id} label="Station code" className="font-mono text-slate-700" />
                      <span className="block text-[10px] text-slate-400">{t.station.name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        {faked && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                        {t.sc.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", meta.badge)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      <SessionDrawer
        txn={openTxn}
        position={openIndex + 1}
        total={filtered.length}
        onPrev={openIndex > 0 ? () => goTo(openIndex - 1) : undefined}
        onNext={openIndex >= 0 && openIndex < filtered.length - 1 ? () => goTo(openIndex + 1) : undefined}
        onClose={closeDrawer}
        alertNav={alertNav}
      />
    </div>
  );
}
