"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { fmtMoves, summarizeMoves } from "@/lib/pricing/moves";
import type { PricingPlan } from "@/lib/pricing/types";
import { MoveWarnings, StationPicker } from "./StationPicker";
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
        <StationPicker targetPlanId={targetId} selected={selected} onChange={setSelected} summary={summary} now={now} />

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

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
        Their new rates apply to swaps from now. Swaps already in progress keep the plan they started on.
        <span className="block mt-2 text-xs text-slate-500">{summary.moves.map((m) => m.id).join(", ")}</span>
        {summary.moves.some((m) => !m.from.isDefault) && (
          <span className="block mt-2 text-xs text-slate-500">
            Leaving another plan: {fmtMoves(summary.moves.filter((m) => !m.from.isDefault))}.
          </span>
        )}
        <span className="block mt-2">
          <MoveWarnings summary={{ ...summary, moves: [] }} />
        </span>
      </ConfirmModal>
    </Modal>
  );
}
