"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DateRangeFilter, type DayRange } from "@/components/swap-transactions/DateRangeFilter";
import { inputCls, labelCls } from "@/components/pricing-plans/shared";
import { dashFilterOptions, getRecord } from "@/lib/dashboards/registry";
import { addCardError, canEdit, layoutRank, rangeError } from "@/lib/dashboards/rules";
import { RANGE_PRESETS, resolveRange, todayEat } from "@/lib/dashboards/time";
import type { Card, CardKind, Dashboard, DashFilter, PresetId } from "@/lib/dashboards/types";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import { dashboards, useRegistry, useUndo, type Me } from "./api";
import { CardFrame } from "./CardFrame";
import { useDashboardActions } from "./DashboardDialogs";
import { CardEditor, type EditorStart } from "./editor/CardEditor";
import { Menu } from "./Menu";

const OTHER_KINDS: [CardKind, string, string][] = [
  ["funnel", "Funnel", "How many get from one step to the next"],
  ["flow", "Flow", "Where records go, from one field to another"],
  ["retention", "Retention", "Who comes back, week after week"],
  ["records", "Latest records", "The most recent rows, as a table"],
  ["note", "Note", "A heading or a few lines of text"],
];
const SELECT = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

export function DashboardView({ dashboard: d, me }: { dashboard: Dashboard; me: Me }) {
  const router = useRouter();
  const registry = useRegistry();
  const editable = canEdit(d, me);
  const [editing, setEditing] = useState<EditorStart | null>(null);
  const [filtering, setFiltering] = useState(false);
  const { items, dialogs } = useDashboardActions(me, () => router.push("/dashboards"));

  const today = todayEat();
  const ctx = useMemo(() => ({ range: resolveRange(d.range, today), today, filters: d.filters }), [d.range, d.filters, today]);
  // Numbers first, then charts, then tables; inside each group, the order the owner chose.
  const ordered = useMemo(() => d.cards.map((card, i) => ({ card, i, rank: layoutRank(registry, card) })).sort((a, b) => a.rank - b.rank || a.i - b.i), [d.cards, registry]);

  const report = (out: { ok: boolean; error?: string }, title = "Couldn’t save the change") => { if (!out.ok) toast.error(title, out.error); };
  const full = addCardError(d);

  function menuFor(card: Card, index: number) {
    if (!editable) return [];
    const neighbour = (step: -1 | 1) => { const o = ordered[index + step]; return o && o.rank === ordered[index].rank ? o.card : null; };
    const up = neighbour(-1);
    const down = neighbour(1);
    return [
      { label: "Edit", onSelect: () => setEditing({ card }) },
      { label: "Duplicate", disabled: !!full, onSelect: () => report(dashboards().addCard(d.id, d.version, card, me)) },
      { label: "Move earlier", disabled: !up, onSelect: () => up && report(dashboards().moveCard(d.id, d.version, card.id, up.id, me)) },
      { label: "Move later", disabled: !down, onSelect: () => down && report(dashboards().moveCard(d.id, d.version, card.id, down.id, me)) },
      { label: "Remove", danger: true, onSelect: () => report(dashboards().removeCard(d.id, d.version, card.id, me)) },
    ];
  }

  function setRange(value: string, range: DayRange | null) {
    const next = value === "custom" && range ? { preset: "custom" as const, from: range.from, to: range.to } : { preset: (value || "30d") as PresetId };
    const error = rangeError(next, today);
    if (error) { toast.error("That range can’t be used", error); return; }
    if (editable) report(dashboards().setRange(d.id, d.version, next, me));
    else setLocalRange(next);
  }
  // People who can't change the dashboard can still look at another period; it isn't saved.
  const [localRange, setLocalRange] = useState<Dashboard["range"] | null>(null);
  const shownRange = editable ? d.range : localRange ?? d.range;
  const shownCtx = useMemo(() => (editable || !localRange ? ctx : { ...ctx, range: resolveRange(localRange, today) }), [ctx, editable, localRange, today]);

  const filterOptions = useMemo(() => dashFilterOptions(registry, d.cards), [registry, d.cards]);
  const add = (kind: CardKind) => { if (full) toast.error("This dashboard is full", full); else setEditing({ kind }); };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <Link href="/dashboards" className="mb-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3 w-3" /> Dashboards</Link>
            <h1 className="truncate text-base font-semibold text-slate-800">{d.name}</h1>
            <p className="text-xs text-slate-500">{d.ownerId === me.id ? "Yours" : `By ${d.ownerName}`} · {d.visibility === "public" ? "Shared with everyone" : d.ownerId === me.id ? "Only you can see it" : "Private"}</p>
          </div>
          <DateRangeFilter
            presets={RANGE_PRESETS}
            value={shownRange.preset}
            range={shownRange.preset === "custom" && shownRange.from && shownRange.to ? { from: shownRange.from, to: shownRange.to } : null}
            onChange={setRange}
            className={SELECT}
          />
          {editable && filterOptions.length > 0 && (
            <button type="button" onClick={() => setFiltering(true)} className={cn(SELECT, "inline-flex items-center gap-1.5")}><Filter className="h-3.5 w-3.5" /> Filter</button>
          )}
          {editable && (
            <div className="flex">
              <Button variant="primary" size="sm" className="rounded-r-none" onClick={() => add("chart")}><Plus className="h-3.5 w-3.5" /> Add card</Button>
              <Menu label="Other card types" heading="Other card types" align="right" items={OTHER_KINDS.map(([kind, label, hint]) => ({ label, hint, onSelect: () => add(kind) }))}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Menu>
            </div>
          )}
          <Menu label="Dashboard actions" items={items(d)} />
        </div>
        {d.filters.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Filters on this dashboard">
            {d.filters.map((f) => (
              <li key={f.fieldId} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-[11px] text-slate-600">
                {f.name}: {f.values.length > 2 ? `${f.values.slice(0, 2).join(", ")} +${f.values.length - 2}` : f.values.join(", ")}
                {editable && <button type="button" aria-label={`Remove the ${f.name} filter`} onClick={() => report(dashboards().setFilters(d.id, d.version, d.filters.filter((x) => x.fieldId !== f.fieldId), me))} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-zeno-bg p-5">
        {ordered.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ordered.map(({ card }, i) => (
              <CardFrame key={card.id} card={card} ctx={shownCtx} me={me} menu={menuFor(card, i)} onRemove={editable ? () => report(dashboards().removeCard(d.id, d.version, card.id, me)) : undefined} />
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">{editable ? "This dashboard is empty." : "This dashboard has no cards yet."}</p>
              {editable && <Button variant="primary" size="sm" className="mt-3" onClick={() => add("chart")}><Plus className="h-3.5 w-3.5" /> Add card</Button>}
            </div>
          </div>
        )}
      </div>

      {editable && <UndoBar dashboardId={d.id} me={me} />}
      {editing && <CardEditor key={"card" in editing ? editing.card.id : editing.kind} dashboard={d} me={me} ctx={ctx} start={editing} onClose={() => setEditing(null)} />}
      {filtering && <FilterDialog options={filterOptions} current={d.filters} onClose={() => setFiltering(false)} onSave={(filters) => { report(dashboards().setFilters(d.id, d.version, filters, me)); setFiltering(false); }} recordCount={new Set(d.cards.map((c) => getRecord(registry, c.measures[0]?.record)?.id).filter(Boolean)).size} />}
      {dialogs}
    </main>
  );
}

/** After a change to the cards: says what changed and offers to take it back, for a few seconds. */
function UndoBar({ dashboardId, me }: { dashboardId: string; me: Me }) {
  const undo = useUndo();
  // The change whose offer has run out; a newer change shows again.
  const [expired, setExpired] = useState<typeof undo>(null);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setExpired(undo), 8000);
    return () => clearTimeout(timer);
  }, [undo]);
  const shown = undo && undo.dashboardId === dashboardId && undo !== expired ? undo : null;
  if (!shown) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-[#192E35] px-4 py-2 text-xs text-white shadow-lg">
        {shown.label}
        <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { const out = dashboards().undoLast(me); if (!out.ok) toast.error("Couldn’t undo", out.error); }}>Undo</button>
      </div>
    </div>
  );
}

/** One filter for every card: pick a field the cards' data shares, then the values to keep. */
function FilterDialog({ options, current, onClose, onSave, recordCount }: {
  options: { fieldId: string; name: string; values: string[] }[];
  current: DashFilter[];
  onClose: () => void;
  onSave: (filters: DashFilter[]) => void;
  recordCount: number;
}) {
  const [fieldId, setFieldId] = useState(options[0]?.fieldId ?? "");
  const option = options.find((o) => o.fieldId === fieldId);
  const [picked, setPicked] = useState<Record<string, string[]>>(() => Object.fromEntries(current.map((f) => [f.fieldId, f.values])));
  const [search, setSearch] = useState("");
  const values = picked[fieldId] ?? [];
  const visible = (option?.values ?? []).filter((v) => v.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (v: string) => setPicked((p) => ({ ...p, [fieldId]: values.includes(v) ? values.filter((x) => x !== v) : [...values, v] }));
  const save = () => onSave(options.filter((o) => picked[o.fieldId]?.length).map((o) => ({ fieldId: o.fieldId, name: o.name, values: picked[o.fieldId] })));

  return (
    <Modal open onClose={onClose} title="Filter this dashboard">
      <div className="space-y-4">
        <div>
          <label htmlFor="dash-filter-field" className={labelCls}>Field</label>
          <select id="dash-filter-field" value={fieldId} onChange={(e) => { setFieldId(e.target.value); setSearch(""); }} className={inputCls}>
            {options.map((o) => <option key={o.fieldId} value={o.fieldId}>{o.name}{picked[o.fieldId]?.length ? ` (${picked[o.fieldId].length})` : ""}</option>)}
          </select>
        </div>
        <div>
          <p className={labelCls}>Keep only</p>
          {(option?.values.length ?? 0) > 8 && <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${option?.name.toLowerCase()}`} aria-label="Search values" className={cn(inputCls, "mb-2")} />}
          <div className="max-h-52 space-y-0.5 overflow-auto rounded-lg border border-slate-200 p-1.5">
            {visible.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={values.includes(v)} onChange={() => toggle(v)} className="accent-[#003B49]" /> {v}
              </label>
            ))}
            {!visible.length && <p className="px-2 py-1 text-xs text-slate-400">Nothing matches.</p>}
          </div>
          {recordCount > 1 && <p className="mt-1.5 text-[11px] text-slate-400">Cards whose data has no {option?.name.toLowerCase()} are left as they are, and say so.</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
