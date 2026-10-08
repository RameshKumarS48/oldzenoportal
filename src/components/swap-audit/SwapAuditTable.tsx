"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Search, Download, ChevronRight, PackageOpen, AlertTriangle } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import {
  SWAP_TXNS, STATIONS, SCENARIOS, VERDICT_TOTALS, fmtClock,
  type SwapTxn, type VerdictStatus,
} from "@/lib/mock/swap-audit";
import { VERDICT_META } from "./tokens";
import { SessionDrawer } from "./SessionDrawer";

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

const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";

/** Summary cards that double as the Verdict filter. "" is Sessions, i.e. All Verdicts. */
const VERDICT_CARDS: { verdict: VerdictStatus | ""; label: string; value: number; valueColor?: string }[] = [
  { verdict: "",              label: "Sessions",      value: SWAP_TXNS.length },
  { verdict: "COMPLIANT",     label: "Compliant",     value: VERDICT_TOTALS.COMPLIANT,        valueColor: "text-emerald-600" },
  { verdict: "NON-COMPLIANT", label: "Non-compliant", value: VERDICT_TOTALS["NON-COMPLIANT"], valueColor: "text-red-600" },
  { verdict: "REVIEW",        label: "Needs review",  value: VERDICT_TOTALS.REVIEW,           valueColor: "text-amber-600" },
  { verdict: "NO SWAP",       label: "No swap",       value: VERDICT_TOTALS["NO SWAP"] },
];

/** The sessions of 6 Oct 2026, one row each, opened in a drawer for the evidence behind the verdict. */
export function SwapAuditTable() {
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("");
  const [scenario, setScenario] = useState("");
  const [verdict, setVerdict] = useState<VerdictStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SWAP_TXNS.filter((t) => {
      if (q && !t.haystack.includes(q)) return false;
      if (station && t.station.id !== station) return false;
      if (scenario && t.sc.key !== scenario) return false;
      if (verdict && t.verdict.status !== verdict) return false;
      return true;
    });
  }, [search, station, scenario, verdict]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage),
    [filtered, page, perPage]
  );

  // Batteries the stations are short across the day — the number the fraud costs.
  const short = SWAP_TXNS.reduce((s, t) => s + (t.verdict.bal < 0 ? -t.verdict.bal : 0), 0);

  // The row that opened the drawer gets focus back when it closes.
  const openerRef = useRef<HTMLTableRowElement | null>(null);
  const openTxn = openId ? SWAP_TXNS.find((t) => t.id === openId) ?? null : null;

  const openRow = (id: string, row: HTMLTableRowElement) => {
    openerRef.current = row;
    setOpenId(id);
  };

  const closeDrawer = useCallback(() => {
    setOpenId(null);
    openerRef.current?.focus();
  }, []);

  // The cards and the dropdown both go through here, so they can't disagree.
  const selectVerdict = (v: VerdictStatus | "") => { setVerdict(v); setPage(1); };

  const clearFilters = () => {
    setSearch(""); setStation(""); setScenario(""); setVerdict(""); setPage(1);
  };

  const dirty = search || station || scenario || verdict;

  return (
    <div className="space-y-4">
      {/* Summary: the session cards filter by verdict; clicking the selected one returns to All. */}
      <StatGrid cols={6}>
        {VERDICT_CARDS.map((c) => {
          const selected = verdict === c.verdict;
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={selected}
              onClick={() => selectVerdict(selected ? "" : c.verdict)}
              className="text-left rounded-lg cursor-pointer"
            >
              {/* zeno-teal is near-invisible on dark cards (1.4:1), so dark mode switches
                  to --sidebar-text, the sidebar's light teal (7.3:1). The hover border
                  needs `[.dark_&]` + `!` to outrank globals.css's `.dark main .border-slate-200`. */}
              <StatCard
                label={c.label}
                value={c.value}
                valueColor={c.valueColor}
                className={cn(
                  "transition-colors",
                  selected
                    ? "border-zeno-teal bg-zeno-teal/5 dark:border-(color:--sidebar-text) dark:bg-(--sidebar-text)/10"
                    : "hover:border-zeno-teal/50 hover:bg-zeno-teal/5 [.dark_&]:hover:border-(color:--sidebar-text)/50!"
                )}
              />
            </button>
          );
        })}
        {/* Counts batteries, not sessions, so it has no verdict to filter by. */}
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
          {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
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
            <option key={v} value={v}>{VERDICT_META[v].label} ({VERDICT_TOTALS[v]})</option>
          ))}
        </select>

        {dirty && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1180px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "Time", "Swap Txn ID", "Customer", "Phone", "Station", "Scenario",
                  "Collects", "Dispensed", "Balance", "Verdict", "",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap",
                      h === "Collects" || h === "Dispensed" || h === "Balance" ? "text-right" : "text-left"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No swap sessions match your filters</p>
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
                    tabIndex={0}
                    aria-haspopup="dialog"
                    className={cn(
                      "hover:bg-slate-50 transition-colors cursor-pointer",
                      selected && "bg-zeno-teal/5 dark:bg-(--sidebar-text)/10"
                    )}
                    onClick={(e) => openRow(t.id, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(t.id, e.currentTarget); }
                    }}
                  >
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">6 Oct, {fmtClock(t.startMinute)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{t.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{t.cust.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{t.cust.phone}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {t.station.name}
                      <span className="block font-mono text-[10px] text-slate-400">{t.station.id}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        {faked && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                        {t.sc.name}
                      </span>
                    </td>
                    {/* Recorded vs confirmed: the gap between them is the fraud. */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className={cn("font-semibold", v.Pc < v.Rc ? "text-red-600" : "text-slate-700")}>
                        {v.Pc}
                      </span>
                      <span className="text-slate-400"> / {v.Rc}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{v.Dn}</td>
                    <td className={cn(
                      "px-3 py-2.5 text-right font-semibold whitespace-nowrap",
                      v.bal !== 0 ? "text-red-600" : "text-slate-400"
                    )}>
                      {v.bal > 0 ? `+${v.bal}` : v.bal}
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

      <SessionDrawer txn={openTxn} onClose={closeDrawer} />
    </div>
  );
}
