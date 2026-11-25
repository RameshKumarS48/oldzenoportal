/**
 * Reading the registry: what a record can be measured by, split by and
 * filtered by, including the fields of the records it links to. Everything
 * the editor offers comes from here, so an invalid pairing is never offered.
 */
import type { Card, CardFilter, DashFilter, Field, FieldRef, Measure, MeasureFn, NamedMetric, RecordType, Registry } from "./types";

export const FN_LABELS: Record<MeasureFn, string> = {
  count: "Count", sum: "Total", avg: "Average", median: "Median", min: "Lowest", max: "Highest", unique: "Unique", metric: "Metric",
};
const NUMBER_FNS: MeasureFn[] = ["sum", "avg", "median", "min", "max"];

/** A name as it reads mid-sentence: "Amount" → "amount", but "kWh billed", "RFID" and "Dome users" keep their capitals. */
export function lower(name: string): string {
  return name.split(" › ").map((part) => (/^(Dome|M-Pesa)\b/.test(part) || !/^[A-Z][a-z]/.test(part) ? part : part[0].toLowerCase() + part.slice(1))).join(" › ");
}

export const getRecord = (reg: Registry, id: string | undefined): RecordType | undefined => reg.records.find((r) => r.id === id);
export const getMetric = (reg: Registry, id: string | undefined): NamedMetric | undefined => reg.metrics.find((m) => m.id === id);

export interface ResolvedField { field: Field; owner: RecordType; label: string; ref: FieldRef }

/** The field a ref points at, from the record itself or one it links to. */
export function resolveField(reg: Registry, recordId: string, ref: FieldRef): ResolvedField | null {
  const record = getRecord(reg, recordId);
  if (!record) return null;
  if (!ref.via) {
    const field = record.fields.find((f) => f.id === ref.field);
    return field ? { field, owner: record, label: field.name, ref } : null;
  }
  const link = record.links.find((l) => l.to === ref.via);
  const owner = getRecord(reg, ref.via);
  const field = owner?.fields.find((f) => f.id === ref.field);
  if (!link || !owner || !field) return null;
  // The linked record's own name reads as the link: "Station", not "Station › Name".
  return { field, owner, label: field.id === "name" ? link.name : `${link.name} › ${field.name}`, ref };
}

/** Every field of a record and of the records it links to (one hop), of the wanted types. */
export function fieldOptions(reg: Registry, recordId: string, types: Field["type"][]): ResolvedField[] {
  const record = getRecord(reg, recordId);
  if (!record) return [];
  const own = record.fields.filter((f) => types.includes(f.type)).map((f) => resolveField(reg, recordId, { field: f.id })!);
  const linked = record.links.flatMap((l) =>
    (getRecord(reg, l.to)?.fields ?? []).filter((f) => types.includes(f.type)).map((f) => resolveField(reg, recordId, { via: l.to, field: f.id })!));
  return [...own, ...linked].filter(Boolean);
}

export const splitOptions = (reg: Registry, recordId: string) => fieldOptions(reg, recordId, ["category", "place"]);
export const filterOptions = (reg: Registry, recordId: string) => fieldOptions(reg, recordId, ["category", "place", "number"]);

/** The same field, as another record sees it (directly or through a link), or null. */
export function refFor(reg: Registry, recordId: string, target: ResolvedField): FieldRef | null {
  if (recordId === target.owner.id) return { field: target.field.id };
  const record = getRecord(reg, recordId);
  if (!record) return null;
  if (record.links.some((l) => l.to === target.owner.id)) return { via: target.owner.id, field: target.field.id };
  // A field both records carry themselves with the same values, like Region. A shared name alone
  // (two records each with a "Status") is not the same field.
  const same = record.fields.find((f) => f.id === target.field.id && f.type === target.field.type && f.name === target.field.name
    && JSON.stringify(f.values ?? []) === JSON.stringify(target.field.values ?? []));
  return same ? { field: same.id } : null;
}

