"use client";

import { useEffect, useMemo, useState } from "react";
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

/**
 * The current time for the pricing pages, moving on at each minute boundary
 * (for the Now marker and "until" times). Never earlier than the latest
 * change in the store: changes apply "from now", so a plan saved or a
 * station moved a moment ago shows as in force straight away rather than
 * after the next tick.
 */
export function usePricingNow(): string {
  const [clock, setClock] = useState(() => new Date().toISOString());
  const latestChange = usePricingStore((s) => s.changes.reduce((max, c) => (c.at > max ? c.at : max), ""));
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => setClock(new Date().toISOString());
    const first = setTimeout(() => {
      tick();
      id = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return new Date(latestChange).getTime() > new Date(clock).getTime() ? latestChange : clock;
}

export function useActorName(): string {
  return useAuthStore((s) => s.user?.name) ?? "Unknown user";
}

/** The same field style as components/ui/input.tsx, for inputs laid out in a grid. */
export const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal disabled:bg-slate-50 disabled:text-slate-400";
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
