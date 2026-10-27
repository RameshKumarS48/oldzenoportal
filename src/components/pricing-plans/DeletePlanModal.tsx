"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { defaultPlan, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import { fmtSlabs, splitVersion } from "@/lib/pricing/windows";
import type { PricingPlan } from "@/lib/pricing/types";
import { inputCls, useActorName, usePricingBook } from "./shared";

/**
 * Delete a plan: it's archived, not removed, and its stations move to Default
 * from now. With stations on it, the plan's name must be typed first.
 */
export function DeletePlanModal({ plan, onClose, onDeleted }: { plan: PricingPlan; onClose: () => void; onDeleted: () => void }) {
  const deletePlan = usePricingStore((s) => s.deletePlan);
  const actor = useActorName();
  const book = usePricingBook();
  const [typed, setTyped] = useState("");
  const [now] = useState(() => new Date().toISOString());

  const stations = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;
  const fallback = defaultPlan(book);
  const base = splitVersion(versionAt(fallback, now) ?? sortedVersions(fallback)[0]).base;
  const matches = typed.trim().toLowerCase() === plan.name.toLowerCase();

  function handleConfirm() {
    const res = deletePlan(plan.id, actor);
    if (!res.ok) {
      toast.error("Can't delete plan", res.error);
      return onClose();
    }
    const moved = res.moved ?? 0;
    toast.info(
      "Plan deleted",
      moved > 0 ? `${plan.name} was deleted. ${moved} station${moved === 1 ? "" : "s"} moved to Default.` : `${plan.name} was deleted.`
    );
    onDeleted();
  }

  return (
    <ConfirmModal
      open
      title={`Delete ${plan.name}?`}
      confirmLabel="Delete"
      tone="danger"
      confirmDisabled={stations > 0 && !matches}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      {stations === 0 ? (
        "This plan has no stations."
      ) : (
        <div className="space-y-3">
          <p>
            Its {stations} station{stations === 1 ? "" : "s"} move{stations === 1 ? "s" : ""} to Default
            {base && <span className="tabular-nums"> ({fmtSlabs(base)})</span>} for swaps from now. Past swaps keep their prices.
          </p>
          <div>
            <label htmlFor="delete-plan-name" className="block text-xs text-slate-500 mb-1">
              Type <span className="font-semibold text-slate-700">{plan.name}</span> to confirm
            </label>
            <input
              id="delete-plan-name"
              className={inputCls}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>
      )}
    </ConfirmModal>
  );
}
