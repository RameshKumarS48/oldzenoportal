"use client";

import { useState } from "react";
import { Download, List, Map } from "lucide-react";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { SearchInput, SegmentedControl } from "@/components/ui/FilterControls";
import { FilterBar } from "@/components/asset-tracking/FilterBar";
import { VehicleTable } from "@/components/asset-tracking/VehicleTable";
import { MapPlaceholder } from "@/components/asset-tracking/MapPlaceholder";

type View = "list" | "map";

async function exportToXLSX(vehicles: ReturnType<typeof useAssetTrackingStore.getState>["vehicles"]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Asset Tracking");

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
  a.download = "asset-tracking-export.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AssetTrackingPage() {
  const [view, setView] = useState<View>("list");
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const filteredVehicles = useAssetTrackingStore((s) => s.filteredVehicles);

  function handleExport() {
    exportToXLSX(filteredVehicles());
  }

  return (
    <AccessGuard module="vehicle">
      <Topbar title="Asset Tracking" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List View", icon: <List className="w-4 h-4" /> },
            { value: "map", label: "Map View", icon: <Map className="w-4 h-4" /> },
          ]}
        />

        <div className="flex items-center gap-3">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter("search", v)}
            placeholder="Search VIN, customer, plate…"
            className="w-64"
          />
          <Button variant="primary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
        <FilterBar />

        {view === "list" ? (
          <VehicleTable />
        ) : (
          <MapPlaceholder className="flex-1" />
        )}
      </div>
      </main>
    </AccessGuard>
  );
}
