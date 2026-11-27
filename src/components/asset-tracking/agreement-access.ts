"use client";

import { useAuthStore } from "@/store/auth";
import { isPartnerRole, type UserRole } from "@/lib/mock/users";

/**
 * Who sees customer agreements on Vehicle Tracking: internal roles do, partner
 * roles (External Admin, External Viewer) don't. For partners the Agreements
 * column, filter, chip, export columns and card are left out, not disabled.
 * The Customer card stays: partners already see customer name and phone.
 */

export function canSeeAgreements(role: UserRole | string | undefined): boolean {
  return !isPartnerRole(role);
}

/** Whether the signed-in user sees agreements. */
export function useCanSeeAgreements(): boolean {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;
  return canSeeAgreements(role);
}
