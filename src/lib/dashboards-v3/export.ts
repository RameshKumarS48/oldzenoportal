/**
 * What a widget exports, shared by its CSV and the dashboard's Excel file
 * so the two always have the same columns. Pure, so it can be checked
 * without a browser.
 */
import { metricById, type Metric } from "./catalogue";
import { runQuery, type QueryResult } from "./series";
import type { DashboardFilters, Widget } from "./types";
import { widgetQuery } from "./widgets";

export interface ExportTable {
  head: string[];
  /** Period, then one figure per column; null where there's no figure. */
  rows: (string | number | null)[][];
}

/** A widget's export: a row per period, a column per split value (or one for the metric). */
export function widgetTable(widget: Widget, result: QueryResult, metric: Metric): ExportTable {
  const head = widget.splitBy && widget.type !== "kpi" ? ["Period", ...result.series.map((s) => s.name)] : ["Period", metric.name];
  const rows = result.buckets.map((b, i) => [
    b.label,
    ...result.series.map((s) => (Number.isFinite(s.values[i]) ? Math.round(s.values[i] * 100) / 100 : null)),
  ]);
  return { head, rows };
}

/** The same export for a widget on its own, with the dashboard's filters applied; null for text widgets. */
export function widgetTableFor(widget: Widget, filters: DashboardFilters, today: Date): ExportTable | null {
  const metric = metricById(widget.metricId);
  const query = widgetQuery(widget, filters, today);
  if (!metric || !query) return null;
  return widgetTable(widget, runQuery(query), metric);
}

/** The table as CSV: every cell quoted, figures with two decimals. */
export function toCsv({ head, rows }: ExportTable): string {
  return [head, ...rows]
    .map((r) => r.map((c) => `"${(typeof c === "number" ? c.toFixed(2) : c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

const SHEET_MAX = 31;

/**
 * Excel sheet names from titles: without the characters Excel refuses
 * (\ / ? * [ ] :), at most 31 characters, and unique, with " (2)", " (3)"
 * added to repeats and the title shortened to make room.
 */
export function sheetNames(titles: string[], taken: string[] = []): string[] {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  return titles.map((title) => {
    const clean = title.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "") || "Widget";
    let name = clean.slice(0, SHEET_MAX).trim();
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      const suffix = ` (${n})`;
      name = `${clean.slice(0, SHEET_MAX - suffix.length).trim()}${suffix}`;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

/** A file name without characters file systems refuse. */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}
