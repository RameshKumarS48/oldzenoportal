import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import { fmtDay, STATUS_LABELS } from "@/lib/mock/battery-provisioning";

/**
 * Battery Tracking's Export XLSX: Vehicle Tracking's export (header row in
 * brand teal, one row per battery), with every column the table shows, split
 * into plain cells (Latitude and Longitude apart, the flags as Yes/No), plus
 * the provisioning dates the detail page shows. Empty cells where a value
 * doesn't apply.
 */
export async function exportBatteriesXLSX(rows: BatteryRecord[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Battery Tracking");

  const headers = [
    "Battery Serial No.", "Status", "Repair in progress", "Charge due", "IMEI", "Last Seen (UTC)", "SOC %",
    "Asset Type", "Asset", "Slot", "Region", "Latitude", "Longitude",
    "Shipment", "Warehouse", "Date Received", "Bring-up 1/2", "Registered for Storage",
    "Days in Storage", "Days Since Last Charge", "Storage Charges", "Bring-up 2/2", "First Deployed",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003B49" } };
  headerRow.height = 20;

  const day = (ms: number | null | undefined) => (ms ? fmtDay(ms) : "");
  rows.forEach((b) => {
    const [lat, lng] = b.location ? b.location.split(",").map((s) => Number(s.trim())) : [null, null];
    sheet.addRow([
      b.serialNo,
      STATUS_LABELS[b.status],
      b.repairInProgress ? "Yes" : "No",
      b.chargeDue ? "Yes" : "No",
      b.imei,
      b.lastSeen,
      b.soc,
      b.asset ? (b.asset.type === "station" ? "Station" : "Vehicle") : "",
      b.asset ? (b.asset.type === "station" ? b.asset.code : b.asset.vin) : "",
      b.asset?.type === "station" ? b.asset.slot : null,
      b.region ?? "",
      lat,
      lng,
      b.shipment?.number ?? "",
      b.shipment?.warehouse ?? "",
      day(b.shipment?.receivedOn),
      day(b.bringUp1?.at),
      day(b.storage?.registeredAt),
      b.storage?.daysInStorage ?? null,
      b.storage?.daysSinceCharge ?? null,
      b.storage?.charges ?? null,
      day(b.bringUp2?.at),
      day(b.firstDeployedAt),
    ]);
  });

  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = Math.max(14, headers[i].length + 4);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "battery-tracking-export.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
