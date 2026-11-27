"use client";

import { useEffect, useState } from "react";
import { List, Map } from "lucide-react";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { useAuthStore } from "@/store/auth";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { toast } from "@/store/toast";
import { SegmentedControl } from "@/components/ui/FilterControls";
import { FilterBar } from "@/components/asset-tracking/FilterBar";
import { VehicleTable } from "@/components/asset-tracking/VehicleTable";
import { VehicleMap } from "@/components/asset-tracking/VehicleMap";
import { useVisibleColumns, withoutHidden, type ColumnId } from "@/components/asset-tracking/vehicle-columns";
import { useCanSeeAgreements } from "@/components/asset-tracking/agreement-access";
import { agreementsFor, formatUtc, summarize, type AgreementType } from "@/lib/mock/vehicle-agreements";

/** The export's agreement columns: the overall status, then each agreement's status and signed time (UTC). */
const AGREEMENT_HEADERS = [
  "Agreements",
  "Warranty agreement", "Warranty signed (UTC)",
  "Energy agreement", "Energy signed (UTC)",
];

function agreementCells(v: { vin: string; customerName: string; customerPhone: string }): string[] {
  const record = agreementsFor(v);
  const summary = summarize(record);
  const overall =
    summary.status === "Pending" && summary.required > 1
      ? `Pending (${summary.signed} of ${summary.required} signed)`
      : summary.status;
  const one = (type: AgreementType) => {
    const a = record.agreements.find((x) => x.type === type);
    return a ? [a.status, a.signedAt ? formatUtc(a.signedAt) : ""] : ["", ""];
  };
  return [overall, ...one("warranty"), ...one("energy")];
}

type View = "list" | "map";

async function exportToXLSX(
  vehicles: ReturnType<typeof useAssetTrackingStore.getState>["vehicles"],
  includeAgreements: boolean,
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Vehicle Tracking");

  const headers = [
    "VIN", "Customer Name", "Customer Phone", "Status", "Tenant", "Store Code",
    "Date of Sale", "Odometer", "Plate", "IMEI", "Connectivity", "Last Connected",
    "Immobilization", "SOC", "Lat", "Long", "VCU", "ZeConnect", "EVCC",
    ...(includeAgreements ? AGREEMENT_HEADERS : []),
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003B49" } };
  headerRow.height = 20;

  vehicles.forEach((v) => {
    sheet.addRow([
      v.vin, v.customerName, v.customerPhone, v.status, v.tenant, v.storeCode,
      v.dateOfSale, v.odometer, v.plate, v.imei, v.connectivity, v.lastConnected,
      v.immobilization, v.soc, v.lat, v.long, v.vcuFirmware, v.zeConnectFirmware, v.evccFirmware,
      ...(includeAgreements ? agreementCells(v) : []),
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
  a.download = "vehicle-tracking-export.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AssetTrackingPage() {
  const [view, setView] = useState<View>("list");
  const filteredVehicles = useAssetTrackingStore((s) => s.filteredVehicles);
  // Map View calls filteredVehicles() during render, so this page has to re-run
  // when the filters move. filteredVehicles is a stable reference and never
  // does that on its own.
  useAssetTrackingStore((s) => s.filters);
  const userId = useAuthStore((s) => s.user?.id);
  const [savedColumns, saveColumns] = useVisibleColumns(userId);
  const canSeeAgreements = useCanSeeAgreements();
  const agreementsFilter = useAssetTrackingStore((s) => s.filters.agreements);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);

  // Partner roles never see the agreement columns. Their own column changes keep
  // whether Agreements was on, so it's still there when an internal role looks.
  const visibleColumns = withoutHidden(savedColumns, canSeeAgreements);
  function setVisibleColumns(cols: ColumnId[]) {
    saveColumns(canSeeAgreements || !savedColumns.includes("agreements") ? cols : [...cols, "agreements"]);
  }

  // Nor does the Agreements filter apply to them: one set before switching role is cleared.
  useEffect(() => {
    if (!canSeeAgreements && agreementsFilter !== "All") setFilter("agreements", "All");
  }, [canSeeAgreements, agreementsFilter, setFilter]);

  function handleExport() {
    const rows = filteredVehicles();
    if (rows.length === 0) {
      toast.error("Nothing to export", "No vehicle matches the current filters. Clear a filter and try again.");
      return;
    }
    exportToXLSX(rows, canSeeAgreements);
    toast.success("Export downloaded", `${rows.length.toLocaleString()} vehicles written to XLSX.`);
  }

  return (
    <AccessGuard module="vehicle">
      <Topbar title="Vehicle Tracking" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List View", icon: <List className="w-4 h-4" /> },
            { value: "map", label: "Map View", icon: <Map className="w-4 h-4" /> },
          ]}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
        <FilterBar
          onExport={handleExport}
          columns={view === "list" ? { visible: visibleColumns, onChange: setVisibleColumns } : undefined}
        />

        {view === "list" ? (
          <VehicleTable visible={visibleColumns} />
        ) : (
          <VehicleMap vehicles={filteredVehicles()} className="flex-1" />
        )}
      </div>
      </main>
    </AccessGuard>
  );
}
