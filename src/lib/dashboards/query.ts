/**
 * runQuery: a card's query spec in, a small aggregated result out.
 *
 * This is the one place numbers come from. The real backend will answer the
 * same call over millions of rows; here a seeded generator stands in, so a
 * card shows the same figures on every visit and totals add up across splits.
 */
import { PLACES } from "./registry-seed";
import { dashFilterFor, getMetric, getRecord, measureLabel, measureUnit, resolveField, stepLabel, type ResolvedField } from "./registry";
import { LIMITS } from "./rules";
import { effectiveView } from "./shape";
import { buckets, compareRange, dayNumber, effectiveGrain, resolveRange, toDay, type Bucket } from "./time";
import type { Card, CardFilter, DashFilter, DayRange, Field, Measure, RecordType, Registry } from "./types";

export type Result =
  | { type: "value"; label: string; value: number; unit: string; previous: number | null; spark: number[]; second?: { label: string; value: number; unit: string } }
  | { type: "series"; labels: string[]; series: { name: string; unit: string; values: number[] }[]; previous?: { name: string; values: number[] } }
  | { type: "groups"; names: string[]; unit: string; unit2?: string; additive: boolean; rows: { label: string; value: number; value2?: number; lat?: number; lng?: number }[] }
  | { type: "matrix"; rows: string[]; cols: string[]; cells: number[][]; unit: string }
  | { type: "hist"; unit: string; bins: { label: string; value: number }[] }
  | { type: "box"; unit: string; rows: { label: string; min: number; q1: number; median: number; q3: number; max: number }[] }
  | { type: "funnel"; steps: { label: string; value: number; hours: number | null }[] }
  | { type: "flow"; links: { from: string; to: string; value: number }[] }
  | { type: "retention"; periods: string[]; cohorts: { label: string; size: number; cells: number[] }[] }
  | { type: "records"; columns: string[]; rows: string[][] }
  | { type: "note" }
  | { type: "error"; code: "missing" | "too_large" | "failed" };

export interface QueryContext { range: DayRange; today: string; filters: DashFilter[] }

const MAX_POINTS = 2000;

// ── Seeded sample numbers ────────────────────────────────────────────────────

/** A stable number in [0, 1) for a string. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

const WEEKDAY = [0.72, 1.04, 1.06, 1.05, 1.07, 1.1, 0.9]; // Sun..Sat
const HOUR = [0.4, 0.25, 0.2, 0.2, 0.3, 0.8, 2.2, 4.8, 6.6, 5.6, 4.6, 4.4, 4.8, 4.6, 4.2, 4.4, 5.4, 7.2, 8.2, 6.8, 4.6, 2.8, 1.6, 0.9];
const HOUR_TOTAL = HOUR.reduce((a, b) => a + b, 0);

/** How busy a record type is on a day: growth, the week's rhythm, and day-to-day noise. */
function dayFactor(recordId: string, day: number, today: number): number {
  const growth = 0.25 + hash(`g:${recordId}`) * 0.6;
  const trend = Math.pow(1 + growth, (day - today) / 365);
  const noise = 0.88 + hash(`n:${recordId}:${day}`) * 0.24;
  return trend * WEEKDAY[(((day + 4) % 7) + 7) % 7] * noise;
}

const weightCache = new Map<string, number[]>();
/** Each value's share of a field on a day. Shares drift slowly and always add to 1. */
function shares(field: Field, day: number): number[] {
  const values = field.values ?? [];
  const key = `${field.id}|${values.length}|${values[0] ?? ""}`;
  let base = weightCache.get(key);
  if (!base) {
    base = values.map((v, i) => (0.6 + hash(`w:${field.id}:${v}`) * 0.8) / Math.pow(i + 1, 0.75));
    weightCache.set(key, base);
  }
  const drift = base.map((w, i) => w * (1 + 0.22 * Math.sin(day / 19 + i * 1.7)));
  const total = drift.reduce((a, b) => a + b, 0) || 1;
  return drift.map((w) => w / total);
}

interface Group { field: Field; value: string }
interface Scope { record: RecordType; timeField: string; groups: Group[]; filters: { field: Field; f: CardFilter }[]; today: number }

/** The share of records a filter keeps on a day. */
function filterShare(field: Field, f: CardFilter, day: number): number {
  if (field.type === "number") {
    const cdf = (x: number) => 1 - Math.exp(-0.8 * Math.pow(Math.max(x, 0) / (field.mean || 1), 1.6));
    return Math.max(0, (f.max != null ? cdf(f.max) : 1) - (f.min != null ? cdf(f.min) : 0));
  }
  const s = shares(field, day);
  return (f.values ?? []).reduce((sum, v) => sum + (s[(field.values ?? []).indexOf(v)] ?? 0), 0);
}

