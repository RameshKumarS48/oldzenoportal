"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info, Plus, Wand2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { PLAN_GONE, usePricingStore, validatePlanName, type VersionInput } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { SLAB1_DAILY_KWH, defaultPlan, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import {
  BASE_LABEL,
  MAX_WINDOWS,
  fmtRateWindow,
  fmtSlabs,
  sortWindows,
  rateRows,
  rateWarnings,
  rowChanged,
  sameWindows,
  type RateRow,
} from "@/lib/pricing/windows";
import {
  addBlocked,
  addRow,
  cleanRate,
  fillFromDefault,
  fromChoices,
  gapStretches,
  gapText,
  isSlot,
  rateError,
  removeRow,
  rowLabel,
  rowsToWindows,
  setFrom,
  setUntil,
  uncoveredHours,
  untilChoices,
  windowsToRows,
  type HourRow,
} from "@/lib/pricing/hour-rows";
import type { PricingPlan } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { DayBandBar, WindowSwatch } from "./DayBandBar";
import { HourSelect } from "./HourSelect";
import { inputCls, labelCls, useActorName, usePricingBook } from "./shared";

let rowSeq = 0;
const rowKey = () => `w${++rowSeq}`;

const ROW_GRID = "grid grid-cols-[0.75rem_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2";

/** A row's rates and times, for telling whether the form changed. */
const snapshot = (name: string, rows: HourRow[]) =>
  JSON.stringify([name.trim(), rows.map((r) => [r.origin, r.from, r.until, r.slab1.trim(), r.slab2.trim()])]);

/**
 * Before → after: every window by its times, rest-of-day stretches tagged. A
 * window only after was added, only before was removed. With no `before` (a
 * new plan) only the rates show.
 */
