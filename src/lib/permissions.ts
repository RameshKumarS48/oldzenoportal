"use client";

import { useAuthStore } from "@/store/auth";
import { SYSTEM_ROLES } from "@/store/roles";
import type { Module } from "@/store/roles";
import type { UserRole } from "@/lib/mock/users";

export type PermissionEntry = { module: string; actions: string[] };

/** Maps a UserRole to the corresponding system role id. */
function systemRoleId(role: UserRole | string | undefined): string {
  switch (role) {
    case "zeno_super_admin":    return "r-superadmin";
    case "zeno_admin":          return "r-internal-user";
    case "zeno_support":        return "r-internal-viewer";
    case "partner_super_admin": return "r-external-admin";
    case "partner_user":        return "r-external-user";
    default:                    return "r-external-user";
  }
}

/** Default permission set for a given role. */
export function defaultPermsForRole(role: UserRole | string | undefined): PermissionEntry[] {
  const id = systemRoleId(role);
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

/** Longest-prefix route → module map. */
const ROUTE_MODULES: { prefix: string; module: Module }[] = [
  { prefix: "/dashboard",              module: "dashboards" },
  { prefix: "/reports",                module: "reports" },
  { prefix: "/asset-tracking",         module: "vehicles" },
  { prefix: "/data/vehicles",          module: "vehicles" },
  { prefix: "/data/batteries",         module: "batteries" },
  { prefix: "/data/swap-stations",     module: "swap_stations" },
  { prefix: "/data/fast-chargers",     module: "fast_chargers" },
  { prefix: "/customers",              module: "customers" },
  { prefix: "/data/transactions",      module: "transactions" },
  { prefix: "/scanner-provisioning",   module: "provisioning" },
  { prefix: "/provisioning",           module: "provisioning" },
  { prefix: "/swap-transactions",      module: "swap_stations" },
  { prefix: "/wallet-transactions",    module: "transactions" },
  { prefix: "/users",                  module: "users" },
  { prefix: "/admin/roles",            module: "roles" },
  { prefix: "/admin/audit-logs",       module: "audit_logs" },
  { prefix: "/settings",               module: "settings" },
  { prefix: "/support/tampering-alerts", module: "tampering_alerts" },
];

/** The module a path belongs to, or null. */
export function moduleForPath(pathname: string): Module | null {
  const match = [...ROUTE_MODULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match?.module ?? null;
}

export interface UsePermissions {
  isRestricted: boolean;
  perms: PermissionEntry[];
  can: (module: Module | string, action?: string) => boolean;
}

export function usePermissions(): UsePermissions {
  const user = useAuthStore((s) => s.user);
  const custom = user?.customPermissions;
  const isRestricted = Array.isArray(custom);
  const perms: PermissionEntry[] = isRestricted
    ? (custom as PermissionEntry[])
    : defaultPermsForRole(user?.role);
  const can = (module: Module | string, action?: string) => permsAllow(perms, module, action);
  return { isRestricted, perms, can };
}
