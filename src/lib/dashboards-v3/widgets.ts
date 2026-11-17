/**
 * Working with a dashboard's widget list: every change keeps the list in
 * its group order (numbers, then charts, then tables) and within the
 * widget limit. Pure, so the same functions serve view and edit mode.
 */
import { metricById, PROPERTIES, type ChartType, type Metric } from "./catalogue";
import { defaultGrouping, resolveRange, type ResolvedRange } from "./dates";
import { defaultSize, MAX_WIDGETS, orderWidgets, topFor, widgetRank } from "./rules";
import type { Query } from "./series";
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

export interface WidgetQuery extends Query {
  /** The widget's own range or the dashboard's, resolved. */
  range: ResolvedRange;
  grouping: Grouping;
}

/** What a widget asks for: its metric, the dashboard's filters plus its own, and its range and grouping. */
export function widgetQuery(widget: Widget, filters: DashboardFilters, today: Date): WidgetQuery | null {
  const metric = metricById(widget.metricId);
  if (!metric || widget.type === "text") return null;
  const range = resolveRange(widget.range ?? filters.range, today);
  const all: PropertyFilter[] = [];
  if (filters.regions.length > 0) all.push({ property: "region", values: filters.regions });
  if (widget.filter && widget.filter.values.length > 0) {
    const same = all.find((f) => f.property === widget.filter!.property);
    // A widget's own filter on the same property narrows the dashboard's.
    // When they share no values, nothing matches: a value no data has keeps the filter from being dropped as empty.
    if (same) {
      const both = same.values.filter((v) => widget.filter!.values.includes(v));
      same.values = both.length > 0 ? both : [NO_MATCH];
    }
    else all.push(widget.filter);
  }
  return {
    metric,
    range,
    filters: all,
    splitBy: widget.type === "kpi" ? undefined : widget.splitBy,
    grouping: widget.grouping ?? defaultGrouping(range),
    top: topFor(widget.type),
  };
}
