"use client";

import { FIELDS, isPublic, mapsUrl, type ChargingAsset } from "@/lib/charging/fields";
import { gbpRows, publicLocations } from "@/lib/charging/public";
import { toCsv } from "@/lib/charging/csv";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Every field, in the sheet's column order and names, so it opens like the old Charging Asset Master. */
export async function exportChargingXLSX(rows: ChargingAsset[]) {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Charging Asset Master");
  const headers = [...FIELDS.map((f) => f.sheet), "Google Map Links", "In app & website", "Needs attention", "Archived", "Last updated by", "Last updated (UTC)"];
  const head = sheet.addRow(headers);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003B49" } };
  for (const a of rows) {
    sheet.addRow([
      ...FIELDS.map((f) => a[f.key] ?? ""),
      mapsUrl(a.lat, a.lng) ?? "",
      isPublic(a) ? "Yes" : "No",
      a.needsAttention ?? "",
      a.archivedAt ? a.archivedAt.slice(0, 10) : "",
      a.updatedBy,
      a.updatedAt.slice(0, 16).replace("T", " "),
    ]);
  }
  headers.forEach((h, i) => { sheet.getColumn(i + 1).width = Math.min(40, Math.max(12, h.length + 2)); });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await book.xlsx.writeBuffer();
  download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `zeno-charging-${today()}.xlsx`);
}

/** Google Business Profile bulk upload of the public locations; returns how many. */
export function exportGbpCsv(rows: ChargingAsset[]): number {
  const locations = publicLocations(rows);
  download(new Blob(["﻿", toCsv(gbpRows(locations))], { type: "text/csv;charset=utf-8" }), `zeno-locations-google-business-${today()}.csv`);
  return locations.length;
}
