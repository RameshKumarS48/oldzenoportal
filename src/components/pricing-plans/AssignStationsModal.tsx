"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/FilterControls";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_LEAD_HOURS, usePricingStore } from "@/store/pricing-plans";
import { PRICING_REGIONS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { resolvePlan } from "@/lib/pricing/engine";
import { eatLocalToIso, fmtEat } from "@/lib/pricing/format";
import type { PricingPlan } from "@/lib/pricing/types";
import { inputCls, labelCls, nextEffectiveLocal, useActorName, usePricingBook } from "./shared";

/**
 * Put stations on a plan from a chosen moment. Search by code, short or long
 * address, pick one by one or a whole region, and see which plan each station
 * would be leaving. A station can only be on one plan, so moving it here takes
 * it off its old one.
 */
export function AssignStationsModal({ plan, onClose }: { plan: PricingPlan; onClose: () => void }) {
  const assignStations = usePricingStore((s) => s.assignStations);
  const book = usePricingBook();
  const actor = useActorName();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [effectiveLocal, setEffectiveLocal] = useState(() => nextEffectiveLocal(ASSIGNMENT_LEAD_HOURS));
  const [error, setError] = useState<string | null>(null);

  const effectiveIso = effectiveLocal ? eatLocalToIso(effectiveLocal) : "";
  const at = effectiveIso && !Number.isNaN(new Date(effectiveIso).getTime()) ? effectiveIso : new Date().toISOString();

  // Each station's plan at the chosen moment, before this move.
  const rows = useMemo(
    () => PRICING_STATIONS.map((s) => ({ ...s, current: resolvePlan(book, s.id, at).plan })),
    [book, at]
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

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectable = (ids: string[]) => ids.filter((id) => rows.find((r) => r.id === id)?.current.id !== plan.id);

  const toggleRegion = (region: string) => {
    const ids = selectable(rows.filter((r) => r.region === region).map((r) => r.id));
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const visibleSelectable = selectable(visible.map((v) => v.id));
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((id) => selected.has(id));
  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleSelectable.forEach((id) => (allVisibleSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const moving = rows.filter((r) => selected.has(r.id) && !r.current.isDefault && r.current.id !== plan.id);

  function handleAssign() {
    const res = assignStations(plan.isDefault ? null : plan.id, Array.from(selected), effectiveIso, actor);
    if (!res.ok) return setError(res.error);
    toast.success(
      `${selected.size} station${selected.size === 1 ? "" : "s"} scheduled`,
      `They move to ${plan.name} on ${fmtEat(effectiveIso)}. Riders are notified ${ASSIGNMENT_LEAD_HOURS} h before.`
    );
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Assign stations to ${plan.name}`} className="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search code, short or long address…"
            className="flex-1"
          />
          <div className="sm:w-56">
            <label className={labelCls}>Effective from (EAT)</label>
            <input className={inputCls} type="datetime-local" value={effectiveLocal} onChange={(e) => setEffectiveLocal(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Whole region:</span>
          {PRICING_REGIONS.map((r) => {
            const ids = selectable(rows.filter((s) => s.region === r.key).map((s) => s.id));
            const on = ids.length > 0 && ids.every((id) => selected.has(id));
            return (
              <button
                key={r.key}
                onClick={() => toggleRegion(r.key)}
                disabled={ids.length === 0}
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
          <span className="ml-auto text-xs text-slate-500">{selected.size} selected</span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-[42vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Select all shown" />
                  </th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Short address</th>
                  <th className="px-3 py-2 hidden md:table-cell">Long address</th>
                  <th className="px-3 py-2">Plan then</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">No station matches “{query}”.</td></tr>
                )}
                {visible.map((s) => {
                  const already = s.current.id === plan.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => !already && toggle(s.id)}
                      className={cn(
                        already ? "opacity-50" : "cursor-pointer hover:bg-slate-50",
                        selected.has(s.id) && "bg-teal-50/60"
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          disabled={already}
                          onChange={() => toggle(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${s.id}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{s.id}</td>
                      <td className="px-3 py-2 text-slate-700">{s.shortAddress}</td>
                      <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{s.longAddress}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {already ? (
                          <span className="text-slate-400">Already on this plan</span>
                        ) : (
                          <span className={s.current.isDefault ? "text-slate-400" : "text-amber-700 font-medium"}>
                            {s.current.name}
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

        {moving.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {moving.length} selected station{moving.length === 1 ? " is" : "s are"} on another plan and will leave it:{" "}
            {moving.map((m) => `${m.id} (${m.current.name})`).join(", ")}.
          </p>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="teal" onClick={handleAssign} disabled={selected.size === 0}>
            Assign {selected.size || ""} station{selected.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
