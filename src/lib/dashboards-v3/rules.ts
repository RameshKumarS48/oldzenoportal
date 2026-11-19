/**
 * The Dashboards (v3) limits and which choices are valid together. Every
 * disabled option gets a reason here, so the UI can say why on hover.
 */
import { propertyBlocked, type ChartType, type Metric, type PropertyId } from "./catalogue";
import type { Widget, WidgetSize } from "./types";

export const MAX_WIDGETS = 12;
/** Most series one chart draws: the five palette colours, then Other in grey. */
export const MAX_SERIES = 6;
/** Most values a bar chart or table names before the rest go into Other. */
export const TOP_VALUES = 8;

/** Most named segments in a stacked bar before Other: more than four slices of a bar can't be told apart. */
export const STACK_SEGMENTS = 4;

/** How many split values a chart names before Other: lines are capped by colours, stacks by readable segments, bars and tables by rows. */
export function topFor(type: ChartType): number {
  if (type === "stacked") return STACK_SEGMENTS;
  return type === "line" ? MAX_SERIES - 1 : TOP_VALUES;
}

/**
 * Each chart by the question it answers, as the widget panel offers it:
 * the goal is the label, the chart's name and when to use
 * it are its tooltip and accessible description.
 */
export const CHART_GOALS: Record<Exclude<ChartType, "text">, { goal: string; name: string; when: string }> = {
  kpi: { goal: "A number", name: "Number", when: "One figure, with its change since the previous period." },
  line: { goal: "Change over time", name: "Line chart", when: "See trends, spikes and dips over time." },
  bar: { goal: "Compare items", name: "Bar chart", when: "Compare regions, stations or services side by side." },
  stacked: { goal: "What it’s made of", name: "Stacked bar chart", when: "See how the parts add up to the total, period by period." },
  table: { goal: "A list", name: "Table", when: "Read the exact figures in rows." },
  toplist: { goal: "Top list", name: "Ranked list", when: "See the biggest items with their share and change." },
};

/** "Line chart. See trends, spikes and dips over time." */
export const chartTip = (type: Exclude<ChartType, "text">) => `${CHART_GOALS[type].name}. ${CHART_GOALS[type].when}`;

/** Figures that add up, so their parts can be stacked into a total: not percentages, averages or ratios. */
export const canStack = (metric: Metric) => metric.unit !== "%" && metric.aggregation !== "average" && metric.aggregation !== "ratio";

export type Intent = "number" | "time" | "compare" | "parts" | "top" | "list";

/** The panel's "What do you want to see?", one choice per chart. "What it's made of" and "Top list" are offered only with a breakdown. */
export const INTENTS: { id: Intent; short: string; hint: string; charts: ChartType[] }[] = [
  { id: "number", short: CHART_GOALS.kpi.goal, hint: chartTip("kpi"), charts: ["kpi"] },
  { id: "time", short: CHART_GOALS.line.goal, hint: chartTip("line"), charts: ["line"] },
  { id: "compare", short: CHART_GOALS.bar.goal, hint: chartTip("bar"), charts: ["bar"] },
  { id: "parts", short: CHART_GOALS.stacked.goal, hint: chartTip("stacked"), charts: ["stacked"] },
  { id: "top", short: CHART_GOALS.toplist.goal, hint: chartTip("toplist"), charts: ["toplist"] },
  { id: "list", short: CHART_GOALS.table.goal, hint: chartTip("table"), charts: ["table"] },
];

export function intentOf(type: ChartType): Intent | null {
  if (type === "kpi") return "number";
  if (type === "line") return "time";
  if (type === "bar") return "compare";
  if (type === "stacked") return "parts";
  if (type === "table") return "list";
  if (type === "toplist") return "top";
  return null;
}

export const CHART_LABEL: Record<ChartType, string> = {
  kpi: "Number",
  line: "Line",
  bar: "Bar",
  stacked: "Stacked bar",
  table: "Table",
  toplist: "Top list",
  text: "Text or heading",
};

/** Why a chart type can't show this metric with this split, or null when it can. */
export function chartBlocked(type: ChartType, metric: Metric | undefined, splitBy: PropertyId | undefined): string | null {
  if (type === "text") return null;
  if (!metric) return "Choose a metric first";
  if (type === "kpi" && splitBy) return "A number shows one figure, so it can't be split. Remove the split to use it.";
  if (type === "bar" && !splitBy) return "A bar chart compares values side by side. Choose what to split by first.";
  if (type === "stacked" && metric.unit === "%") return "Percentages don't add up, so they can't be stacked.";
  if (type === "stacked" && !splitBy) return "A stacked bar shows the parts of a total. Choose what to split by first.";
  if (type === "toplist" && !splitBy) return "A top list ranks items. Choose what to break down by first.";
  return null;
}

/** Why a property can't split this widget, or null when it can. */
export function splitBlocked(type: ChartType, metric: Metric, property: PropertyId): string | null {
  if (type === "kpi") return "A number shows one figure, so it can't be split.";
  return propertyBlocked(metric, property, "split");
}

/** Top to bottom: numbers first, then charts (and text), then tables. */
const RANK: Record<ChartType, number> = { kpi: 0, text: 1, line: 1, bar: 1, stacked: 1, toplist: 1, table: 2 };

/** Widgets whose viewers can switch the breakdown with tabs: they show one breakdown at a time, for the whole period. */
export const canSwitch = (type: ChartType) => type === "bar" || type === "toplist" || type === "table";
/** Most breakdown tabs a widget offers. */
export const SWITCH_MAX = 4;
/** A top list names this many items, or this many with Show all. */
export const TOP_LIST_ALL = 20;

export function widgetRank(type: ChartType): number {
  return RANK[type];
}

/** Puts widgets in their group order, keeping their order within each group. */
export function orderWidgets(widgets: Widget[]): Widget[] {
  return widgets.map((w, i) => ({ w, i })).sort((a, b) => RANK[a.w.type] - RANK[b.w.type] || a.i - b.i).map(({ w }) => w);
}

export const SIZE_LABEL: Record<WidgetSize, string> = { quarter: "¼ width", half: "½ width", full: "Full width" };

export function allowedSizes(type: ChartType): WidgetSize[] {
  if (type === "kpi") return ["quarter", "half"];
  if (type === "text") return ["quarter", "half", "full"];
  return ["half", "full"];
}

export function defaultSize(type: ChartType): WidgetSize {
  if (type === "kpi") return "quarter";
  if (type === "text") return "full";
  return "half";
}
