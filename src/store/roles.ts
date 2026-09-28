"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MODULES = [
  "dashboards", "reports", "vehicles", "batteries", "swap_stations",
  "fast_chargers", "customers", "transactions", "provisioning",
  "users", "roles", "audit_logs", "settings", "tampering_alerts",
] as const;

export type Module = typeof MODULES[number];

export const MODULE_LABELS: Record<Module, string> = {
  dashboards: "Dashboards",
  reports: "Reports",
  vehicles: "Vehicles",
  batteries: "Batteries",
  swap_stations: "Swap Stations",
  fast_chargers: "Fast Chargers",
  customers: "Customers",
  transactions: "Transactions",
  provisioning: "Provisioning",
  users: "Users",
  roles: "Roles",
  audit_logs: "Audit Logs",
  settings: "Settings",
  tampering_alerts: "Tampering Alerts",
};

export const MODULE_ACTIONS: Record<Module, string[]> = {
  dashboards:   ["view", "create", "edit", "delete", "export"],
  reports:      ["view", "create", "export", "schedule"],
  vehicles:     ["view", "create", "edit", "delete", "bulk_upload"],
  batteries:    ["view", "create", "edit", "delete", "bulk_upload"],
  swap_stations:["view", "create", "edit", "delete"],
  fast_chargers:["view", "create", "edit", "delete"],
  customers:    ["view", "create", "edit", "delete", "export"],
  transactions: ["view", "export"],
  provisioning: ["view", "create", "edit"],
  users:        ["view", "create", "edit", "delete"],
  roles:        ["view", "create", "edit", "delete"],
  audit_logs:   ["view", "export"],
  settings:         ["view", "edit"],
  tampering_alerts: ["view", "review", "debit", "notify", "rfid_control"],
};

export interface RolePermission {
  module: Module;
  actions: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  color: string;
  permissions: RolePermission[];
  createdAt: string;
  createdBy?: string;
}

const ALL_PERMISSIONS: RolePermission[] = MODULES.map((m) => ({
  module: m,
  actions: [...MODULE_ACTIONS[m]],
}));

export const SYSTEM_ROLES: Role[] = [
  {
    id: "r-superadmin",
    name: "Super Admin",
    description: "Unrestricted access to all modules and actions.",
    isSystem: true,
    color: "#FF3B06",
    permissions: ALL_PERMISSIONS,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r-internal-user",
    name: "Internal User",
    description: "Full operational access to all modules. Cannot manage users or roles.",
    isSystem: true,
    color: "#003B49",
    permissions: MODULES.filter((m) => m !== "users" && m !== "roles").map((m) => ({
      module: m,
      actions: [...MODULE_ACTIONS[m]],
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r-internal-viewer",
    name: "Internal Viewer",
    description: "Read-only access to all operational data. Cannot manage users or roles.",
    isSystem: true,
    color: "#7c3aed",
    permissions: MODULES.filter((m) => m !== "users" && m !== "roles").map((m) => ({
      module: m,
      actions: ["view"],
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r-external-admin",
    name: "External Admin",
    description: "Full access to own partner's vehicles and scanner data. Manages partner users. No swap or wallet access.",
    isSystem: true,
    color: "#0891b2",
    permissions: [
      { module: "vehicles",         actions: [...MODULE_ACTIONS["vehicles"]] },
      { module: "batteries",        actions: [...MODULE_ACTIONS["batteries"]] },
      { module: "provisioning",     actions: [...MODULE_ACTIONS["provisioning"]] },
      { module: "customers",        actions: [...MODULE_ACTIONS["customers"]] },
      { module: "users",            actions: [...MODULE_ACTIONS["users"]] },
      { module: "dashboards",       actions: ["view"] },
      { module: "reports",          actions: ["view"] },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r-external-user",
    name: "External User",
    description: "Read-only view of own partner's vehicles and scanner data. No swap, wallet, or user management access.",
    isSystem: true,
    color: "#6366f1",
    permissions: [
      { module: "vehicles",         actions: ["view"] },
      { module: "batteries",        actions: ["view"] },
      { module: "provisioning",     actions: ["view"] },
      { module: "customers",        actions: ["view"] },
      { module: "dashboards",       actions: ["view"] },
      { module: "reports",          actions: ["view"] },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

interface RolesState {
  customRoles: Role[];
  get roles(): Role[];
  createRole: (data: { name: string; description?: string; color: string; permissions: RolePermission[] }) => Role;
  updateRole: (id: string, patch: Partial<Pick<Role, "name" | "description" | "color" | "permissions">>) => void;
  deleteRole: (id: string) => void;
  getRoleById: (id: string) => Role | undefined;
}

export const useRolesStore = create<RolesState>()(
  persist(
    (set, get) => ({
      customRoles: [],

      get roles() {
        return [...SYSTEM_ROLES, ...get().customRoles];
      },

      createRole: (data) => {
        const role: Role = {
          id: `r-custom-${Date.now()}`,
          isSystem: false,
          createdAt: new Date().toISOString(),
          ...data,
        };
        set((s) => ({ customRoles: [...s.customRoles, role] }));
        return role;
      },

      updateRole: (id, patch) => {
        // Cannot update system roles' permissions/structure (but we allow name edits for custom roles)
        const isSystem = SYSTEM_ROLES.some((r) => r.id === id);
        if (isSystem) return;
        set((s) => ({
          customRoles: s.customRoles.map((r) => r.id === id ? { ...r, ...patch } : r),
        }));
      },

      deleteRole: (id) => {
        const isSystem = SYSTEM_ROLES.some((r) => r.id === id);
        if (isSystem) return;
        set((s) => ({ customRoles: s.customRoles.filter((r) => r.id !== id) }));
      },

      getRoleById: (id) => {
        return [...SYSTEM_ROLES, ...get().customRoles].find((r) => r.id === id);
      },
    }),
    {
      name: "zeno-roles",
      partialize: (s) => ({ customRoles: s.customRoles }),
    }
  )
);
