"use client";

import { useMemo, useState } from "react";
import { Search, Download, ArrowRight, ChevronDown, ChevronUp, PackageOpen, AlertTriangle } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/Pagination";
import {
  useSwapTransactionsStore,
  swapStatus,
  hasRfidMismatch,
  isCrossStation,
  isTamperingCandidate,
  SWAP_STATUS_META,
  type SwapRecord,
  type SwapStatus,
} from "@/store/swap-transactions";
import { cn } from "@/lib/utils";

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtTs(iso?: string) {
  return iso ? fmtDateTime(iso) : "—";
}

function totalBilledKWh(r: SwapRecord) {
  return r.batteries.reduce((s, b) => s + b.billedKWh, 0);
}

// ── CSV export (mirrors data/transactions pattern) ───────────────────────────

function exportCSV(records: SwapRecord[]) {
  const headers = [
    "SwapTxnID", "OccurredAt", "Customer", "Phone", "Type",
    "TotalKWh", "TotalPoints", "BilledKWh",
    "Bins", "DispenseStation", "CollectStation",
    "RfidMismatch", "Skipped", "Flagged", "ManualIgnore", "Status", "ErrorNote",
  ];
  const rows = records.map((r) => [
    r.id, r.occurredAt, r.customerName, r.phone, r.type,
    r.totalKWh, r.totalPoints, totalBilledKWh(r).toFixed(6),
    r.batteries.map((b) => b.bin).join(" | "),
    r.dispenseStationId, r.collectStationId,
    hasRfidMismatch(r), r.skipped, r.flagged, r.manualIgnore,
    SWAP_STATUS_META[swapStatus(r)].label, r.errorNote ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swap-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Expanded detail row ───────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-slate-700 mt-0.5 break-all">{value ?? "—"}</p>
    </div>
  );
}

function RecordDetail({ record }: { record: SwapRecord }) {
  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
      {/* Swap-level fields */}
      <div className="grid grid-cols-4 gap-4">
        <DetailField label="Total kWh" value={record.totalKWh.toFixed(3)} />
        <DetailField label="Total Points" value={record.totalPoints.toFixed(2)} />
        <DetailField label="Dispense Timestamp" value={fmtTs(record.dispenseTimestamp)} />
        <DetailField label="Collect Timestamp" value={fmtTs(record.collectTimestamp)} />
        <DetailField label="Dispense Swap Txn ID" value={<span className="font-mono">{record.id}</span>} />
        <DetailField label="Collect Swap Txn ID" value={<span className="font-mono">{record.collectSwapTransactionId ?? "—"}</span>} />
        <DetailField label="Multiday Split" value={record.multiday ?? "—"} />
        <DetailField label="Manual Ignore" value={record.manualIgnore ? "Yes" : "No"} />
      </div>

      {/* Per-battery breakdown */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Batteries</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[720px]">
            <thead>
              <tr className="text-left text-slate-400">
                {["Bin (Serial)", "Billed kWh", "RFID Mismatch", "Slot D→C", "Ah Discharged", "Ah Charged", "Ah Regen", "RFID Tag UID"].map((h) => (
                  <th key={h} className="pb-1.5 pr-4 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {record.batteries.map((b) => (
                <tr key={b.bin}>
                  <td className="py-1.5 pr-4 font-mono text-slate-700 whitespace-nowrap">{b.bin}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{b.billedKWh.toFixed(6)}</td>
                  <td className="py-1.5 pr-4">
                    {b.rfidMismatch
                      ? <span className="text-red-600 font-semibold">Yes</span>
                      : <span className="text-slate-400">No</span>}
                  </td>
                  <td className="py-1.5 pr-4 text-slate-600">{b.slotDispense ?? "—"} → {b.slotCollect ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{b.ahDischarged ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{b.ahCharged ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{b.ahRegen ?? "—"}</td>
                  <td className="py-1.5 pr-4 font-mono text-slate-500 whitespace-nowrap">{b.rfidTagUid ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery / error */}
      {(record.errorNote || record.recovery) && (
        <div className="grid grid-cols-4 gap-4">
          <DetailField label="Error Note" value={record.errorNote ?? "—"} />
          <DetailField label="Recovery Confidence" value={record.recovery?.confidence ?? "—"} />
          <DetailField label="Recovery Method" value={record.recovery?.method ?? "—"} />
          <DetailField label="Recovery kWh" value={record.recovery?.kwh != null ? record.recovery.kwh.toFixed(3) : "—"} />
          {record.recovery?.evidence && (
            <div className="col-span-4">
              <DetailField label="Recovery Evidence" value={record.recovery.evidence} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: [SwapStatus | "", string][] = [
  ["", "All Status"],
  ["flagged", "Flagged"],
  ["cross_station", "Cross-Station"],
  ["rfid_mismatch", "RFID Mismatch"],
  ["skipped", "Skipped"],
  ["recovered", "Recovered"],
  ["ok", "OK"],
];

export function SwapRecordsTable() {
  const records = useSwapTransactionsStore((s) => s.records);

  const [search, setSearch]           = useState("");
  const [stationFilter, setStation]   = useState("");
  const [rfidFilter, setRfid]         = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [dateFilter, setDate]         = useState("7d");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [perPage, setPerPage]         = useState(25);
  const [now] = useState(() => Date.now());

  const stations = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.dispenseStationId) set.add(r.dispenseStationId);
      if (r.collectStationId) set.add(r.collectStationId);
    });
    return Array.from(set).sort();
  }, [records]);

  const sorted = useMemo(
    () => [...records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [records]
  );

  const filtered = useMemo(() => {
    const cutoff =
      dateFilter === "today" ? now - 86_400_000 :
      dateFilter === "7d"    ? now - 7 * 86_400_000 :
      dateFilter === "30d"   ? now - 30 * 86_400_000 : 0;

    return sorted.filter((r) => {
      if (stationFilter && r.dispenseStationId !== stationFilter && r.collectStationId !== stationFilter) return false;
      if (rfidFilter === "yes" && !hasRfidMismatch(r)) return false;
      if (rfidFilter === "no" && hasRfidMismatch(r)) return false;
      if (statusFilter && swapStatus(r) !== statusFilter) return false;
      if (cutoff && new Date(r.occurredAt).getTime() < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.batteries.some((b) => b.bin.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [sorted, search, stationFilter, rfidFilter, statusFilter, dateFilter, now]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Summary stats
  const totalSwaps = records.length;
  const totalKWh = records.reduce((s, r) => s + r.totalKWh, 0);
  const flaggedCount = records.filter(isTamperingCandidate).length;
  const crossStationCount = records.filter(isCrossStation).length;
  const skippedCount = records.filter((r) => r.skipped).length;

  const clearFilters = () => {
    setSearch(""); setStation(""); setRfid(""); setStatus(""); setDate(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <StatGrid cols={5}>
        <StatCard label="Total Swaps" value={totalSwaps} />
        <StatCard label="Total Energy (kWh)" value={totalKWh.toFixed(1)} valueColor="text-emerald-600" />
        <StatCard label="Flagged / Tampering" value={flaggedCount} valueColor={flaggedCount > 0 ? "text-red-600" : undefined} />
        <StatCard label="Cross-Station Alerts" value={crossStationCount} valueColor={crossStationCount > 0 ? "text-rose-700" : undefined} />
        <StatCard label="Skipped" value={skippedCount} valueColor={skippedCount > 0 ? "text-amber-600" : undefined} />
      </StatGrid>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customer, phone, bin, txn…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-56"
          />
        </div>

        <select
          value={stationFilter}
          onChange={(e) => { setStation(e.target.value); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          <option value="">All Stations</option>
          {stations.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={rfidFilter}
          onChange={(e) => { setRfid(e.target.value); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          <option value="">Any RFID</option>
          <option value="yes">RFID Mismatch</option>
          <option value="no">No Mismatch</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 text-slate-600"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {(search || stationFilter || rfidFilter || statusFilter || dateFilter) && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        )}

        <button
          onClick={() => exportCSV(filtered)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Date", "Customer", "Phone", "Batteries (bins)", "Billed kWh", "Billed Amount", "Stations", "RFID Mismatch", "Flagged", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No swap transactions match your filters</p>
                  </td>
                </tr>
              )}
              {paginated.map((r) => {
                const expanded = expandedId === r.id;
                const status = swapStatus(r);
                const rfidBad = hasRfidMismatch(r);
                const crossStation = isCrossStation(r);
                return (
                  <>
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        expanded && "bg-slate-50",
                        isTamperingCandidate(r) && "bg-red-50/30"
                      )}
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(r.occurredAt)}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{r.customerName}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{r.phone}</td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {r.batteries.map((b) => (
                          <p key={b.bin} className="font-mono text-[10px]">{b.bin}</p>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{totalBilledKWh(r).toFixed(3)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {r.totalPoints.toFixed(2)}
                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">pts</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-mono text-[11px]",
                          crossStation ? "text-rose-700 font-semibold" : "text-slate-500"
                        )}>
                          {crossStation && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {r.dispenseStationId || "—"}
                          <ArrowRight className={cn("w-3 h-3", crossStation ? "text-rose-400" : "text-slate-300")} />
                          {r.collectStationId || "—"}
                        </span>
                        {crossStation && (
                          <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">2 stations — review</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {rfidBad
                          ? <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700">Mismatch</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.flagged
                          ? <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700">Flagged</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", SWAP_STATUS_META[status].badge)}>
                          {SWAP_STATUS_META[status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}
                      </td>
                    </tr>

                    {expanded && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={11} className="p-0">
                          <RecordDetail record={r} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>
    </div>
  );
}
