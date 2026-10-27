"use client";

import { History } from "lucide-react";
import { usePricingStore } from "@/store/pricing-plans";
import { CHANGE_LABELS, fmtEat } from "@/lib/pricing/format";

/** Who changed the plan and when, newest first. */
export function ChangeHistory({ planId }: { planId: string }) {
  const changes = usePricingStore((s) => s.changes);
  const rows = changes
    .filter((c) => c.planId === planId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
        No changes recorded for this plan yet.
      </div>
    );
  }

  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-5">
      {rows.map((c) => (
        <li key={c.id} className="pl-5 relative">
          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zeno-teal ring-4 ring-white" />
          <p className="text-xs font-semibold text-slate-700">{CHANGE_LABELS[c.kind]}</p>
          {c.summary && <p className="text-xs text-slate-600 mt-0.5">{c.summary}</p>}
          <p className="text-[11px] text-slate-400 mt-1">
            {c.by} · {fmtEat(c.at)}
            {/* Changes now apply when made; older entries could take effect later. */}
            {c.effectiveFrom && Math.abs(new Date(c.effectiveFrom).getTime() - new Date(c.at).getTime()) > 60_000 && (
              <> · effective {fmtEat(c.effectiveFrom)}</>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}
