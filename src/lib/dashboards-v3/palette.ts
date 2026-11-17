/**
 * The one chart palette for Dashboards (v3): IBM Carbon's categorical
 * colours. Hex values because Recharts draws SVG. Category chips keep their
 * own colours (catalogue.ts); there is no colour picker anywhere.
 *
 * Contrast on white: every series colour is at least 3:1 (cyan, the lowest,
 * is 3.33:1), so series colours mark lines and bars but never colour text;
 * labels beside them are slate-700. The KPI change colours are text and are
 * at least 4.5:1. Carbon's red and green are kept out of the series so they
 * only ever mean good or bad.
 */
import type { PropertyId } from "./catalogue";

/** Series colours in the order a widget uses them: purple, cyan, teal, magenta, blue. Five at most, then Other. */
export const SERIES = ["#6929C4", "#1192E8", "#005D5D", "#9F1853", "#002D9C"] as const;

/** Other, and the previous-period line (dashed): slate-500, 4.76:1. */
export const OTHER = "#64748b";
export const PREVIOUS = "#64748b";
/** Goal lines, dashed and always labelled: slate-400. */
export const GOAL = "#94a3b8";
/** Light gridlines: slate-100. */
export const GRID = "#f1f5f9";
/** Axis text: slate-500. */
export const AXIS_TEXT = "#64748b";
/** Text beside a colour (direct labels, legends): slate-700, so it reads whatever the colour. */
export const LABEL_TEXT = "#334155";

/** Services keep the same colour in every widget, whatever order they come in. */
export const SERVICE_COLOR: Record<string, string> = {
  Swap: "#005D5D",
  "Fast charge": "#6929C4",
  "Home charge": "#1192E8",
};

/**
 * Each series' colour in a widget: services by name; anything else in
 * palette order, first series purple; Other always grey. A single series is
 * the first colour.
 */
export function seriesColors(splitBy: PropertyId | undefined, names: string[]): string[] {
  let i = 0;
  return names.map((name) => {
    if (name === "Other") return OTHER;
    if (splitBy === "service" && SERVICE_COLOR[name]) return SERVICE_COLOR[name];
    return SERIES[i++ % SERIES.length];
  });
}

/** KPI change text: Carbon green #198038 (5.02:1) for good news, red #DA1E28 (5.00:1) for bad, slate-600 when flat. Always with ▲ ▼ and words. */
export const CHANGE_CLASS = { good: "text-[#198038]", bad: "text-[#DA1E28]", flat: "text-slate-600" } as const;
