"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ACTION_LABELS, type ScannerAction } from "@/store/scanner-provisioning";

export function DeleteConfirmModal({
  action,
  onClose,
  onConfirm,
}: {
  action: ScannerAction | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={action !== null} onClose={onClose} title="Delete Scanner Entry?">
      {action && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-100 px-3 py-3 text-sm text-red-700">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">This permanently removes the log entry.</p>
              <p className="mt-1 text-red-600/90">
                {ACTION_LABELS[action.actionType]} · {action.vin || action.customerPhone || "—"} ·{" "}
                {action.timestamp}
              </p>
              <p className="mt-1 text-red-600/80">
                Note: deleting the log row does not reverse any state already written to the linked
                vehicle in Asset Tracking.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-lg bg-zeno-red text-white text-sm font-semibold hover:bg-zeno-red-hover transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