/** Splits a card can use: with two measures, only fields both records have. */
export function cardSplitOptions(reg: Registry, card: Pick<Card, "measures">): ResolvedField[] {
  const [first, second] = card.measures;
  if (!first) return [];
  const options = splitOptions(reg, first.record);
  return second && second.record !== first.record ? options.filter((o) => refFor(reg, second.record, o)) : options;
}

export interface MeasureOption { measure: Measure; label: string }

/** What a record can be measured by: its count, each number field five ways, each id field uniquely, and its named metrics. */
export function measureOptions(reg: Registry, recordId: string): MeasureOption[] {
  const record = getRecord(reg, recordId);
  if (!record) return [];
  const out: MeasureOption[] = [{ measure: { record: recordId, fn: "count" }, label: `Count of ${lower(record.name)}` }];
  for (const f of record.fields) {
    if (f.type === "number") for (const fn of NUMBER_FNS) out.push({ measure: { record: recordId, fn, field: f.id }, label: `${FN_LABELS[fn]} ${lower(f.name)}` });
    if (f.type === "id") out.push({ measure: { record: recordId, fn: "unique", field: f.id }, label: `Unique ${lower(f.name)}` });
  }
  for (const m of reg.metrics.filter((x) => x.record === recordId)) out.push({ measure: { record: recordId, fn: "metric", metricId: m.id }, label: m.name });
  return out;
}

/** Why a measure can't be used, or null. */
export function measureError(reg: Registry, m: Measure): string | null {
  const record = getRecord(reg, m.record);
  if (!record) return "This data is no longer available.";
  if (m.fn === "count") return null;
  if (m.fn === "metric") return getMetric(reg, m.metricId)?.record === m.record ? null : "This metric is no longer available.";
  const field = record.fields.find((f) => f.id === m.field);
  if (!field) return "Choose a field to measure.";
  if (m.fn === "unique") return field.type === "id" ? null : "Unique needs an ID field.";
  return field.type === "number" ? null : `${FN_LABELS[m.fn]} needs a number field.`;
}

/** "Swaps", "Total kWh billed", "Unique customers", "Swap revenue". */
export function measureLabel(reg: Registry, m: Measure): string {
  const record = getRecord(reg, m.record);
  if (!record) return "Unavailable data";
  if (m.fn === "count") return record.name;
  if (m.fn === "metric") return getMetric(reg, m.metricId)?.name ?? "Unavailable metric";
  const field = record.fields.find((f) => f.id === m.field);
  return `${FN_LABELS[m.fn]} ${lower(field?.name ?? "field")}`;
}

/** A measure's unit: the field's, the metric's, or none for a count. */
export function measureUnit(reg: Registry, m: Measure): string {
  if (m.fn === "metric") return getMetric(reg, m.metricId)?.unit ?? "";
  if (m.fn === "count" || m.fn === "unique") return "";
  return getRecord(reg, m.record)?.fields.find((f) => f.id === m.field)?.unit ?? "";
}

/** What the number means, in a sentence, for the card's ⓘ. */
export function measureDefinition(reg: Registry, m: Measure): string {
  const record = getRecord(reg, m.record);
  if (!record) return "";
  if (m.fn === "metric") return getMetric(reg, m.metricId)?.definition ?? "";
  if (m.fn === "count") return record.kind === "thing" ? `The number of ${lower(record.name)} there are now.` : `The number of ${lower(record.name)} in the period.`;
  const field = record.fields.find((f) => f.id === m.field);
  const name = lower(field?.name ?? "");
  if (m.fn === "unique") return `How many different ${name} appear on ${lower(record.name)} in the period.`;
  return `${FN_LABELS[m.fn]} ${name} across ${lower(record.name)}${record.kind === "thing" ? "" : " in the period"}.`;
}

