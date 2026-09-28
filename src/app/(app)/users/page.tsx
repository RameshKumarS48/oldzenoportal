"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, UserIcon, Mail, Copy, Check, Clock, X } from "lucide-react";
import { UsersGuard } from "@/components/ui/AdminGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { useUsersStore } from "@/store/users";
import { usePartnersStore } from "@/store/partners";
import type { PendingInvite } from "@/store/users";
import type { AppUser, UserRole } from "@/lib/mock/users";
import { ROLE_LABELS, isPartnerRole } from "@/lib/mock/users";
import { SYSTEM_ROLES } from "@/store/roles";
import type { RolePermission } from "@/store/roles";
import { PermissionMatrix } from "@/components/ui/permission-matrix";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getDefaultPermissionsForRole(role: UserRole): RolePermission[] {
  const id =
    role === "zeno_super_admin"    ? "r-superadmin" :
    role === "zeno_admin"          ? "r-internal-user" :
    role === "zeno_support"        ? "r-internal-viewer" :
    role === "partner_super_admin" ? "r-external-admin" :
    "r-external-user";
  return (SYSTEM_ROLES.find((r) => r.id === id)?.permissions ?? []).map((p) => ({ ...p, actions: [...p.actions] }));
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "zeno_super_admin",    label: "Super Admin" },
  { value: "zeno_admin",          label: "Internal User" },
  { value: "zeno_support",        label: "Internal Viewer" },
  { value: "partner_super_admin", label: "External Admin" },
  { value: "partner_user",        label: "External User" },
];

