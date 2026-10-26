"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { usePricingStore } from "@/store/pricing-plans";
import { SLOT_BADGE, SLOT_LABELS, STATUS_META, displayStatus } from "@/lib/pricing/format";
import type { PlanStatus } from "@/lib/pricing/engine";
import type { PricingBook, RateSlot } from "@/lib/pricing/types";

/** The plans and assignments as one book, stable between renders. */
export function usePricingBook(): PricingBook {
  const plans = usePricingStore((s) => s.plans);
  const assignments = usePricingStore((s) => s.assignments);
  return useMemo(() => ({ plans, assignments }), [plans, assignments]);
}

export function useActorName(): string {
  return useAuthStore((s) => s.user?.name) ?? "Unknown user";
}

export const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40";
export const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const meta = STATUS_META[displayStatus(status)];
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", meta.badge)}>
      {meta.label}
    </span>
  );
}

export function SlotBadge({ slot }: { slot: RateSlot }) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", SLOT_BADGE[slot])}>
      {SLOT_LABELS[slot]}
    </span>
  );
}
