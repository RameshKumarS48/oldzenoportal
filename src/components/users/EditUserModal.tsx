"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTenantOptions } from "@/lib/tenants";
import { useUsersStore } from "@/store/users";
import { ROLE_LABELS, INTERNAL_TENANT } from "@/lib/mock/users";
import type { AppUser, UserRole, UserStatus } from "@/lib/mock/users";

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
];

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
    <Modal open={!!user} onClose={onClose} title="Edit User" className="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Pencil className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <p className="text-sm text-slate-500">
            Update this person&apos;s details. Their email is their sign-in identity and
            can&apos;t be changed.
          </p>
        </div>

        <Input
          label="Full Name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input
            value={user?.email ?? ""}
            readOnly
            disabled
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
          <Select
            label="Tenant"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            options={tenants.map((t) => ({ value: t.id, label: t.label }))}
          />
        </div>

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
          options={STATUS_OPTIONS}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}