const STATUS_OPTIONS = [
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_BADGE: Record<UserRole, string> = {
  zeno_super_admin:    "bg-[#FF3B06]/10 text-[#FF3B06]",
  zeno_admin:          "bg-[#003B49]/10 text-[#003B49]",
  zeno_support:        "bg-violet-50 text-violet-700",
  partner_super_admin: "bg-cyan-50 text-cyan-700",
  partner_user:        "bg-indigo-50 text-indigo-700",
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { users, invites, updateUser, deleteUser, createInvite, revokeInvite } = useUsersStore();
  const partners = usePartnersStore((s) => s.partners);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<"details" | "permissions">("details");
  const [inviteForm, setInviteForm] = useState<{ email: string; role: UserRole; partnerId: string }>({ email: "", role: "zeno_support", partnerId: "" });
  const [customPerms, setCustomPerms] = useState<RolePermission[]>([]);
  const [inviteLink, setInviteLink] = useState<{ token: string; email: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: UserRole; status: AppUser["status"] }>({ name: "", email: "", role: "zeno_support", status: "active" });
  const [deleteConfirm, setDeleteConfirm] = useState<AppUser | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<PendingInvite | null>(null);

  const openEdit = (u: AppUser) => {
    setEditForm({ name: u.name, email: u.email, role: u.role, status: u.status });
    setEditUser(u);
  };

  const handleEdit = () => {
    if (!editUser) return;
    updateUser(editUser.id, editForm);
    setEditUser(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteUser(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteStep("details");
    setCustomPerms([]);
    setInviteError("");
    setInviteForm({ email: "", role: "zeno_support", partnerId: "" });
  };

  const handleNextStep = () => {
    setInviteError("");
    if (!inviteForm.email.trim()) { setInviteError("Email is required."); return; }
    setCustomPerms(getDefaultPermissionsForRole(inviteForm.role));
    setInviteStep("permissions");
  };

  const handleInvite = async () => {
    setInviteError("");
    const email = inviteForm.email.trim();
    if (!email) return;
    try {
      const invite = await createInvite(email, inviteForm.role, currentUser!.name, customPerms);
      handleCloseInvite();
      setInviteLink({ token: invite.token, email: invite.email });
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite.");
      setInviteStep("details");
    }
  };

  const inviteUrl = inviteLink
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteLink.token}`
    : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <UsersGuard>
      <Topbar
        title="Users & Permissions"
        actions={
          <Button size="sm" onClick={() => { setInviteStep("details"); setInviteError(""); setInviteOpen(true); }} className="ml-4">
            <Plus className="w-4 h-4" /> Invite User
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                {["Name", "Email", "Role", "Partner", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", ROLE_BADGE[u.role as UserRole] ?? "bg-slate-100 text-slate-500")}>
                      {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {u.partnerId ? (partners.find((p) => p.id === u.partnerId)?.name ?? u.partnerId) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.status === "active" ? "success" : "warning"}>{u.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{format(new Date(u.createdAt), "d MMM yyyy")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        disabled={u.id === currentUser?.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {invites.map((inv) => (
                <tr key={inv.token} className="hover:bg-amber-50/40 transition-colors bg-amber-50/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-slate-400 italic text-sm">Awaiting signup</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{inv.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", ROLE_BADGE[inv.role as UserRole] ?? "bg-slate-100 text-slate-500")}>
                      {ROLE_LABELS[inv.role as UserRole] ?? inv.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">—</td>
                  <td className="px-5 py-3.5"><Badge variant="warning">Pending</Badge></td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setRevokeConfirm(inv)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Revoke invite">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Invite Modal — Step 1: Details */}
      <Modal open={inviteOpen && inviteStep === "details"} onClose={handleCloseInvite} title="Invite User — Step 1 of 2">
        <div className="space-y-4">
          <Input label="Email address" type="email" placeholder="colleague@company.com" value={inviteForm.email}
            onChange={(e) => { setInviteForm((f) => ({ ...f, email: e.target.value })); setInviteError(""); }} autoFocus />
          <Select label="Role" value={inviteForm.role}
            onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          {isPartnerRole(inviteForm.role) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Partner</label>
              <select
                value={inviteForm.partnerId}
                onChange={(e) => setInviteForm((f) => ({ ...f, partnerId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
              >
                <option value="">— Select Partner —</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleCloseInvite}>Cancel</Button>
            <Button className="flex-1" onClick={handleNextStep} disabled={!inviteForm.email}>
              Next: Review Permissions →
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal — Step 2: Permissions Review */}
      <Modal open={inviteOpen && inviteStep === "permissions"} onClose={handleCloseInvite}
        title="Review Permissions — Step 2 of 2" className="max-w-2xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Default permissions for <strong className="text-slate-700">{ROLE_LABELS[inviteForm.role]}</strong>. Adjust before sending the invite — the user will receive exactly these access rights.
          </p>
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <PermissionMatrix permissions={customPerms} onChange={setCustomPerms} />
          </div>
          {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInviteStep("details")}>← Back</Button>
            <Button className="flex-1" onClick={handleInvite}>
              <Mail className="w-4 h-4" /> Generate Invite Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Link Modal */}
      <Modal open={!!inviteLink} onClose={() => { setInviteLink(null); setLinkCopied(false); }} title="Invite Link Generated">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Share this link with <strong>{inviteLink?.email}</strong>. It expires in 7 days.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <p className="text-xs text-slate-600 font-mono flex-1 break-all">{inviteUrl}</p>
            <button onClick={handleCopyLink} className="shrink-0 p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {linkCopied && <p className="text-xs text-green-600 text-center">Link copied!</p>}
          <a
            href={`mailto:${inviteLink?.email}?subject=${encodeURIComponent("You've been invited to Zeno Dashboard")}&body=${encodeURIComponent(`Hi,\n\nYou've been invited to join Zeno Dashboard.\n\nClick the link below to create your account:\n${inviteUrl}\n\nThis link expires in 7 days.`)}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> Open in Email Client
          </a>
          <Button className="w-full" onClick={() => { setInviteLink(null); setLinkCopied(false); }}>Done</Button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <div className="space-y-4">
          <Input label="Full Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          <Select label="Role" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as AppUser["status"] }))} options={STATUS_OPTIONS} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User">
        <p className="text-sm text-slate-600 mb-5">Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Revoke Invite */}
      <Modal open={!!revokeConfirm} onClose={() => setRevokeConfirm(null)} title="Revoke Invite">
        <p className="text-sm text-slate-600 mb-5">Revoke the invite for <strong>{revokeConfirm?.email}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setRevokeConfirm(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => { if (revokeConfirm) revokeInvite(revokeConfirm.token); setRevokeConfirm(null); }}>Revoke</Button>
        </div>
      </Modal>
    </UsersGuard>
  );
}
