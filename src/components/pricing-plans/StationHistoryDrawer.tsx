"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { REASON_LABELS, stationHistory } from "@/lib/pricing/history";
import { fmtEat } from "@/lib/pricing/format";
import type { PricingPlan } from "@/lib/pricing/types";
import { usePricingBook, usePricingNow } from "./shared";

const STATION_BY_ID = new Map(PRICING_STATIONS.map((s) => [s.id, s]));

/** A plan's name, linking to its page; a deleted plan has no page, so it reads "(deleted)". */
function PlanName({ plan }: { plan: PricingPlan }) {
  if (plan.archived) return <span className="text-slate-500">{plan.name} (deleted)</span>;
  return (
    <Link href={`/swap-station-pricing/${plan.id}`} className="font-medium text-slate-800 hover:text-zeno-teal hover:underline">
      {plan.name}
    </Link>
  );
}

/**
 * One station's pricing history in a right-hand panel, so the table behind
 * stays in view: every plan it joined or left, newest first (so the top entry
 * is where it is now), with who moved it, when and why. Styled after Swap Audit's
 * SessionDrawer. `stationId` null closes it.
 */
export function StationHistoryDrawer({ stationId, onClose }: { stationId: string | null; onClose: () => void }) {
  const book = usePricingBook();
  const now = usePricingNow();
  const open = stationId !== null;
  // Keep the last station while the panel slides out.
  const [shown, setShown] = useState(stationId);
  if (stationId && stationId !== shown) setShown(stationId);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus the title once as it opens, not on every render of the parent.
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const station = shown ? STATION_BY_ID.get(shown) : undefined;
  const history = shown && station ? stationHistory(book, shown, now) : [];

  return (
    <div
      inert={!open}
      className={cn("fixed inset-0 z-50 flex justify-end transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-history-title"
        className={cn(
          "relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 id="station-history-title" ref={titleRef} tabIndex={-1} className="font-medium text-slate-800 focus:outline-none">
              <span className="font-mono">{shown}</span>
              {station && <span className="ml-2 text-slate-600">{station.shortAddress}</span>}
            </h2>
            {station && <p className="mt-0.5 text-xs text-slate-500">{station.longAddress}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!station ? (
            <p className="text-sm text-slate-500">Station not found.</p>
          ) : (
            <div className="space-y-6">
              {/* The newest entry is the plan it's on now, so there's no separate "Plan now". */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700">History</h3>
                <ol className="relative mt-3 ml-1.5 space-y-5 border-l border-slate-200">
                  {history.map((e) => (
                    <li key={e.id} className="relative pl-5">
                      <span
                        className={cn(
                          "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                          e.scheduled ? "border border-amber-500 bg-white" : "bg-zeno-teal"
                        )}
                      />
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <PlanName plan={e.from} />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-label="to" />
                        <PlanName plan={e.to} />
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {REASON_LABELS[e.reason]} by {e.by}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        {e.scheduled ? <span className="font-medium text-amber-700">Scheduled for {fmtEat(e.at)}</span> : fmtEat(e.at)}
                      </p>
                    </li>
                  ))}
                  <li className="relative pl-5">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                    <p className="text-sm text-slate-600">On Default since go-live</p>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
