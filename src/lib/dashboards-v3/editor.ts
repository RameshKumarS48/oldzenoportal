/**
 * The widget panel's choices and how they affect each other. Every option
 * that can't be used says why, and every change leaves the widget valid:
 * a number loses its split, a bar chart gets one, options a chart doesn't
 * use are cleared.
 */
import { metricById, PROPERTIES, type ChartType, type Metric, type PropertyId } from "./catalogue";
import { resolveRange } from "./dates";
import { allowedSizes, canStack, canSwitch, chartBlocked, defaultSize, INTENTS, splitBlocked, SWITCH_MAX, type Intent } from "./rules";
import type { DashboardFilters, Widget } from "./types";
import { showsCurrentValue, WIDGET_FILTERS_MAX } from "./widgets";

/** A metric's name with its split, unless the name already says it ("Battery inventory by state"). */
export function splitName(metric: Metric, splitBy: PropertyId | undefined): string {
  if (!splitBy || metric.defaultSplit === splitBy) return metric.name;
  return `${metric.name} by ${PROPERTIES[splitBy].name.toLowerCase()}`;
}

/** The title a widget would have if nobody typed one: the metric, and what it's split by (not with breakdown tabs, which say it themselves). */
export function autoTitle(w: Widget): string {
  if (w.type === "text") return "Heading";
  const metric = metricById(w.metricId);
  if (!metric) return "";
  const tabbed = (w.switchable?.length ?? 0) >= 2;
  return splitName(metric, w.type === "kpi" || tabbed ? undefined : w.splitBy);
}

function firstSplit(metric: Metric): Widget["splitBy"] {
  return metric.defaultSplit ?? metric.splitBy[0];
}

export function compareBlocked(w: Widget): string | null {
  if (w.type === "kpi") return null;
  if (w.type === "line") return w.splitBy ? "Comparing shows one line against the last period. Remove the split to compare." : null;
  if (w.type === "table") return w.splitBy ? null : "Comparing shows a change for each row of a split table. Choose a split first.";
  if (w.type === "text") return "Text has nothing to compare";
  if (w.type === "toplist") return "A top list always shows the change for each item";
  return "Bar charts don’t show the previous period. Use a line or a table to compare.";
}

/** Why a widget can't have its own time range: a snapshot's number, bar or table shows the current value. */
export function rangeBlocked(w: Widget): string | null {
  return showsCurrentValue(w, metricById(w.metricId)) ? "Shows the current value, so the date range doesn’t apply. A line or stacked bar shows it over time." : null;
}

export function groupingBlocked(w: Widget): string | null {
  if (rangeBlocked(w)) return "A current value is one moment, with no time to group";
  if (w.type === "kpi") return "A number shows the whole period in one figure";
  if (w.type === "bar") return "Bars compare totals for the whole period";
  if (w.type === "toplist") return "A top list ranks totals for the whole period";
  if (w.type === "table" && w.splitBy) return "A split table shows totals for the whole period";
  if (w.type === "text") return "Text has no time";
  return null;
}

export function goalBlocked(w: Widget): string | null {
  return w.type === "line" || w.type === "bar" || w.type === "stacked" ? null : "Goal lines show on line and bar charts";
}

export function showValuesBlocked(w: Widget): string | null {
  if (w.type === "line" || w.type === "stacked") return null;
  if (w.type === "kpi") return "A number already shows its value";
  if (w.type === "toplist") return "A top list always shows its values";
  if (w.type === "bar" || w.type === "table") return "Bars and tables always show their values";
  return "Text has no values";
}

/** Why a widget can't show each part as a % of its total: only stacked bars and broken-down bars, of figures that add up. */
export function percentBlocked(w: Widget): string | null {
  const metric = metricById(w.metricId);
  if (w.type !== "stacked" && w.type !== "bar") return "% of total shows on stacked bars and bar charts";
  if (!w.splitBy) return "% of total needs a breakdown";
  return metric && !canStack(metric) ? "Percentages, averages and ratios don’t add up to a total" : null;
}

