"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { SearchInput } from "@/components/ui/FilterControls";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { PRICING_REGIONS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { resolvePlan } from "@/lib/pricing/engine";
import { usePricingBook } from "./shared";

/**
 * Pick stations to move onto a plan: search by code, short or long address
 * or region, tick them one by one or a whole region at once, and see which
 * plan each is on now ("moves off" marks a station leaving another plan).
 * Stations already on the target can't be picked; with `hideAlreadyOnTarget`
 * they aren't listed at all. `showRegions` adds the whole-region chips.
 * Search and paging never clear a selection they hide. `targetPlanId` is null
 * for Default, or an id the book doesn't have yet for a plan being created.
 */
export function StationPicker({
  targetPlanId,
  selected,
  onChange,
  now,
  showRegions = true,
  hideAlreadyOnTarget = false,
}: {
  targetPlanId: string | null;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  now: string;
  showRegions?: boolean;
  hideAlreadyOnTarget?: boolean;
}) {
  const book = usePricingBook();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Each station's plan now, before any move.
  const rows = useMemo(
    () =>
      PRICING_STATIONS.map((s) => {
        const current = resolvePlan(book, s.id, now).plan;
        const already = targetPlanId === null ? current.isDefault : current.id === targetPlanId;
        return { ...s, current, already };
      }).filter((s) => !(hideAlreadyOnTarget && s.already)),
    [book, now, targetPlanId, hideAlreadyOnTarget]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.shortAddress.toLowerCase().includes(q) ||
        s.longAddress.toLowerCase().includes(q) ||
        s.regionLabel.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const flip = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };
  const toggle = (id: string) => flip([id], !selected.has(id));
  const pickable = (list: typeof rows) => list.filter((r) => !r.already).map((r) => r.id);

  // A shrinking list (a search) can leave the page past the end, so clamp it.
  const pages = Math.max(1, Math.ceil(visible.length / perPage));
  const current = Math.min(page, pages);
  const shown = visible.slice((current - 1) * perPage, current * perPage);
  // The header checkbox acts on the rows on this page.
  const pageIds = pickable(shown);
  const allShown = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const hiddenSelected = Array.from(selected).filter((id) => !shown.some((v) => v.id === id)).length;

  const count = (
    <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">
      {selected.size} selected
      {hiddenSelected > 0 && <span className="text-slate-400"> ({hiddenSelected} not shown)</span>}
      {selected.size > 0 && (
        <button type="button" onClick={() => onChange(new Set())} className="ml-2 text-zeno-teal hover:underline">
          Clear
        </button>
      )}
    </span>
  );

  if (rows.length === 0) {
    return <p className="rounded-xl border border-slate-200 py-10 text-center text-sm text-slate-400">Every station is already on this plan.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search code, short or long address…"
          />
        </div>
        {!showRegions && count}
      </div>

      {showRegions && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-500">Whole region:</span>
        {PRICING_REGIONS.map((r) => {
          const ids = pickable(rows.filter((s) => s.region === r.key));
          const on = ids.length > 0 && ids.every((id) => selected.has(id));
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => flip(ids, !on)}
              disabled={ids.length === 0}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40",
                on ? "bg-zeno-teal text-white border-zeno-teal" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {on && <Check className="w-3 h-3" />}
              {r.label} <span className={on ? "text-white/70" : "text-slate-400"}>{ids.length}</span>
            </button>
          );
        })}
        {count}
      </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="max-h-[42vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allShown}
                    disabled={pageIds.length === 0}
                    onChange={() => flip(pageIds, !allShown)}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Short address</th>
                <th className="px-3 py-2 hidden md:table-cell">Long address</th>
                <th className="px-3 py-2">Plan now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">No station matches “{query.trim()}”.</td></tr>
              )}
              {shown.map((s) => {
                const on = selected.has(s.id);
                const leaves = on && !s.current.isDefault;
                return (
                  <tr
                    key={s.id}
                    onClick={() => !s.already && toggle(s.id)}
                    className={cn(s.already ? "opacity-50" : "cursor-pointer hover:bg-slate-50", on && "bg-teal-50/60")}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={s.already}
                        onChange={() => toggle(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${s.id}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{s.id}</td>
                    <td className="px-3 py-2 text-slate-700">{s.shortAddress}</td>
                    <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{s.longAddress}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {s.already ? (
                        <span className="text-slate-400">Already on this plan</span>
                      ) : (
                        <span className={s.current.isDefault ? "text-slate-500" : "text-amber-700 font-medium"}>
                          {s.current.name}
                          {leaves && <span className="font-normal"> · moves off</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={visible.length} page={current} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>
    </div>
  );
}
