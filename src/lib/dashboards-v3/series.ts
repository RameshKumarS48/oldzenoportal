/**
 * Queries over the Dashboards (v3) mock data. The numbers come from
 * mock-model.ts (realistic shapes, seeded so they're stable); this file
 * turns them into a widget's buckets, series and totals. Nothing here
 * touches real data.
 */
import { format } from "date-fns";
import { LOCATION, PROPERTIES, REGION_COUNTRY, STATION_REGION, type Metric, type PropertyId } from "./catalogue";
import { bucketEnd, bucketFullLabel, bucketLabel, bucketStart, DATE_FORMAT, eachDay, fmtAsOf, type ResolvedRange } from "./dates";
import { allowed, evaluate, seeded, type Pair } from "./mock-model";
import type { Grouping, PropertyFilter } from "./types";

export { seeded };

/** Values with no data at all: there are no stations in Mombasa yet, so filtering on it shows the empty state. */
const NO_DATA: Partial<Record<PropertyId, string[]>> = { region: ["Mombasa"] };

export function hasNoData(property: PropertyId, value: string): boolean {
  return NO_DATA[property]?.includes(value) ?? false;
}

const DAY_MS = 86_400_000;

/** Percentages and ratios are one total over another; everything else is a total on its own. */
const divides = (m: Metric) => m.unit === "%" || m.aggregation === "ratio";
const valueOf = (m: Metric, p: Pair) => (divides(m) ? (p.den > 0 ? p.num / p.den : NaN) : p.num);
const addPairs = (a: Pair, b: Pair): Pair => ({ num: a.num + b.num, den: a.den + b.den });
const ZERO: Pair = { num: 0, den: 0 };

/** The country a region or station is in. */
function countryOf(property: PropertyId, value: string): string | undefined {
  if (property === "region") return REGION_COUNTRY[value];
  if (property === "station") return REGION_COUNTRY[STATION_REGION[value]];
  return undefined;
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

/** The finest place a metric is counted at: a station, or a region for metrics not tied to stations. */
const leafLevel = (m: Metric): PropertyId => (atStations(m) ? "station" : "region");
const isLocation = (p: PropertyId) => LOCATION.includes(p);

/** The places (stations, or regions) a set of parts leaves: in an allowed country and region, and allowed themselves. */
function leavesIn(metric: Metric, parts: PropertyFilter[]): string[] {
  const level = leafLevel(metric);
  const countries = allowed(parts, "country");
  const regions = allowed(parts, "region");
  const stations = allowed(parts, "station");
  return PROPERTIES[level].values.filter((leaf) => {
    const region = level === "station" ? STATION_REGION[leaf] : leaf;
    return (!countries || countries.includes(REGION_COUNTRY[region])) && (!regions || regions.includes(region)) && (!stations || level !== "station" || stations.includes(leaf));
  });
}

/** Whether any place is left once these filters are applied: false when, say, the region is in another country. */
export function anyPlaceLeft(metric: Metric, filters: PropertyFilter[]): boolean {
  return leavesIn(metric, filters.filter((f) => isLocation(f.property))).length > 0;
}

/** The regions these filters leave places in: for a station filter, the stations' regions. */
export function regionsLeft(metric: Metric, filters: PropertyFilter[]): string[] {
  const level = leafLevel(metric);
  const leaves = leavesIn(metric, filters.filter((f) => isLocation(f.property)));
  return [...new Set(leaves.map((l) => (level === "station" ? STATION_REGION[l] : l)))];
}

/** The countries these filters leave places in, in order: both, when no country or region narrows it. */
export function countriesLeft(metric: Metric, filters: PropertyFilter[]): string[] {
  const level = leafLevel(metric);
  const leaves = leavesIn(metric, filters.filter((f) => isLocation(f.property)));
  return PROPERTIES.country.values.filter((c) => leaves.some((l) => countryOf(level, l) === c));
}

/** One segment's figure on one day: the metric for the filters, plus the split value if any. */
function segmentDaily(metric: Metric, day: Date, filters: PropertyFilter[], split?: { property: PropertyId; value: string }): Pair {
  return evaluate(metric.id, day, split ? [...filters, { property: split.property, values: [split.value] }] : filters);
}

/** Many days into one figure, by the metric's own aggregation. */
function aggregate(metric: Metric, days: Pair[]): number {
  if (days.length === 0) return NaN;
  switch (metric.aggregation) {
    case "sum": return days.reduce((a, p) => a + p.num, 0);
    // One total over another for the whole period: points per swap is all swap points ÷ all swaps.
    case "ratio": return valueOf(metric, days.reduce(addPairs, ZERO));
    case "average": {
      const real = days.map((p) => valueOf(metric, p)).filter(Number.isFinite);
      return real.length ? real.reduce((a, b) => a + b, 0) / real.length : NaN;
    }
    case "latest": return valueOf(metric, days[days.length - 1]);
    // Someone active on several days is counted once: a range's unique count grows slower than its days.
    case "unique": return (days.reduce((a, p) => a + p.num, 0) / days.length) * (1 + 0.35 * Math.log(days.length));
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
      // A current value is one moment: "As of 18 Nov, 06:00".
      label: range.asOf ? `As of ${fmtAsOf(range.asOf)}` : bucketLabel(start, grouping, crossesYear && newYear),
      fullLabel: range.asOf ? `As of ${format(range.asOf, `${DATE_FORMAT}, HH:mm`)}` : bucketFullLabel(start, grouping),
      // Not over yet: only a day, week or month that holds today. A range that ended before today
      // (1–31 Oct, say) is complete, so it's solid throughout, even where its last week runs past it.
      partial: !range.asOf && range.today !== undefined && bucketEnd(start, grouping) >= range.today,
      idx: [i],
    });
  });
  // Today so far: counts that build up through the day only have the part of it that has data.
  const builds = metric.aggregation === "sum" || metric.aggregation === "unique";
  const soFar = (daily: Pair[]) => {
    const last = daily.length - 1;
    if (range.endFraction !== undefined && builds) daily[last] = { num: daily[last].num * range.endFraction, den: daily[last].den * range.endFraction };
    return daily;
  };
  const byBucket = (daily: Pair[]) => buckets.map((b) => aggregate(metric, b.idx.map((i) => daily[i])));
  const overRange = (daily: Pair[]) => aggregate(metric, daily.filter((_, i) => inRange[i]));

  const totalDaily = soFar(days.map((d) => segmentDaily(metric, d, used)));
  const total = overRange(totalDaily);
  const empty = !Number.isFinite(total) || (!divides(metric) && total === 0);

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
      // The rest added up as pairs, so a percentage or ratio stays one total over another.
      const daily = days.map((_, i) => rest.reduce((a, s) => addPairs(a, s.daily[i]), ZERO));
      series.push({ name: "Other", values: byBucket(daily), total: overRange(daily), other: true });
    }
  }

  return { buckets: buckets.map((b) => ({ start: b.start, label: b.label, fullLabel: b.fullLabel, partial: b.partial })), series, total, empty, ignored };
}
