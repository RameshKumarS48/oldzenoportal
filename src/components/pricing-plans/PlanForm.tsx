"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { NOTE_MAX, PLAN_GONE, usePricingStore, validatePlanName, type VersionInput } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { COUNTRIES, COUNTRY_LIST, DEFAULT_COUNTRY, type CountryCode } from "@/lib/pricing/country";
import { SLAB1_DAILY_KWH, defaultPlan, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import {
  BASE_LABEL, MAX_WINDOWS, fmtRateWindow, fmtSlabs, rateRows, rateWarnings, rowChanged, sameWindows, sortWindows, type BaseRates,
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
  typedRate,
  type HourRow,
} from "@/lib/pricing/hour-rows";
import { summarizeMoves } from "@/lib/pricing/moves";
import type { PricingPlan } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { DayBandBar, WindowSwatch, isDefaultRate, versionBands, type BandItem } from "./DayBandBar";
import { HourSelect } from "./HourSelect";
import { StationPicker } from "./StationPicker";
import { inputCls, labelCls, useActorName, useDefaultRate, usePricingBook } from "./shared";

let rowSeq = 0;
const rowKey = () => `w${++rowSeq}`;

/** Stands in for the id of a plan being created, so no station reads as already on it. */
const NEW_PLAN = "pp-new";

/** The note counter turns amber from here, so the limit never comes as a surprise. */
const NOTE_WARN = 450;

const ROW_GRID = "grid grid-cols-[0.75rem_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2";

/** A row's rates and times, for telling whether the form changed. */
const snapshot = (name: string, rows: HourRow[]) =>
  JSON.stringify([name.trim(), rows.map((r) => [r.origin, r.from, r.until, r.slab1.trim(), r.slab2.trim()])]);

/**
 * Each row's colour: grey only while its rates are exactly Default's Default
 * Rate (`defaultRate`; null when the plan's currency isn't Default's), so a
 * filled row whose rates are changed takes a colour of its own. Slots keep
 * theirs; other rows take the colours no slot uses, in time order.
 */
function rowColors(rows: HourRow[], defaultRate: BaseRates | null): Map<string, number | "base"> {
  const used = new Set(rows.filter(isSlot).map((r) => r.color));
  const free = [0, 1, 2, 3, 4, 5].filter((c) => !used.has(c));
  let k = 0;
  const out = new Map<string, number | "base">();
  for (const r of rows) {
    if (isDefaultRate({ slab1: typedRate(r.slab1), slab2: typedRate(r.slab2) }, defaultRate)) out.set(r.key, "base");
    else if (isSlot(r)) out.set(r.key, r.color);
    else out.set(r.key, free.length ? free[k++ % free.length] : 0);
  }
  return out;
}

/** The rows as day-bar bands, each keyed by its row so a moving edge slides. */
const rowBands = (rows: HourRow[], colors: Map<string, number | "base">): BandItem[] =>
  rows.map((r) => ({ id: r.key, window: rowsToWindows([r])[0], color: colors.get(r.key) ?? 0 }));

/** "1 Rates ─ 2 Stations": where a new plan's two steps are. */
function Steps({ step }: { step: "rates" | "stations" }) {
  const dot = (on: boolean, done: boolean) =>
    cn(
      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
      on ? "bg-zeno-teal text-white" : done ? "bg-teal-100 text-zeno-teal" : "bg-slate-100 text-slate-400"
    );
  return (
    <ol className="flex items-center gap-3 text-base" aria-label="Steps">
      <li className={cn("flex items-center gap-2", step === "rates" ? "font-semibold text-slate-800" : "text-slate-500")}>
        <span className={dot(step === "rates", step === "stations")}>1</span> Rates
      </li>
      <li aria-hidden className="h-px w-10 bg-slate-200" />
      <li className={cn("flex items-center gap-2", step === "stations" ? "font-semibold text-slate-800" : "text-slate-500")}>
        <span className={dot(step === "stations", false)}>2</span> Stations
      </li>
    </ol>
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
  max,
}: {
  id: string;
  label: string;
  value: string;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  /** The plan currency's top rate. */
  max: number;
}) {
  const err = rateError(value, max);
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

/** A labelled day bar in the confirmation. */
function ConfirmBar({ label, items, currency }: { label?: string; items: BandItem[]; currency: string }) {
  return (
    <div>
      {label && <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>}
      <DayBandBar items={items} currency={currency} />
    </div>
  );
}

/**
 * A new plan (a full page, in two steps: rates, then stations) or new rates
 * for an existing one (a modal). The user sets the time slots they know (up
 * to five, whole hours, never overlapping), then Fill with Default Rate puts
 * one Default Rate row in each gap. Every row's times and rates can be
 * edited, and a plan can't be saved until all 24 hours have a rate (see
 * hour-rows.ts). An optional note goes into the plan's History.
 *
 * Saving asks for confirmation, showing the day as a bar with soft warnings
 * for rates that look like typos, then applies at once: an existing plan gets
 * a new version in force from now, so swaps already priced (or in progress)
 * keep their rates.
 *
 * `onDone` gets the new plan's id after a create; `onCancel` runs once any
 * unsaved changes are confirmed discarded.
 */
export function PlanForm({
  plan,
  onDone,
  onCancel,
}: {
  plan: PricingPlan | null;
  onDone: (planId?: string) => void;
  onCancel: () => void;
}) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();
  const book = usePricingBook();
  const [now] = useState(() => new Date().toISOString());
  const isPage = !plan;

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;
  const editingDefault = !!plan?.isDefault;
  const fallback = defaultPlan(book);
  const defaultWindows = (versionAt(fallback, now) ?? sortedVersions(fallback)[0]).windows;

  const [name, setName] = useState(plan?.name ?? "");
  // Chosen when the plan is created and fixed after; it sets the currency.
  const [countryCode, setCountryCode] = useState<CountryCode>(plan?.country ?? DEFAULT_COUNTRY);
  const country = COUNTRIES[countryCode];
  // Default is Kenya's plan, so only a Kenya plan can copy (or match) its Default Rate.
  const sameAsDefault = country.code === DEFAULT_COUNTRY;
  const kenyaDefaultRate = useDefaultRate(now);
  const defaultRate = sameAsDefault ? kenyaDefaultRate : null;
  const [note, setNote] = useState("");
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
  /** A new plan is set up in two steps: its rates, then (optionally) its stations. */
  const [step, setStep] = useState<"rates" | "stations">("rates");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const moves = summarizeMoves(book, Array.from(picked), NEW_PLAN, ALL_STATION_IDS, now);

  const windows = rowsToWindows(rows);
  const version: VersionInput = { windows };
  const gaps = gapStretches(rows);
  const covered = 24 - uncoveredHours(rows).length;
  const slotCount = rows.filter(isSlot).length;
  const colors = rowColors(rows, defaultRate);

  const nameError = validatePlanName(name, book.plans, plan?.id);
  const missingRates = rows.some((r) => rateError(r.slab1, country.maxRate) || rateError(r.slab2, country.maxRate));
  const badRates = rows.some((r) => [r.slab1, r.slab2].some((v) => v.trim() !== "" && rateError(v, country.maxRate)));
  const ratesChanged = !latest || !sameWindows(windows, latest.windows);
  const nameChanged = !!plan && name.trim() !== plan.name;
  // A note alone isn't a change: it describes one.
  const dirty =
    snapshot(name, rows) !== initial || picked.size > 0 || note.trim() !== "" || (!plan && countryCode !== DEFAULT_COUNTRY);
  const blocked = addBlocked(rows);

  // The first thing standing in the way of saving, for the footer.
  const blocker = nameError && (touched.has("name") || name.trim() !== "")
    ? nameError
    : !name.trim()
      ? "Name the plan to save."
      : gaps.length > 0
        ? `No rate yet for ${gapText(rows)}.`
        : badRates
          ? `Fix the rates marked in red: whole numbers from 1 to ${country.maxRate.toLocaleString()}.`
          : missingRates
            ? "Enter both rates for every row."
            : plan && !ratesChanged && !nameChanged
              ? "No changes to save."
              : null;
  const canSave = !nameError && gaps.length === 0 && !missingRates && (!plan || ratesChanged || nameChanged);

  // Closing the tab or reloading with unsaved work asks first, on the page only.
  useEffect(() => {
    if (!isPage || !dirty || saving) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [isPage, dirty, saving]);

  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));
  const setRate = (key: string, field: "slab1" | "slab2", value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  function addSlot() {
    const key = rowKey();
    setAdded(key);
    setRows((rs) => addRow(rs, key, rowKey));
  }

  /** Leaving with unsaved changes asks first. */
  function requestClose() {
    if (saving) return;
    if (dirty) setDiscarding(true);
    else onCancel();
  }

  /** A name change alone saves straight away; new plans and rate changes confirm first. */
  function handleSave() {
    touch("name");
    if (!canSave) return;
    setError(null);
    if (plan && !ratesChanged) {
      const res = renamePlan(plan.id, name, actor, note);
      if (!res.ok) return fail(res.error);
      toast.success("Plan updated", `${name.trim()} was saved.`);
      return onDone();
    }
    // A new plan picks its stations next; an edit goes straight to confirming.
    if (!plan) return setStep("stations");
    setConfirming({ stations: stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length });
  }

  /** A store error goes back to the form, where it can be fixed; a deleted plan closes it. */
  function fail(message: string) {
    setSaving(false);
    setConfirming(null);
    if (message === PLAN_GONE) {
      toast.error("Plan not saved", `${PLAN_GONE} It may have been deleted in another tab.`);
      return onCancel();
    }
    // A create error (say the name was taken meanwhile) is fixed on the rates step.
    setStep("rates");
    setError(message);
  }

  function handleConfirm() {
    if (saving) return;
    setSaving(true);
    if (!plan) {
      const res = createPlan({ name, version, stationIds: moves.moves.map((m) => m.id), note, country: countryCode }, actor);
      if (!res.ok) return fail(res.error);
      const n = res.moved ?? 0;
      toast.success(
        "Plan created",
        n > 0
          ? `${name.trim()} is live on ${n} station${n === 1 ? "" : "s"} from now.`
          : `${name.trim()} is ready. Assign stations from its Stations tab to put it to use.`
      );
      return onDone(res.planId);
    }
    if (nameChanged) {
      // The note goes on the rates change, the entry it most likely explains.
      const renamed = renamePlan(plan.id, name, actor);
      if (!renamed.ok) return fail(renamed.error);
    }
    const res = addVersion(plan.id, version, actor, note);
    if (!res.ok) return fail(res.error);
    toast.success("Rates updated", `${name.trim()}'s new rates apply to swaps from now.`);
    onDone();
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
        max={country.maxRate}
      />
    ));

  // Comparing with Default only makes sense in Default's currency.
  const warnings = confirming ? rateWarnings(windows, editingDefault || !sameAsDefault ? null : defaultWindows) : null;
  const stationCount = (n: number) => `${n} station${n === 1 ? "" : "s"}`;

  // ── The rates step ─────────────────────────────────────────────────────────
  const ratesStep = (
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="plan-country" className={labelCls}>Country</label>
          {plan ? (
            // Fixed once the plan exists: its rates and stations are in this country.
            <p id="plan-country" className={cn(inputCls, "bg-slate-50 text-slate-600")}>{country.name}</p>
          ) : (
            <select
              id="plan-country"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value as CountryCode);
                // Stations are in one country, so a change of country clears the picks.
                setPicked(new Set());
              }}
              className={inputCls}
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <span className={labelCls}>Currency</span>
          <p className={cn(inputCls, "bg-slate-50 text-slate-600")} aria-live="polite">
            {country.currency} <span className="text-slate-400">· set by the country</span>
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-700">Your time slots (EAT, {country.currency} per kWh)</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Add the hours you want to price differently, up to {MAX_WINDOWS}.{" "}
            {sameAsDefault ? `Fill the rest with the ${BASE_LABEL}.` : "Then fill the rest of the day and set its rates."}
          </p>
        </div>

        {/* The day stays in view while the rows scroll under it. */}
        <div className="sticky top-0 z-10 -mx-1 bg-white px-1 pt-1 pb-2">
          <DayBandBar items={rowBands(rows, colors)} currency={country.currency} highlighted={highlight} onHighlight={setHighlight} />
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
            const color = colors.get(r.key) ?? 0;
            // Only the actual Default Rate is called that; a changed rate is the plan's own.
            const isDefault = color === "base";
            const label = `${isDefault ? BASE_LABEL : "slot"} ${rowLabel(r)}`;
            return (
              <div
                key={r.key}
                {...hovered(r.key)}
                className={cn("rounded-lg -mx-1 px-1 py-1 transition-colors", highlight === r.key && "bg-slate-50")}
              >
                <div className={cn(ROW_GRID, "items-start")}>
                  <WindowSwatch color={color} className="mt-3" />
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
                  <button
                    type="button"
                    onClick={() => setRows((rs) => removeRow(rs, r.key))}
                    aria-label={`Remove ${label}`}
                    title="Remove: these hours need a rate again"
                    className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {isDefault && <p className="mt-0.5 pl-5 text-[11px] text-slate-400">{BASE_LABEL}</p>}
              </div>
            );
          })}

          {/* A new slot goes in a gap, so once every hour has a rate there's nothing to add. */}
          {gaps.length > 0 && (
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
                  <span className="text-slate-400">({slotCount} of {MAX_WINDOWS})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Coverage: every hour needs a rate before the plan can be saved. */}
        {gaps.length === 0 ? (
          <p role="status" className="flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> All 24 hours have a rate
          </p>
        ) : (
          <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 px-3 py-2.5">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-medium text-slate-800 tabular-nums">{covered} of 24 hours have a rate</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <span>Missing</span>
                {gaps.map((g) => (
                  <span
                    key={g.from}
                    className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 tabular-nums"
                  >
                    {rowLabel(g)}
                  </span>
                ))}
              </div>
            </div>
            {!editingDefault && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRows((rs) => fillFromDefault(rs, sameAsDefault ? defaultWindows : null, rowKey))}
              >
                {sameAsDefault ? `Fill with ${BASE_LABEL}` : "Fill remaining hours"}
              </Button>
            )}
          </div>
        )}
      </section>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="plan-note" className={labelCls}>Note (optional)</label>
          <span className={cn("text-[11px] tabular-nums", note.length >= NOTE_WARN ? "text-amber-700" : "text-slate-400")}>
            {note.length}/{NOTE_MAX}
          </span>
        </div>
        <textarea
          id="plan-note"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={plan ? "Why this change? e.g. Matching CBD demand after 5 pm." : "Why this plan? e.g. Matching CBD demand after 5 pm."}
          className={cn(inputCls, "resize-y")}
        />
        <p className="mt-1 text-[11px] text-slate-400">Shown in the plan&apos;s History.</p>
      </div>

      <Callout variant="info" title="Note">
        <p>
          <span className="font-semibold">Slab 1</span> is the rate per kWh for a rider&apos;s first {SLAB1_DAILY_KWH} kWh each
          day. The count resets at midnight (EAT).
        </p>
        <p>
          <span className="font-semibold">Slab 2</span> is the rate for every kWh after that, the same day. It&apos;s usually the
          same as slab 1 or cheaper.
        </p>
        {sameAsDefault && (
          <p className="tabular-nums">
            <span className="font-semibold">Default plan:</span>{" "}
            {sortWindows(defaultWindows).map((w) => `${fmtRateWindow(w)} at ${fmtSlabs(w)}`).join(", ")} (slab 1 / slab 2).
          </p>
        )}
      </Callout>

      {error && <Callout variant="danger" role="alert">{error}</Callout>}
    </div>
  );

  const blockerHint = blocker && (
    <p
      role="alert"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        // An unchanged edit isn't a mistake, so it stays quiet.
        plan && !ratesChanged && !nameChanged ? "text-slate-500" : "text-red-600"
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      {blocker}
    </p>
  );

  // ── The stations step (new plans only) ─────────────────────────────────────
  const stationsStep = (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Which stations should use {name.trim()}?</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Optional. A station can be on one plan at a time, so picking one here moves it off its current plan. You can also
          assign stations later from the plan&apos;s Stations tab.
        </p>
      </div>
      <StationPicker targetPlanId={NEW_PLAN} selected={picked} onChange={setPicked} now={now} country={countryCode} />
    </div>
  );

  const review = () => setConfirming({ stations: moves.moves.length });

  // ── The confirmation ───────────────────────────────────────────────────────
  const confirmation = confirming && (
    <Modal
      open
      onClose={saving ? () => {} : () => setConfirming(null)}
      title={plan ? "Confirm new rates" : "Confirm new plan"}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{plan ? "Plan" : "New plan"}</p>
          <p className="text-sm font-semibold text-slate-800">{name.trim()}</p>
        </div>

        {latest ? (
          <div className="space-y-3">
            <ConfirmBar label="Current" items={versionBands(latest.windows, defaultRate)} currency={country.currency} />
            <ConfirmBar label="New" items={rowBands(rows, colors)} currency={country.currency} />
            {/* A rate change alone doesn't show on the bars, so spell out what changes. */}
            <div>
              <p className="text-[11px] font-medium text-slate-500">Changes (slab 1 / slab 2)</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-700 tabular-nums">
                {rateRows(latest, version)
                  .filter(rowChanged)
                  .map((r) => (
                    <li key={r.label}>
                      <span className="text-slate-500">{r.label}:</span>{" "}
                      {!r.before ? `added at ${fmtSlabs(r.after!)}` : !r.after ? "removed" : `${fmtSlabs(r.before)} → ${fmtSlabs(r.after)}`}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ) : (
          <ConfirmBar items={rowBands(rows, colors)} currency={country.currency} />
        )}

        {warnings && warnings.items.length > 0 && (
          <ul className="space-y-1">
            {warnings.items.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium tabular-nums">{w.time}:</span> {w.title}
                </span>
              </li>
            ))}
          </ul>
        )}
        {warnings?.matchesDefault && (
          <Callout variant="warning">Same rates as Default at every hour, so this plan changes nothing for riders.</Callout>
        )}

        {note.trim() && (
          <div>
            <p className="text-[11px] font-medium text-slate-500">Note</p>
            <p className="mt-0.5 border-l-2 border-slate-200 pl-3 text-sm text-slate-600 whitespace-pre-line">{note.trim()}</p>
          </div>
        )}

        {!plan ? (
          moves.moves.length === 0 ? (
            <Callout variant="warning">No stations yet. This plan won&apos;t price any swaps until you assign some.</Callout>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{stationCount(moves.moves.length)}</span> {moves.moves.length === 1 ? "moves" : "move"} to this plan.
              </p>
              {moves.emptied.length > 0 && (
                <Callout variant="warning">{moves.emptied.map((p) => p.name).join(", ")} will have no stations left.</Callout>
              )}
            </div>
          )
        ) : (
          <p className="text-sm text-slate-700">
            {editingDefault ? (
              <>Prices <span className="font-semibold">every station not on another plan ({confirming.stations})</span></>
            ) : (
              <>
                Affects <span className="font-semibold">{stationCount(confirming.stations)}</span>
                {confirming.stations === 0 && <span className="text-slate-500">. Assign stations from the plan&apos;s Stations tab.</span>}
              </>
            )}
          </p>
        )}
        <p className="text-xs text-slate-500">New rates apply to swaps from now. Earlier swaps, and swaps in progress, keep their rates.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => setConfirming(null)} disabled={saving}>Back</Button>
          <Button variant="teal" onClick={handleConfirm} loading={saving}>{plan ? "Confirm" : "Create plan"}</Button>
        </div>
      </div>
    </Modal>
  );

  const discard = (
    <ConfirmModal
      open={discarding}
      title="Discard changes?"
      confirmLabel="Discard"
      tone="danger"
      onClose={() => setDiscarding(false)}
      onConfirm={() => {
        setDiscarding(false);
        onCancel();
      }}
    >
      Your changes to {plan ? plan.name : "this new plan"} won&apos;t be saved.
    </ConfirmModal>
  );

  if (!isPage) {
    return (
      <>
        <Modal open onClose={discarding || confirming ? () => {} : requestClose} title={`Edit ${plan.name}`} className="max-w-2xl">
          <div className="space-y-5">
            {ratesStep}
            <div className="flex items-center justify-end gap-3 pt-1">
              {blockerHint && <div className="mr-auto">{blockerHint}</div>}
              <Button variant="secondary" onClick={requestClose}>Cancel</Button>
              <Button variant="teal" onClick={handleSave} disabled={!canSave}>Save</Button>
            </div>
          </div>
        </Modal>
        {confirmation}
        {discard}
      </>
    );
  }

  // The page: the header (title, steps and actions) stays put; the step scrolls under it.
  return (
    <>
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Link
              href="/swap-station-pricing"
              onClick={(e) => {
                if (dirty) {
                  e.preventDefault();
                  requestClose();
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Back to Swap Station Pricing"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h2 className="font-semibold text-slate-800">New pricing plan</h2>
          </div>
          <Steps step={step} />
          <div className="ml-auto flex items-center gap-2">
            {step === "rates" ? (
              <>
                <Button variant="secondary" onClick={requestClose}>Cancel</Button>
                <Button variant="teal" onClick={handleSave} disabled={!canSave}>Next: stations</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setStep("rates")}>Back to rates</Button>
                {/* Opens the confirmation, with or without stations; the count shows there. */}
                <Button variant="teal" onClick={review}>Create plan</Button>
              </>
            )}
          </div>
        </div>
        {step === "rates" && blockerHint && <div className="mt-2 flex justify-end">{blockerHint}</div>}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">{step === "rates" ? ratesStep : stationsStep}</div>
        </div>
      </div>

      {confirmation}
      {discard}
    </>
  );
}
