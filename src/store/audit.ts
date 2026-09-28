"use client";

import { create } from "zustand";

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "Super Admin" | "Admin" | "User";
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

const MOCK_LOGS: AuditLog[] = [
  { id: "al-001", timestamp: "2026-07-29T08:12:43Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.11" },
  { id: "al-002", timestamp: "2026-07-29T08:14:01Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "dashboard.create",     module: "dashboards",   entityType: "dashboard", entityId: "d-8812",           summary: "Created dashboard 'Weekly Fleet Review'",    newValue: { title: "Weekly Fleet Review", visibility: "private" } },
  { id: "al-003", timestamp: "2026-07-29T08:31:17Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.14" },
  { id: "al-004", timestamp: "2026-07-29T09:02:55Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "user.invite",          module: "users",        entityType: "invite", entityId: "inv-001",           summary: "Invited fatuma@zeno.earth as User",          newValue: { email: "fatuma@zeno.earth", role: "User" } },
  { id: "al-005", timestamp: "2026-07-29T09:15:30Z", userId: "u2", userName: "Willie Omondi",  userEmail: "willie@zeno.earth",   userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.22" },
  { id: "al-006", timestamp: "2026-07-29T09:18:04Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "vehicles",     entityType: "vehicle", entityId: "VH-0034",          summary: "Provisioned vehicle VH-0034",                newValue: { vin: "KENZ001MX34", reg: "KDA 234Y", partner: "watu" } },
  { id: "al-007", timestamp: "2026-07-29T09:22:11Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "vehicles",     entityType: "vehicle", entityId: "VH-0035",          summary: "Provisioned vehicle VH-0035",                newValue: { vin: "KENZ001MX35", reg: "KDA 235Y", partner: "watu" } },
  { id: "al-008", timestamp: "2026-07-29T09:45:00Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "permission.change",    module: "roles",        entityType: "role", entityId: "r-user",             summary: "Updated permissions for 'User' role",        previousValue: { reports: ["view"] }, newValue: { reports: ["view", "export"] } },
  { id: "al-009", timestamp: "2026-07-29T10:01:22Z", userId: "u3", userName: "Omar Hassan",    userEmail: "omar@zeno.earth",     userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.5" },
  { id: "al-010", timestamp: "2026-07-29T10:14:37Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.update",        module: "vehicles",     entityType: "vehicle", entityId: "VH-0012",          summary: "Updated vehicle VH-0012 status",             previousValue: { status: "provisioning" }, newValue: { status: "active" } },
  { id: "al-011", timestamp: "2026-07-29T10:30:01Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "report.export",        module: "reports",      entityType: "report",                                  summary: "Exported weekly summary CSV (Week 30)" },
  { id: "al-012", timestamp: "2026-07-29T10:55:44Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "batteries",    entityType: "battery", entityId: "BAT-0412",         summary: "Registered battery BAT-0412",                newValue: { serial: "ZBT-2026-0412", capacity: 1.92, partner: "gw" } },
  { id: "al-013", timestamp: "2026-07-29T11:02:08Z", userId: "u4", userName: "Brian Mwangi",   userEmail: "brian@zeno.earth",    userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.9" },
  { id: "al-014", timestamp: "2026-07-29T11:20:33Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "user.update",          module: "users",        entityType: "user", entityId: "u7",                 summary: "Updated user Alastair N. status to inactive", previousValue: { status: "active" }, newValue: { status: "inactive" } },
  { id: "al-015", timestamp: "2026-07-29T11:45:00Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.bulk_upload",   module: "vehicles",     entityType: "vehicle",                                 summary: "Bulk uploaded 12 vehicles",                  newValue: { count: 12, partner: "mkopa" } },
  { id: "al-016", timestamp: "2026-07-29T12:00:00Z", userId: "u2", userName: "Willie Omondi",  userEmail: "willie@zeno.earth",   userRole: "User",        action: "auth.logout",          module: "auth",         summary: "Logged out" },
  { id: "al-017", timestamp: "2026-07-28T16:30:22Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "dashboard.update",     module: "dashboards",   entityType: "dashboard", entityId: "preset-partner-metrics", summary: "Pinned widget to Partner Metrics dashboard" },
  { id: "al-018", timestamp: "2026-07-28T15:10:05Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "swap_stations",entityType: "swap_station", entityId: "SS-NBO-31",     summary: "Added swap station SS-NBO-31 (Kasarani)",    newValue: { name: "Kasarani Hub", region: "nbo", installType: "three_phase" } },
  { id: "al-019", timestamp: "2026-07-28T14:55:17Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "role.create",          module: "roles",        entityType: "role", entityId: "r-custom-1",         summary: "Created role 'Field Engineer'",              newValue: { name: "Field Engineer", permissions: ["vehicles:view", "batteries:view"] } },
  { id: "al-020", timestamp: "2026-07-28T14:22:01Z", userId: "u3", userName: "Omar Hassan",    userEmail: "omar@zeno.earth",     userRole: "User",        action: "auth.logout",          module: "auth",         summary: "Logged out" },
  { id: "al-021", timestamp: "2026-07-28T13:48:39Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.update",        module: "customers",    entityType: "customer", entityId: "CX-1204",          summary: "Updated customer CX-1204 partner assignment", previousValue: { partner: "gw" }, newValue: { partner: "watu" } },
  { id: "al-022", timestamp: "2026-07-28T11:30:00Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "settings.update",      module: "settings",     summary: "Changed KPI comparison period to 4 weeks",   previousValue: { period: "1w" }, newValue: { period: "4w" } },
  { id: "al-023", timestamp: "2026-07-28T10:05:22Z", userId: "u5", userName: "Keith Kariuki",  userEmail: "keith@zeno.earth",    userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.33" },
  { id: "al-024", timestamp: "2026-07-28T09:44:11Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "provisioning.create",  module: "provisioning", entityType: "vehicle", entityId: "VH-0033",          summary: "Started provisioning for vehicle VH-0033" },
  { id: "al-025", timestamp: "2026-07-27T17:22:00Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "report.schedule",      module: "reports",      entityType: "report", entityId: "rpt-003",           summary: "Scheduled monthly fleet report for all users" },
  { id: "al-026", timestamp: "2026-07-27T16:01:55Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.delete",        module: "vehicles",     entityType: "vehicle", entityId: "VH-0007",          summary: "Deleted vehicle VH-0007 (decommissioned)",   previousValue: { status: "offroad", reason: "accident" } },
  { id: "al-027", timestamp: "2026-07-27T14:30:41Z", userId: "u4", userName: "Brian Mwangi",   userEmail: "brian@zeno.earth",    userRole: "User",        action: "auth.logout",          module: "auth",         summary: "Logged out" },
  { id: "al-028", timestamp: "2026-07-27T13:11:29Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "user.create",          module: "users",        entityType: "user", entityId: "u8",                 summary: "Registered new user via invite (fatuma@zeno.earth)", newValue: { email: "fatuma@zeno.earth", role: "User" } },
  { id: "al-029", timestamp: "2026-07-27T11:00:00Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.update",        module: "swap_stations",entityType: "swap_station", entityId: "SS-NYR-04",     summary: "Updated SS-NYR-04 battery count",            previousValue: { batteriesInstalled: 6 }, newValue: { batteriesInstalled: 8 } },
  { id: "al-030", timestamp: "2026-07-27T09:22:17Z", userId: "u3", userName: "Omar Hassan",    userEmail: "omar@zeno.earth",     userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.5" },
  { id: "al-031", timestamp: "2026-07-26T16:45:02Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "dashboard.create",     module: "dashboards",   entityType: "dashboard", entityId: "d-9901",           summary: "Created shared dashboard 'Nanyuki Ops'",     newValue: { title: "Nanyuki Ops", visibility: "shared", sharedWith: "all-admins" } },
  { id: "al-032", timestamp: "2026-07-26T14:02:33Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.bulk_upload",   module: "batteries",    entityType: "battery",                                 summary: "Bulk uploaded 24 batteries",                 newValue: { count: 24, region: "nanyuki" } },
  { id: "al-033", timestamp: "2026-07-26T11:30:00Z", userId: "u2", userName: "Willie Omondi",  userEmail: "willie@zeno.earth",   userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.22" },
  { id: "al-034", timestamp: "2026-07-26T10:05:11Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "permission.change",    module: "roles",        entityType: "role", entityId: "r-admin",            summary: "Updated Admin role, added provisioning:edit" },
  { id: "al-035", timestamp: "2026-07-25T15:44:22Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "customers",    entityType: "customer", entityId: "CX-1291",          summary: "Added customer record CX-1291",              newValue: { name: "James Mutua", partner: "watu", source: "scanner_app" } },
  { id: "al-036", timestamp: "2026-07-25T14:01:00Z", userId: "u5", userName: "Keith Kariuki",  userEmail: "keith@zeno.earth",    userRole: "User",        action: "auth.logout",          module: "auth",         summary: "Logged out" },
  { id: "al-037", timestamp: "2026-07-25T11:22:09Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "report.export",        module: "reports",      summary: "Exported partner KPI data to CSV (Week 29)" },
  { id: "al-038", timestamp: "2026-07-25T09:00:00Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.14" },
  { id: "al-039", timestamp: "2026-07-24T17:30:44Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "user.delete",          module: "users",        entityType: "user", entityId: "u-old-01",           summary: "Deleted user james.old@zeno.earth",          previousValue: { name: "James Old", email: "james.old@zeno.earth", role: "User" } },
  { id: "al-040", timestamp: "2026-07-24T14:15:22Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "provisioning.update",  module: "provisioning", entityType: "vehicle", entityId: "VH-0031",          summary: "Completed provisioning for VH-0031",         previousValue: { status: "provisioning" }, newValue: { status: "active" } },
  { id: "al-041", timestamp: "2026-07-24T10:44:00Z", userId: "u3", userName: "Omar Hassan",    userEmail: "omar@zeno.earth",     userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.5" },
  { id: "al-042", timestamp: "2026-07-23T16:22:01Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "dashboard.delete",     module: "dashboards",   entityType: "dashboard", entityId: "d-7701",           summary: "Deleted dashboard 'Old Q1 Report'",          previousValue: { title: "Old Q1 Report" } },
  { id: "al-043", timestamp: "2026-07-23T14:03:37Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.update",        module: "batteries",    entityType: "battery", entityId: "BAT-0388",         summary: "Updated battery BAT-0388 status",            previousValue: { status: "in_station" }, newValue: { status: "in_vehicle", vehicleId: "VH-0034" } },
  { id: "al-044", timestamp: "2026-07-23T11:00:00Z", userId: "u4", userName: "Brian Mwangi",   userEmail: "brian@zeno.earth",    userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.9" },
  { id: "al-045", timestamp: "2026-07-22T15:33:12Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "role.update",          module: "roles",        entityType: "role", entityId: "r-custom-1",         summary: "Updated 'Field Engineer' role permissions",  previousValue: { permissions: ["vehicles:view"] }, newValue: { permissions: ["vehicles:view", "batteries:view", "swap_stations:view"] } },
  { id: "al-046", timestamp: "2026-07-22T12:01:55Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.create",        module: "fast_chargers",entityType: "fast_charger", entityId: "FC-NBO-09",       summary: "Registered fast charger FC-NBO-09 (Westlands)" },
  { id: "al-047", timestamp: "2026-07-22T09:10:44Z", userId: "u5", userName: "Keith Kariuki",  userEmail: "keith@zeno.earth",    userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "197.232.4.33" },
  { id: "al-048", timestamp: "2026-07-21T16:45:00Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "report.create",        module: "reports",      entityType: "report", entityId: "rpt-008",           summary: "Created scheduled report 'Infra Weekly'" },
  { id: "al-049", timestamp: "2026-07-21T14:22:11Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "record.bulk_delete",   module: "vehicles",     entityType: "vehicle",                                 summary: "Bulk deleted 3 decommissioned vehicles",     previousValue: { ids: ["VH-0001", "VH-0002", "VH-0003"] } },
  { id: "al-050", timestamp: "2026-07-21T09:00:00Z", userId: "u3", userName: "Omar Hassan",    userEmail: "omar@zeno.earth",     userRole: "User",        action: "auth.login",           module: "auth",         summary: "Logged in",                                  ipAddress: "41.90.64.5" },
  { id: "al-051", timestamp: "2026-07-20T17:11:00Z", userId: "u1", userName: "Ramesh Kumar",   userEmail: "admin@zeno.earth",    userRole: "Super Admin", action: "user.update",          module: "users",        entityType: "user", entityId: "u2",                 summary: "Updated Willie Omondi's role",               previousValue: { role: "User" }, newValue: { role: "Admin" } },
  { id: "al-052", timestamp: "2026-07-20T14:00:22Z", userId: "u6", userName: "Vijayanand P",   userEmail: "vijay@zeno.earth",    userRole: "Admin",       action: "provisioning.create",  module: "provisioning", entityType: "battery", entityId: "BAT-0420",         summary: "Started provisioning for battery BAT-0420" },
];

interface AuditState {
  logs: AuditLog[];
  addLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
}

export const useAuditStore = create<AuditState>()((set) => ({
  logs: MOCK_LOGS,
  addLog: (log) => set((s) => ({
    logs: [
      {
        ...log,
        id: `al-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      ...s.logs,
    ],
  })),
}));
