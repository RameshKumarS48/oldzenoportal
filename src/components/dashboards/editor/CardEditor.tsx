"use client";

/**
 * The card editor. One pick ("Swaps") already makes a valid card; everything
 * under it is optional and only ever offers what fits the data chosen, so a
 * card that can't be drawn can't be built. The preview on the right is the
 * card as it will appear.
 */
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { autoTitle, cardSplitOptions, fieldOptions, getRecord, measureLabel, measureOptions, resolveField, splitOptions } from "@/lib/dashboards/registry";
import { cardErrors, cardKey, LIMITS, tidyCard } from "@/lib/dashboards/rules";
import type { SearchItem } from "@/lib/dashboards/search";
import { effectiveView, maxSplits, shapeOf, startsOverTime, VIEW_LABELS, viewsFor } from "@/lib/dashboards/shape";
import { allowedGrains, GRAIN_LABELS, RANGE_PRESETS, rangeText, resolveRange } from "@/lib/dashboards/time";
import type { QueryContext } from "@/lib/dashboards/query";
import type { Card, CardKind, Dashboard, FieldRef, Grain, Measure, PresetId, ViewId } from "@/lib/dashboards/types";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import { dashboards, useQuery, useRegistry, type Me } from "../api";
import { CardBody, Message } from "../CardBody";
import { ADD, FilterRows, SMALL } from "./FilterRows";
import { RegistrySearch } from "./RegistrySearch";

export type EditorStart = { kind: CardKind } | { card: Card };

const KIND_NAMES: Record<CardKind, string> = { chart: "card", funnel: "funnel", flow: "flow", retention: "retention card", records: "records card", note: "note" };
const blank = (kind: CardKind): Card => ({ id: "", kind, measures: [], overTime: false, splits: [], filters: [], time: {}, ...(kind === "funnel" ? { steps: [] } : {}), ...(kind === "note" ? { text: "" } : {}) });
const refKey = (r: FieldRef | undefined) => (r ? `${r.via ?? ""}|${r.field}` : "");
const measureKey = (m: Measure) => `${m.fn}|${m.field ?? ""}|${m.metricId ?? ""}`;
const LABEL = "mb-1 block text-[11px] font-medium text-slate-500";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className={LABEL}>{label}</p>{children}</div>;
}

/** A chosen record with "Change", or the search to choose one. */
function Pick({ value, me, only, placeholder, onPick }: { value: string | null; me: Me; only?: "record"; placeholder: string; onPick: (item: SearchItem) => void }) {
  const [open, setOpen] = useState(false);
  if (!value || open) return <RegistrySearch me={me} only={only} placeholder={placeholder} autoFocus={!value || open} onPick={(item) => { setOpen(false); onPick(item); }} />;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
      <span className="truncate text-sm font-medium text-slate-800">{value}</span>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-xs font-medium text-zeno-teal hover:underline">Change</button>
    </div>
  );
}

