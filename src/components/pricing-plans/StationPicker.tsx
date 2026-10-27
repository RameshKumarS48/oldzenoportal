"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { SearchInput } from "@/components/ui/FilterControls";
import { cn } from "@/lib/utils";
import { PRICING_REGIONS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { resolvePlan } from "@/lib/pricing/engine";
import { fmtMoves, type MoveSummary } from "@/lib/pricing/moves";
import { usePricingBook } from "./shared";

/**
 * Pick stations to move onto a plan: search by code, short or long address
 * or region, tick them one by one or a whole region at once, and see which
 * plan each is on now. Stations already on the target can't be picked.
 * Search never clears a selection it hides. `targetPlanId` is null for
 * Default, or an id the book doesn't have yet for a plan being created.
 */
export function StationPicker({
  targetPlanId,
  selected,
  onChange,
  summary,
  now,
}: {
  targetPlanId: string | null;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** The moves the selection makes, for the warnings under the table. */
  summary: MoveSummary;
  now: string;
}) {
  const book = usePricingBook();
  const [query, setQuery] = useState("");

  // Each station's plan now, before any move.
  const rows = useMemo(
    () =>
      PRICING_STATIONS.map((s) => {
        const current = resolvePlan(book, s.id, now).plan;
        const already = targetPlanId === null ? current.isDefault : current.id === targetPlanId;
        return { ...s, current, already };
      }),
    [book, now, targetPlanId]
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

  const visibleIds = pickable(visible);
  const allVisible = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const hiddenSelected = Array.from(selected).filter((id) => !visible.some((v) => v.id === id)).length;

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search code, short or long address…" />

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
        <span className="ml-auto text-xs text-slate-500">
          {selected.size} selected
          {hiddenSelected > 0 && <span className="text-slate-400"> ({hiddenSelected} hidden by search)</span>}
          {selected.size > 0 && (
            <button type="button" onClick={() => onChange(new Set())} className="ml-2 text-zeno-teal hover:underline">
              Clear
            </button>
          )}
        </span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="max-h-[42vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allVisible}
                    disabled={visibleIds.length === 0}
                    onChange={() => flip(visibleIds, !allVisible)}
                    aria-label="Select all shown"
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
              {visible.map((s) => {
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
      </div>

      <MoveWarnings summary={summary} />
    </div>
  );
}

/** Stations leaving other plans, and plans that would be left empty. */
export function MoveWarnings({ summary }: { summary: MoveSummary }) {
  const leaving = summary.moves.filter((m) => !m.from.isDefault);
  if (leaving.length === 0 && summary.emptied.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
      {leaving.length > 0 && (
        <p className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
          <span>
            {leaving.length} station{leaving.length === 1 ? " leaves its" : "s leave their"} current plan: {fmtMoves(leaving)}.
          </span>
        </p>
      )}
      {summary.emptied.map((p) => (
        <p key={p.id} className="flex items-start gap-2 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
          {p.name} will have no stations left.
        </p>
      ))}
    </div>
  );
}
