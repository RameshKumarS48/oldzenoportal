"use client";

import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Link2 } from "lucide-react";
import {
  useScannerProvisioningStore,
  ACTION_LABELS,
  SYNC_LABELS,
  type ScannerAction,
  type ScannerActionType,
  type SyncStatus,
} from "@/store/scanner-provisioning";
import { Pagination } from "@/components/ui/Pagination";

const ACTION_COLORS: Record<ScannerActionType, string> = {
  bring_up: "bg-slate-100 text-slate-600",
  tenant_assign: "bg-indigo-50 text-indigo-700",
  dispatch: "bg-cyan-50 text-cyan-700",
  customer_onboard: "bg-purple-50 text-purple-700",
  bike_assign: "bg-blue-50 text-blue-700",
  rfid_assign: "bg-teal-50 text-teal-700",
  handover: "bg-green-50 text-green-700",
  deactivate: "bg-red-50 text-red-700",
};

function ActionBadge({ value }: { value: ScannerActionType }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ACTION_COLORS[value]}`}>
      {ACTION_LABELS[value]}
    </span>
  );
}

function BikeStateBadge({ value }: { value: ScannerAction["bikeState"] }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        value === "active"
          ? "bg-green-50 text-green-700"
          : value === "new"
          ? "bg-blue-50 text-blue-700"
          : value === "test"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

const SYNC_COLORS: Record<SyncStatus, string> = {
  synced: "bg-green-50 text-green-700",
  not_sent: "bg-amber-50 text-amber-700",
  empty: "bg-slate-100 text-slate-500",
};

function SyncBadge({ value }: { value: SyncStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${SYNC_COLORS[value]}`}>
      {SYNC_LABELS[value]}
    </span>
  );
}

// Compact monospace cell for scanned component IDs, with an em-dash when empty.
function MonoCell({ value }: { value: string }) {
  return value ? (
    <span className="text-slate-600 font-mono text-xs">{value}</span>
  ) : (
    <span className="text-slate-300">—</span>
  );
}

type ColKey = keyof ScannerAction;

const COLUMNS: { key: ColKey; label: string; width?: string }[] = [
  { key: "timestamp", label: "Timestamp", width: "min-w-[150px]" },
  { key: "actionType", label: "Action", width: "min-w-[130px]" },
  { key: "vin", label: "VIN", width: "min-w-[150px]" },
  { key: "chassisId", label: "Chassis", width: "min-w-[150px]" },
  { key: "vcuImei", label: "VCU · IMEI", width: "min-w-[140px]" },
  { key: "vcuIccid", label: "VCU · ICCID", width: "min-w-[170px]" },
  { key: "evccId", label: "EVCC", width: "min-w-[130px]" },
  { key: "motorId", label: "Motor", width: "min-w-[130px]" },
  { key: "registrationNo", label: "Registration", width: "min-w-[120px]" },
  { key: "customerName", label: "Customer", width: "min-w-[140px]" },
  { key: "customerPhone", label: "Phone", width: "min-w-[130px]" },
  { key: "drivingLicense", label: "Driving License", width: "min-w-[150px]" },
  { key: "rfidTag", label: "RFID Tag", width: "min-w-[120px]" },
  { key: "storeCode", label: "Store Code", width: "min-w-[130px]" },
  { key: "tenant", label: "Tenant", width: "min-w-[150px]" },
  { key: "bikeState", label: "Bike State", width: "min-w-[100px]" },
  { key: "performedBy", label: "Performed By", width: "min-w-[130px]" },
  { key: "credentialType", label: "Credential", width: "min-w-[100px]" },
  { key: "otpVerified", label: "OTP", width: "min-w-[70px]" },
  { key: "signatureCaptured", label: "Signature", width: "min-w-[90px]" },
  { key: "syncStatus", label: "Sync", width: "min-w-[90px]" },
  { key: "source", label: "Source", width: "min-w-[110px]" },
];

function SortIcon({ col }: { col: ColKey }) {
  const sort = useScannerProvisioningStore((s) => s.sort);
  if (sort?.column !== col) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return sort.direction === "asc" ? (
    <ArrowUp className="w-3 h-3 ml-1 text-zeno-red" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1 text-zeno-red" />
  );
}

export function ActionTable({
  onEdit,
  onDelete,
}: {
  onEdit: (action: ScannerAction) => void;
  onDelete: (action: ScannerAction) => void;
}) {
  const page = useScannerProvisioningStore((s) => s.page);
  const perPage = useScannerProvisioningStore((s) => s.perPage);
  const setPage = useScannerProvisioningStore((s) => s.setPage);
  const setPerPage = useScannerProvisioningStore((s) => s.setPerPage);
  const setSort = useScannerProvisioningStore((s) => s.setSort);
  const filteredActions = useScannerProvisioningStore((s) => s.filteredActions);

  const all = filteredActions();
  const total = all.length;
  const rows = all.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white border border-slate-200 rounded-xl">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {COLUMNS.map(({ key, label, width }) => (
                <th
                  key={key}
                  className={`px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700 select-none ${width ?? ""}`}
                  onClick={() => setSort(key)}
                >
                  <span className="flex items-center">
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap sticky right-0 bg-slate-50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-16 text-slate-400 text-sm">
                  No scanner entries match the current filters.
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const linkedElsewhere = a.linkedVin && a.linkedVin !== a.vin;
              return (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{a.timestamp}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><ActionBadge value={a.actionType} /></td>
                  <td className="px-3 py-2.5 text-slate-700 font-mono text-xs whitespace-nowrap">
                    {a.vin || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.chassisId} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.vcuImei} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.vcuIccid} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.evccId} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.motorId} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.registrationNo} /></td>
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                    {a.customerName || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                    {a.customerPhone || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><MonoCell value={a.drivingLicense} /></td>
                  <td className="px-3 py-2.5 text-slate-600 font-mono text-xs whitespace-nowrap">
                    {a.rfidTag || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{a.storeCode}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                    {a.tenant || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><BikeStateBadge value={a.bikeState} /></td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{a.performedBy}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.credentialType === "Zeno" ? "bg-zeno-teal/10 text-zeno-teal" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {a.credentialType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {a.otpVerified ? (
                      <span className="text-green-600 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {a.signatureCaptured ? (
                      <span className="text-green-600 text-xs font-medium">Captured</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><SyncBadge value={a.syncStatus} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {a.source === "portal" ? "Portal" : "Scanner App"}
                      {linkedElsewhere && (
                        <Link2 className="w-3 h-3 text-teal-500" aria-label={`Linked to ${a.linkedVin}`} />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right sticky right-0 bg-white">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(a)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-zeno-teal hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(a)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-zeno-red hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        total={total}
        page={page}
        perPage={perPage}
        onPage={setPage}
        onPerPage={setPerPage}
        perPageOptions={[20, 50, 100]}
      />
    </div>
  );
}
