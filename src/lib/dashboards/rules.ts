/**
 * The rules for dashboards and cards. Pure, so the screens (instant feedback)
 * and the store (the authority, as a backend would be) apply the same ones.
 */
import { cardSplitOptions, filterOptions, getRecord, lower, measureError, resolveField, stepLabel } from "./registry";
import { effectiveView, maxSplits, viewsFor } from "./shape";
import { allowedGrains, customRangeError, resolveRange } from "./time";
import type { Card, CardFilter, Dashboard, FieldRef, RangeValue, Registry } from "./types";

export const LIMITS = { nameMin: 3, nameMax: 60, cards: 24, measures: 2, filters: 6, funnelMin: 2, funnelMax: 8, top: 8, noteMax: 600 };

export interface Actor { id: string; name: string; superAdmin: boolean }

const key = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export const cleanName = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ");

/** Why a dashboard name can't be used, or null. Names are unique among one owner's dashboards. */
export function nameError(name: string, ownerId: string, all: Dashboard[], selfId?: string): string | null {
  const n = cleanName(name);
  if (!n) return "Give the dashboard a name.";
  if (n.length < LIMITS.nameMin) return `Use at least ${LIMITS.nameMin} characters.`;
  if (n.length > LIMITS.nameMax) return `Use at most ${LIMITS.nameMax} characters.`;
  if (all.some((d) => d.id !== selfId && d.ownerId === ownerId && key(d.name) === key(n))) return "You already have a dashboard with this name.";
  return null;
}

/** "Name (copy)", then "(copy 2)", "(copy 3)"… until it is free among the owner's dashboards. */
export function copyName(name: string, ownerId: string, all: Dashboard[]): string {
  const taken = new Set(all.filter((d) => d.ownerId === ownerId).map((d) => key(d.name)));
  const base = cleanName(name).replace(/ \(copy(?: \d+)?\)$/, "");
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? " (copy)" : ` (copy ${n})`;
    const candidate = `${base.slice(0, LIMITS.nameMax - suffix.length)}${suffix}`;
    if (!taken.has(key(candidate))) return candidate;
  }
}

/** Shared dashboards are open to everyone; private ones to their owner and Super Admins. */
export const canSee = (d: Dashboard, a: Actor) => d.visibility === "public" || d.ownerId === a.id || a.superAdmin;
/** Only the owner or a Super Admin changes a dashboard. */
export const canEdit = (d: Dashboard, a: Actor) => d.ownerId === a.id || a.superAdmin;

export function rangeError(r: RangeValue, today: string): string | null {
  return r.preset === "custom" ? customRangeError(r.from ?? "", r.to ?? "", today) : null;
}

const sameRef = (a: FieldRef, b: FieldRef) => (a.via ?? "") === (b.via ?? "") && a.field === b.field;

export function filterError(reg: Registry, recordId: string, f: CardFilter): string | null {
  const r = resolveField(reg, recordId, f.field);
  if (!r) return "This filter’s field is no longer available.";
  if (r.field.type === "number") {
    if (f.min == null && f.max == null) return `Enter a lowest or highest ${lower(r.label)}.`;
    if ((f.min != null && !Number.isFinite(f.min)) || (f.max != null && !Number.isFinite(f.max))) return "Enter numbers only.";
    if (f.min != null && f.max != null && f.min > f.max) return "The lowest value must not be above the highest.";
    return null;
  }
  return f.values?.length ? null : `Choose at least one ${lower(r.label)}.`;
}

