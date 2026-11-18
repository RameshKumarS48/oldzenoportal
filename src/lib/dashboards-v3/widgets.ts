/**
 * Working with a dashboard's widget list: every change keeps the list in
 * its group order (numbers, then charts, then tables) and within the
 * widget limit. Pure, so the same functions serve view and edit mode.
 */
import { isMoney, metricById, PROPERTIES, type ChartType, type Metric, type PropertyId } from "./catalogue";
import { defaultGrouping, resolveRange, snapshotRange, type ResolvedRange } from "./dates";
import { defaultSize, MAX_WIDGETS, orderWidgets, topFor, widgetRank } from "./rules";
import { anyPlaceLeft, countriesLeft, type Query } from "./series";
import type { DashboardFilters, Grouping, PropertyFilter, Widget, WidgetSize } from "./types";

let seq = 0;
export function widgetId(): string {
  return `w-${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

/** A new widget for a metric, in the metric's default chart unless told otherwise. */
export function makeWidget(metric: Metric, type: ChartType = metric.defaultChart): Widget {
  const splitBy = type === "stacked" || type === "bar" ? metric.defaultSplit ?? metric.splitBy[0] : undefined;
  return {
    id: widgetId(),
    type,
    title: splitBy ? `${metric.name} by ${PROPERTIES[splitBy].name.toLowerCase()}` : metric.name,
    metricId: metric.id,
    splitBy,
    compare: type === "kpi",
    showValues: false,
    sort: "desc",
    size: defaultSize(type),
  };
}

export const atLimit = (widgets: Widget[]) => widgets.length >= MAX_WIDGETS;
export const MAX_WIDGETS_NOTE = `Full: ${MAX_WIDGETS} widgets is the most a dashboard can hold`;

export function addWidget(widgets: Widget[], widget: Widget): Widget[] {
  return atLimit(widgets) ? widgets : orderWidgets([...widgets, widget]);
}

export function replaceWidget(widgets: Widget[], widget: Widget): Widget[] {
  return orderWidgets(widgets.map((w) => (w.id === widget.id ? widget : w)));
}

export function patchWidget(widgets: Widget[], id: string, patch: Partial<Widget>): Widget[] {
  return orderWidgets(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

export function duplicateWidget(widgets: Widget[], id: string): Widget[] {
  const i = widgets.findIndex((w) => w.id === id);
  if (i < 0 || atLimit(widgets)) return widgets;
  const copy: Widget = { ...widgets[i], id: widgetId(), title: `${widgets[i].title} (copy)` };
  delete copy.mockError;
  return [...widgets.slice(0, i + 1), copy, ...widgets.slice(i + 1)];
}

export function removeWidget(widgets: Widget[], id: string): { widgets: Widget[]; removed: Widget | null; index: number } {
  const index = widgets.findIndex((w) => w.id === id);
  if (index < 0) return { widgets, removed: null, index };
  return { widgets: widgets.filter((w) => w.id !== id), removed: widgets[index], index };
}

/** Puts a removed widget back where it was. */
export function restoreWidget(widgets: Widget[], widget: Widget, index: number): Widget[] {
  if (widgets.some((w) => w.id === widget.id)) return widgets;
  return orderWidgets([...widgets.slice(0, index), widget, ...widgets.slice(index)]);
}

/**
 * Why a widget can't move up or down, or null when it can. Widgets only move
 * within their group, so numbers stay above charts and charts above tables.
 */
export function moveBlocked(widgets: Widget[], id: string, dir: -1 | 1): string | null {
  const i = widgets.findIndex((w) => w.id === id);
  // A new widget's placeholder isn't in the list yet.
  if (i < 0) return "Not added yet";
  const neighbour = widgets[i + dir];
  if (!neighbour) return dir === -1 ? "Already at the top" : "Already at the bottom";
  if (widgetRank(neighbour.type) !== widgetRank(widgets[i].type)) {
    return dir === -1 ? GROUP_TOP[widgetRank(widgets[i].type)] : GROUP_BOTTOM[widgetRank(widgets[i].type)];
  }
  return null;
}

const GROUP_TOP = ["Already at the top", "Charts stay below numbers", "Tables stay below charts"];
const GROUP_BOTTOM = ["Numbers stay above charts", "Charts stay above tables", "Already at the bottom"];

export function moveWidget(widgets: Widget[], id: string, dir: -1 | 1): Widget[] {
  if (moveBlocked(widgets, id, dir)) return widgets;
  const i = widgets.findIndex((w) => w.id === id);
  const out = [...widgets];
  [out[i], out[i + dir]] = [out[i + dir], out[i]];
  return out;
}

/** The size a widget takes in the four-column grid. */
export const SPAN: Record<WidgetSize, string> = { quarter: "col-span-4 sm:col-span-2 xl:col-span-1", half: "col-span-4 xl:col-span-2", full: "col-span-4" };
/** The same sizes on the two-column grid shown beside the widget panel. */
export const SPAN_COMPACT: Record<WidgetSize, string> = { quarter: "col-span-1", half: "col-span-2", full: "col-span-2" };

const NO_MATCH = "(no match)";

/** Most filters one widget can have. */
export const WIDGET_FILTERS_MAX = 3;

/** Whether a widget shows a snapshot's current value: numbers, bars and tables do; lines and stacks show it over time. */
export function showsCurrentValue(widget: Widget, metric: Metric | undefined): boolean {
  return metric?.kind === "snapshot" && (widget.type === "kpi" || widget.type === "bar" || widget.type === "table");
}

/** A widget's filters that filter something: on a property, with at least one value ticked. */
export function activeFilters(widget: Widget): PropertyFilter[] {
  return (widget.filters ?? []).filter((f) => f.values.length > 0);
}

/** The muted line under a widget's title: "Swap · BaaS", "Nairobi, Nanyuki". */
export function filterLine(widget: Widget): string {
  return activeFilters(widget).map((f) => f.values.join(", ")).join(" · ");
}

/** The dashboard's filters as query parts: country, then regions. */
function dashboardParts(filters: DashboardFilters): PropertyFilter[] {
  const out: PropertyFilter[] = [];
  if (filters.country) out.push({ property: "country", values: [filters.country] });
  if (filters.regions.length > 0) out.push({ property: "region", values: filters.regions });
  return out;
}

export interface WidgetQuery extends Query {
  /** The widget's own range or the dashboard's, resolved; for a snapshot's current value, today's 06:00 refresh. */
  range: ResolvedRange;
  grouping: Grouping;
  /** A money metric across more than one country: split by country so currencies are never added up. */
  byCountry: boolean;
  /** The split the widget asked for, set aside to show it by country. */
  splitSetAside?: PropertyId;
  /** Both the dashboard's filters and the widget's have places in them, but none in common: nothing can match. */
  noOverlap: boolean;
}

/**
 * What a widget asks for: its metric, the dashboard's filters with its own
 * on top (all must match), and its range and grouping. A snapshot's number,
 * bar or table ignores the range and shows the current value. A money
 * metric that would add up more than one country is split by country.
 */
export function widgetQuery(widget: Widget, filters: DashboardFilters, today: Date): WidgetQuery | null {
  const metric = metricById(widget.metricId);
  if (!metric || widget.type === "text") return null;
  const current = showsCurrentValue(widget, metric);
  const range = current ? snapshotRange(today) : resolveRange(widget.range ?? filters.range, today);
  const board = dashboardParts(filters);
  const own = activeFilters(widget);
  const all: PropertyFilter[] = board.map((f) => ({ ...f, values: [...f.values] }));
  for (const f of own) {
    const same = all.find((x) => x.property === f.property);
    // A widget's own filter on the same property narrows the dashboard's.
    // When they share no values, nothing matches: a value no data has keeps the filter from being dropped as empty.
    if (same) {
      const both = same.values.filter((v) => f.values.includes(v));
      same.values = both.length > 0 ? both : [NO_MATCH];
    } else all.push(f);
  }
  const noOverlap = own.length > 0 && board.length > 0 && !anyPlaceLeft(metric, all) && anyPlaceLeft(metric, board) && anyPlaceLeft(metric, own);
  const byCountry = isMoney(metric) && countriesLeft(metric, all).length > 1;
  const asked = widget.type === "kpi" ? undefined : widget.splitBy;
  return {
    metric,
    range,
    filters: all,
    splitBy: byCountry ? "country" : asked,
    splitSetAside: byCountry && asked && asked !== "country" ? asked : undefined,
    byCountry,
    noOverlap,
    // A number's sparkline follows the same rule as a line: daily up to 31 days, weekly above.
    grouping: current ? "day" : widget.type === "kpi" ? defaultGrouping(range) : widget.grouping ?? defaultGrouping(range),
    top: topFor(widget.type),
  };
}
