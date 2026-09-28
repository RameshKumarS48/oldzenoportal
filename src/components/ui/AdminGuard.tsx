"use client";

import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { isZenoAdmin, canManageUsers } from "@/lib/mock/users";

function AccessDenied({ message }: { message?: string }) {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h2 className="font-semibold text-slate-700 mb-1">Access Denied</h2>
        <p className="text-sm text-slate-500">{message ?? "You need admin privileges to view this page."}</p>
      </div>
    </main>
  );
}

/** Allows zeno_super_admin and zeno_admin (Internal User). */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!isZenoAdmin(role)) return <AccessDenied />;
  return <>{children}</>;
}

/** Allows any role that can manage users: zeno_super_admin, zeno_admin, partner_super_admin. */
export function UsersGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canManageUsers(role)) return <AccessDenied message="You need admin privileges to manage users." />;
  return <>{children}</>;
}

/** Only zeno_super_admin. */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "zeno_super_admin") {
    return <AccessDenied message="This section is restricted to Zeno Super Admins." />;
  }
  return <>{children}</>;
}

/** Allows zeno_support and zeno admins. */
export function SupportGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "zeno_support" && !isZenoAdmin(role))
    return <AccessDenied message="This section is for Zeno Support staff only." />;
  return <>{children}</>;
}
