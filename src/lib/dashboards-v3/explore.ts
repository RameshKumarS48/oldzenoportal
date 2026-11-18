/**
 * Explore: one widget's question on a page of its own, with everything about
 * it in the URL, so the page can be reloaded, shared or gone back to. Pure,
 * so it can be checked without a browser.
 */
import { metricById, PROPERTIES, type ChartType, type Metric, type PropertyId } from "./catalogue";
import { bucketEnd, DEFAULT_RANGE, fmtAsOf, fmtSpan, previousDates, resolveRange, type ResolvedRange } from "./dates";
import { autoTitle, normalise } from "./editor";
import { canStack } from "./rules";
import { change, fmtValue, type Change } from "./format";
import { EVENTS } from "./mock-model";
import { countriesLeft, regionsLeft, type Bucket, type QueryResult } from "./series";
import type { Dashboard, DashboardFilters, Grouping, PropertyFilter, Widget, WidgetSort } from "./types";
import { filtersFromLink, viewQuery } from "./view-link";
import { makeWidget, type WidgetQuery } from "./widgets";

export const EXPLORE_PATH = "/dashboards-v3/explore";
/** Explore's charts: no Number, since the summary above the chart is the number. */
export const EXPLORE_CHARTS: ChartType[] = ["line", "bar", "stacked", "table"];
const CHARTS = new Set<ChartType>(EXPLORE_CHARTS);
const GROUPINGS = new Set<Grouping>(["day", "week", "month"]);
const SORTS = new Set<WidgetSort>(["desc", "asc", "name"]);
const NO_FILTERS: DashboardFilters = { range: DEFAULT_RANGE, country: null, regions: [] };

export interface ExploreState {
  /** The dashboard it was opened from, if it still exists. */
  dashboard: Dashboard | null;
  /** The widget it started from on that dashboard, if any. */
  widgetId: string | null;
  /** What's being explored; its range comes from the filter bar. */
  widget: Widget;
  /** The filter bar's filters. */
  filters: DashboardFilters;
  /** The dashboard's filters when Explore was opened: what Back returns to and Reset goes back to. */
  backFilters: DashboardFilters;
  /** The Display options as last chosen, kept while a chart that doesn't use one is shown, and back when one that does is. */
  display: Display;
  /** The chart was chosen by the person; otherwise it follows the recommendation as the breakdown changes. */
  picked: boolean;
  /** The chart recommended for this metric and breakdown. */
  recommended: ChartType;
}

/**
 * Explore's Display options, each remembered in the URL whatever the chart:
 * a chart that doesn't use one hides it, and it's there again on one that does.
 */
export interface Display {
  /** Unset: automatic. Lines and stacked bars. */
  grouping?: Grouping;
  /** Bars and tables. */
  sort: WidgetSort;
  /** Value labels: bars and stacked bars. Unset: on for bars, off for stacks. */
  values?: boolean;
  /** Lines, tables, and the summary row. */
  compare: boolean;
  /** Stacked bars, and bars with a breakdown: each value as a share of the total. */
  percent: boolean;
  /** A line broken down shows Other only when asked. */
  other: boolean;
}

/** Whether value labels show on this chart. */
export const valuesShown = (type: ChartType, d: Display) => d.values ?? type === "bar";

/** Display options as a widget has them: where Explore opened from. */
export const displayOf = (w: Widget): Display => ({ grouping: w.grouping, sort: w.sort, values: w.showValues || undefined, compare: w.compare, percent: false, other: false });

/** "service:Swap,Fast charge;customerType:BaaS;station:" (a filter just added, with nothing chosen yet, keeps its row). */
const writeFilters = (fs: PropertyFilter[]) => fs.map((f) => `${f.property}:${f.values.join(",")}`).join(";");
function readFilters(text: string | null): PropertyFilter[] {
  if (!text) return [];
  return text.split(";").flatMap((part) => {
    const [property, values = ""] = part.split(":");
    if (!(property in PROPERTIES)) return [];
    return [{ property: property as PropertyId, values: values.split(",").filter((v) => PROPERTIES[property as PropertyId].values.includes(v)) }];
  });
}

