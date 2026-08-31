"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import {
  useScannerProvisioningStore,
  ACTION_LABELS,
  type ScannerAction,
} from "@/store/scanner-provisioning";
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
    "Timestamp", "Action", "VIN", "Customer Name", "Customer Phone", "RFID Tag",
    "Store Code", "Tenant", "Bike State", "Performed By", "Credential", "OTP Verified",
    "Source", "Linked VIN", "Notes",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003B49" } };
  headerRow.height = 20;

  actions.forEach((a) => {
    sheet.addRow([
      a.timestamp, ACTION_LABELS[a.actionType], a.vin, a.customerName, a.customerPhone, a.rfidTag,
      a.storeCode, a.tenant, a.bikeState, a.performedBy, a.credentialType, a.otpVerified ? "Yes" : "No",
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
    <main className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Scanner Provisioning Flow</h1>
          <p className="text-xs text-slate-400">
            Every scanner-app action — bring-up, dispatch, onboarding, assignment, RFID, handover &amp; deactivation
          </p>
        </div>

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
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
        <FilterBar />
        <ActionTable onEdit={handleEdit} onDelete={setDeleting} />
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
  );
}
