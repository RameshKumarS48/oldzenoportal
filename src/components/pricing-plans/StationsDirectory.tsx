"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { stationNow } from "@/lib/pricing/history";
import { fmtEat } from "@/lib/pricing/format";
import { StationHistoryDrawer } from "./StationHistoryDrawer";
import { usePricingBook, usePricingNow } from "./shared";

/**
 * Every swap station and the plan it's on now, with when it joined and who
 * moved it last. A row opens the station's history. Search matches the code,
 * either address, the region or the plan.
 */
export function StationsDirectory() {
  const book = usePricingBook();
  const now = usePricingNow();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => PRICING_STATIONS.map((s) => ({ ...s, ...stationNow(book, s.id, now) })), [book, now]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.id, r.shortAddress, r.longAddress, r.regionLabel, r.plan.name].some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, query]);

  return (
    <>
      {/* Same filter bar as the Plans tab. */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stations or plans"
            aria-label="Search stations by code, address, region or plan"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60"
          />
        </div>
        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          {visible.length === rows.length ? `${rows.length} stations` : `${visible.length} of ${rows.length} stations`}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-2.5">Station</th>
              <th className="px-4 py-2.5">Region</th>
              <th className="px-4 py-2.5">Plan now</th>
              <th className="px-4 py-2.5">Since</th>
              <th className="px-4 py-2.5">Last moved by</th>
              <th className="px-2 py-2.5"><span className="sr-only">Open history</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">No station matches “{query.trim()}”.</td>
              </tr>
            )}
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpenId(r.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(r.id))}
                tabIndex={0}
                aria-label={`${r.id} ${r.shortAddress}: open history`}
                className="cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zeno-teal/30"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-slate-800">{r.id}</span>
                  <span className="ml-2 text-slate-600">{r.shortAddress}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.regionLabel}</td>
                <td className={r.plan.isDefault ? "px-4 py-3 text-slate-500" : "px-4 py-3 font-medium text-slate-800"}>{r.plan.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.since ? fmtEat(r.since) : "Go-live"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.lastBy ?? <span className="text-slate-300">–</span>}</td>
                <td className="px-2 py-3 text-slate-300"><ChevronRight className="h-4 w-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StationHistoryDrawer stationId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
