"use client";

import { usePartnersStore } from "@/store/partners";
import { INTERNAL_TENANT } from "@/lib/mock/users";

export interface TenantOption {
  id: string;
  label: string;
}

/**
 * Tenants a user can belong to: Zeno itself, plus every partner. Zeno isn't in
 * the partners store (it isn't a partner), so it's prepended here rather than
 * seeded into partner data that other screens read.
 */
export function useTenantOptions(): TenantOption[] {
  const partners = usePartnersStore((s) => s.partners);
  return [
    { id: INTERNAL_TENANT, label: "Zeno (internal)" },
    ...partners.map((p) => ({ id: p.id, label: p.name })),
  ];
}

/** Resolve a tenant id to its display label, falling back to the raw id. */
export function tenantLabel(options: TenantOption[], id: string | undefined): string {
  if (!id) return "—";
  return options.find((o) => o.id === id)?.label ?? id;
}