export function CardEditor({ dashboard, me, ctx, start, onClose }: { dashboard: Dashboard; me: Me; ctx: QueryContext; start: EditorStart; onClose: () => void }) {
  const registry = useRegistry();
  const [initial] = useState<Card>(() => ("card" in start ? start.card : blank(start.kind)));
  const [draft, setDraft] = useState<Card>(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // A ref, not state: two clicks in the same instant must not add the card twice.
  const busy = useRef(false);
  // Whether a second search is open: for the measure to compare with, or a funnel's next step.
  const [comparing, setComparing] = useState(false);
  const adding = !initial.id;
  const kind = draft.kind;

  const first = draft.measures[0];
  const record = getRecord(registry, first?.record);
  const errors = useMemo(() => cardErrors(registry, draft, ctx.today), [registry, draft, ctx.today]);
  const views = viewsFor(registry, draft);
  const view = effectiveView(registry, draft);
  const range = draft.time.range ? resolveRange(draft.time.range, ctx.today) : ctx.range;
  const duplicate = !errors.length && dashboard.cards.some((c) => c.id !== draft.id && cardKey(c) === cardKey(draft));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const query = useQuery(draft, ctx, errors.length === 0);

  /** Applies a change, then drops whatever no longer fits and says what was dropped. */
  function apply(next: Card, previousRecord?: string) {
    const tidy = tidyCard(registry, next, previousRecord);
    setDraft(tidy.card);
    setNotice(tidy.dropped.length ? `Removed: ${tidy.dropped.join(", ")}. ${getRecord(registry, tidy.card.measures[0]?.record)?.name ?? "This data"} ${tidy.dropped.length > 1 ? "don’t have those fields" : "doesn’t have that field"}.` : null);
  }
  const patch = (p: Partial<Card>) => apply({ ...draft, ...p });

  function pickData(item: SearchItem) {
    const previous = first?.record;
    const fresh = !first;
    apply({ ...draft, measures: [item.measure, ...draft.measures.slice(1)], overTime: kind === "chart" && fresh ? startsOverTime(registry, item.measure.record) : draft.overTime, time: previous === item.measure.record ? draft.time : { ...draft.time, field: undefined } }, previous);
  }

  function close() { if (dirty) setLeaving(true); else onClose(); }

  function save() {
    setTried(true);
    if (errors.length || busy.current) return;
    busy.current = true;
    const card = { ...draft, title: draft.title?.trim() || undefined };
    const out = adding ? dashboards().addCard(dashboard.id, dashboard.version, card, me) : dashboards().updateCard(dashboard.id, dashboard.version, card, me);
    if (!out.ok) { busy.current = false; toast.error(adding ? "Couldn’t add the card" : "Couldn’t save the card", out.error); return; }
    onClose();
  }

  // ── The sentence, by kind ──────────────────────────────────────────────────

  const timeRows = kind !== "note" && (
    <details className="group rounded-lg border border-slate-200">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">More options</summary>
      <div className="space-y-3 border-t border-slate-100 p-3">
        {kind === "chart" && first && (
          <Row label="Compare with">
            {draft.measures[1] ? (
              <div className="flex items-center gap-1.5">
                <select aria-label="Second measure" value={measureKey(draft.measures[1])} className={SMALL}
                  onChange={(e) => { const o = measureOptions(registry, draft.measures[1].record).find((x) => measureKey(x.measure) === e.target.value); if (o) patch({ measures: [first, o.measure] }); }}>
                  {measureOptions(registry, draft.measures[1].record).map((o) => <option key={measureKey(o.measure)} value={measureKey(o.measure)}>{o.label}</option>)}
                </select>
                <button type="button" aria-label="Remove the second measure" onClick={() => patch({ measures: [first] })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : comparing ? (
              <RegistrySearch me={me} placeholder="Search for a second measure" onPick={(item) => { setComparing(false); patch({ measures: [first, item.measure] }); }} />
            ) : (
              <button type="button" className={ADD} onClick={() => setComparing(true)}><Plus className="h-3.5 w-3.5" /> Another measure</button>
            )}
          </Row>
        )}
        <Row label="Time range">
          <select aria-label="Time range" className={SMALL} value={draft.time.range?.preset ?? ""}
            onChange={(e) => patch({ time: { ...draft.time, range: e.target.value ? { preset: e.target.value as PresetId, ...(e.target.value === "custom" ? { from: ctx.range.from, to: ctx.range.to } : {}) } : undefined } })}>
            <option value="">Same as the dashboard</option>
            {RANGE_PRESETS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            <option value="custom">Custom range</option>
          </select>
          {draft.time.range?.preset === "custom" && (
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["from", "to"] as const).map((k) => (
                <label key={k} className="text-[11px] text-slate-500">{k === "from" ? "From" : "To"}
                  <input type="date" max={ctx.today} value={draft.time.range?.[k] ?? ""} onChange={(e) => patch({ time: { ...draft.time, range: { ...draft.time.range!, [k]: e.target.value } } })} className={cn(SMALL, "mt-0.5")} />
                </label>
              ))}
            </div>
          )}
        </Row>
        {kind === "chart" && record?.kind === "event" && draft.measures.length === 1 && !draft.splits.length && (
          <Row label="Compare to">
            <select aria-label="Compare to" className={SMALL} value={draft.time.compare ?? ""} onChange={(e) => patch({ time: { ...draft.time, compare: (e.target.value || undefined) as Card["time"]["compare"] } })}>
              <option value="">{draft.overTime ? "Nothing" : "The period before"}</option>
              {draft.overTime && <option value="previous">The period before</option>}
              <option value="year">The same period a year earlier</option>
            </select>
          </Row>
        )}
        <Row label="Heading">
          <input aria-label="Heading" value={draft.title ?? ""} maxLength={80} placeholder={autoTitle(registry, draft)} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={SMALL} />
        </Row>
      </div>
    </details>
  );

  // Always in view, so nobody has to open More options to learn which period the card covers.
  const timeNote = kind !== "note" && (
    <p className="text-[11px] text-slate-500">
      Time range: <span className="font-medium text-slate-700">{rangeText(draft.time.range ?? dashboard.range, ctx.today)}</span>
      {draft.time.range ? ", set for this card." : ", the dashboard’s."} Change it under More options.
    </p>
  );

  let form: React.ReactNode;
  if (kind === "note") {
    form = (
      <Row label="Note">
        <textarea autoFocus aria-label="Note" rows={7} value={draft.text ?? ""} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className={cn(SMALL, "resize-none")} />
        <p className={cn("mt-1 text-right text-[11px] tabular-nums", (draft.text?.length ?? 0) > LIMITS.noteMax ? "text-red-600" : "text-slate-400")}>{draft.text?.length ?? 0} / {LIMITS.noteMax}</p>
      </Row>
    );
  } else if (kind === "funnel") {
    const steps = draft.steps ?? [];
    const setSteps = (next: NonNullable<Card["steps"]>) => setDraft({ ...draft, steps: next });
    form = (
      <>
        <Row label="Steps, in order">
          <ol className="space-y-1.5">
            {steps.map((s, i) => {
              const fields = fieldOptions(registry, s.record, ["category"]).filter((o) => !o.ref.via);
              const field = fields.find((o) => o.field.id === s.where?.field);
              return (
                <li key={i} className="rounded-lg border border-slate-200 p-2">
                  <div className="flex items-center gap-1">
                    <span className="w-4 text-xs tabular-nums text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{getRecord(registry, s.record)?.name ?? "Unavailable data"}</span>
                    <button type="button" aria-label={`Move step ${i + 1} earlier`} disabled={i === 0} onClick={() => { const n = [...steps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setSteps(n); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={`Move step ${i + 1} later`} disabled={i === steps.length - 1} onClick={() => { const n = [...steps]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setSteps(n); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  {fields.length > 0 && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 pl-5">
                      <select aria-label={`Step ${i + 1}: only where`} className={SMALL} value={s.where?.field ?? ""}
                        onChange={(e) => { const f = fields.find((o) => o.field.id === e.target.value); setSteps(steps.map((x, j) => (j === i ? { record: x.record, ...(f ? { where: { field: f.field.id, value: f.field.values?.[0] ?? "" } } : {}) } : x))); }}>
                        <option value="">All of them</option>
                        {fields.map((o) => <option key={o.field.id} value={o.field.id}>Only {o.label.toLowerCase()}…</option>)}
                      </select>
                      {field && (
                        <select aria-label={`Step ${i + 1}: ${field.label}`} className={SMALL} value={s.where?.value ?? ""} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, where: { field: field.field.id, value: e.target.value } } : x)))}>
                          {(field.field.values ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Row>
        {steps.length < LIMITS.funnelMax && (steps.length === 0 || comparing ? (
          <Row label={steps.length ? "Next step" : "First step"}>
            <RegistrySearch key={steps.length} me={me} only="record" placeholder="Search records" onPick={(item) => { setComparing(false); setSteps([...steps, { record: item.measure.record }]); }} />
          </Row>
        ) : <button type="button" className={ADD} onClick={() => setComparing(true)}><Plus className="h-3.5 w-3.5" /> Add step</button>)}
        {timeNote}
        {timeRows}
      </>
    );
  } else {
    const splitChoices = kind === "chart" ? cardSplitOptions(registry, draft) : [];
    const freeSplits = splitChoices.filter((o) => !draft.splits.some((s) => refKey(s) === refKey(o.ref)));
    const dates = record?.fields.filter((f) => f.type === "date") ?? [];
    const ends = record ? splitOptions(registry, record.id) : [];
    const endSelect = (label: string, value: FieldRef | undefined, set: (r: FieldRef | undefined) => void) => (
      <Row label={label}>
        <select aria-label={label} className={SMALL} value={refKey(value)} onChange={(e) => set(ends.find((o) => refKey(o.ref) === e.target.value)?.ref)}>
          <option value="">Choose a field</option>
          {ends.map((o) => <option key={refKey(o.ref)} value={refKey(o.ref)}>{o.label}</option>)}
        </select>
      </Row>
    );
    form = (
      <>
        <Row label={kind === "retention" ? "People who did this" : kind === "records" ? "Records" : "Show"}>
          <Pick value={record?.name ?? null} me={me} only={kind === "chart" ? undefined : "record"} placeholder={kind === "chart" ? "Search records, numbers and metrics" : "Search records"} onPick={pickData} />
        </Row>
        {notice && <p role="status" className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">{notice}</p>}

        {record && kind === "chart" && first && (
          <>
            <Row label="Measure">
              <select aria-label="Measure" className={SMALL} value={measureKey(first)} onChange={(e) => { const o = measureOptions(registry, record.id).find((x) => measureKey(x.measure) === e.target.value); if (o) patch({ measures: [o.measure, ...draft.measures.slice(1)] }); }}>
                {measureOptions(registry, record.id).map((o) => <option key={measureKey(o.measure)} value={measureKey(o.measure)}>{o.label}</option>)}
              </select>
            </Row>
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.overTime} onChange={(e) => patch({ overTime: e.target.checked })} className="accent-[#003B49]" /> Over time
              </label>
              {draft.overTime && (
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {dates.length > 1 && (
                    <select aria-label="Which date" className={SMALL} value={draft.time.field ?? record.defaultTimeField} onChange={(e) => patch({ time: { ...draft.time, field: e.target.value } })}>
                      {dates.map((f) => <option key={f.id} value={f.id}>By {f.name.toLowerCase()}</option>)}
                    </select>
                  )}
                  <select aria-label="Time step" className={SMALL} value={draft.time.grain && allowedGrains(range).includes(draft.time.grain) ? draft.time.grain : ""} onChange={(e) => patch({ time: { ...draft.time, grain: (e.target.value || undefined) as Grain | undefined } })}>
                    <option value="">Automatic step</option>
                    {allowedGrains(range).map((g) => <option key={g} value={g}>{GRAIN_LABELS[g]}</option>)}
                  </select>
                </div>
              )}
            </div>
            <Row label="Split by">
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.splits.map((s) => (
                  <span key={refKey(s)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-xs text-slate-700">
                    {resolveField(registry, record.id, s)?.label}
                    <button type="button" aria-label={`Stop splitting by ${resolveField(registry, record.id, s)?.label ?? ""}`} onClick={() => patch({ splits: draft.splits.filter((x) => refKey(x) !== refKey(s)) })} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {draft.splits.length < maxSplits(draft) && freeSplits.length > 0 && (
                  <label className={cn(ADD, "relative cursor-pointer")}>
                    <Plus className="h-3.5 w-3.5" /> Split by
                    <select aria-label="Add a split" value="" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const o = freeSplits.find((x) => refKey(x.ref) === e.target.value); if (o) patch({ splits: [...draft.splits, o.ref] }); }}>
                      <option value="" disabled>Choose a field</option>
                      {freeSplits.map((o) => <option key={refKey(o.ref)} value={refKey(o.ref)}>{o.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </Row>
          </>
        )}

        {record && kind === "flow" && (<>{endSelect("From", draft.from, (r) => setDraft({ ...draft, from: r }))}{endSelect("To", draft.to, (r) => setDraft({ ...draft, to: r }))}</>)}
        {record && kind === "retention" && (
          <Row label="Came back and did this">
            <Pick value={getRecord(registry, draft.returnRecord)?.name ?? null} me={me} only="record" placeholder="Search records" onPick={(item) => setDraft({ ...draft, returnRecord: item.measure.record })} />
          </Row>
        )}

        {record && (kind === "chart" || kind === "records") && <Row label="Only where"><FilterRows recordId={record.id} filters={draft.filters} onChange={(filters) => setDraft({ ...draft, filters })} /></Row>}

        {record && kind === "chart" && views.length > 1 && (
          <Row label="View as">
            <select aria-label="View as" className={SMALL} value={view ?? ""} onChange={(e) => patch({ view: e.target.value === views[0] ? undefined : (e.target.value as ViewId) })}>
              {views.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
            </select>
          </Row>
        )}
        {record && kind === "chart" && (view === "target" || view === "gauge") && (
          <Row label={`Target${first ? ` for ${measureLabel(registry, first).toLowerCase()}` : ""}`}>
            <input type="number" inputMode="decimal" min={0} aria-label="Target" value={draft.target ?? ""} onChange={(e) => setDraft({ ...draft, target: e.target.value === "" ? undefined : Number(e.target.value) })} className={cn(SMALL, "tabular-nums")} />
          </Row>
        )}
        {record && timeNote}
        {record && timeRows}
      </>
    );
  }

  const started = kind === "note" || kind === "funnel" ? true : !!record;
  const previewTitle = draft.title?.trim() || autoTitle(registry, draft);
  const tall = kind === "chart" && shapeOf(draft).endsWith("value") && view !== "histogram" && view !== "box" ? "h-48 max-w-sm" : kind === "note" ? "min-h-32" : "h-[420px]";

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={adding ? `Add a ${KIND_NAMES[kind]}` : `Edit ${KIND_NAMES[kind]}`}>
      <div className="absolute inset-0 bg-black/30" onClick={close} />
      <div className="relative flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{adding ? `Add a ${KIND_NAMES[kind]}` : `Edit ${KIND_NAMES[kind]}`}</h2>
          <button type="button" aria-label="Close" onClick={close} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex w-full shrink-0 flex-col border-b border-slate-200 md:w-[380px] md:border-b-0 md:border-r">
            <div className="flex-1 space-y-4 overflow-auto p-5">{form}</div>
            <div className="border-t border-slate-200 p-4">
              {tried && errors.length > 0 && <ul className="mb-2 space-y-0.5 text-[11px] text-red-600">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
              {duplicate && <p className="mb-2 text-[11px] text-amber-700">This card is already on the dashboard.</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button variant="primary" onClick={save} disabled={!started}>{adding ? "Add to dashboard" : "Save"}</Button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-zeno-bg p-6">
            <div className={cn("flex flex-col rounded-xl border border-slate-200 bg-white p-4", tall)}>
              {previewTitle && <h3 className="mb-2 truncate text-sm font-semibold text-slate-800">{previewTitle}</h3>}
              <div className="dash-viz min-h-0 flex-1">
                {errors.length ? <Message>{started ? errors[0] : "Choose what to show."}</Message>
                  : query.status === "loading" ? <div className="h-full animate-pulse rounded-lg bg-slate-100" aria-label="Loading" />
                  : <CardBody card={draft} view={view} result={query.result} compareLabel={draft.time.compare === "year" ? "vs a year earlier" : "vs the period before"} onRetry={query.retry} />}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal open={leaving} title="Discard your changes?" confirmLabel="Discard" onClose={() => setLeaving(false)} onConfirm={onClose}>
        {adding ? "This card hasn’t been added to the dashboard." : "Your changes to this card haven’t been saved."}
      </ConfirmModal>
    </div>
  );
}