/** Everything about an Explore view, as a query string. */
export function exploreQuery(s: {
  dashboardId: string | null; widgetId: string | null; widget: Widget; filters: DashboardFilters; backFilters: DashboardFilters;
  display?: Display;
  /** The chart was chosen by the person, not recommended. */
  picked?: boolean;
}): string {
  const d = s.display ?? displayOf(s.widget);
  const q = new URLSearchParams(viewQuery(s.filters));
  if (s.dashboardId) q.set("dash", s.dashboardId);
  if (s.widgetId) q.set("wid", s.widgetId);
  if (s.widget.metricId) q.set("metric", s.widget.metricId);
  q.set("type", s.widget.type);
  if (s.widget.splitBy) q.set("split", s.widget.splitBy);
  const f = writeFilters(s.widget.filters ?? []);
  if (f) q.set("f", f);
  if (d.compare) q.set("compare", "1");
  if (d.other) q.set("other", "1");
  if (d.grouping) q.set("grouping", d.grouping);
  if (d.sort !== "desc") q.set("sort", d.sort);
  if (d.values !== undefined) q.set("values", d.values ? "1" : "0");
  if (d.percent) q.set("pct", "1");
  if (s.picked) q.set("picked", "1");
  q.set("back", viewQuery(s.backFilters));
  return q.toString();
}

/** A single period: a snapshot's current value, or one day. Broken down, it reads best as bars. */
export function singlePeriod(metric: Metric, filters: DashboardFilters): boolean {
  return metric.kind === "snapshot" || resolveRange(filters.range).days === 1;
}

/**
 * The recommended chart: no breakdown, change over time (line); a breakdown
 * on a single period, compare items (bars); a breakdown over time, what it's
 * made of (stacked), or lines for figures that don't add up.
 */
export function recommendedChart(metric: Metric, splitBy: PropertyId | undefined, filters: DashboardFilters): ChartType {
  if (!splitBy) return "line";
  if (singlePeriod(metric, filters)) return "bar";
  return canStack(metric) ? "stacked" : "line";
}

/** The charts that fit: no stacking without a breakdown or for figures that don't add up, no bars without anything to compare. */
export function exploreChartOptions(metric: Metric, splitBy: PropertyId | undefined): ChartType[] {
  return EXPLORE_CHARTS.filter((c) => {
    if (c === "stacked") return !!splitBy && canStack(metric);
    if (c === "bar") return metric.splitBy.length > 0;
    return true;
  });
}

/** Explore opened from a dashboard's widget: that widget, with the dashboard's filters (and the widget's own range, if it has one). */
export function exploreLink(dashboard: Dashboard, widget: Widget, filters: DashboardFilters): string {
  const start: Widget = { ...widget, range: undefined };
  return `${EXPLORE_PATH}?${exploreQuery({
    dashboardId: dashboard.id,
    widgetId: widget.id,
    widget: start,
    filters: widget.range ? { ...filters, range: widget.range } : filters,
    backFilters: filters,
  })}`;
}

