/**
 * Who may do what in Zeno Charging (for engineers: the backend should enforce
 * exactly this). Matches the `charging` grants in
 * src/lib/access.ts (Super Admin and Internal User read-write, Internal
 * Viewer read-only, external roles none).
 */
import type { UserRole } from "@/lib/mock/users";

export type ChargingAction = "view" | "write" | "restore" | "overrideId";

const RIGHTS: Record<UserRole, ChargingAction[]> = {
  zeno_super_admin: ["view", "write", "restore", "overrideId"],
  zeno_admin: ["view", "write"],
  zeno_support: ["view"],
  partner_super_admin: [],
  partner_user: [],
};

export function chargingCan(role: UserRole | string | null | undefined, action: ChargingAction): boolean {
  return !!role && (RIGHTS[role as UserRole]?.includes(action) ?? false);
}
