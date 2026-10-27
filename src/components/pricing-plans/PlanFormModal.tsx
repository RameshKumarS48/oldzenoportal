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
  BASE_LABEL,
  coversText,
  fillBase,
  fmtSlabs,
  freeStretches,
  rateRows,
  rowChanged,
  sameWindows,
  splitVersion,
  type RateRow,
} from "@/lib/pricing/windows";
import {
  addBlocked,
  addRow,
  baseFromChoices,
  baseStretch,
  baseUntilChoices,
  fromChoices,
  rateError,
  removeRow,
  rowLabel,
  rowsToWindows,
  type BaseChange,
  setBaseFrom,
  setBaseUntil,
  setFrom,
  setUntil,
  typedRate,
  untilChoices,
  windowsToRows,
  type HourRow,
} from "@/lib/pricing/hour-rows";
import type { PricingPlan } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { BASE_ID, DayBandBar, WindowSwatch } from "./DayBandBar";
import { HourSelect } from "./HourSelect";
import { inputCls, labelCls, useActorName, usePricingBook } from "./shared";

let rowSeq = 0;
const rowKey = () => `w${++rowSeq}`;

const ROW_GRID = "grid grid-cols-[0.75rem_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2";

const NEW_ROW_NOTE = "New window for the hours removed from rest of the day. Add its rates.";

/** The rest-of-day rates as typed. */
interface BaseInput {
  slab1: string;
  slab2: string;
}

/**
 * Before → after: Rest of the day, then each custom window by its times.
 * A window only after was added, only before was removed. With no `before`
 * (a new plan) only the rates show.
 */