/** An Explore view from its URL. Anything unknown is ignored; a missing dashboard just means there's nowhere to go back to. */
export function exploreFromParams(get: (key: string) => string | null, dashboards: Dashboard[]): ExploreState {
  const dashboard = dashboards.find((d) => d.id === get("dash")) ?? null;
  const base = dashboard?.widgets.find((w) => w.id === get("wid"));
  const saved = dashboard?.filters ?? NO_FILTERS;
  const back = get("back");
  const backParams = new URLSearchParams(back ?? "");
  const backFilters = back ? filtersFromLink((k) => backParams.get(k), saved) ?? saved : saved;
  const filters = filtersFromLink(get, backFilters) ?? backFilters;

  const metric = metricById(get("metric") ?? base?.metricId);
  const type = get("type") as ChartType | null;
  const grouping = get("grouping") as Grouping | null;
  const sort = get("sort") as WidgetSort | null;
  const split = get("split") as PropertyId | null;
  const splitBy = split && split in PROPERTIES ? split : undefined;
  // The recommended chart, unless the person picked one that still fits.
  const picked = get("picked") === "1";
  const recommended = metric ? recommendedChart(metric, splitBy, filters) : "line";
  const chosen = metric && picked && type && CHARTS.has(type) && exploreChartOptions(metric, splitBy).includes(type) ? type : recommended;
  const start: Widget = metric
    ? makeWidget(metric, chosen)
    : { id: "explore", type: "line", title: "", compare: false, showValues: false, sort: "desc", size: "half" };
  const raw: Widget = {
    ...start,
    id: base?.id ?? "explore",
    metricId: metric?.id,
    splitBy,
    filters: readFilters(get("f")),
    compare: get("compare") === "1",
    grouping: grouping && GROUPINGS.has(grouping) ? grouping : undefined,
    sort: sort && SORTS.has(sort) ? sort : "desc",
    showValues: get("values") === "1",
    size: base?.size ?? start.size,
    range: undefined,
  };
  const widget = metric ? normalise(raw, true) : raw;
  return {
    dashboard, widgetId: base?.id ?? null,
    widget: { ...widget, title: base?.title && base.metricId === widget.metricId ? base.title : autoTitle(widget) },
    filters, backFilters,
    picked: picked && chosen === type,
    recommended,
    display: {
      grouping: grouping && GROUPINGS.has(grouping) ? grouping : undefined,
      sort: sort && SORTS.has(sort) ? sort : "desc",
      values: get("values") === "1" ? true : get("values") === "0" ? false : undefined,
      compare: get("compare") === "1",
      percent: get("pct") === "1",
      other: get("other") === "1",
    },
  };
}

/** "Swaps · 19 Oct – 17 Nov 2026 · Nairobi": the metric, its exact dates, and where. */
export function exploreTitle(widget: Widget, query: WidgetQuery | null, filters: DashboardFilters): string {
  const metric = metricById(widget.metricId);
  if (!metric || !query) return "Explore";
  const dates = query.range.asOf ? `As of ${fmtAsOf(query.range.asOf)}` : fmtSpan(query.range.from, query.range.to);
  const place = filters.regions.length > 0 ? filters.regions.join(", ") : filters.country ?? "All countries";
  return `${metric.name} · ${dates} · ${place}`;
}

/**
 * The page's one-line answer: the figure, how it changed, and for a split
 * which value leads. "Swaps: 83,541 swaps, up 3.1% vs 19 Sep – 18 Oct 2026.
 * Nairobi is highest at 48,610 swaps (58%)."
 */
export function answerLine(query: WidgetQuery, result: QueryResult, previous: QueryResult | null): string {
  return summaryOf(query, result, previous).full;
}

export interface SummaryFigure {
  /** The country, when money is shown by country. */
  label?: string;
  value: number;
  change: Change | null;
}

export interface Summary {
  /** The big number (one per country for money across countries); empty when there's no data. */
  figures: SummaryFigure[];
  /** "vs 19 Sep – 18 Oct 2026": what the change is against. */
  versus: string;
  /** What the number doesn't say: where, when, and which value leads. Shown beside the number. */
  context: string;
  /** The whole answer as one sentence, for Copy. */
  full: string;
}

/**
 * Explore's summary row: the big number with its change, a sentence for
 * what the number doesn't say, and the whole answer as one sentence to copy.
 */