/** Records on one day (events), or in existence (things, when `day` is null). */
function countOn(scope: Scope, day: number | null): number {
  const { record } = scope;
  const d = day ?? scope.today;
  let n: number;
  if (record.kind === "event") n = record.volume * dayFactor(record.id, d, scope.today) * (scope.timeField === record.defaultTimeField ? 1 : 0.9);
  // Things by one of their dates: how many were sold, deployed, signed… that day.
  else n = day == null ? record.volume : (record.volume / 520) * dayFactor(`${record.id}:${scope.timeField}`, d, scope.today);
  for (const g of scope.groups) n *= shares(g.field, d)[(g.field.values ?? []).indexOf(g.value)] ?? 0;
  for (const x of scope.filters) n *= filterShare(x.field, x.f, d);
  return n;
}

/** A number field's typical value for a group on a day. */
function fieldMean(field: Field, scope: Scope, day: number): number {
  let m = field.mean ?? 1;
  for (const g of scope.groups) m *= 0.8 + hash(`m:${field.id}:${g.field.id}:${g.value}`) * 0.45;
  return m * (0.96 + hash(`d:${field.id}:${day}`) * 0.08);
}

const round = (n: number, unit: string) => {
  if (!Number.isFinite(n)) return 0;
  if (unit === "%" ) return Math.round(n * 10) / 10;
  const a = Math.abs(n);
  return a >= 100 ? Math.round(n) : a >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100;
};

/** One measure over a set of days (or now, for things), for one group. */
function measure(reg: Registry, m: Measure, scope: Scope, days: number[] | null, hour?: number): number {
  const hourShare = hour == null ? 1 : HOUR[hour] / HOUR_TOTAL;
  const list = days ?? [null];
  let count = 0;
  for (const d of list) count += countOn(scope, d) * hourShare;
  const unit = measureUnit(reg, m);
  if (m.fn === "count") return Math.round(count);
  if (m.fn === "metric") {
    const metric = getMetric(reg, m.metricId);
    if (!metric) return 0;
    if (metric.calc.type === "rate") {
      const key = `${metric.id}:${scope.groups.map((g) => g.value).join("|")}:${list[0] ?? "now"}:${list.length}:${hour ?? ""}`;
      return round(Math.min(0.999, metric.calc.base + (hash(key) - 0.5) * 2 * metric.calc.spread) * 100, "%");
    }
    return measure(reg, { record: m.record, fn: "sum", field: metric.calc.field }, scope, days, hour);
  }
  const field = scope.record.fields.find((f) => f.id === m.field);
  if (!field) return 0;
  if (m.fn === "unique") return Math.round((count * (field.uniqueRatio ?? 0.5)) / (1 + 0.18 * Math.log(list.length)));
  let sum = 0;
  for (const d of list) sum += countOn(scope, d) * hourShare * fieldMean(field, scope, d ?? scope.today);
  if (m.fn === "sum") return round(sum, unit);
  const avg = count ? sum / count : 0;
  const k = m.fn === "avg" ? 1 : m.fn === "median" ? 0.93 : m.fn === "min" ? 0.34 : 2.4;
  return round(avg * k, unit);
}

/** Sums add up across groups; averages, rates and unique counts don't. */
const additive = (reg: Registry, m: Measure) =>
  m.fn === "count" || m.fn === "sum" || (m.fn === "metric" && getMetric(reg, m.metricId)?.calc.type === "sum");

// ── Building scopes ──────────────────────────────────────────────────────────

function scopeFor(reg: Registry, m: Measure, card: Card, ctx: QueryContext, groups: Group[]): Scope | null {
  const record = getRecord(reg, m.record);
  if (!record) return null;
  const base = card.measures[0]?.record ?? m.record;
  const filters: Scope["filters"] = [];
  // The card's filters belong to its first record; a second measure keeps the ones its data also has.
  for (const f of card.filters) {
    const r = resolveField(reg, base, f.field);
    if (!r) continue;
    if (m.record === base || r.owner.id === m.record || record.links.some((l) => l.to === r.owner.id)) filters.push({ field: r.field, f });
  }
  for (const df of ctx.filters) {
    const f = dashFilterFor(reg, m.record, df);
    const r = f && resolveField(reg, m.record, f.field);
    if (f && r) filters.push({ field: r.field, f });
  }
  const timeField = m.record === base && card.time.field && record.fields.some((f) => f.id === card.time.field) ? card.time.field : record.defaultTimeField;
  return { record, timeField, groups, filters, today: dayNumber(ctx.today) };
}

