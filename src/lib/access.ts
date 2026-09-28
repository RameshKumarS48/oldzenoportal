"use client";

/**
 * Dome's access model — the single source of truth for who can see and do what.
 *
 * Five roles, five modules. A role holds a flat list of permission grants where
 * `_ro` (read) and `_rw` (write) are *separate* grants: a read-write role holds
 * both. Grants are fixed per role and are not editable per user.
 *
 * The four data modules line up 1:1 with dome's four data tabs, and
 * `user_management` with the fifth — so nav gating, route guards and the invite
 * dialog's permission summary all read from this one table.
 */

import { useAuthStore } from "@/store/auth";
import type { UserRole } from "@/lib/mock/users";

export const ACCESS_MODULES = [
  "vehicle",
  "scanner",
  "swap_info",
  "wallet_info",
  "user_management",
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];
export type Permission = `${AccessModule}_ro` | `${AccessModule}_rw`;

/** What a role can do with one module. */
export type AccessLevel = "read_write" | "read_only" | "none";

export interface RoleDefinition {
  id: number;
  name: string;
  permissions: Permission[];
}

/** The authoritative role → permission table. */
export const ROLES: RoleDefinition[] = [
  {
    id: 1,
    name: "Super Admin",
    permissions: [
      "vehicle_ro", "vehicle_rw",
      "scanner_ro", "scanner_rw",
      "swap_info_ro", "swap_info_rw",
      "wallet_info_ro", "wallet_info_rw",
      "user_management_ro", "user_management_rw",
    ],
  },
  {
    id: 2,
    name: "Internal User",
    permissions: [
      "vehicle_ro", "vehicle_rw",
      "scanner_ro", "scanner_rw",
      "swap_info_ro", "swap_info_rw",
      "wallet_info_ro", "wallet_info_rw",
    ],
  },
  {
    id: 3,
    name: "Internal Viewer",
    permissions: ["vehicle_ro", "scanner_ro", "swap_info_ro", "wallet_info_ro"],
  },
  {
    id: 4,
    name: "External Admin",
    permissions: ["vehicle_ro", "vehicle_rw", "scanner_ro", "scanner_rw"],
  },
  {
    id: 5,
    name: "External Viewer",
    permissions: ["vehicle_ro", "scanner_ro"],
  },
];

/** Bridges the stored `UserRole` string keys onto the numeric role ids above. */
export const ROLE_ID_BY_KEY: Record<UserRole, number> = {
  zeno_super_admin:    1,
  zeno_admin:          2,
  zeno_support:        3,
  partner_super_admin: 4,
  partner_user:        5,
};

/** The reverse map — used when a form hands back a role by id. */
export const ROLE_KEY_BY_ID: Record<number, UserRole> = Object.fromEntries(
  Object.entries(ROLE_ID_BY_KEY).map(([key, id]) => [id, key as UserRole])
) as Record<number, UserRole>;

export const MODULE_LABELS: Record<AccessModule, string> = {
  vehicle:         "Vehicle",
  scanner:         "Scanner",
  swap_info:       "Swap Info",
  wallet_info:     "Wallet Info",
  user_management: "User Management",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  read_write: "Read Write",
  read_only:  "Read Only",
  none:       "No Access",
};

/** Badge styling per level, mirroring the reference design's green-on-pale chips. */
export const ACCESS_LEVEL_BADGE: Record<AccessLevel, string> = {
  read_write: "bg-emerald-50 text-emerald-700 border-emerald-200",
  read_only:  "bg-slate-100 text-slate-600 border-slate-200",
  none:       "bg-slate-50 text-slate-400 border-slate-200",
};

// ── Lookups ──────────────────────────────────────────────────────────────────

export function roleDefinition(role: UserRole | string | undefined): RoleDefinition | undefined {
  if (!role) return undefined;
  const id = ROLE_ID_BY_KEY[role as UserRole];
  return id ? ROLES.find((r) => r.id === id) : undefined;
}

/** Display name for a role, straight from the access table. */
export function roleName(role: UserRole | string | undefined): string {
  return roleDefinition(role)?.name ?? "—";
}

export function permissionsFor(role: UserRole | string | undefined): Permission[] {
  return roleDefinition(role)?.permissions ?? [];
}

/** Does this role hold an exact grant, e.g. `can(role, "vehicle_rw")`. */
export function can(role: UserRole | string | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

export function levelFor(role: UserRole | string | undefined, module: AccessModule): AccessLevel {
  const perms = permissionsFor(role);
  if (perms.includes(`${module}_rw` as Permission)) return "read_write";
  if (perms.includes(`${module}_ro` as Permission)) return "read_only";
  return "none";
}

/** Can the role open the module at all (read or write)? */
export function canView(role: UserRole | string | undefined, module: AccessModule): boolean {
  return levelFor(role, module) !== "none";
}

/** Can the role change anything in the module? */
export function canWrite(role: UserRole | string | undefined, module: AccessModule): boolean {
  return levelFor(role, module) === "read_write";
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** Dome's five tabs, in sidebar order, each tied to the module that gates it. */
export const ROUTE_MODULES: { prefix: string; module: AccessModule }[] = [
  { prefix: "/asset-tracking",       module: "vehicle" },
  { prefix: "/scanner-provisioning", module: "scanner" },
  { prefix: "/swap-transactions",    module: "swap_info" },
  { prefix: "/wallet-transactions",  module: "wallet_info" },
  { prefix: "/users",                module: "user_management" },
];

/** The module a dome route belongs to, or null for routes outside the model. */
export function moduleForPath(pathname: string): AccessModule | null {
  const match = [...ROUTE_MODULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match?.module ?? null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAccess {
  role: UserRole | undefined;
  roleName: string;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  level: (module: AccessModule) => AccessLevel;
  canView: (module: AccessModule) => boolean;
  canWrite: (module: AccessModule) => boolean;
}

/** Access for the signed-in user. */
export function useAccess(): UseAccess {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;
  return {
    role,
    roleName: roleName(role),
    permissions: permissionsFor(role),
    can: (permission) => can(role, permission),
    level: (module) => levelFor(role, module),
    canView: (module) => canView(role, module),
    canWrite: (module) => canWrite(role, module),
  };
}
