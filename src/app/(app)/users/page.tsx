"use client";

import { useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, Mail, Copy, Check, Clock, X, RotateCcw, Search, ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { toast } from "@/store/toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
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

/** Pill-shaped filter control, matching the approved design. */
function FilterSelect({
  value, onChange, label, children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none rounded-full border border-slate-200 bg-white pl-4 pr-9 py-2 text-sm text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  );
}

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
    // The clipboard API rejects outside a secure context or when the browser
    // withholds permission, so the link has to stay recoverable by hand.
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link", "Your browser blocked clipboard access. Select the link above and copy it manually.");
    }
  };

  const th = "text-left px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap";

  return (
    <AccessGuard module="user_management">
      <Topbar title="User Management" />

      <main className="flex-1 overflow-y-auto bg-[#F1F3F4] p-6 space-y-4">
        {/* Filters, then the one action that creates something */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[320px] bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or email"
                aria-label="Search users"
                className="w-56 rounded-full border border-slate-200 bg-white pl-11 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]"
              />
            </div>

            <FilterSelect
              value={partnerFilter}
              onChange={(v) => { setPartnerFilter(v); setPage(1); }}
              label="Filter by partner"
            >
              <option value="">All Partners</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </FilterSelect>

            <FilterSelect
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
              label="Filter by role"
            >
              <option value="">All Roles</option>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </FilterSelect>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/30"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400 tabular-nums">
              {filtered.length} user{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          <button
            onClick={() => setInviteOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#167C3C] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#12662F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167C3C]/40 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>

        {/* Roster */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Name", "Email", "Role", "Partner", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className={cn(th, h === "Actions" && "w-px")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 && invites.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                      No users match these filters. Clear them, or invite someone new.
                    </td>
                  </tr>
                )}

                {paginated.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">{u.name}</td>
                      <td className="px-5 py-4 text-slate-500">{u.email}</td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{ROLE_LABELS[u.role]}</td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        {tenantLabel(tenants, u.partnerId)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            u.status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {format(new Date(u.createdAt), "d MMM yyyy")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditUser(u)}
                            aria-label={`Edit ${u.name}`}
                            title="Edit user"
                            className="grid place-items-center w-9 h-9 rounded-full bg-blue-50 text-blue-500 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={isSelf}
                            aria-label={`Delete ${u.name}`}
                            title={isSelf ? "You can't delete your own account" : "Delete user"}
                            className="grid place-items-center w-9 h-9 rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Invited, but not an account yet */}
                {invites.map((inv) => (
                  <tr key={inv.token} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-700 whitespace-nowrap">{inv.name}</td>
                    <td className="px-5 py-4 text-slate-500">{inv.email}</td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{ROLE_LABELS[inv.role]}</td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {tenantLabel(tenants, inv.partnerId)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        invited
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setInviteLink(inv); setLinkCopied(false); }}
                          aria-label={`Show invite link for ${inv.email}`}
                          title="Show invite link"
                          className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRevokeTarget(inv)}
                          aria-label={`Revoke invite for ${inv.email}`}
                          title="Revoke invite"
                          className="grid place-items-center w-9 h-9 rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          <X className="w-4 h-4" />
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
          if (deleteTarget) {
            deleteUser(deleteTarget.id);
            toast.info("User deleted", `${deleteTarget.name} can no longer sign in.`);
          }
          setDeleteTarget(null);
        }}
      />

      {/* No mail service is wired up, so the invite link is handed over by hand. */}
      <Modal
        open={!!inviteLink}
        onClose={() => { setInviteLink(null); setLinkCopied(false); }}
        title="Invite link ready"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Send this to <strong>{inviteLink?.email}</strong>. It stops working in 7 days.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <p className="text-xs text-slate-600 font-mono flex-1 break-all">{inviteUrl}</p>
            <button
              onClick={handleCopyLink}
              aria-label="Copy invite link"
              className="shrink-0 p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {linkCopied && <p className="text-xs text-green-600 text-center">Copied</p>}
          <a
            href={`mailto:${inviteLink?.email}?subject=${encodeURIComponent("You've been invited to Zeno")}&body=${encodeURIComponent(`Hi,\n\nYou've been invited to join Zeno.\n\nOpen this link to create your account:\n${inviteUrl}\n\nIt stops working in 7 days.`)}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> Open in email client
          </a>
          <Button className="w-full" onClick={() => { setInviteLink(null); setLinkCopied(false); }}>
            Done
          </Button>
        </div>
      </Modal>

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke invite">
        <p className="text-sm text-slate-600 mb-5">
          Revoke the invite for <strong>{revokeTarget?.email}</strong>? Their link stops working
          straight away.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (revokeTarget) {
                revokeInvite(revokeTarget.token);
                toast.info("Invite revoked", `The link sent to ${revokeTarget.email} no longer works.`);
              }
              setRevokeTarget(null);
            }}
          >
            Revoke invite
          </Button>
        </div>
      </Modal>
    </AccessGuard>
  );
}