function RatesDiff({ rows, isNew }: { rows: RateRow[]; isNew: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <th className="px-3 py-2">Window (EAT)</th>
            {!isNew && <th className="px-3 py-2 text-right">Before</th>}
            {!isNew && <th className="w-6" />}
            <th className="px-3 py-2 text-right">{isNew ? "Slab 1 / slab 2" : "After"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const changed = rowChanged(r);
            return (
              <tr key={r.label}>
                <td className="px-3 py-2 tabular-nums text-slate-600 whitespace-nowrap">
                  {r.label}
                  {!isNew && !r.base && !r.before && <span className="ml-2 text-[11px] text-slate-400">Added</span>}
                </td>
                {!isNew && <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.before ? fmtSlabs(r.before) : "–"}</td>}
                {!isNew && <td className="text-slate-300">{changed && <ArrowRight className="h-3.5 w-3.5" />}</td>}
                <td className={cn("px-3 py-2 text-right tabular-nums", !isNew && changed ? "font-semibold text-slate-800" : "text-slate-700")}>
                  {r.after ? fmtSlabs(r.after) : "Removed"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A Slab 1 / Slab 2 input with its inline error, shown once the field was left or typed in. */
function RateInput({
  id,
  label,
  value,
  touched,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const err = rateError(value);
  const show = err && (touched || value !== "");
  return (
    <div>
      <input
        className={cn(inputCls, "tabular-nums", show && "border-red-300")}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={show ? true : undefined}
        aria-describedby={show ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {show && <p id={`${id}-error`} className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

/**
 * New plan, or new rates for an existing one: a rest-of-day rate plus up to
 * five custom windows in whole hours that never overlap (see hour-rows.ts).
 * Saving fills every hour outside the custom windows with the rest-of-day
 * rates, asks for confirmation, then applies at once: an existing plan gets a
 * new version in force from now, so swaps already priced (or in progress)
 * keep their rates.
 */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan | null; onClose: () => void }) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();
  const book = usePricingBook();

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;
  const [initial] = useState(() => (latest ? splitVersion(latest) : null));

  const [name, setName] = useState(plan?.name ?? "");
  const [base, setBase] = useState<BaseInput>(() => ({
    slab1: initial?.base ? String(initial.base.slab1) : "",
    slab2: initial?.base ? String(initial.base.slab2) : "",
  }));
  // A new plan starts with the rest-of-day rate only.
  const [rows, setRows] = useState<HourRow[]>(() => (initial ? windowsToRows(initial.custom, rowKey) : []));
  /** Rate inputs left at least once, "key:slab1"; their errors show from then on. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  /** The window under the pointer or focus (BASE_ID or a row key), shared by the rows and the bar. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set while the confirmation shows: how many stations the change reaches. */
  const [confirming, setConfirming] = useState<{ stations: number } | null>(null);
  /** The row Add window just made; its From dropdown takes focus as it mounts. */
  const [added, setAdded] = useState<string | null>(null);
  /** The row a shrinking rest of the day just made: outlined, with a note, until its rates are in. */
  const [released, setReleased] = useState<string | null>(null);
  /** Why the last change to the rest of the day's hours was refused; cleared by the next edit. */
  const [baseError, setBaseError] = useState<string | null>(null);

  const custom = rowsToWindows(rows);
  const baseRates = { slab1: typedRate(base.slab1), slab2: typedRate(base.slab2) };
  const windows = fillBase(custom, baseRates);
  const version: VersionInput = { windows, baseSlab1: baseRates.slab1, baseSlab2: baseRates.slab2 };
  const ratesChanged =
    !latest ||
    !sameWindows(windows, latest.windows) ||
    initial?.base?.slab1 !== baseRates.slab1 ||
    initial?.base?.slab2 !== baseRates.slab2;
  const missingRates = [base, ...rows].some((r) => rateError(r.slab1) || rateError(r.slab2));
  const invalid = missingRates || !name.trim();
  const blocked = addBlocked(rows);
  const stretch = baseStretch(rows);

  /** Every edit to the rows clears a refused rest-of-day change. */
  const edit = (next: HourRow[] | ((rs: HourRow[]) => HourRow[])) => {
    setBaseError(null);
    setRows(next);
  };

  const setRate = (key: string, field: "slab1" | "slab2", value: string) =>
    edit((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  /** Shrink the rest of the day: its freed hours become a new row, whose From takes focus. */
  function changeBase(change: (key: string) => BaseChange) {
    const key = rowKey();
    const res = change(key);
    if (!res.ok) return setBaseError(res.error);
    if (res.rows === rows) return;
    edit(res.rows);
    setAdded(key);
    setReleased(key);
  }

  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));

  function addWindow() {
    const key = rowKey();
    setAdded(key);
    edit((rs) => addRow(rs, key));
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

  const hovered = (id: string) => ({
    onMouseEnter: () => setHighlight(id),
    onMouseLeave: () => setHighlight(null),
  });

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
          <RatesDiff rows={rateRows(latest, version)} isNew={!latest} />
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
                <p className="mt-0.5 text-[11px] text-slate-400">Set rates for specific hours. Every other hour uses the rest-of-day rate.</p>
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

              {/* Rest of the day: always first, never removed. One stretch is edited with From and Until. */}
              <div {...hovered(BASE_ID)} className={cn("rounded-lg -mx-1 px-1 py-1 transition-colors", highlight === BASE_ID && "bg-slate-50")}>
                <p className="pl-5 pb-1 text-xs font-medium text-slate-700">{BASE_LABEL}</p>
                <div className={cn(ROW_GRID, "items-start")}>
                  <WindowSwatch color="base" className="mt-3" />
                  {stretch ? (
                    <>
                      <HourSelect
                        aria-label={`${BASE_LABEL} from`}
                        value={stretch.from}
                        options={baseFromChoices(rows, stretch)}
                        onChange={(h) => changeBase((key) => setBaseFrom(rows, stretch, h, key))}
                      />
                      <HourSelect
                        aria-label={`${BASE_LABEL} until`}
                        value={stretch.until}
                        options={baseUntilChoices(rows, stretch)}
                        onChange={(v) => changeBase((key) => setBaseUntil(rows, stretch, v, key))}
                      />
                    </>
                  ) : (
                    <div className="col-span-2 py-1.5 text-[11px] leading-snug">
                      <p className="text-slate-600 tabular-nums">{coversText(custom)}</p>
                      {rows.length > 0 && freeStretches(custom).length > 0 && (
                        <p className="text-slate-400">Change these hours by editing the custom windows.</p>
                      )}
                    </div>
                  )}
                  {(["slab1", "slab2"] as const).map((field) => (
                    <RateInput
                      key={field}
                      id={`base-${field}`}
                      label={`${field === "slab1" ? "Slab 1" : "Slab 2"} rate, ${BASE_LABEL}`}
                      value={base[field]}
                      touched={touched.has(`base:${field}`)}
                      onChange={(v) => setBase((b) => ({ ...b, [field]: v }))}
                      onBlur={() => touch(`base:${field}`)}
                    />
                  ))}
                  <span />
                </div>
                {baseError && (
                  <p role="alert" className="pl-5 pt-1 text-[11px] text-red-600">{baseError}</p>
                )}
              </div>

              <h4 className="pt-2 text-[11px] font-semibold text-slate-500">Custom windows</h4>

              {rows.map((r, i) => {
                const label = rowLabel(r);
                const fresh = released === r.key && !!(rateError(r.slab1) || rateError(r.slab2));
                return (
                  <div
                    key={r.key}
                    {...hovered(r.key)}
                    className={cn(
                      "rounded-lg -mx-1 px-1 py-1 transition-colors border border-transparent",
                      highlight === r.key && "bg-slate-50",
                      fresh && "border-zeno-teal/40 bg-teal-50/40"
                    )}
                  >
                    <div className={cn(ROW_GRID, "items-start")}>
                      <WindowSwatch color={r.color} className="mt-3" />
                      <HourSelect
                        aria-label={`Window ${i + 1} from`}
                        value={r.from}
                        options={fromChoices(rows, i)}
                        onChange={(h) => edit(setFrom(rows, i, h))}
                        autoFocus={added === r.key}
                      />
                      <HourSelect
                        aria-label={`Window ${i + 1} until`}
                        value={r.until}
                        options={untilChoices(rows, i)}
                        onChange={(v) => edit(setUntil(rows, i, v))}
                      />
                      {(["slab1", "slab2"] as const).map((field) => (
                        <RateInput
                          key={field}
                          id={`${r.key}-${field}`}
                          label={`${field === "slab1" ? "Slab 1" : "Slab 2"} rate, ${label}`}
                          value={r[field]}
                          touched={touched.has(`${r.key}:${field}`)}
                          onChange={(v) => setRate(r.key, field, v)}
                          onBlur={() => touch(`${r.key}:${field}`)}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => edit((rs) => removeRow(rs, r.key))}
                        aria-label={`Remove window ${label}`}
                        title={`Remove window: its hours go back to ${BASE_LABEL.toLowerCase()}`}
                        className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {fresh && <p className="pl-5 pt-1 text-[11px] text-slate-500">{NEW_ROW_NOTE}</p>}
                  </div>
                );
              })}

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
              items={[
                ...freeStretches(custom).map((s) => ({ id: BASE_ID, window: { ...s, ...baseRates }, color: "base" as const })),
                ...rows.map((r, i) => ({ id: r.key, window: custom[i], color: r.color })),
              ]}
              highlighted={highlight}
              onHighlight={setHighlight}
            />
          </section>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {invalid && (
              <p className="mr-auto text-[11px] text-slate-400">
                {name.trim() ? "Enter both rates for every row to save." : "Name the plan and enter every rate to save."}
              </p>
            )}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="teal" onClick={handleSave} disabled={invalid}>
              {plan ? "Save" : "Create plan"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
