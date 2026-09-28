"use client";

import { useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, User as UserIcon, Mail, Copy, Check, Clock, X, RotateCcw, Search,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/Pagination";
import { InviteUserModal } from "@/components/users/InviteUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { useAuthStore } from "@/store/auth";
import { useUsersStore } from "@/store/users";
import type { PendingInvite } from "@/store/users";
import { useTenantOptions, tenantLabel } from "@/lib/tenants";
import { ROLE_LABELS } from "@/lib/mock/users";
import type { AppUser, UserRole } from "@/lib/mock/users";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<UserRole, string> = {
  zeno_super_admin:    "bg-[#FF3B06]/10 text-[#FF3B06]",
  zeno_admin:          "bg-[#003B49]/10 text-[#003B49]",
  zeno_support:        "bg-violet-50 text-violet-700",
  partner_super_admin: "bg-cyan-50 text-cyan-700",
  partner_user:        "bg-indigo-50 text-indigo-700",
};

const CONTROL =
  "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { users, invites, deleteUser, revokeInvite } = useUsersStore();
  const tenants = useTenantOptions();

  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<PendingInvite | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvite | null>(null);

  const filtered = useMemo(() => users.filter((u) => {
    if (partnerFilter && (u.partnerId ?? "") !== partnerFilter) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  }), [users, search, partnerFilter, roleFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const hasFilters = !!(search || partnerFilter || roleFilter);
  const clearFilters = () => {
    setSearch(""); setPartnerFilter(""); setRoleFilter(""); setPage(1);
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
    <AccessGuard module="user_management">
      <Topbar title="User Management" />

      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-4">
        {/* Filters + invite */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px] bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or email…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-52"
              />
            </div>

            <select
              value={partnerFilter}
              onChange={(e) => { setPartnerFilter(e.target.value); setPage(1); }}
              className={cn(CONTROL, "text-xs py-1.5")}
              aria-label="Filter by partner"
            >
              <option value="">All Partners</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className={cn(CONTROL, "text-xs py-1.5")}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400">
              {filtered.length} user{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          <Button onClick={() => setInviteOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4" /> Invite User
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Name", "Email", "Role", "Partner", "Status", "Created", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && invites.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No users match your filters
                    </td>
                  </tr>
                )}

                {paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
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
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap", ROLE_BADGE[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {tenantLabel(tenants, u.partnerId)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.status === "active" ? "success" : "warning"}>{u.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {format(new Date(u.createdAt), "d MMM yyyy")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditUser(u)}
                          title="Edit user"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? "You can't delete your own account" : "Delete user"}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Pending invites sit below the roster — they aren't accounts yet. */}
                {invites.map((inv) => (
                  <tr key={inv.token} className="bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="font-medium text-slate-700">{inv.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{inv.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap", ROLE_BADGE[inv.role])}>
                        {ROLE_LABELS[inv.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {tenantLabel(tenants, inv.partnerId)}
                    </td>
                    <td className="px-5 py-3.5"><Badge variant="warning">Pending</Badge></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setInviteLink(inv); setLinkCopied(false); }}
                          title="Show invite link"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRevokeTarget(inv)}
                          title="Revoke invite"
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={filtered.length}
            page={page}
            perPage={perPage}
            onPage={setPage}
            onPerPage={setPerPage}
          />
        </div>
      </main>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        invitedBy={currentUser?.name ?? "Zeno Admin"}
        onInvited={(invite) => { setInviteLink(invite); setLinkCopied(false); }}
      />

      <EditUserModal user={editUser} onClose={() => setEditUser(null)} />

      <DeleteUserModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteUser(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* No mail service — the invite link is handed over manually. */}
      <Modal
        open={!!inviteLink}
        onClose={() => { setInviteLink(null); setLinkCopied(false); }}
        title="Invite Link Generated"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Share this link with <strong>{inviteLink?.email}</strong>. It expires in 7 days.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <p className="text-xs text-slate-600 font-mono flex-1 break-all">{inviteUrl}</p>
            <button
              onClick={handleCopyLink}
              className="shrink-0 p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {linkCopied && <p className="text-xs text-green-600 text-center">Link copied!</p>}
          <a
            href={`mailto:${inviteLink?.email}?subject=${encodeURIComponent("You've been invited to Zeno")}&body=${encodeURIComponent(`Hi,\n\nYou've been invited to join Zeno.\n\nClick the link below to create your account:\n${inviteUrl}\n\nThis link expires in 7 days.`)}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> Open in Email Client
          </a>
          <Button className="w-full" onClick={() => { setInviteLink(null); setLinkCopied(false); }}>
            Done
          </Button>
        </div>
      </Modal>

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke Invite">
        <p className="text-sm text-slate-600 mb-5">
          Revoke the invite for <strong>{revokeTarget?.email}</strong>? The link stops working
          immediately.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => { if (revokeTarget) revokeInvite(revokeTarget.token); setRevokeTarget(null); }}
          >
            Revoke
          </Button>
        </div>
      </Modal>
    </AccessGuard>
  );
}
