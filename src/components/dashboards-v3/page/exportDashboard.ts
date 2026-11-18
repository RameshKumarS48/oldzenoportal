import { format } from "date-fns";
import { categoryName, metricById, PROPERTIES } from "@/lib/dashboards-v3/catalogue";
import { DATE_FORMAT, rangeLabel, rangeWithDates } from "@/lib/dashboards-v3/dates";
import { safeFileName, sheetNames, widgetTableFor } from "@/lib/dashboards-v3/export";
import { dataAsOf } from "@/lib/dashboards-v3/format";
import { CHART_LABEL } from "@/lib/dashboards-v3/rules";
import type { Dashboard, DashboardFilters } from "@/lib/dashboards-v3/types";

const SUMMARY = "Summary";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * The whole dashboard as one Excel file, mock data: a Summary sheet (name,
 * category, filters, data as of, the widgets), then a sheet per widget with
 * the same columns as its CSV and the filters on screen applied. exceljs is
 * already used by Asset Tracking's export and is loaded only when needed.
 */
export async function buildDashboardWorkbook(dashboard: Dashboard, filters: DashboardFilters, widgets: Dashboard["widgets"], today: Date) {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  const dataWidgets = widgets.filter((w) => w.type !== "text");
  const names = sheetNames(dataWidgets.map((w) => w.title || metricById(w.metricId)?.name || "Widget"), [SUMMARY]);
  const sheetOf = new Map(dataWidgets.map((w, i) => [w.id, names[i]]));

  const summary = book.addWorksheet(SUMMARY);
  summary.columns = [{ width: 26 }, { width: 44 }, { width: 28 }, { width: 32 }];
  const facts: [string, string][] = [
    ["Dashboard", dashboard.name],
    ["Category", categoryName(dashboard.category)],
    ["Date range", rangeWithDates(filters.range, today)],
    ["Country", filters.country ?? "All countries"],
    ["Region", filters.regions.length > 0 ? filters.regions.join(", ") : "All regions"],
    ["Data as of", format(dataAsOf(), `${DATE_FORMAT}, HH:mm`)],
    ["Note", "Sandbox export with mock data"],
  ];
  for (const [k, v] of facts) summary.addRow([k, v]).getCell(1).font = { bold: true };
  summary.addRow([]);
  summary.addRow(["Widget", "Type", "Metric", "Sheet"]).font = { bold: true };
  for (const w of widgets) {
    const metric = metricById(w.metricId);
    const split = w.splitBy && w.type !== "kpi" ? ` by ${PROPERTIES[w.splitBy].name.toLowerCase()}` : "";
    summary.addRow([w.title || "Untitled", CHART_LABEL[w.type], metric ? `${metric.name}${split}` : "–", sheetOf.get(w.id) ?? "No data (text)"]);
  }

  for (const w of dataWidgets) {
    const table = widgetTableFor(w, filters, today);
    if (!table) continue;
    const sheet = book.addWorksheet(sheetOf.get(w.id)!);
    sheet.addRow(table.head).font = { bold: true };
    for (const row of table.rows) sheet.addRow(row);
    sheet.columns.forEach((c, i) => { c.width = i === 0 ? 16 : Math.max(12, Math.min(28, (table.head[i]?.length ?? 10) + 2)); });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const fileName = `${safeFileName(`${dashboard.name} – ${rangeLabel(filters.range)}`)}.xlsx`;
  return { book, fileName };
}

/** Builds the dashboard's Excel file and downloads it; returns the file name. */
export async function exportDashboardXlsx(dashboard: Dashboard, filters: DashboardFilters, widgets: Dashboard["widgets"], today: Date): Promise<string> {
  const { book, fileName } = await buildDashboardWorkbook(dashboard, filters, widgets, today);
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_TYPE }));
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
  return fileName;
}
