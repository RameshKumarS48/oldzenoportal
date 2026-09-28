"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One confirm popup for the whole app, so every action that reaches a customer
 * or reverses a decision asks the same way before it commits.
 *
 * The body says what will actually happen, not "are you sure".
 */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  tone = "danger",
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} className="max-w-md">
      <div className="space-y-5">
        <div className="flex gap-3">
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full",
              tone === "danger" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="text-sm leading-relaxed text-slate-600">{children}</div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "flex-1 text-white",
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-[#003B49] hover:bg-[#00515f]"
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
