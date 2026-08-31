"use client";

import { useAuthStore } from "@/store/auth";
import { SYSTEM_ROLES } from "@/store/roles";
import type { Module } from "@/store/roles";
import type { UserRole } from "@/lib/mock/users";

/**
 * Runtime RBAC enforcement.
 *
 * A user's *effective* permissions are either the custom set chosen at invite
 * time (persisted on `AppUser.customPermissions`) or, if none, the defaults for
 * their role. Enforcement only kicks in for users that actually carry a custom
 * set — every existing/seed user keeps the original role-based gating, so
 * `can()` returns `true` for them and callers fall back to their own role logic.
 */

export type PermissionEntry = { module: string; actions: string[] };

/** Default permission set backing a given role (mirrors the invite dialog). */
export function defaultPermsForRole(role: UserRole | string | undefined): PermissionEntry[] {
  const id =
    role === "zeno_super_admin" ? "r-superadmin" :
    role === "zeno_admin" || role === "partner_super_admin" ? "r-admin" :
    role === "zeno_support" ? "r-support" :
    "r-user";
  return (SYSTEM_ROLES.find((r) => r.id === id)?.permissions ?? []).map((p) => ({
    module: p.module,
    actions: [...p.actions],
  }));
}

/** Pure check against an explicit permission set. */
export function permsAllow(perms: PermissionEntry[], module: Module | string, action?: string): boolean {
  const entry = perms.find((p) => p.module === module);
  if (!entry) return false;
  if (!action) return entry.actions.length > 0;
  return entry.actions.includes(action);
}

/** Longest-prefix route → module map, used to guard pages by URL. */
const ROUTE_MODULES: { prefix: string; module: Module }[] = [
  { prefix: "/dashboard",          module: "dashboards" },
  { prefix: "/reports",            module: "reports" },
  { prefix: "/data/vehicles",      module: "vehicles" },
  { prefix: "/data/batteries",     module: "batteries" },
  { prefix: "/data/swap-stations", module: "swap_stations" },
  { prefix: "/data/fast-chargers", module: "fast_chargers" },
  { prefix: "/customers",          module: "customers" },
  { prefix: "/data/transactions",  module: "transactions" },
  { prefix: "/provisioning",       module: "provisioning" },
  { prefix: "/users",              module: "users" },
  { prefix: "/admin/roles",        module: "roles" },
  { prefix: "/admin/audit-logs",   module: "audit_logs" },
  { prefix: "/settings",                    module: "settings" },
  { prefix: "/support/tampering-alerts",    module: "tampering_alerts" },
];

/** The module a path belongs to, or null for pages not tied to a module. */
export function moduleForPath(pathname: string): Module | null {
  const match = [...ROUTE_MODULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match?.module ?? null;
}

export interface UsePermissions {
  /** True if this user has an explicit custom permission set (restricted user). */
  isRestricted: boolean;
  perms: PermissionEntry[];
  /** For restricted users, checks the set; for everyone else always true. */
  can: (module: Module | string, action?: string) => boolean;
}

export function usePermissions(): UsePermissions {
  const user = useAuthStore((s) => s.user);
  const custom = user?.customPermissions;
  const isRestricted = Array.isArray(custom);
  const perms = isRestricted ? (custom as PermissionEntry[]) : defaultPermsForRole(user?.role);
  const can = (module: Module | string, action?: string) => {
    if (!isRestricted) return true; // defer to existing role-based gating
    return permsAllow(perms, module, action);
  };
  return { isRestricted, perms, can };
}