function RatesDiff({ rows, isNew }: { rows: RateRow[]; isNew: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <th className="px-3 py-2">Time (EAT)</th>
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
                  {r.base && <span className="ml-2 text-[11px] text-slate-400">{BASE_LABEL}</span>}
                  {!isNew && !r.before && <span className="ml-2 text-[11px] text-slate-400">Added</span>}
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
        onChange={(e) => onChange(cleanRate(e.target.value))}
        onBlur={onBlur}
      />
      {show && <p id={`${id}-error`} className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

/**
 * New plan, or new rates for an existing one. The user sets the time slots
 * they know (up to five, whole hours, never overlapping), then Fill remaining
 * hours with Default copies Default's rates into every other hour. A plan
 * can't be saved until all 24 hours have a rate (see hour-rows.ts).
 *
 * Saving asks for confirmation, with soft warnings for rates that look like
 * typos, then applies at once: an existing plan gets a new version in force
 * from now, so swaps already priced (or in progress) keep their rates.
 */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan | null; onClose: () => void }) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();
  const book = usePricingBook();
  const [now] = useState(() => new Date().toISOString());

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;
  const editingDefault = !!plan?.isDefault;
  const fallback = defaultPlan(book);
  const defaultWindows = (versionAt(fallback, now) ?? sortedVersions(fallback)[0]).windows;

  const [name, setName] = useState(plan?.name ?? "");
  // A new plan starts with one empty slot; an existing one with its saved windows.
  const [rows, setRows] = useState<HourRow[]>(() => (latest ? windowsToRows(latest.windows, rowKey) : addRow([], rowKey(), rowKey)));
  const [initial] = useState(() => snapshot(name, rows));
  /** Fields left at least once, "key:slab1" or "name"; their errors show from then on. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  /** The row under the pointer or focus, shared by the rows and the bar. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set while the confirmation shows: how many stations the change reaches. */
  const [confirming, setConfirming] = useState<{ stations: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  /** The slot Add slot just made; its From dropdown takes focus as it mounts. */
  const [added, setAdded] = useState<string | null>(null);

  const windows = rowsToWindows(rows);
  const version: VersionInput = { windows };
  const gaps = gapStretches(rows);
  const covered = 24 - uncoveredHours(rows).length;
  const slots = rows.filter(isSlot);
  const restRows = rows.filter((r) => !isSlot(r));

  const nameError = validatePlanName(name, book.plans, plan?.id);
  const missingRates = rows.some((r) => rateError(r.slab1) || rateError(r.slab2));
  const badRates = rows.some((r) => [r.slab1, r.slab2].some((v) => v.trim() !== "" && rateError(v)));
  const ratesChanged = !latest || !sameWindows(windows, latest.windows);
  const nameChanged = !!plan && name.trim() !== plan.name;
  const dirty = snapshot(name, rows) !== initial;
  const blocked = addBlocked(rows);

  // The first thing standing in the way of saving, for the footer.
  const blocker = nameError && (touched.has("name") || name.trim() !== "")
    ? nameError
    : !name.trim()
      ? "Name the plan to save."
      : gaps.length > 0
        ? `No rate yet for ${gapText(rows)}.`
        : badRates
          ? "Fix the rates marked in red: whole numbers from 1 to 500."
          : missingRates
            ? "Enter both rates for every row."
            : plan && !ratesChanged && !nameChanged
              ? "No changes to save."
              : null;
  const canSave = !nameError && gaps.length === 0 && !missingRates && (!plan || ratesChanged || nameChanged);

  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));
  const setRate = (key: string, field: "slab1" | "slab2", value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  function addSlot() {
    const key = rowKey();
    setAdded(key);
    setRows((rs) => addRow(rs, key, rowKey));
  }

  /** Closing with unsaved changes asks first. */
  function requestClose() {
    if (saving) return;
    if (dirty) setDiscarding(true);
    else onClose();
  }

  /** A name change alone saves straight away; new plans and rate changes confirm first. */
  function handleSave() {
    touch("name");
    if (!canSave) return;
    setError(null);
    if (plan && !ratesChanged) {
      const res = renamePlan(plan.id, name, actor);
      if (!res.ok) return fail(res.error);
      toast.success("Plan updated", `${name.trim()} was saved.`);
      return onClose();
    }
    const stations = plan ? stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length : 0;
    setConfirming({ stations });
  }

  /** A store error goes back to the form, where it can be fixed; a deleted plan closes it. */
  function fail(message: string) {
    setSaving(false);
    setConfirming(null);
    if (message === PLAN_GONE) {
      toast.error("Plan not saved", `${PLAN_GONE} It may have been deleted in another tab.`);
      return onClose();
    }
    setError(message);
  }

  function handleConfirm() {
    if (saving) return;
    setSaving(true);
    if (!plan) {
      const res = createPlan({ name, version }, actor);
      if (!res.ok) return fail(res.error);
      toast.success("Plan created", `${name.trim()} is ready. Assign stations to put it to use.`);
      return onClose();
    }
    if (nameChanged) {
      const renamed = renamePlan(plan.id, name, actor);
      if (!renamed.ok) return fail(renamed.error);
    }
    const res = addVersion(plan.id, version, actor);
    if (!res.ok) return fail(res.error);
    toast.success("Rates updated", `${name.trim()}'s new rates apply to swaps from now.`);
    onClose();
  }

  const hovered = (id: string) => ({
    onMouseEnter: () => setHighlight(id),
    onMouseLeave: () => setHighlight(null),
  });

  const rateInputs = (r: HourRow, label: string) =>
    (["slab1", "slab2"] as const).map((field) => (
      <RateInput
        key={field}
        id={`${r.key}-${field}`}
        label={`${field === "slab1" ? "Slab 1" : "Slab 2"} rate, ${label}`}
        value={r[field]}
        touched={touched.has(`${r.key}:${field}`)}
        onChange={(v) => setRate(r.key, field, v)}
        onBlur={() => touch(`${r.key}:${field}`)}
      />
    ));

  const removeButton = (r: HourRow, label: string, title: string) => (
    <button
      type="button"
      onClick={() => setRows((rs) => removeRow(rs, r.key))}
      aria-label={`Remove ${label}`}
      title={title}
      className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
    >
      <X className="w-4 h-4" />
    </button>
  );

  const warnings = confirming ? rateWarnings(windows, editingDefault ? null : defaultWindows) : null;
  const singleWarning = !!warnings && warnings.items.length + (warnings.matchesDefault ? 1 : 0) === 1;

  return (
    <>
      <Modal
        open
        onClose={discarding ? () => {} : requestClose}
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
            {warnings && (warnings.items.length > 0 || warnings.matchesDefault) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900" role="alert">
                <div className="flex items-start gap-2 border-b border-amber-200 px-3 py-2.5">
                  <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">
                      Please double-check {singleWarning ? "this rate" : "these rates"}
                    </p>
                    <p className="text-amber-800">
                      {singleWarning
                        ? "It's allowed, but looks unusual. Confirm if it's right, or go Back to change it."
                        : "They're allowed, but look unusual. Confirm if they're right, or go Back to change them."}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-amber-200">
                  {warnings.matchesDefault && (
                    <li className="px-3 py-2.5">
                      <p className="font-semibold">Same as Default at every hour</p>
                      <p className="mt-0.5 text-amber-800">Stations on this plan would pay exactly what they pay on Default, so the plan changes nothing.</p>
                    </li>
                  )}
                  {warnings.items.map((w) => (
                    <li key={`${w.kind}-${w.time}`} className="px-3 py-2.5">
                      <p className="font-semibold">
                        <span className="tabular-nums">{w.time}</span> · {w.title}
                      </p>
                      <p className="mt-0.5 text-amber-800">{w.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-slate-700">
              {editingDefault ? (
                <>Prices <span className="font-semibold">every station not on another plan ({confirming.stations})</span></>
              ) : (
                <>
                  Affects <span className="font-semibold">{confirming.stations} station{confirming.stations === 1 ? "" : "s"}</span>
                  {confirming.stations === 0 && <span className="text-slate-500"> · assign stations from the plan&apos;s Stations tab</span>}
                </>
              )}
            </p>
            <p className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px text-slate-400" />
              New rates apply to swaps from now. Earlier swaps, and swaps already in progress, keep their rates.
            </p>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setConfirming(null)} disabled={saving}>Back</Button>
              <Button variant="teal" onClick={handleConfirm} loading={saving}>Confirm</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="sm:w-1/2">
              <label htmlFor="plan-name" className={labelCls}>Plan name</label>
              <input
                id="plan-name"
                className={cn(inputCls, nameError && touched.has("name") && "border-red-300")}
                value={name}
                maxLength={80}
                disabled={editingDefault}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => touch("name")}
                placeholder="e.g. Nairobi CBD"
                aria-invalid={nameError && touched.has("name") ? true : undefined}
              />
              {nameError && touched.has("name") && <p className="mt-1 text-[11px] text-red-600">{nameError}</p>}
            </div>

            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700">Your time slots (EAT, KES per kWh)</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Add the hours you want to price differently, up to {MAX_WINDOWS}. Fill the rest from Default.
                  </p>
                </div>
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

                {slots.length === 0 && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">No time slots: every hour uses the rates below.</p>
                )}

                {rows.map((r, i) => {
                  if (!isSlot(r)) return null;
                  const label = `slot ${rowLabel(r)}`;
                  return (
                    <div
                      key={r.key}
                      {...hovered(r.key)}
                      className={cn("rounded-lg -mx-1 px-1 py-1 transition-colors", highlight === r.key && "bg-slate-50")}
                    >
                      <div className={cn(ROW_GRID, "items-start")}>
                        <WindowSwatch color={r.color} className="mt-3" />
                        <HourSelect
                          aria-label={`${label} from`}
                          value={r.from}
                          options={fromChoices(rows, i)}
                          onChange={(h) => setRows(setFrom(rows, i, h, rowKey))}
                          autoFocus={added === r.key}
                        />
                        <HourSelect
                          aria-label={`${label} until`}
                          value={r.until}
                          options={untilChoices(rows, i)}
                          onChange={(v) => setRows(setUntil(rows, i, v, rowKey))}
                        />
                        {rateInputs(r, label)}
                        {removeButton(r, label, "Remove this slot: its hours need a rate again")}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addSlot}
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
                      <Plus className="w-3.5 h-3.5" /> Add slot
                    </>
                  )}
                </button>
              </div>

              {/* Coverage: every hour needs a rate before the plan can be saved. */}
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2 text-xs",
                  gaps.length === 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                )}
                role="status"
              >
                {gaps.length === 0 ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All 24 hours covered
                  </span>
                ) : (
                  <span className="tabular-nums">
                    <span className="font-medium">{covered} of 24 hours covered</span> · No rate yet: {gapText(rows)}
                  </span>
                )}
                {!editingDefault && gaps.length > 0 && (
                  <Button
                    size="sm"
                    variant="teal"
                    className="ml-auto"
                    onClick={() => setRows((rs) => fillFromDefault(rs, defaultWindows, rowKey))}
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Fill remaining hours with Default
                  </Button>
                )}
              </div>

              {restRows.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500">{BASE_LABEL}</h4>
                    {!editingDefault && (
                      <p className="text-[11px] text-slate-400">Copied from Default&apos;s rates at these hours. Change any rate if you need to.</p>
                    )}
                  </div>
                  {restRows.map((r) => {
                    const label = `${BASE_LABEL.toLowerCase()} ${rowLabel(r)}`;
                    return (
                      <div
                        key={r.key}
                        {...hovered(r.key)}
                        className={cn("rounded-lg -mx-1 px-1 py-1 transition-colors", highlight === r.key && "bg-slate-50")}
                      >
                        <div className={cn(ROW_GRID, "items-start")}>
                          <WindowSwatch color="base" className="mt-3" />
                          <p className="col-span-2 self-center text-sm text-slate-600 tabular-nums">{rowLabel(r)}</p>
                          {rateInputs(r, label)}
                          {removeButton(r, label, "Remove: these hours need a rate again")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <DayBandBar
                items={rows.map((r, i) => ({ id: r.key, window: windows[i], color: isSlot(r) ? r.color : ("base" as const) }))}
                highlighted={highlight}
                onHighlight={setHighlight}
              />

              <div className="flex gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
                <Info className="mt-px h-4 w-4 shrink-0 text-sky-600" />
                <div className="space-y-1">
                  <p className="font-semibold">Note</p>
                  <p>
                    <span className="font-semibold">Slab 1</span> is the rate per kWh for a rider&apos;s first {SLAB1_DAILY_KWH} kWh
                    each day. The count resets at midnight (EAT).
                  </p>
                  <p>
                    <span className="font-semibold">Slab 2</span> is the rate for every kWh after that, the same day. It&apos;s
                    usually the same as slab 1 or cheaper.
                  </p>
                  <p className="tabular-nums">
                    <span className="font-semibold">Default plan:</span>{" "}
                    {sortWindows(defaultWindows).map((w) => `${fmtRateWindow(w)} at ${fmtSlabs(w)}`).join(" · ")} (slab 1 / slab 2, KES per kWh).
                  </p>
                </div>
              </div>
            </section>

            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            {blocker && (
              <p
                role="alert"
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                  // An unchanged edit isn't a mistake, so it stays quiet.
                  plan && !ratesChanged && !nameChanged
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-red-200 bg-red-50 text-red-700"
                )}
              >
                <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                {blocker}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={requestClose}>Cancel</Button>
              <Button variant="teal" onClick={handleSave} disabled={!canSave}>
                {plan ? "Save" : "Create plan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={discarding}
        title="Discard changes?"
        confirmLabel="Discard"
        tone="danger"
        onClose={() => setDiscarding(false)}
        onConfirm={onClose}
      >
        Your changes to {plan ? plan.name : "this new plan"} won&apos;t be saved.
      </ConfirmModal>
    </>
  );
}
