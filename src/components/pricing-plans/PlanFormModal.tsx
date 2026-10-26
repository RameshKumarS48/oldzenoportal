"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Info, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast";
import { usePricingStore, type VersionInput } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { sortedVersions, stationsOnPlan } from "@/lib/pricing/engine";
import {
  MAX_WINDOWS,
  fmtHHmmss,
  fmtRateWindow,
  fmtSlabs,
  parseHHmmss,
  sameWindows,
  sortWindows,
  validateWindows,
  windowSeconds,
} from "@/lib/pricing/windows";
import type { PricingPlan, RateWindow } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { DayBandBar } from "./DayBandBar";
import { inputCls, labelCls, useActorName, usePricingBook } from "./shared";

/** A window as the form edits it: its start and two rates. Its end is the second before the next start. */
interface WindowRow {
  key: string;
  start: string;
  slab1: string;
  slab2: string;
}

let rowSeq = 0;
const rowKey = () => `w${++rowSeq}`;

/** `<input type="time" step="1">` can drop ":00" seconds; keep "HH:mm:ss". */
function withSeconds(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

/**
 * Rows chained into windows: sorted by start, each ends the second before the
 * next one starts and the last wraps to the first, so they always cover the
 * day once. Only the start times and rates can be wrong.
 */
function rowsToWindows(rows: WindowRow[]): RateWindow[] {
  const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.map((r, i) => ({
    start: r.start,
    end: fmtHHmmss(parseHHmmss(sorted[(i + 1) % sorted.length].start) - 1),
    slab1: r.slab1.trim() === "" ? NaN : Number(r.slab1),
    slab2: r.slab2.trim() === "" ? NaN : Number(r.slab2),
  }));
}

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
 * New plan, or new rates for an existing one. Saving asks for confirmation,
 * then applies at once: an existing plan gets a new version in force from now,
 * so swaps already priced (or in progress) keep the rates they started on.
 */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan | null; onClose: () => void }) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();
  const book = usePricingBook();

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;
  // A new plan starts from Default's latest windows.
  const defaultPlan = usePricingStore((s) => s.plans.find((p) => p.isDefault));
  const startingWindows = latest?.windows ?? (defaultPlan ? sortedVersions(defaultPlan).at(-1)?.windows : undefined) ?? [];

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [rows, setRows] = useState<WindowRow[]>(() =>
    sortWindows(startingWindows).map((w) => ({ key: rowKey(), start: w.start, slab1: String(w.slab1), slab2: String(w.slab2) }))
  );
  const [error, setError] = useState<string | null>(null);
  /** Set while the confirmation shows: how many stations the change reaches. */
  const [confirming, setConfirming] = useState<{ stations: number } | null>(null);

  const windows = rowsToWindows(rows);
  const windowError = validateWindows(windows);
  const endOf = new Map(windows.map((w) => [w.start, w.end]));
  const ratesChanged = !latest || !sameWindows(windows, latest.windows);

  const setRow = (key: string, patch: Partial<WindowRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /** Back into start order once a start time is done changing. */
  const sortRows = () => setRows((rs) => [...rs].sort((a, b) => a.start.localeCompare(b.start)));

  /** Split the longest window at its midpoint, rounded down to the minute; the new half copies its rates. */
  function addWindow() {
    const longest = windows.reduce((a, b) => (windowSeconds(b) > windowSeconds(a) ? b : a));
    const half = Math.floor(windowSeconds(longest) / 2 / 60) * 60;
    if (half < 60) return;
    const source = rows.find((r) => r.start === longest.start);
    const start = fmtHHmmss(parseHHmmss(longest.start) + half);
    setRows((rs) =>
      [...rs, { key: rowKey(), start, slab1: source?.slab1 ?? "", slab2: source?.slab2 ?? "" }].sort((a, b) =>
        a.start.localeCompare(b.start)
      )
    );
  }

  /** The window before it takes over the removed one's time. */
  const removeWindow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  /** Rate changes and new plans confirm first; a name or description change saves straight away. */
  function handleSave() {
    if (!name.trim()) return setError("Give the plan a name.");
    setError(null);
    // Already shown under the windows.
    if (windowError) return;
    if (!ratesChanged && plan) {
      const res = renamePlan(plan.id, name, description, actor);
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
      const res = createPlan({ name, description, version }, actor);
      if (!res.ok) return fail(res.error);
      toast.success("Plan created", `${name.trim()} is ready. Assign stations to put it to use.`);
      return onClose();
    }

    const renamed = renamePlan(plan.id, name, description, actor);
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
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Plan name</label>
              <input
                className={inputCls}
                value={name}
                disabled={plan?.isDefault}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nairobi CBD"
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input
                className={inputCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who it's for"
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-semibold text-slate-700">Time windows (EAT) and rates (KES per kWh)</h3>
              <p className="text-[11px] text-slate-400">Slab 1: first 3 kWh a day · Slab 2: after</p>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2">
                <span className={labelCls}>From</span>
                <span className={labelCls}>Until</span>
                <span className={labelCls}>Slab 1</span>
                <span className={labelCls}>Slab 2</span>
                <span />
              </div>
              {rows.map((r) => {
                const end = endOf.get(r.start);
                const bad = (v: string) => !(Number(v) > 0);
                return (
                  <div key={r.key} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 items-center">
                    <input
                      className={cn(inputCls, "tabular-nums")}
                      type="time"
                      step={1}
                      aria-label="Window starts"
                      value={r.start}
                      onChange={(e) => e.target.value && setRow(r.key, { start: withSeconds(e.target.value) })}
                      onBlur={sortRows}
                    />
                    <span className="px-1 text-sm tabular-nums text-slate-500">{end ?? "–"}</span>
                    <input
                      className={cn(inputCls, "tabular-nums", bad(r.slab1) && "border-red-300")}
                      type="number"
                      min={1}
                      step="0.5"
                      aria-label={`Slab 1 rate from ${r.start}`}
                      value={r.slab1}
                      onChange={(e) => setRow(r.key, { slab1: e.target.value })}
                    />
                    <input
                      className={cn(inputCls, "tabular-nums", bad(r.slab2) && "border-red-300")}
                      type="number"
                      min={1}
                      step="0.5"
                      aria-label={`Slab 2 rate from ${r.start}`}
                      value={r.slab2}
                      onChange={(e) => setRow(r.key, { slab2: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeWindow(r.key)}
                      disabled={rows.length === 1}
                      aria-label={`Remove the window from ${r.start}`}
                      title="Remove window: the one before it takes over its time"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={addWindow} disabled={rows.length >= MAX_WINDOWS}>
                  <Plus className="w-3.5 h-3.5" /> Add window
                </Button>
                <p className="text-[11px] text-slate-400">Each window runs until the second before the next one starts.</p>
              </div>
              {windowError && <p className="text-xs text-red-600">{windowError}</p>}
            </div>
            <DayBandBar windows={windows.map((w) => ({ ...w, slab1: w.slab1 || 0, slab2: w.slab2 || 0 }))} />
          </section>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="teal" onClick={handleSave}>
              {plan ? "Save" : "Create plan"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
