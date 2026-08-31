export type UserRole =
  | "zeno_super_admin"
  | "zeno_admin"
  | "zeno_user"
  | "partner_super_admin"
  | "partner_user"
  | "zeno_support";

export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  avatar?: string;
  password?: string;
  emailVerified?: boolean;
  partnerId?: string;
  customPermissions?: Array<{ module: string; actions: string[] }>;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  zeno_super_admin:  "Super Admin",
  zeno_admin:        "Zeno Admin",
  zeno_user:         "Zeno User",
  partner_super_admin: "Partner Super Admin",
  partner_user:      "Partner User",
  zeno_support:      "Support Agent",
};

export function isZenoAdmin(role: UserRole | string | undefined): boolean {
  return role === "zeno_super_admin" || role === "zeno_admin" || role === "admin";
}

export function isPartnerRole(role: UserRole | string | undefined): boolean {
  return role === "partner_super_admin" || role === "partner_user";
}

export function isSupportRole(role: UserRole | string | undefined): boolean {
  return role === "zeno_support";
}

// Passwords are SHA-256 hashes. Plain-text equivalents are in .env.local (gitignored).
// Dev defaults: admins → "Admin@2026", users → "Zeno@2026", support → "Zeno@2026"
const ADMIN_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
const USER_HASH  = "60ee89117a4a14614cdd5ff775fa02a6c2c1ce0a283e25bc0a56ac9a74de9570";

export const SEED_USERS: AppUser[] = [
  { id: "u1",  name: "Ramesh Kumar",   email: "admin@zeno.earth",     role: "zeno_super_admin",   status: "active",   createdAt: "2026-01-15", password: ADMIN_HASH, emailVerified: true },
  { id: "u2",  name: "Willie Omondi",  email: "willie@zeno.earth",    role: "zeno_admin",          status: "active",   createdAt: "2026-01-20", password: USER_HASH,  emailVerified: true },
  { id: "u3",  name: "Omar Hassan",    email: "omar@zeno.earth",      role: "zeno_user",           status: "active",   createdAt: "2026-02-01", password: USER_HASH,  emailVerified: true },
  { id: "u4",  name: "Brian Mwangi",   email: "brian@zeno.earth",     role: "zeno_user",           status: "active",   createdAt: "2026-02-10", password: USER_HASH,  emailVerified: true },
  { id: "u5",  name: "Keith Kariuki",  email: "keith@zeno.earth",     role: "zeno_user",           status: "active",   createdAt: "2026-02-15", password: USER_HASH,  emailVerified: true },
  { id: "u6",  name: "Vijayanand P",   email: "vijay@zeno.earth",     role: "zeno_admin",          status: "active",   createdAt: "2026-01-01", password: ADMIN_HASH, emailVerified: true },
  { id: "u7",  name: "Alastair N.",    email: "alastair@zeno.earth",  role: "zeno_user",           status: "inactive", createdAt: "2026-03-01", password: USER_HASH,  emailVerified: true },
  { id: "u8",  name: "James Kariuki",  email: "james@watu.co.ke",     role: "partner_super_admin", status: "active",   createdAt: "2026-03-10", password: USER_HASH,  emailVerified: true, partnerId: "watu" },
  { id: "u9",  name: "Aisha Mwenda",   email: "aisha@gw.co.ke",       role: "partner_user",        status: "active",   createdAt: "2026-04-01", password: USER_HASH,  emailVerified: true, partnerId: "gw" },
  { id: "u10", name: "Amara Osei",     email: "support@zeno.earth",   role: "zeno_support",        status: "active",   createdAt: "2026-04-15", password: USER_HASH,  emailVerified: true },
];
