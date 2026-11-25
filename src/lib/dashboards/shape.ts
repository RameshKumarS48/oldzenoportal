/**
 * The view follows from the query. A card's shape (how many measures, over
 * time or not, how many splits) decides which views make sense; the first is
 * the default, and "View as" offers only the rest of that list.
 */
import { getRecord, resolveField } from "./registry";
import type { Card, Registry, ViewId } from "./types";

export type Shape = "value" | "time" | "time_split" | "split" | "split2" | "two_time" | "two_split" | "two_value";

export const VIEW_LABELS: Record<ViewId, string> = {
  number: "Number", target: "Progress to target", gauge: "Gauge",
  line: "Line", area: "Area", columns: "Columns", cumulative: "Running total", overlay: "This period vs last", calendar: "Calendar heatmap", hourweek: "Hour by weekday",
  lines: "Lines", stacked_area: "Stacked area", stacked_columns: "Stacked columns", stacked_100: "Share of total",
  bars: "Bars", columns_cat: "Columns", donut: "Donut", treemap: "Treemap", table: "Table", toplist: "Top list", tiles: "Tiles", map: "Map", waterfall: "Waterfall",
  stacked_bars: "Stacked bars", grouped_bars: "Grouped bars", heatgrid: "Heatmap", pivot: "Pivot table",
  combo: "Two charts", lines2: "Indexed lines", ratio_line: "Ratio over time", scatter: "Scatter", pair_bars: "Side by side", ratio: "Ratio", pair: "Two numbers",
  histogram: "Histogram", box: "Box plot", percentiles: "Percentiles",
};

const SPREAD_FNS = ["sum", "avg", "median", "min", "max"];

export function shapeOf(card: Pick<Card, "measures" | "overTime" | "splits">): Shape {
  const two = card.measures.length > 1;
  const splits = card.splits.length;
  if (two) return card.overTime ? "two_time" : splits ? "two_split" : "two_value";
  if (card.overTime) return splits ? "time_split" : "time";
  return splits >= 2 ? "split2" : splits === 1 ? "split" : "value";
}

/** How many splits the card can take: one over time or with two measures, else two. */
export function maxSplits(card: Pick<Card, "measures" | "overTime">): number {
  return card.overTime || card.measures.length > 1 ? 1 : 2;
}

/** Views valid for this card, default first. */
export function viewsFor(reg: Registry, card: Card): ViewId[] {
  if (card.kind !== "chart") return [];
  const first = card.measures[0];
  if (!first) return [];
  const record = getRecord(reg, first.record);
  // A number field has a spread of values, so its distribution can be drawn too.
  const spread = SPREAD_FNS.includes(first.fn);
  const split = card.splits[0] ? resolveField(reg, first.record, card.splits[0]) : null;
  switch (shapeOf(card)) {
    case "value": return ["number", "target", "gauge", ...(spread ? (["histogram", "box"] as ViewId[]) : [])];
    case "time": return ["line", "area", "columns", "cumulative", "overlay", "calendar", "hourweek", "waterfall", ...(spread ? (["percentiles"] as ViewId[]) : [])];
    case "time_split": return ["lines", "stacked_area", "stacked_columns", "stacked_100"];
    case "split": return [
      ...(split?.field.type === "place" ? (["map"] as ViewId[]) : []),
      "bars", "columns_cat", "donut", "treemap", "table", "toplist",
      ...(record?.kind === "thing" ? (["tiles"] as ViewId[]) : []),
      "waterfall", ...(spread ? (["box"] as ViewId[]) : []),
    ];
    case "split2": return ["stacked_bars", "grouped_bars", "heatgrid", "pivot"];
    case "two_time": return ["combo", "lines2", "ratio_line"];
    case "two_split": return ["scatter", "pair_bars", "table"];
    case "two_value": return ["ratio", "pair"];
  }
}

/** The card's view if it is still valid for its shape, else the default. */
export function effectiveView(reg: Registry, card: Card): ViewId | null {
  const views = viewsFor(reg, card);
  return card.view && views.includes(card.view) ? card.view : views[0] ?? null;
}

/** Whether "over time" is the natural start for a record: yes for events, no for things. */
export const startsOverTime = (reg: Registry, recordId: string) => getRecord(reg, recordId)?.kind === "event";
