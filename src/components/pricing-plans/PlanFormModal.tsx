"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Info, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast";
import { usePricingStore, type VersionInput } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { sortedVersions, stationsOnPlan } from "@/lib/pricing/engine";
import { fmtRateWindow, fmtSlabs, sameWindows, sortWindows } from "@/lib/pricing/windows";
import {
  fromChoices,
  rateError,
  removeRow,
  rowEnd,
  rowsToWindows,
  setFrom,
  setUntil,
  splitBlocked,
  splitLongest,
  untilChoices,
  untilValue,
  windowsToRows,
  type HourRow,
  type MovedField,
  type RowsChange,
} from "@/lib/pricing/hour-rows";
import type { PricingPlan, RateWindow } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { DayBandBar, WindowSwatch } from "./DayBandBar";
import { HourSelect } from "./HourSelect";
import { inputCls, labelCls, useActorName, usePricingBook } from "./shared";

let rowSeq = 0;
const rowKey = () => `w${++rowSeq}`;

const ROW_GRID = "grid grid-cols-[0.75rem_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2";

/** The app's selection highlight, for a field an edit just moved. */
const MOVED_FIELD = "bg-teal-50 border-teal-300";

/**
 * Before → after, one row per window time range. A range only in one set
 * shows "–" on the other side; with no `before` (a new plan) only the windows show.
 */
