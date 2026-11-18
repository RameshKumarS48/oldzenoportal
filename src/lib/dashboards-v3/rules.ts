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

/** How many split values a chart names before Other: lines and stacks are capped by colours, bars and tables by rows. */
export function topFor(type: ChartType): number {
  return type === "line" || type === "stacked" ? MAX_SERIES - 1 : TOP_VALUES;
}

export type Intent = "number" | "trend" | "comparison" | "list";

export const INTENTS: { id: Intent; short: string; hint: string; charts: ChartType[] }[] = [
  { id: "number", short: "Number", hint: "One figure, with its change since the previous period", charts: ["kpi"] },
  { id: "trend", short: "Trend", hint: "How a figure moves day by day, week by week or month by month", charts: ["line", "stacked"] },
  { id: "comparison", short: "Comparison", hint: "Regions, stations or services side by side, biggest first", charts: ["bar", "stacked"] },
  { id: "list", short: "List", hint: "The figures in rows you can read across", charts: ["table"] },
];

export function intentOf(type: ChartType): Intent | null {
  if (type === "kpi") return "number";
  if (type === "line") return "trend";
  if (type === "bar" || type === "stacked") return "comparison";
  if (type === "table") return "list";
  return null;
}

export const CHART_LABEL: Record<ChartType, string> = {
  kpi: "Number",
  line: "Line",
  bar: "Bar",
  stacked: "Stacked bar",
  table: "Table",
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
  return null;
}

/** Why a property can't split this widget, or null when it can. */
export function splitBlocked(type: ChartType, metric: Metric, property: PropertyId): string | null {
  if (type === "kpi") return "A number shows one figure, so it can't be split.";
  return propertyBlocked(metric, property, "split");
}

/** Top to bottom: numbers first, then charts (and text), then tables. */
const RANK: Record<ChartType, number> = { kpi: 0, text: 1, line: 1, bar: 1, stacked: 1, table: 2 };

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