export function summaryOf(query: WidgetQuery, result: QueryResult, previous: QueryResult | null): Summary {
  const metric = query.metric;
  const versus = previousDates(query.range);
  const nothing = (text: string): Summary => ({ figures: [], versus, context: text, full: text });
  if (query.noOverlap) return nothing("No data: the filters here and the dashboard’s don’t overlap.");
  if (result.empty) return nothing("No data for these filters.");
  const when = query.range.asOf ? `As of ${fmtAsOf(query.range.asOf)}` : fmtSpan(query.range.from, query.range.to);
  const prevOf = (name: string) => previous?.series.find((s) => s.name === name)?.total;
  const moved = (c: Change | null) => (!c ? "" : c.direction === "flat" ? `, no change ${versus}` : `, ${c.direction} ${c.text.replace(/^[+−]/, "")} ${versus}`);

  if (query.byCountry) {
    const figures = result.series.map((s) => ({ label: s.name, value: s.total, change: prevOf(s.name) !== undefined ? change(s.total, prevOf(s.name)!, metric) : null }));
    const context = `${when}. Shown by country; currencies aren’t combined.`;
    const full = `${metric.name}, ${when}: ${figures.map((f) => `${f.label} ${fmtValue(f.value, metric, false)}${moved(f.change)}`).join("; ")}. Currencies aren’t combined.`;
    return { figures, versus, context, full };
  }
  const c = previous ? change(result.total, previous.total, metric) : null;
  const named = result.series.filter((s) => !s.other);
  const additive = metric.unit !== "%" && metric.aggregation === "sum";
  const leader = query.splitBy && named.length > 1
    ? ` ${named[0].name} is highest at ${fmtValue(named[0].total, metric, false)}${additive ? ` (${Math.round((named[0].total / result.total) * 100)}%)` : ""}.`
    : "";
  return {
    figures: [{ value: result.total, change: c }],
    versus,
    context: `${when}.${leader}`,
    full: `${metric.name}, ${when}: ${fmtValue(result.total, metric, false)}${moved(c)}.${leader}`,
  };
}

export interface Marker {
  /** The bucket's axis label, where the line is drawn. */
  x: string;
  label: string;
}

/**
 * The model's events that fall in a chart's buckets and in the places its
 * filters leave (no Nanyuki outage on a Nairobi chart), one marker per
 * bucket; events in the same bucket share it.
 */
export function markersFor(buckets: Bucket[], grouping: Grouping, range: ResolvedRange, query?: Pick<WidgetQuery, "metric" | "filters">): Marker[] {
  if (range.asOf || buckets.length < 2) return [];
  const countries = query ? countriesLeft(query.metric, query.filters) : null;
  const regions = query ? regionsLeft(query.metric, query.filters) : null;
  const out: Marker[] = [];
  for (const e of EVENTS) {
    if (e.date < range.from || e.date > range.to) continue;
    if (countries && e.country && !countries.includes(e.country)) continue;
    if (regions && e.region && !regions.includes(e.region)) continue;
    const b = buckets.find((x) => e.date >= x.start && e.date <= bucketEnd(x.start, grouping));
    if (!b) continue;
    const same = out.find((m) => m.x === b.label);
    if (same) same.label = `${same.label}, ${e.label}`;
    else out.push({ x: b.label, label: e.label });
  }
  return out;
}

/** Each value as a share: of its bar, period by period, and of the whole for the totals. */
export function asShares(r: QueryResult): QueryResult {
  const perBucket = r.buckets.map((_, i) => r.series.reduce((a, x) => a + (Number.isFinite(x.values[i]) ? x.values[i] : 0), 0));
  const whole = r.series.reduce((a, x) => a + x.total, 0);
  return {
    ...r,
    total: 100,
    series: r.series.map((x) => ({
      ...x,
      values: x.values.map((v, i) => (perBucket[i] > 0 && Number.isFinite(v) ? (v / perBucket[i]) * 100 : 0)),
      total: whole > 0 ? (x.total / whole) * 100 : 0,
    })),
  };
}

/** The metric as a percentage, so axes, labels and tooltips read 0–100%. */
export const sharesMetric = (m: Metric): Metric => ({ ...m, unit: "%", noun: undefined });
