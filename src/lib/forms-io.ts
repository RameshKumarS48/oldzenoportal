"use client";

import { format } from "date-fns";
import type { FormDef, FormField, FieldType, FieldValue } from "@/store/forms";

/**
 * Import/export helpers that make forms and sheets bi-directional:
 *  - Import an existing CSV / Excel file → infer fields + rows (start from a
 *    sheet people already use instead of building from scratch).
 *  - Export any form's data back out to CSV or Excel.
 * Excel support is loaded on demand (dynamic import) so it never bloats the
 * main bundle.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** RFC-4180-ish CSV parser (handles quotes, escaped quotes, CRLF/CR/LF). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        if (ch === "\r") i++;
        row.push(field); field = ""; rows.push(row); row = [];
      } else if (ch === "\r") { row.push(field); field = ""; rows.push(row); row = []; }
      else { field += ch; }
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function getWorkbookCtor(): Promise<typeof import("exceljs").Workbook> {
  const mod = await import("exceljs");
  const W = mod.Workbook ?? (mod as { default?: { Workbook?: typeof import("exceljs").Workbook } }).default?.Workbook;
  if (!W) throw new Error("Could not load the Excel engine.");
  return W;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return isoDate(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if ("result" in o && o.result != null) return cellToString(o.result);
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    if (typeof o.hyperlink === "string") return o.hyperlink;
    if ("error" in o) return "";
  }
  return String(v);
}

export async function parseXLSX(buf: ArrayBuffer): Promise<string[][]> {
  const Workbook = await getWorkbookCtor();
  const wb = new Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  let colCount = ws.columnCount;
  if (!colCount || colCount < 1) colCount = ws.getRow(1).cellCount || 0;
  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const arr: string[] = [];
    for (let c = 1; c <= colCount; c++) arr.push(cellToString(row.getCell(c).value));
    matrix.push(arr);
  });
  return matrix;
}

/** Parse an uploaded file (CSV or Excel) into a raw string matrix. */
export async function parseFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm") || name.endsWith(".xls")) {
    return parseXLSX(await file.arrayBuffer());
  }
  return parseCSV(await file.text());
}

// ---------------------------------------------------------------------------
// Matrix → form schema + rows
// ---------------------------------------------------------------------------

function inferType(samples: string[]): FieldType {
  const vals = samples.map((s) => (s ?? "").trim()).filter((s) => s !== "");
  if (vals.length === 0) return "text";
  if (vals.every((v) => !isNaN(Number(v)))) return "number";
  if (vals.every((v) => EMAIL_RE.test(v))) return "email";
  if (vals.every((v) => ISO_DATE_RE.test(v))) return "date";
  return "text";
}

function coerce(raw: string, type: FieldType): FieldValue {
  if (raw === "") return type === "checkbox" ? false : "";
  if (type === "number") { const n = Number(raw); return isNaN(n) ? raw : n; }
  if (type === "checkbox") return /^(yes|true|1|y)$/i.test(raw);
  return raw;
}

export interface ImportDraft {
  fields: FormField[];
  rows: Record<string, FieldValue>[];
}

/** First row = headers → fields (with inferred types); remaining rows → values. */
export function matrixToDraft(matrix: string[][]): ImportDraft {
  const clean = matrix.filter((r) => r.length > 0);
  if (clean.length === 0) return { fields: [], rows: [] };
  const headers = clean[0];
  const body = clean.slice(1);
  const fields: FormField[] = headers.map((h, ci) => ({
    id: uid("f"),
    label: (h ?? "").trim() || `Column ${ci + 1}`,
    type: inferType(body.map((r) => r[ci] ?? "")),
    required: false,
  }));
  const rows = body
    .filter((r) => r.some((c) => (c ?? "").trim() !== ""))
    .map((r) => {
      const values: Record<string, FieldValue> = {};
      fields.forEach((f, ci) => { values[f.id] = coerce((r[ci] ?? "").trim(), f.type); });
      return values;
    });
  return { fields, rows };
}

/** Append an imported matrix to an existing form, matching columns by header
 *  label (case-insensitive) and creating fields for any that don't exist yet. */
export function mergeMatrixIntoForm(form: FormDef, matrix: string[][]): { newFields: FormField[]; rows: Record<string, FieldValue>[] } {
  const clean = matrix.filter((r) => r.length > 0);
  if (clean.length === 0) return { newFields: [], rows: [] };
  const headers = clean[0].map((h) => (h ?? "").trim());
  const body = clean.slice(1);
  const byLabel = new Map(form.fields.map((f) => [f.label.trim().toLowerCase(), f]));
  const newFields: FormField[] = [];
  const colField: FormField[] = headers.map((h, ci) => {
    const existing = byLabel.get(h.toLowerCase());
    if (existing) return existing;
    const nf: FormField = { id: uid("f"), label: h || `Column ${ci + 1}`, type: inferType(body.map((r) => r[ci] ?? "")), required: false };
    newFields.push(nf);
    byLabel.set(nf.label.toLowerCase(), nf);
    return nf;
  });
  const rows = body
    .filter((r) => r.some((c) => (c ?? "").trim() !== ""))
    .map((r) => {
      const values: Record<string, FieldValue> = {};
      colField.forEach((f, ci) => { values[f.id] = coerce((r[ci] ?? "").trim(), f.type); });
      return values;
    });
  return { newFields, rows };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function displayValue(v: FieldValue | undefined, field: FormField): string {
  if (v === undefined || v === "") return "";
  if (field.type === "checkbox") return v ? "Yes" : "No";
  return String(v);
}

function exportCell(v: FieldValue | undefined, field: FormField): FieldValue {
  if (v === undefined || v === "") return "";
  if (field.type === "checkbox") return v ? "Yes" : "No";
  if (field.type === "number") return typeof v === "number" ? v : (isNaN(Number(v)) ? String(v) : Number(v));
  return typeof v === "boolean" ? (v ? "Yes" : "No") : v;
}

function slug(s: string): string {
  return (s || "sheet").trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "") || "sheet";
}

function sanitizeSheetName(s: string): string {
  return (s || "Sheet").replace(/[[\]*?/\\:]/g, " ").slice(0, 31) || "Sheet";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportRow { values: Record<string, FieldValue>; submittedAt?: string; submittedBy?: string }

export function downloadCSV(form: FormDef, rows: ExportRow[]) {
  const headers = [...form.fields.map((f) => f.label || "Untitled"), "Submitted At", "Submitted By"];
  const body = rows.map((s) => [
    ...form.fields.map((f) => displayValue(s.values[f.id], f)),
    s.submittedAt ? format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm") : "",
    s.submittedBy ?? "",
  ]);
  const csv = [headers, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${slug(form.title)}.csv`);
}

export async function downloadXLSX(form: FormDef, rows: ExportRow[]) {
  const Workbook = await getWorkbookCtor();
  const wb = new Workbook();
  const ws = wb.addWorksheet(sanitizeSheetName(form.title));
  ws.columns = [
    ...form.fields.map((f) => ({ header: f.label || "Untitled", key: f.id, width: 22 })),
    { header: "Submitted At", key: "__at", width: 20 },
    { header: "Submitted By", key: "__by", width: 18 },
  ];
  for (const s of rows) {
    const row: Record<string, FieldValue> = {};
    for (const f of form.fields) row[f.id] = exportCell(s.values[f.id], f);
    row.__at = s.submittedAt ? format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm") : "";
    row.__by = s.submittedBy ?? "";
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(form.title)}.xlsx`
  );
}
