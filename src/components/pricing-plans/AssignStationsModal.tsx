"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { summarizeMoves } from "@/lib/pricing/moves";
import { countryOf } from "@/lib/pricing/country";
import type { PricingPlan } from "@/lib/pricing/types";
import { StationPicker } from "./StationPicker";
import { useActorName, usePricingBook } from "./shared";

/**
 * Put stations on a plan, from now. A station can only be on one plan, so
 * moving it here takes it off its old one. The move applies once confirmed.
 */
export function AssignStationsModal({ plan, onClose }: { plan: PricingPlan; onClose: () => void }) {
  const assignStations = usePricingStore((s) => s.assignStations);
  const book = usePricingBook();
  const actor = useActorName();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => new Date().toISOString());

  const targetId = plan.isDefault ? null : plan.id;
  const summary = summarizeMoves(book, Array.from(selected), targetId, ALL_STATION_IDS, now);
  const count = `${summary.moves.length} station${summary.moves.length === 1 ? "" : "s"}`;

  function handleConfirm() {
    setConfirming(false);
    const res = assignStations(targetId, Array.from(selected), actor);
    if (!res.ok) return setError(res.error);
    toast.success(`${count} moved`, `They're on ${plan.name} from now.`);
    onClose();
  }

  return (
    <Modal open onClose={confirming ? () => {} : onClose} title={`Assign stations to ${plan.name}`} className="max-w-3xl">
      <div className="space-y-4">
        <StationPicker targetPlanId={targetId} selected={selected} onChange={setSelected} now={now} hideAlreadyOnTarget country={countryOf(plan).code} />

        {error && <Callout variant="danger" role="alert">{error}</Callout>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="teal" onClick={() => setConfirming(true)} disabled={summary.moves.length === 0}>
            Assign {summary.moves.length || ""} station{summary.moves.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirming}
        title={`Move ${count} to ${plan.name}?`}
        confirmLabel="Confirm"
        tone="neutral"
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
      >
        Their new rates apply to swaps from now. Swaps in progress keep the plan they started on.
        {summary.emptied.length > 0 && (
          <Callout variant="warning" className="mt-3">
            {summary.emptied.map((p) => p.name).join(", ")} will have no stations left.
          </Callout>
        )}
      </ConfirmModal>
    </Modal>
  );
}
