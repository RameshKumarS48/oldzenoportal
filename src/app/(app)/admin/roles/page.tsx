"use client";

import { useState } from "react";
import { Plus, Shield, Trash2, Lock } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { PermissionMatrix } from "@/components/ui/permission-matrix";
import { useRolesStore, MODULES, MODULE_ACTIONS } from "@/store/roles";
import type { Role, RolePermission } from "@/store/roles";
import { cn } from "@/lib/utils";

const ROLE_COLORS = ["#FF3B06", "#003B49", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

const ALL_PERMISSIONS: RolePermission[] = MODULES.map((m) => ({
  module: m,
  actions: [...MODULE_ACTIONS[m]],
}));

function RoleColorDot({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn("rounded-full shrink-0 inline-block", size === "sm" ? "w-2 h-2" : "w-3 h-3")}
      style={{ background: color }}
    />
  );
}

export default function RolesPage() {
  const { roles, customRoles, createRole, updateRole, deleteRole } = useRolesStore();
  const [selected, setSelected] = useState<Role>(roles[0]);
  const [draftPermissions, setDraftPermissions] = useState<RolePermission[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(ROLE_COLORS[4]);
  const [newPerms, setNewPerms] = useState<RolePermission[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const editablePermissions = draftPermissions ?? selected.permissions;

  const handleSelectRole = (role: Role) => {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setSelected(role);
    setDraftPermissions(null);
    setIsDirty(false);
  };

  const handlePermChange = (perms: RolePermission[]) => {
    setDraftPermissions(perms);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!draftPermissions) return;
    updateRole(selected.id, { permissions: draftPermissions });
    setDraftPermissions(null);
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setDraftPermissions(null);
    setIsDirty(false);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const role = createRole({ name: newName.trim(), color: newColor, permissions: newPerms });
    setShowCreate(false);
    setNewName("");
    setNewColor(ROLE_COLORS[4]);
    setNewPerms([]);
    setSelected(role);
    setDraftPermissions(null);
    setIsDirty(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteRole(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(roles.find((r) => r.id !== deleteTarget.id) ?? roles[0]);
  };

  return (
    <AdminGuard>
      <Topbar
        title="Roles & Permissions"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)} className="ml-4">
            <Plus className="w-4 h-4" /> New Role
          </Button>
        }
      />
      <main className="flex-1 overflow-hidden flex gap-0 bg-zeno-bg">

        {/* Role list sidebar */}
        <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roles</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {/* System roles */}
            <p className="px-4 py-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-widest">System</p>
            {roles.filter((r) => r.isSystem).map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  selected.id === role.id
                    ? "bg-slate-100"
                    : "hover:bg-slate-50"
                )}
              >
                <RoleColorDot color={role.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate" style={{ fontFamily: "var(--font-display)" }}>
                    {role.name}
                  </p>
                </div>
                <Lock className="w-3 h-3 text-slate-300 shrink-0" />
              </button>
            ))}

            {/* Custom roles */}
            {customRoles.length > 0 && (
              <>
                <p className="px-4 py-1.5 mt-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Custom</p>
                {customRoles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected.id === role.id
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <RoleColorDot color={role.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {role.name}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                      className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Permission editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {/* Role header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${selected.color}18` }}
              >
                <Shield className="w-5 h-5" style={{ color: selected.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-lg font-bold text-slate-800"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {selected.name}
                  </h2>
                  {selected.isSystem && (
                    <Badge variant="default" className="text-[10px]">System</Badge>
                  )}
                </div>
                {selected.description && (
                  <p className="text-sm text-slate-500 mt-0.5">{selected.description}</p>
                )}
              </div>
              {isDirty && (
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDiscard}>Discard</Button>
                  <Button size="sm" onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>

            {selected.isSystem && selected.id === "r-superadmin" && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Super Admin has unrestricted access to all modules and cannot be modified.
                </p>
              </div>
            )}

            <PermissionMatrix
              permissions={editablePermissions}
              onChange={selected.isSystem && selected.id === "r-superadmin" ? undefined : handlePermChange}
              readonly={selected.isSystem && selected.id === "r-superadmin"}
            />
          </div>
        </div>
      </main>

      {/* Create Role Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewName(""); setNewPerms([]); }} title="Create New Role">
        <div className="space-y-4">
          <Input
            label="Role name"
            placeholder="e.g. Field Engineer"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    newColor === c ? "border-slate-700 scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
              <PermissionMatrix permissions={newPerms} onChange={setNewPerms} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName.trim()}>
              <Plus className="w-4 h-4" /> Create Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Role">
        <p className="text-sm text-slate-600 mb-5">
          Delete <strong>{deleteTarget?.name}</strong>? Users assigned this role will lose its permissions.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDeleteConfirm}>Delete Role</Button>
        </div>
      </Modal>
    </AdminGuard>
  );
}