function RatesDiff({ before, after }: { before?: RateWindow[]; after: RateWindow[] }) {
  const key = (w: RateWindow) => fmtRateWindow(w);
  const was = new Map((before ?? []).map((w) => [key(w), w]));
  const now = new Map(after.map((w) => [key(w), w]));
  const ranges = sortWindows([...(before ?? []), ...after.filter((w) => !was.has(key(w)))]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <th className="px-3 py-2">Window (EAT)</th>
            {before && <th className="px-3 py-2 text-right">Before</th>}
            {before && <th className="w-6" />}
            <th className="px-3 py-2 text-right">{before ? "After" : "Slab 1 / slab 2"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ranges.map((r) => {
            const b = was.get(key(r));
            const a = now.get(key(r));
            const changed = !b || !a || b.slab1 !== a.slab1 || b.slab2 !== a.slab2;
            return (
              <tr key={key(r)}>
                <td className="px-3 py-2 tabular-nums text-slate-600 whitespace-nowrap">{key(r)}</td>
                {before && <td className="px-3 py-2 text-right tabular-nums text-slate-500">{b ? fmtSlabs(b) : "–"}</td>}
                {before && <td className="text-slate-300">{changed && <ArrowRight className="h-3.5 w-3.5" />}</td>}
                <td className={cn("px-3 py-2 text-right tabular-nums", before && changed ? "font-semibold text-slate-800" : "text-slate-700")}>
                  {a ? fmtSlabs(a) : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * New plan, or new rates for an existing one. Windows are edited in whole
 * hours and always cover the day (see hour-rows.ts). Saving asks for
 * confirmation, then applies at once: an existing plan gets a new version in
 * force from now, so swaps already priced (or in progress) keep their rates.
 */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan | null; onClose: () => void }) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();
  const book = usePricingBook();

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;

  const [name, setName] = useState(plan?.name ?? "");
  // A new plan starts as one all-day window with no rates yet.
  const [rows, setRows] = useState<HourRow[]>(() =>
    latest ? windowsToRows(latest.windows, rowKey) : [{ key: rowKey(), start: 0, slab1: "", slab2: "", color: 0 }]
  );
  /** Rate inputs left at least once, "key:slab1"; their errors show from then on. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  /** The neighbour the last edit moved; a new object each time, so its timers restart. */
  const [moved, setMoved] = useState<MovedField | null>(null);
  /** True for the first ~1.5 s of `moved`: its field and bar boundary are highlighted. */
  const [flash, setFlash] = useState(false);
  /** The window under the pointer or focus, by row key, shared by the rows and the bar. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set while the confirmation shows: how many stations the change reaches. */
  const [confirming, setConfirming] = useState<{ stations: number } | null>(null);

  const slabInputs = useRef(new Map<string, HTMLInputElement>());
  const focusNext = useRef<string | null>(null);

  const windows = rowsToWindows(rows);
  const ratesChanged = !latest || !sameWindows(windows, latest.windows);
  const missingRates = rows.some((r) => rateError(r.slab1) || rateError(r.slab2));
  const blocked = splitBlocked(rows);
  const locked = rows.length === 1;

  // Focus a new row's Slab 1 once it has rendered.
  useEffect(() => {
    if (!focusNext.current) return;
    slabInputs.current.get(focusNext.current)?.focus();
    focusNext.current = null;
  });

  // A moved field stays highlighted ~1.5 s; its note stays 4 s.
  useEffect(() => {
    if (!moved) return;
    const fade = setTimeout(() => setFlash(false), 1500);
    const hide = setTimeout(() => setMoved(null), 4000);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, [moved]);

  const apply = (change: RowsChange) => {
    setRows(change.rows);
    setMoved(change.moved);
    setFlash(true);
  };

  /** Any other edit clears the last "Moved to…" note. */
  const clearMoved = () => {
    setMoved(null);
    setFlash(false);
  };

  const setRate = (key: string, field: "slab1" | "slab2", value: string) => {
    clearMoved();
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  // Where the moved boundary now sits on the bar, in seconds past midnight.
  const movedIndex = moved ? rows.findIndex((r) => r.key === moved.key) : -1;
  const pulse =
    flash && movedIndex >= 0
      ? (moved!.field === "from" ? rows[movedIndex].start : rowEnd(rows, movedIndex) || 24) * 3600
      : null;

  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));

  function addWindow() {
    clearMoved();
    const key = rowKey();
    focusNext.current = key;
    setRows((rs) => splitLongest(rs, key));
  }

  /** A name change alone saves straight away; new plans and rate changes confirm first. */
  function handleSave() {
    if (!name.trim()) return setError("Give the plan a name.");
    if (missingRates) return;
    setError(null);
    if (!ratesChanged && plan) {
      const res = renamePlan(plan.id, name, actor);
      if (!res.ok) return setError(res.error);
      toast.success("Plan updated", `${name.trim()} was saved.`);
      return onClose();
    }
    const stations = plan ? stationsOnPlan(book, plan.id, ALL_STATION_IDS, new Date().toISOString()).length : 0;
    setConfirming({ stations });
  }

  function handleConfirm() {
    const version: VersionInput = { windows };
    // A store error (a taken name, say) goes back to the form, where it can be fixed.
    const fail = (message: string) => {
      setConfirming(null);
      setError(message);
    };

    if (!plan) {
      const res = createPlan({ name, version }, actor);
      if (!res.ok) return fail(res.error);
      toast.success("Plan created", `${name.trim()} is ready. Assign stations to put it to use.`);
      return onClose();
    }

    const renamed = renamePlan(plan.id, name, actor);
    if (!renamed.ok) return fail(renamed.error);
    const res = addVersion(plan.id, version, actor);
    if (!res.ok) return fail(res.error);
    toast.success("Rates updated", `${name.trim()}'s new rates apply to swaps from now.`);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={confirming ? (plan ? "Confirm new rates" : "Confirm new plan") : plan ? `Edit ${plan.name}` : "New pricing plan"}
      className="max-w-2xl"
    >
      {confirming ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium text-slate-500">{plan ? "Plan" : "New plan"}</p>
            <p className="text-sm font-semibold text-slate-800">{name.trim()}</p>
          </div>
          <RatesDiff before={latest?.windows} after={windows} />
          <p className="text-sm text-slate-700">
            Affects <span className="font-semibold">{confirming.stations} station{confirming.stations === 1 ? "" : "s"}</span>
            {confirming.stations === 0 && <span className="text-slate-500"> · assign stations from the plan&apos;s Stations tab</span>}
          </p>
          <p className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px text-slate-400" />
            New rates apply to swaps from now. Earlier swaps keep their rates.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button variant="teal" onClick={handleConfirm}>Confirm</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="sm:w-1/2">
            <label htmlFor="plan-name" className={labelCls}>Plan name</label>
            <input
              id="plan-name"
              className={inputCls}
              value={name}
              disabled={plan?.isDefault}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi CBD"
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-700">Time windows (EAT) and rates (KES per kWh)</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Windows always cover the full day. Changing where one ends moves where the next begins.
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">Slab 1: first 3 kWh a day · Slab 2: after</p>
            </div>

            <div className="space-y-2">
              <div className={ROW_GRID}>
                <span />
                <span className={labelCls}>From</span>
                <span className={labelCls}>Until</span>
                <span className={labelCls}>Slab 1</span>
                <span className={labelCls}>Slab 2</span>
                <span />
              </div>
              {rows.map((r, i) => {
                const w = windows[i];
                const label = fmtRateWindow(w);
                const err1 = rateError(r.slab1);
                const err2 = rateError(r.slab2);
                const show1 = err1 && (touched.has(`${r.key}:slab1`) || r.slab1 !== "");
                const show2 = err2 && (touched.has(`${r.key}:slab2`) || r.slab2 !== "");
                const movedHere = moved?.key === r.key ? moved : null;
                return (
                  <div key={r.key}>
                    <div
                      onMouseEnter={() => setHighlight(r.key)}
                      onMouseLeave={() => setHighlight(null)}
                      className={cn(ROW_GRID, "items-start rounded-lg -mx-1 px-1 py-1 transition-colors", highlight === r.key && "bg-slate-50")}
                    >
                      <WindowSwatch color={r.color} className="mt-3" />
                      <HourSelect
                        aria-label={`Window ${i + 1} from`}
                        value={r.start}
                        options={fromChoices(rows, i)}
                        onChange={(h) => apply(setFrom(rows, i, h))}
                        disabled={locked}
                        className={cn(flash && movedHere?.field === "from" && MOVED_FIELD)}
                      />
                      <HourSelect
                        aria-label={`Window ${i + 1} until`}
                        value={untilValue(rows, i)}
                        options={untilChoices(rows, i)}
                        onChange={(v) => apply(setUntil(rows, i, v))}
                        disabled={locked}
                        className={cn(flash && movedHere?.field === "until" && MOVED_FIELD)}
                      />
                      {(["slab1", "slab2"] as const).map((field) => {
                        const err = field === "slab1" ? err1 : err2;
                        const show = field === "slab1" ? show1 : show2;
                        const errId = `${r.key}-${field}-error`;
                        return (
                          <div key={field}>
                            <input
                              ref={(el) => {
                                if (field !== "slab1") return;
                                if (el) slabInputs.current.set(r.key, el);
                                else slabInputs.current.delete(r.key);
                              }}
                              className={cn(inputCls, "tabular-nums", show && "border-red-300")}
                              inputMode="numeric"
                              aria-label={`${field === "slab1" ? "Slab 1" : "Slab 2"} rate, ${label}`}
                              aria-invalid={show ? true : undefined}
                              aria-describedby={show ? errId : undefined}
                              value={r[field]}
                              onChange={(e) => setRate(r.key, field, e.target.value)}
                              onBlur={() => touch(`${r.key}:${field}`)}
                            />
                            {show && <p id={errId} className="mt-1 text-[11px] text-red-600">{err}</p>}
                          </div>
                        );
                      })}
                      {locked ? (
                        <span />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            clearMoved();
                            setRows((rs) => removeRow(rs, r.key));
                          }}
                          aria-label={`Remove window ${label}`}
                          title="Remove window: the one before it takes over its hours"
                          className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Read out by the live region below, so hidden from screen readers here. */}
                    {movedHere && (
                      <p aria-hidden="true" className="pl-6 pb-1 text-[11px] text-slate-500">{movedHere.note}</p>
                    )}
                  </div>
                );
              })}

              <p aria-live="polite" className="sr-only">{moved?.note ?? ""}</p>

              {locked && (
                <p className="text-[11px] text-slate-400">One rate all day. Add a window to charge a different rate at certain hours.</p>
              )}

              <button
                type="button"
                onClick={addWindow}
                disabled={!!blocked}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                  blocked
                    ? "cursor-not-allowed border-slate-200 text-slate-400"
                    : "border-slate-300 text-slate-500 hover:border-zeno-teal hover:bg-teal-50/50 hover:text-zeno-teal"
                )}
              >
                {blocked ?? (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add window
                  </>
                )}
              </button>
            </div>

            <DayBandBar
              items={rows.map((r, i) => ({ id: r.key, window: windows[i], color: r.color }))}
              highlighted={highlight}
              onHighlight={setHighlight}
              pulse={pulse}
            />
          </section>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {missingRates && <p className="mr-auto text-[11px] text-slate-400">Enter both rates for every window to save.</p>}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="teal" onClick={handleSave} disabled={missingRates}>
              {plan ? "Save" : "Create plan"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
