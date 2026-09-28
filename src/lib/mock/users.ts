export type UserRole =
  | "zeno_super_admin"
  | "zeno_admin"
  | "zeno_support"
  | "partner_super_admin"
  | "partner_user";

export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  avatar?: string;
  emailVerified?: boolean;
  /** Tenant this user belongs to — "zeno" for internal roles, else a partner id. */
  partnerId?: string;
  customPermissions?: Array<{ module: string; actions: string[] }>;
}

/**
 * Display names. These are the labels in the access spec — see `src/lib/access.ts`
 * for the grants each one carries.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  zeno_super_admin:    "Super Admin",
  zeno_admin:          "Internal User",
  zeno_support:        "Internal Viewer",
  partner_super_admin: "External Admin",
  partner_user:        "External Viewer",
};

/** The internal tenant every Zeno staff account belongs to. */
export const INTERNAL_TENANT = "zeno";

export function isZenoAdmin(role: UserRole | string | undefined): boolean {
  return role === "zeno_super_admin" || role === "zeno_admin";
}

export function isPartnerRole(role: UserRole | string | undefined): boolean {
  return role === "partner_super_admin" || role === "partner_user";
}

export function isSupportRole(role: UserRole | string | undefined): boolean {
  return role === "zeno_support";
}

// Sign-in is email + one-time code (see src/store/otp.ts), so accounts carry no
// password at all — there is nothing to seed, reset, or leak.
export const SEED_USERS: AppUser[] = [
  { id: "u1",  name: "Ramesh Kumar",   email: "admin@zenomoto.com",   role: "zeno_super_admin",   status: "active",   createdAt: "2026-01-15", partnerId: "zeno",  emailVerified: true },
  { id: "u2",  name: "Willie Omondi",  email: "willie@zeno.earth",    role: "zeno_admin",          status: "active",   createdAt: "2026-01-20", partnerId: "zeno",  emailVerified: true },
  { id: "u3",  name: "Omar Hassan",    email: "omar@zeno.earth",      role: "zeno_support",        status: "active",   createdAt: "2026-02-01", partnerId: "zeno",  emailVerified: true },
  { id: "u4",  name: "Brian Mwangi",   email: "brian@zeno.earth",     role: "zeno_admin",          status: "active",   createdAt: "2026-02-10", partnerId: "zeno",  emailVerified: true },
  { id: "u5",  name: "Keith Kariuki",  email: "keith@zeno.earth",     role: "zeno_support",        status: "active",   createdAt: "2026-02-15", partnerId: "zeno",  emailVerified: true },
  { id: "u6",  name: "Vijayanand P",   email: "vijay@zeno.earth",     role: "zeno_admin",          status: "active",   createdAt: "2026-01-01", partnerId: "zeno",  emailVerified: true },
  { id: "u7",  name: "Alastair N.",    email: "alastair@zeno.earth",  role: "zeno_support",        status: "inactive", createdAt: "2026-03-01", partnerId: "zeno",  emailVerified: true },
  { id: "u8",  name: "James Kariuki",  email: "james@watu.co.ke",     role: "partner_super_admin", status: "active",   createdAt: "2026-03-10", partnerId: "watu",  emailVerified: true },
  { id: "u9",  name: "Aisha Mwenda",   email: "aisha@gw.co.ke",       role: "partner_user",        status: "active",   createdAt: "2026-04-01", partnerId: "gw",    emailVerified: true },
  { id: "u10", name: "Amara Osei",     email: "support@zeno.earth",   role: "zeno_support",        status: "active",   createdAt: "2026-04-15", partnerId: "zeno",  emailVerified: true },
];
