"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
    <Modal open={!!user} onClose={onClose} title="Delete User">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed pt-2">
            Are you sure you want to delete <strong>{user?.name}</strong> (
            <strong>{user?.email}</strong>)? This action is permanent. The user cannot be
            recovered.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </Modal>
  );
}
