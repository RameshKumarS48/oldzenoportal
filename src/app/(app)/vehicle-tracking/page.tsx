"use client";

import { useState } from "react";
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
import { useVisibleColumns } from "@/components/asset-tracking/vehicle-columns";

type View = "list" | "map";

async function exportToXLSX(vehicles: ReturnType<typeof useAssetTrackingStore.getState>["vehicles"]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Vehicle Tracking");

  const headers = [
    "VIN", "Customer Name", "Customer Phone", "Status", "Tenant", "Store Code",
    "Date of Sale", "Odometer", "Plate", "IMEI", "Connectivity", "Last Connected",
    "Immobilization", "SOC", "Lat", "Long", "VCU", "ZeConnect", "EVCC",
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
  const [visibleColumns, setVisibleColumns] = useVisibleColumns(userId);

  function handleExport() {
    const rows = filteredVehicles();
    if (rows.length === 0) {
      toast.error("Nothing to export", "No vehicle matches the current filters. Clear a filter and try again.");
      return;
    }
    exportToXLSX(rows);
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
