"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  DIALOG_PANEL, FIELD, LABEL, DialogHeading, SelectField,
} from "@/components/users/InviteUserModal";
import { useTenantOptions } from "@/lib/tenants";
import { useUsersStore } from "@/store/users";
import { ROLE_LABELS, INTERNAL_TENANT } from "@/lib/mock/users";
import type { AppUser, UserRole, UserStatus } from "@/lib/mock/users";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];

export function EditUserModal({
  user,
  onClose,
}: {
  user: AppUser | null;
  onClose: () => void;
}) {
  const updateUser = useUsersStore((s) => s.updateUser);
  const tenants = useTenantOptions();

  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("partner_user");
  const [partnerId, setPartnerId] = useState(INTERNAL_TENANT);
  const [status, setStatus] = useState<UserStatus>("active");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setRole(user.role);
    setPartnerId(user.partnerId ?? INTERNAL_TENANT);
    setStatus(user.status);
    setError("");
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    if (!name.trim()) return setError("Name can't be empty.");
    updateUser(user.id, { name: name.trim(), role, partnerId, status });
    onClose();
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      className={DIALOG_PANEL}
      title={
        <DialogHeading icon={Pencil} tint="bg-[#DEEBFA] text-[#2F7DD1]">
          Edit User
        </DialogHeading>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={LABEL} htmlFor="edit-name">Full Name</label>
          <input
            id="edit-name"
            className={FIELD}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            autoFocus
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="edit-email">Email Address</label>
          <input
            id="edit-email"
            value={user?.email ?? ""}
            readOnly
            disabled
            className={`${FIELD} bg-slate-100 text-slate-400 cursor-not-allowed`}
          />
          <p className="mt-2 text-xs text-slate-500">
            Email is how this person signs in, so it can&apos;t be changed here.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Role" value={role} onChange={(v) => setRole(v as UserRole)}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </SelectField>
          <SelectField label="Tenant" value={partnerId} onChange={setPartnerId}>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </SelectField>
        </div>

        <SelectField label="Status" value={status} onChange={(v) => setStatus(v as UserStatus)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#E0491F] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C4340A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0491F]/40 focus-visible:ring-offset-2"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
