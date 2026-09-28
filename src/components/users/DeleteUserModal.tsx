"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DIALOG_PANEL, DialogHeading } from "@/components/users/InviteUserModal";
import type { AppUser } from "@/lib/mock/users";

export function DeleteUserModal({
  user,
  onClose,
  onConfirm,
}: {
  user: AppUser | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={!!user}
      onClose={onClose}
      className={DIALOG_PANEL}
      title={
        <DialogHeading icon={AlertTriangle} tint="bg-[#FBE3DC] text-[#C4340A]">
          Delete User
        </DialogHeading>
      }
    >
      <div className="space-y-6">
        <p className="text-[15px] leading-relaxed text-slate-700">
          Are you sure you want to delete <strong className="font-semibold">{user?.name}</strong>{" "}
          (<strong className="font-semibold">{user?.email}</strong>)? This action is permanent.
          The user cannot be recovered.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[#E0491F] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C4340A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0491F]/40 focus-visible:ring-offset-2"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