const dayNums = (b: Bucket) => b.days.map(dayNumber);
const rangeDays = (r: DayRange) => { const out: number[] = []; for (let d = dayNumber(r.from); d <= dayNumber(r.to); d++) out.push(d); return out; };

/** A split's values, biggest first, cut to the top few with the rest as "Other" when the measure adds up. */
function topValues(reg: Registry, m: Measure, card: Card, ctx: QueryContext, split: ResolvedField, days: number[] | null, all = false) {
  const rows = (split.field.values ?? []).map((value) => {
    const scope = scopeFor(reg, m, card, ctx, [{ field: split.field, value }])!;
    return { label: value, value: measure(reg, m, scope, days) };
  }).sort((a, b) => b.value - a.value);
  if (all || rows.length <= LIMITS.top) return { rows, other: null as number | null };
  const top = rows.slice(0, LIMITS.top);
  const other = additive(reg, m) ? rows.slice(LIMITS.top).reduce((s, r) => s + r.value, 0) : null;
  return { rows: top, other };
}

// ── The query ────────────────────────────────────────────────────────────────

export function runQuery(reg: Registry, card: Card, ctx: QueryContext): Result {
  if (card.kind === "note") return { type: "note" };
  const range = card.time.range ? resolveRange(card.time.range, ctx.today) : ctx.range;
  const days = rangeDays(range);
  const local: QueryContext = { ...ctx, range };

  if (card.kind === "funnel") {
    const steps = card.steps ?? [];
    if (steps.some((s) => !getRecord(reg, s.record))) return { type: "error", code: "missing" };
    const firstRecord = getRecord(reg, steps[0]?.record);
    if (!firstRecord) return { type: "error", code: "missing" };
    const start = measure(reg, { record: firstRecord.id, fn: "count" }, scopeFor(reg, { record: firstRecord.id, fn: "count" }, { ...card, measures: [], filters: [] }, local, [])!, firstRecord.kind === "thing" ? null : days);
    let value = start;
    return { type: "funnel", steps: steps.map((s, i) => {
      const label = stepLabel(reg, s);
      if (i > 0) value = Math.round(value * (0.52 + hash(`f:${label}:${i}`) * 0.4));
      return { label, value, hours: i === 0 ? null : round(0.4 + hash(`h:${label}`) * 30, "h") };
    }) };
  }

  const first = card.measures[0];
  const record = getRecord(reg, first?.record);
  if (!first || !record || card.measures.some((m) => !getRecord(reg, m.record))) return { type: "error", code: "missing" };
  const span = record.kind === "thing" && !card.overTime ? null : days;
  const total = (m: Measure, d: number[] | null = span, groups: Group[] = []) => measure(reg, m, scopeFor(reg, m, card, local, groups)!, getRecord(reg, m.record)!.kind === "thing" && !card.overTime ? null : d);

  if (card.kind === "records") {
    const fields = record.fields.slice(0, 7);
    const count = Math.min(25, Math.round(total({ record: record.id, fn: "count" })));
    const rows = Array.from({ length: count }, (_, i) => fields.map((f) => {
      const h = hash(`r:${record.id}:${f.id}:${i}:${range.to}`);
      if (f.type === "date") return `${toDay((dayNumber(range.to) - Math.floor(i / 6)) * 86_400_000)} ${String(23 - (i % 6) * 3).padStart(2, "0")}:${String(Math.floor(h * 60)).padStart(2, "0")}`;
      if (f.type === "number") return f.unit ? `${round((f.mean ?? 1) * (0.5 + h), f.unit)} ${f.unit}` : String(Math.max(1, Math.round((f.mean ?? 1) * (0.5 + h))));
      if (f.type === "id") return `${f.id.slice(0, 2).toUpperCase()}-${10000 + Math.floor(h * 89999)}`;
      const values = f.values ?? [];
      const s = shares(f, dayNumber(range.to));
      let acc = 0;
      return values[s.findIndex((x) => (acc += x) >= h)] ?? values[0] ?? "";
    }));
    return { type: "records", columns: fields.map((f) => f.name), rows };
  }

  if (card.kind === "flow") {
    const from = card.from && resolveField(reg, record.id, card.from);
    const to = card.to && resolveField(reg, record.id, card.to);
    if (!from || !to) return { type: "error", code: "missing" };
    const n = total({ record: record.id, fn: "count" });
    const a = shares(from.field, dayNumber(range.to));
    const b = shares(to.field, dayNumber(range.to));
    const links: { from: string; to: string; value: number }[] = [];
    (from.field.values ?? []).slice(0, 6).forEach((fv, i) => (to.field.values ?? []).slice(0, 6).forEach((tv, j) => {
      const value = Math.round(n * a[i] * b[j] * (0.5 + hash(`fl:${fv}:${tv}`)));
      if (value > 0) links.push({ from: fv, to: tv, value });
    }));
    return { type: "flow", links };
  }

  if (card.kind === "retention") {
    const back = getRecord(reg, card.returnRecord);
    if (!back) return { type: "error", code: "missing" };
    const weeks = buckets(range, "week").slice(-8);
    const periods = weeks.map((_, i) => (i === 0 ? "Same week" : `Week ${i}`));
    return { type: "retention", periods, cohorts: weeks.map((w, i) => {
      const size = measure(reg, { record: record.id, fn: "count" }, scopeFor(reg, { record: record.id, fn: "count" }, card, local, [])!, record.kind === "thing" ? null : dayNums(w));
      const floor = 0.12 + hash(`rt:${record.id}:${back.id}`) * 0.3;
      const cells = Array.from({ length: weeks.length - i }, (_, k) => (k === 0 ? 100 : round((floor + (1 - floor) * Math.exp(-k * 0.55)) * (0.92 + hash(`rt:${w.label}:${k}`) * 0.16) * 100, "%")));
      return { label: w.label, size, cells };
    }) };
  }

  // Charts.
  const view = effectiveView(reg, card);
  const second = card.measures[1];
  const unit = measureUnit(reg, first);
  const name = measureLabel(reg, first);
  const splits = card.splits.map((s) => resolveField(reg, record.id, s));
  if (splits.some((s) => !s)) return { type: "error", code: "missing" };
  const [split, split2] = splits as ResolvedField[];

  if (view === "histogram" || view === "box") {
    const field = record.fields.find((f) => f.id === first.field);
    if (!field) return { type: "error", code: "missing" };
    const quartiles = (mean: number, label: string) => ({ label, min: round(mean * 0.34, unit), q1: round(mean * 0.7, unit), median: round(mean * 0.93, unit), q3: round(mean * 1.28, unit), max: round(mean * 2.4, unit) });
    if (view === "box") {
      const groups = split ? topValues(reg, { ...first, fn: "avg" }, card, local, split, span).rows : [{ label: name, value: total({ ...first, fn: "avg" }) }];
      return { type: "box", unit, rows: groups.map((g) => quartiles(g.value, g.label)) };
    }
    const n = total({ record: record.id, fn: "count" });
    const mean = total({ ...first, fn: "avg" });
    const edges = Array.from({ length: 13 }, (_, i) => mean * (0.2 + i * 0.2));
    const cdf = (x: number) => 1 - Math.exp(-0.8 * Math.pow(x / (mean || 1), 1.6));
    return { type: "hist", unit, bins: edges.slice(0, -1).map((e, i) => ({ label: `${round(e, unit)}–${round(edges[i + 1], unit)}`, value: Math.round(n * (cdf(edges[i + 1]) - cdf(e))) })) };
  }

  if (card.overTime) {
    const grain = effectiveGrain(range, card.time.grain);
    const bs = buckets(range, grain);
    if (bs.length * Math.max(1, split ? LIMITS.top + 1 : 1) > MAX_POINTS) return { type: "error", code: "too_large" };
    const labels = bs.map((b) => b.label);
    const line = (m: Measure, groups: Group[] = [], r: DayRange = range) =>
      buckets(r, grain).map((b) => measure(reg, m, scopeFor(reg, m, card, local, groups)!, dayNums(b), b.hour));

    if (view === "hourweek") {
      const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const byDay: number[][] = names.map(() => []);
      for (const d of days) byDay[(((d + 3) % 7) + 7) % 7].push(d);
      const scope = scopeFor(reg, first, card, local, [])!;
      return { type: "matrix", unit, rows: names, cols: HOUR.map((_, h) => String(h).padStart(2, "0")), cells: byDay.map((ds) => HOUR.map((_, h) => (ds.length ? measure(reg, first, scope, ds, h) : 0))) };
    }
    if (view === "calendar") {
      const last = days.slice(-371);
      const scope = scopeFor(reg, first, card, local, [])!;
      return { type: "series", labels: last.map((d) => toDay(d * 86_400_000)), series: [{ name, unit, values: last.map((d) => measure(reg, first, scope, [d])) }] };
    }
    if (view === "percentiles") {
      const avg = line({ ...first, fn: "avg" });
      return { type: "series", labels, series: [["Typical (p50)", 0.93], ["p90", 1.7], ["p99", 2.3]].map(([n, k]) => ({ name: n as string, unit, values: avg.map((v, i) => round(v * (k as number) * (0.97 + hash(`p:${n}:${i}`) * 0.06), unit)) })) };
    }
    if (second) {
      const a = line(first);
      const b = line(second);
      if (view === "ratio_line") return { type: "series", labels, series: [{ name: `${name} per ${measureLabel(reg, second).toLowerCase()}`, unit: "", values: a.map((v, i) => (b[i] ? round(v / b[i], "") : 0)) }] };
      return { type: "series", labels, series: [{ name, unit, values: a }, { name: measureLabel(reg, second), unit: measureUnit(reg, second), values: b }] };
    }
    if (split) {
      const top = topValues(reg, first, card, local, split, days);
      const series = top.rows.map((r) => ({ name: r.label, unit, values: line(first, [{ field: split.field, value: r.label }]) }));
      if (top.other != null) {
        const all = line(first);
        series.push({ name: "Other", unit, values: all.map((v, i) => Math.max(0, round(v - series.reduce((s, x) => s + x.values[i], 0), unit))) });
      }
      return { type: "series", labels, series };
    }
    const values = line(first);
    const mode = card.time.compare ?? (view === "overlay" ? "previous" : null);
    const previous = mode ? { name: mode === "year" ? "A year earlier" : "Previous period", values: line(first, [], compareRange(range, mode)).slice(0, values.length) } : undefined;
    if (view === "cumulative" && additive(reg, first)) {
      let run = 0;
      return { type: "series", labels, series: [{ name, unit, values: values.map((v) => (run = round(run + v, unit))) }] };
    }
    return { type: "series", labels, series: [{ name, unit, values }], previous };
  }

  if (split && split2) {
    const rows = topValues(reg, first, card, local, split, span).rows.map((r) => r.label);
    const cols = topValues(reg, first, card, local, split2, span).rows.map((r) => r.label);
    return { type: "matrix", unit, rows, cols, cells: rows.map((r) => cols.map((c) => total(first, span, [{ field: split.field, value: r }, { field: split2.field, value: c }]))) };
  }

  if (split) {
    const top = topValues(reg, first, card, local, split, span, view === "table" || view === "map" || view === "scatter");
    const rows = top.rows.map((r) => ({
      ...r,
      value2: second ? total(second, span, [{ field: split.field, value: r.label }]) : undefined,
      lat: split.field.type === "place" ? PLACES[r.label]?.[0] : undefined,
      lng: split.field.type === "place" ? PLACES[r.label]?.[1] : undefined,
    }));
    if (top.other != null && top.other > 0) rows.push({ label: "Other", value: round(top.other, unit), value2: undefined, lat: undefined, lng: undefined });
    return { type: "groups", names: [name, ...(second ? [measureLabel(reg, second)] : [])], unit, unit2: second ? measureUnit(reg, second) : undefined, additive: additive(reg, first), rows };
  }

  // One value.
  const value = total(first);
  const sparkBuckets = record.kind === "thing" ? [] : buckets(range, effectiveGrain(range)).slice(-40);
  const scope = scopeFor(reg, first, card, local, [])!;
  const spark = sparkBuckets.map((b) => measure(reg, first, scope, dayNums(b), b.hour));
  const mode = card.time.compare ?? "previous";
  const previous = record.kind === "thing" ? null : total(first, rangeDays(compareRange(range, mode)));
  if (second) {
    const v2 = total(second);
    if (view === "ratio") return { type: "value", label: `${name} per ${measureLabel(reg, second).toLowerCase()}`, value: v2 ? round(value / v2, "") : 0, unit: "", previous: null, spark: [] };
    return { type: "value", label: name, value, unit, previous, spark, second: { label: measureLabel(reg, second), value: v2, unit: measureUnit(reg, second) } };
  }
  return { type: "value", label: name, value, unit, previous, spark };
}

/** Whether a result has anything to draw. */
export function isEmpty(r: Result): boolean {
  switch (r.type) {
    case "value": return r.value === 0 && r.spark.every((v) => v === 0);
    case "series": return r.series.every((s) => s.values.every((v) => v === 0));
    case "groups": return r.rows.every((x) => x.value === 0);
    case "matrix": return r.cells.every((row) => row.every((v) => v === 0));
    case "hist": return r.bins.every((b) => b.value === 0);
    case "box": return r.rows.length === 0;
    case "funnel": return (r.steps[0]?.value ?? 0) === 0;
    case "flow": return r.links.length === 0;
    case "retention": return r.cohorts.every((c) => c.size === 0);
    case "records": return r.rows.length === 0;
    default: return false;
  }
}