/** Everything wrong with a card, in the order the editor shows it. Empty means it can be saved. */
export function cardErrors(reg: Registry, card: Card, today: string): string[] {
  const out: string[] = [];
  if (card.kind === "note") {
    if (!card.text?.trim()) out.push("Write the note.");
    else if (card.text.length > LIMITS.noteMax) out.push(`A note can have at most ${LIMITS.noteMax} characters.`);
    return out;
  }
  if (card.time.range) { const e = rangeError(card.time.range, today); if (e) out.push(e); }
  if (card.kind === "funnel") {
    const steps = card.steps ?? [];
    if (steps.length < LIMITS.funnelMin) out.push(`A funnel needs at least ${LIMITS.funnelMin} steps.`);
    if (steps.length > LIMITS.funnelMax) out.push(`A funnel can have at most ${LIMITS.funnelMax} steps.`);
    if (steps.some((s) => !getRecord(reg, s.record))) out.push("A step uses data that is no longer available.");
    if (steps.some((s, i) => i > 0 && stepLabel(reg, s) === stepLabel(reg, steps[i - 1]))) out.push("The same step can’t come twice in a row.");
    return out;
  }
  const first = card.measures[0];
  if (!first) return ["Choose what to show."];
  if (card.measures.length > LIMITS.measures) out.push(`A card can compare at most ${LIMITS.measures} measures.`);
  for (const m of card.measures) { const e = measureError(reg, m); if (e) out.push(e); }
  if (out.length) return out;
  if (card.kind === "flow") {
    const from = card.from && resolveField(reg, first.record, card.from);
    const to = card.to && resolveField(reg, first.record, card.to);
    if (!from || !to) out.push("Choose where the flow starts and where it ends.");
    else if (sameRef(card.from!, card.to!)) out.push("The start and the end must be different fields.");
  }
  if (card.kind === "retention" && !getRecord(reg, card.returnRecord)) out.push("Choose what counts as coming back.");
  if (card.kind === "chart") {
    const options = cardSplitOptions(reg, card);
    if (card.splits.length > maxSplits(card)) out.push(card.overTime ? "Over time, a card can be split by one field." : "A card can be split by at most two fields.");
    if (card.splits.some((s) => !options.some((o) => sameRef(o.ref, s)))) out.push("A split uses a field this data doesn’t have.");
    if (card.splits.length === 2 && sameRef(card.splits[0], card.splits[1])) out.push("Split by two different fields.");
    const view = effectiveView(reg, card);
    if ((view === "target" || view === "gauge") && !(card.target != null && Number.isFinite(card.target) && card.target > 0)) out.push("Enter a target above 0.");
    if (card.overTime && card.time.grain) {
      const range = card.time.range ? resolveRange(card.time.range, today) : null;
      if (range && !allowedGrains(range).includes(card.time.grain)) out.push("That time step doesn’t fit this range: hourly up to 7 days, daily up to 12 months.");
    }
  }
  if (card.filters.length > LIMITS.filters) out.push(`A card can have at most ${LIMITS.filters} filters.`);
  for (const f of card.filters) { const e = filterError(reg, first.record, f); if (e) out.push(e); }
  return out;
}

/**
 * The card made consistent after its data changed: splits and filters the new
 * data doesn't have are dropped (and named, so the editor can say so), extra
 * splits trimmed, and a view that no longer fits removed.
 */
export function tidyCard(reg: Registry, card: Card, previousRecordId?: string): { card: Card; dropped: string[] } {
  const first = card.measures[0];
  if (!first || card.kind === "note" || card.kind === "funnel") return { card, dropped: [] };
  const dropped: string[] = [];
  // Named as the data they came from called them.
  const previous = (ref: FieldRef) => (previousRecordId && lower(resolveField(reg, previousRecordId, ref)?.label ?? "")) || ref.field;
  const splitOptions = card.kind === "chart" ? cardSplitOptions(reg, card) : [];
  let splits = card.splits.filter((s) => {
    const ok = splitOptions.some((o) => sameRef(o.ref, s));
    if (!ok) dropped.push(`split by ${previous(s)}`);
    return ok;
  });
  if (splits.length > maxSplits(card)) splits = splits.slice(0, maxSplits(card));
  const options = filterOptions(reg, first.record);
  const filters = card.filters.filter((f) => {
    const ok = options.some((o) => sameRef(o.ref, f.field));
    if (!ok) dropped.push(`filter on ${previous(f.field)}`);
    return ok;
  });
  const record = getRecord(reg, first.record);
  const time = card.time.field && !record?.fields.some((f) => f.id === card.time.field && f.type === "date") ? { ...card.time, field: undefined } : card.time;
  const next: Card = { ...card, splits, filters, time };
  if (next.view && !viewsFor(reg, next).includes(next.view)) next.view = undefined;
  return { card: next, dropped };
}

/** Two cards asking the same question have the same key, whatever their ids and titles. */
export function cardKey(card: Card): string {
  const { id: _id, title: _title, ...rest } = card;
  void _id; void _title;
  // Keys in a fixed order at every depth, and nothing for what was left unset.
  const stable = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(stable)
      : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stable(x)]))
        : v;
  return JSON.stringify(stable(rest));
}

export function addCardError(d: Dashboard): string | null {
  return d.cards.length >= LIMITS.cards ? `A dashboard can hold ${LIMITS.cards} cards. Remove one to add another.` : null;
}

/** Cards in reading order: numbers first, then charts, then tables and lists, notes where they were put among their kind. */
export function layoutRank(reg: Registry, card: Card): number {
  if (card.kind === "note") return 0;
  if (card.kind === "records") return 3;
  if (card.kind !== "chart") return 2;
  const view = effectiveView(reg, card);
  if (view === "number" || view === "target" || view === "gauge" || view === "ratio" || view === "pair") return 1;
  if (view === "table" || view === "pivot") return 3;
  return 2;
}

/** How wide a card is on the 4-column grid. */
export function cardSpan(reg: Registry, card: Card): 1 | 2 | 4 {
  if (card.kind === "note") return 4;
  if (card.kind === "records" || card.kind === "retention") return 4;
  return layoutRank(reg, card) === 1 ? 1 : 2;
}
