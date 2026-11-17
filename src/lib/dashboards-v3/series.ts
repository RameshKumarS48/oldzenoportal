/**
 * Mock numbers for the Dashboards (v3) sandbox. Every value comes from a
 * seeded hash of the metric, the property value and the calendar day, so a
 * widget shows the same numbers on every render and every visit. Nothing
 * here touches real data.
 */
import { PROPERTIES, STATION_REGION, type Metric, type PropertyId } from "./catalogue";
import { bucketEnd, bucketFullLabel, bucketLabel, bucketStart, eachDay, isoDay, type ResolvedRange } from "./dates";
import type { Grouping, PropertyFilter } from "./types";

/** FNV-1a, then one mulberry32 step: a stable number in [0, 1) for any key. */
export function seeded(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Values with no data at all: there are no stations in Mombasa yet, so filtering on it shows the empty state. */
const NO_DATA: Partial<Record<PropertyId, string[]>> = { region: ["Mombasa"] };

export function hasNoData(property: PropertyId, value: string): boolean {
  return NO_DATA[property]?.includes(value) ?? false;
}

const EPOCH = new Date(2025, 0, 1).getTime();
const DAY_MS = 86_400_000;

const isPercent = (m: Metric) => m.unit === "%";

/** Each value's share of a metric, skewed so the first values lead and stable per metric. */
function shares(metric: Metric, property: PropertyId): Map<string, number> {
  const values = PROPERTIES[property].values;
  const raw = values.map((v, i) =>
    NO_DATA[property]?.includes(v) ? 0 : (0.5 + seeded(`${metric.id}|${property}|${v}`)) / (1 + i * 0.45)
  );
  const sum = raw.reduce((a, b) => a + b, 0);
  return new Map(values.map((v, i) => [v, raw[i] / sum]));
}

/** For a percentage, how far a value sits from the network's level on a day, in points; each value drifts a little over time. */
function offset(metric: Metric, property: PropertyId, value: string, day: Date): number {
  const spread = Math.min(20, (100 - metric.mock.base) * 1.6);
  const t = (day.getTime() - EPOCH) / (365 * DAY_MS);
  const drift = (seeded(`${metric.id}|${property}|${value}|drift`) - 0.5) * spread * t;
  return (seeded(`${metric.id}|${property}|${value}|offset`) - 0.5) * spread + drift;
}

/** The whole network's value on one day. */
function dailyTotal(metric: Metric, day: Date): number {
  const t = (day.getTime() - EPOCH) / (365 * DAY_MS);
  const key = `${metric.id}|${isoDay(day)}`;
  const { base, trend, weekend } = metric.mock;
  if (isPercent(metric)) {
    return clampPct(base * (1 + trend * t) + (seeded(key) - 0.5) * 0.8);
  }
  const dow = day.getDay();
  const week = dow === 0 || dow === 6 ? weekend : 1;
  return Math.max(0, base * (1 + trend * t) * week * (1 + (seeded(key) - 0.5) * 0.16));
}

function clampPct(n: number): number {
  return Math.min(99.9, Math.max(0, n));
}

/** The filters that apply to a metric; the rest are reported back so the widget can say so. */
export function applicableFilters(metric: Metric, filters: PropertyFilter[]): { used: PropertyFilter[]; ignored: PropertyId[] } {
  const used: PropertyFilter[] = [];
  const ignored: PropertyId[] = [];
  for (const f of filters) {
    if (f.values.length === 0) continue;
    if (metric.filters.includes(f.property)) used.push(f);
    else ignored.push(f.property);
  }
  return { used, ignored };
}

/** Metrics counted at stations: their regions are the sum of the stations in them, so region and station always agree. */
const atStations = (m: Metric) => m.splitBy.includes("station") || m.filters.includes("station");

/** The values every part on a property allows, or null when no part constrains it. */
function allowed(parts: PropertyFilter[], property: PropertyId): string[] | null {
  let out: string[] | null = null;
  for (const p of parts) {
    if (p.property !== property) continue;
    out = out ? out.filter((v) => p.values.includes(v)) : [...p.values];
  }
  return out;
}

/** The stations a set of parts leaves: in an allowed region, and allowed themselves. */
function stationsIn(parts: PropertyFilter[]): string[] {
  const regions = allowed(parts, "region");
  const stations = allowed(parts, "station");
  return PROPERTIES.station.values.filter((s) => (!regions || regions.includes(STATION_REGION[s])) && (!stations || stations.includes(s)));
}

/**
 * One segment's value on one day: the network total scaled by every filter
 * (and the split value, if any) for counts, or shifted by them for
 * percentages. For metrics counted at stations, region and station are one
 * hierarchy: a region is its stations, so filtering Nairobi only ever leaves
 * Nairobi's stations. Other properties are independent of each other.
 */
function segmentDaily(metric: Metric, day: Date, filters: PropertyFilter[], split?: { property: PropertyId; value: string }): number {
  const total = dailyTotal(metric, day);
  const parts = split ? [...filters, { property: split.property, values: [split.value] }] : filters;
  const hierarchy = atStations(metric);
  const independent = hierarchy ? parts.filter((p) => p.property !== "region" && p.property !== "station") : parts;
  const percent = isPercent(metric);

  let factor = 1;
  let shift = 0;
  if (hierarchy && parts.some((p) => p.property === "region" || p.property === "station")) {
    const s = shares(metric, "station");
    const kept = stationsIn(parts);
    const weight = kept.reduce((a, st) => a + (s.get(st) ?? 0), 0);
    if (weight === 0) return percent ? NaN : 0;
    factor *= weight;
    if (percent) shift += kept.reduce((a, st) => a + (s.get(st) ?? 0) * offset(metric, "station", st, day), 0) / weight;
  }
  for (const p of independent) {
    // Two parts on the same property (a filter and the split) narrow each other.
    const values = allowed(parts, p.property)!;
    if (independent.find((q) => q.property === p.property) !== p) continue;
    const s = shares(metric, p.property);
    const weight = values.reduce((a, v) => a + (s.get(v) ?? 0), 0);
    if (weight === 0) return percent ? NaN : 0;
    factor *= weight;
    if (percent) shift += values.reduce((a, v) => a + (s.get(v) ?? 0) * offset(metric, p.property, v, day), 0) / weight;
  }

  if (percent) return clampPct(total + shift);
  const jitter = split ? 1 + (seeded(`${metric.id}|${split.property}|${split.value}|${isoDay(day)}`) - 0.5) * 0.2 : 1;
  return total * factor * jitter;
}

/** Many days into one figure, by the metric's own aggregation. */
function aggregate(metric: Metric, days: number[]): number {
  const real = days.filter((n) => Number.isFinite(n));
  if (real.length === 0) return NaN;
  switch (metric.aggregation) {
    case "sum": return real.reduce((a, b) => a + b, 0);
    case "average": return real.reduce((a, b) => a + b, 0) / real.length;
    case "latest": return real[real.length - 1];
    // Someone active on several days is counted once: a range's unique count grows slower than its days.
    case "unique": return (real.reduce((a, b) => a + b, 0) / real.length) * (1 + 0.35 * Math.log(real.length));
  }
}

export interface Series {
  name: string;
  values: number[];
  /** The whole range in one figure. */
  total: number;
  /** The values past the top ones, added up (or averaged, for percentages). */
  other?: boolean;
}

export interface Bucket {
  start: Date;
  /** For the axis; carries the year at the first label and each January when the range crosses a year. */
  label: string;
  /** For tooltips and tables, always with the year. */
  fullLabel: string;
  /** The current week or month, not over yet: drawn dashed and called "so far". */
  partial: boolean;
}

export interface QueryResult {
  buckets: Bucket[];
  /** One per split value, biggest first, then Other; or a single series named "Total". */
  series: Series[];
  /** The whole range in one figure. */
  total: number;
  /** True when the filters leave nothing to show. */
  empty: boolean;
  /** Filters the metric can't use, so the widget can say they don't apply. */
  ignored: PropertyId[];
}

export interface Query {
  metric: Metric;
  range: ResolvedRange;
  filters: PropertyFilter[];
  splitBy?: PropertyId;
  grouping: Grouping;
  /** How many split values to name before the rest go into Other. */
  top: number;
}

/**
 * Runs one widget's query over the mock data. Pure and deterministic.
 *
 * Totals cover the range exactly. The chart's buckets start at the beginning
 * of the first week or month, so the first point isn't a part-week dip; the
 * last bucket can still be part of a week or month, and says so.
 */
export function runQuery({ metric, range, filters, splitBy, grouping, top }: Query): QueryResult {
  const { used, ignored } = applicableFilters(metric, filters);
  const chartFrom = bucketStart(range.from, grouping);
  const chartRange: ResolvedRange = { ...range, from: chartFrom, days: Math.round((range.to.getTime() - chartFrom.getTime()) / DAY_MS) + 1 };
  const days = eachDay(chartRange);
  const inRange = days.map((d) => d >= range.from);

  const buckets: (Bucket & { idx: number[] })[] = [];
  const crossesYear = chartFrom.getFullYear() !== range.to.getFullYear();
  days.forEach((d, i) => {
    const start = bucketStart(d, grouping);
    const last = buckets[buckets.length - 1];
    if (last && last.start.getTime() === start.getTime()) { last.idx.push(i); return; }
    const newYear = !last || last.start.getFullYear() !== start.getFullYear();
    buckets.push({
      start,
      label: bucketLabel(start, grouping, crossesYear && newYear),
      fullLabel: bucketFullLabel(start, grouping),
      // Not over yet: a week or month that runs past the range's end, or any period holding today so far.
      partial: bucketEnd(start, grouping) > range.to || (range.endFraction !== undefined && bucketEnd(start, grouping) >= range.to),
      idx: [i],
    });
  });
  // Today so far: counts that build up through the day only have the part of it that has data.
  const builds = metric.aggregation === "sum" || metric.aggregation === "unique";
  const soFar = (daily: number[]) => {
    if (range.endFraction !== undefined && builds) daily[daily.length - 1] *= range.endFraction;
    return daily;
  };
  const byBucket = (daily: number[]) => buckets.map((b) => aggregate(metric, b.idx.map((i) => daily[i])));
  const overRange = (daily: number[]) => aggregate(metric, daily.filter((_, i) => inRange[i]));

  const totalDaily = soFar(days.map((d) => segmentDaily(metric, d, used)));
  const total = overRange(totalDaily);
  const empty = !Number.isFinite(total) || (!isPercent(metric) && total === 0);

  let series: Series[];
  if (!splitBy) {
    series = [{ name: "Total", values: byBucket(totalDaily), total }];
  } else {
    // A split on a filtered property only shows the filtered values.
    const narrowed = used.find((f) => f.property === splitBy)?.values;
    const values = PROPERTIES[splitBy].values.filter((v) => !narrowed || narrowed.includes(v));
    const all = values
      .map((value) => {
        const daily = soFar(days.map((d) => segmentDaily(metric, d, used, { property: splitBy, value })));
        return { name: value, daily, total: overRange(daily) };
      })
      .filter((s) => Number.isFinite(s.total) && s.total > 0)
      .sort((a, b) => b.total - a.total);

    const named = all.length > top ? all.slice(0, top) : all;
    const rest = all.length > top ? all.slice(top) : [];
    series = named.map((s) => ({ name: s.name, values: byBucket(s.daily), total: s.total }));
    if (rest.length > 0) {
      const daily = days.map((_, i) => {
        const vals = rest.map((s) => s.daily[i]);
        return isPercent(metric) ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0);
      });
      series.push({ name: "Other", values: byBucket(daily), total: overRange(daily), other: true });
    }
  }

  return { buckets: buckets.map((b) => ({ start: b.start, label: b.label, fullLabel: b.fullLabel, partial: b.partial })), series, total, empty, ignored };
}