export function sortBlocked(w: Widget): string | null {
  if (w.type === "toplist") return "A top list is ranked biggest first";
  return w.type === "bar" || w.type === "table" ? null : "Sorting applies to bar charts and tables";
}

/**
 * Makes a widget consistent after any change: a split only where the chart
 * takes one (and one it allows), options the chart doesn't use cleared, a
 * size the chart allows.
 */
export function normalise(w: Widget, sizeChosen: boolean): Widget {
  const out: Widget = { ...w };
  const metric = metricById(out.metricId);
  if (out.type === "text") {
    delete out.metricId; delete out.splitBy; delete out.filters; delete out.range; delete out.switchable; delete out.grouping; delete out.goal;
    out.compare = false;
    out.showValues = false;
  } else if (metric) {
    if (out.type === "kpi") delete out.splitBy;
    if (out.splitBy && splitBlocked(out.type, metric, out.splitBy)) delete out.splitBy;
    if ((out.type === "bar" || out.type === "stacked" || out.type === "toplist") && !out.splitBy) out.splitBy = firstSplit(metric);
    // Breakdown tabs: only where one breakdown shows at a time, the current one first, valid ones, four at most.
    if (out.switchable) {
      const split = out.splitBy;
      if (!canSwitch(out.type) || !split) delete out.switchable;
      else out.switchable = [...new Set([split, ...out.switchable])].filter((p) => !splitBlocked(out.type, metric, p)).slice(0, SWITCH_MAX);
    }
    if (out.filters) {
      // Filters the metric can use, one per property, three at most.
      const kept = out.filters.filter((f, i, all) => metric.filters.includes(f.property) && all.findIndex((g) => g.property === f.property) === i);
      out.filters = kept.slice(0, WIDGET_FILTERS_MAX);
      if (out.filters.length === 0) delete out.filters;
    }
    if (out.type === "stacked" && metric.unit === "%") out.type = "line";
  }
  if (rangeBlocked(out)) delete out.range;
  if (compareBlocked(out)) out.compare = false;
  if (groupingBlocked(out)) delete out.grouping;
  if (goalBlocked(out)) delete out.goal;
  if (showValuesBlocked(out)) out.showValues = false;
  if (!out.percent || percentBlocked(out)) delete out.percent;
  if (!sizeChosen || !allowedSizes(out.type).includes(out.size)) out.size = defaultSize(out.type);
  return out;
}

/**
 * "Recommended" in What do you want to see: with no breakdown, a snapshot's
 * number or a flow over time; broken down over a single period (a current
 * value, or one day), compare items; over time, what it's made of, or lines
 * for figures that don't add up.
 */
export function recommendedIntent(w: Widget, filters: DashboardFilters): Intent | null {
  const metric = metricById(w.metricId);
  if (!metric || w.type === "text") return null;
  if (!w.splitBy) return metric.kind === "snapshot" ? "number" : "time";
  if (metric.kind === "snapshot" || resolveRange(w.range ?? filters.range).days === 1) return "compare";
  return canStack(metric) ? "parts" : "time";
}

/** The chart a "What do you want to see?" choice starts with. */
export function chartForIntent(intent: Intent): ChartType {
  return INTENTS.find((i) => i.id === intent)!.charts[0];
}

/** Why a chart can't show this widget, for the "Change chart" choices. A missing split doesn't block: choosing the chart adds one. */
export function chartChoiceBlocked(type: ChartType, w: Widget): string | null {
  const metric = metricById(w.metricId);
  if (type === "bar" || type === "stacked" || type === "toplist") return chartBlocked(type, metric, metric ? metric.splitBy[0] : undefined);
  return chartBlocked(type, metric, undefined);
}

/** A widget's settings that change what it shows, to tell whether the panel has unsaved changes. */
export function sameWidget(a: Widget, b: Widget): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
