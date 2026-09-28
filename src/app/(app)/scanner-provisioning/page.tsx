"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import {
  useScannerProvisioningStore,
  ACTION_LABELS,
  SYNC_LABELS,
  RFID_LABELS,
  type ScannerAction,
} from "@/store/scanner-provisioning";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { useAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/FilterControls";
import { FilterBar } from "@/components/scanner-provisioning/FilterBar";
import { ActionTable } from "@/components/scanner-provisioning/ActionTable";
import { ActionFormModal } from "@/components/scanner-provisioning/ActionFormModal";
import { DeleteConfirmModal } from "@/components/scanner-provisioning/DeleteConfirmModal";

async function exportToXLSX(actions: ScannerAction[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Scanner Provisioning");

  const headers = [
    "Timestamp", "Action", "VIN", "Chassis", "VCU IMEI", "VCU ICCID", "EVCC", "Motor",
    "Registration", "Customer Name", "Customer Phone", "Driving License", "RFID", "RFID Tag",
    "Store Code", "Tenant", "Bike State", "Performed By", "Credential", "OTP Verified",
    "Signature", "Sync Status", "Source", "Linked VIN", "Notes",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003B49" } };
  headerRow.height = 20;

  actions.forEach((a) => {
    sheet.addRow([
      a.timestamp, ACTION_LABELS[a.actionType], a.vin, a.chassisId, a.vcuImei, a.vcuIccid, a.evccId, a.motorId,
      a.registrationNo, a.customerName, a.customerPhone, a.drivingLicense,
      a.rfidStatus === "unassigned" ? "" : RFID_LABELS[a.rfidStatus], a.rfidTag,
      a.storeCode, a.tenant, a.bikeState, a.performedBy, a.credentialType, a.otpVerified ? "Yes" : "No",
      a.signatureCaptured ? "Captured" : "", SYNC_LABELS[a.syncStatus],
      a.source === "portal" ? "Portal" : "Scanner App", a.linkedVin, a.notes,
    ]);
  });

  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = Math.max(14, headers[i].length + 4);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = "scanner-provisioning-export.xlsx";
  el.click();
  URL.revokeObjectURL(url);
}

export default function ScannerProvisioningPage() {
  const filters = useScannerProvisioningStore((s) => s.filters);
  const setFilter = useScannerProvisioningStore((s) => s.setFilter);
  const filteredActions = useScannerProvisioningStore((s) => s.filteredActions);
  const deleteAction = useScannerProvisioningStore((s) => s.deleteAction);

  const canWrite = useAccess().canWrite("scanner");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScannerAction | null>(null);
  const [deleting, setDeleting] = useState<ScannerAction | null>(null);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(action: ScannerAction) {
    setEditing(action);
    setFormOpen(true);
  }

  function handleConfirmDelete() {
    if (deleting) deleteAction(deleting.id);
    setDeleting(null);
  }

  return (
    <AccessGuard module="scanner">
      <Topbar title="Scanner Provisioning Flow" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <p className="text-xs text-slate-400 max-w-md">
          Every scanner-app action — bring-up, dispatch, onboarding, assignment, RFID, handover &amp; deactivation
        </p>

        <div className="flex items-center gap-3">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter("search", v)}
            placeholder="Search VIN, phone, RFID, staff…"
            className="w-64"
          />
          <Button variant="secondary" onClick={() => exportToXLSX(filteredActions())}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          {canWrite && (
            <Button variant="primary" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
        <FilterBar />
        <ActionTable
          onEdit={canWrite ? handleEdit : undefined}
          onDelete={canWrite ? setDeleting : undefined}
        />
      </div>

      {formOpen && (
        <ActionFormModal open onClose={() => setFormOpen(false)} editing={editing} />
      )}
      <DeleteConfirmModal
        action={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
      />
      </main>
    </AccessGuard>
  );
}