/** The card's heading when nobody wrote one. */
export function autoTitle(reg: Registry, card: Card): string {
  if (card.kind === "note") return "";
  if (card.kind === "funnel") return (card.steps ?? []).map((s) => stepLabel(reg, s)).join(" → ") || "Funnel";
  const first = card.measures[0];
  if (!first) return "New card";
  const record = getRecord(reg, first.record);
  if (card.kind === "records") return `Latest ${lower(record?.name ?? "records")}`;
  if (card.kind === "flow") {
    const a = card.from && resolveField(reg, first.record, card.from)?.label;
    const b = card.to && resolveField(reg, first.record, card.to)?.label;
    return `${record?.name ?? "Flow"}: ${a ?? "…"} → ${b ?? "…"}`;
  }
  if (card.kind === "retention") return `${record?.name ?? "…"} who came back for ${lower(getRecord(reg, card.returnRecord)?.name ?? "…")}`;
  // A field's name alone can be ambiguous ("Total amount" of what?), so the record leads.
  let title = first.fn === "count" || first.fn === "metric" ? measureLabel(reg, first) : `${record?.name}: ${lower(measureLabel(reg, first))}`;
  if (card.measures[1]) title += ` and ${lower(measureLabel(reg, card.measures[1]))}`;
  const splits = card.splits.map((s) => resolveField(reg, first.record, s)?.label).filter((l): l is string => !!l).map(lower);
  if (splits.length) title += ` by ${splits.join(" and ")}`;
  return title;
}

export function stepLabel(reg: Registry, step: { record: string; where?: { field: string; value: string } }): string {
  const record = getRecord(reg, step.record);
  if (!record) return "Unavailable data";
  return step.where ? `${record.name}: ${step.where.value}` : record.name;
}

/** "Status is Completed or Flagged", "Amount is 100 to 500". */
export function filterText(reg: Registry, recordId: string, f: CardFilter): string {
  const r = resolveField(reg, recordId, f.field);
  if (!r) return "Unavailable filter";
  if (r.field.type === "number") {
    const unit = r.field.unit ? ` ${r.field.unit}` : "";
    if (f.min != null && f.max != null) return `${r.label} is ${f.min} to ${f.max}${unit}`;
    if (f.min != null) return `${r.label} is at least ${f.min}${unit}`;
    return `${r.label} is at most ${f.max}${unit}`;
  }
  const values = f.values ?? [];
  return `${r.label} is ${values.length > 2 ? `${values.slice(0, 2).join(", ")} +${values.length - 2}` : values.join(" or ")}`;
}

/** Every record a card reads, so access can be checked. */
export function cardRecords(card: Card): string[] {
  const ids = new Set<string>();
  for (const m of card.measures) ids.add(m.record);
  for (const s of card.steps ?? []) ids.add(s.record);
  if (card.returnRecord) ids.add(card.returnRecord);
  const base = card.measures[0]?.record;
  if (base) for (const ref of [...card.splits, ...card.filters.map((f) => f.field), card.from, card.to]) if (ref?.via) ids.add(ref.via);
  return [...ids];
}

/** A dashboard-wide filter as one card sees it, or null when the card's data has no such field. */
export function dashFilterFor(reg: Registry, recordId: string, f: DashFilter): CardFilter | null {
  const record = getRecord(reg, recordId);
  if (!record) return null;
  if (record.fields.some((x) => x.id === f.fieldId && x.type === "category")) return { field: { field: f.fieldId }, values: f.values };
  const link = record.links.find((l) => getRecord(reg, l.to)?.fields.some((x) => x.id === f.fieldId && x.type === "category"));
  return link ? { field: { via: link.to, field: f.fieldId }, values: f.values } : null;
}

/** Fields the dashboard can be filtered by: category fields its cards' data share by id, with their values. */
export function dashFilterOptions(reg: Registry, cards: Card[]): { fieldId: string; name: string; values: string[] }[] {
  const out = new Map<string, { fieldId: string; name: string; values: string[] }>();
  for (const card of cards) {
    const recordId = card.measures[0]?.record ?? card.steps?.[0]?.record;
    if (!recordId) continue;
    for (const o of fieldOptions(reg, recordId, ["category"])) {
      // A linked record's own name reads as the record: "Station", not "Name".
      if (!out.has(o.field.id)) out.set(o.field.id, { fieldId: o.field.id, name: o.field.id === "name" ? o.label : o.field.name, values: o.field.values ?? [] });
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}
