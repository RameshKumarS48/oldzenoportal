"use client";

import type { PricingPlan } from "@/lib/pricing/types";
import { PlanForm } from "./PlanForm";

/** Edit a plan's name and rates in a modal over its page. A new plan has its own page, /swap-station-pricing/new. */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan; onClose: () => void }) {
  return <PlanForm plan={plan} onDone={onClose} onCancel={onClose} />;
}
