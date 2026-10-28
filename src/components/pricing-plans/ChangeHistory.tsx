"use client";

import { History } from "lucide-react";
import { usePricingStore } from "@/store/pricing-plans";
import { CHANGE_LABELS, fmtEat } from "@/lib/pricing/format";
import { sortedVersions, versionNumber } from "@/lib/pricing/engine";
import { countryOf } from "@/lib/pricing/country";
import type { BaseRates } from "@/lib/pricing/windows";
import type { PlanChangeKind, PlanVersion, PricingPlan } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { DayBandBar, versionBands } from "./DayBandBar";

/** Change kinds that save a new rate version. */
const RATE_KINDS = new Set<PlanChangeKind>(["created", "rates_changed", "window_changed"]);

const ms = (iso: string) => new Date(iso).getTime();

interface Entry {
  key: string;
  at: string;
  title: string;
  summary: string;
  note?: string;
  by: string;
  effectiveFrom?: string;
  version?: PlanVersion;
}

/**
 * Everything that happened to the plan, newest first: who did what, when,
 * and the note they left. An entry that saved new rates carries that rate
 * version: its number (v1, v2…), whether it's the one in force, and its day
 * as a bar. A version with no log entry (older data) still gets a row.
 */
export function ChangeHistory({
  plan,
  currentId,
  defaultRate,
}: {
  plan: PricingPlan;
  currentId: string;
  /** The rates drawn grey; null for a plan in another currency. */
  defaultRate: BaseRates | null;
}) {
  const changes = usePricingStore((s) => s.changes);
  const currency = countryOf(plan).currency;
  const versions = sortedVersions(plan);
  const used = new Set<string>();

  const entries: Entry[] = changes
    .filter((c) => c.planId === plan.id)
    .map((c) => {
      // The version a rate change saved takes effect the moment it's logged.
      const version = RATE_KINDS.has(c.kind)
        ? versions.find((v) => !used.has(v.id) && ms(v.effectiveFrom) === ms(c.effectiveFrom ?? c.at))
        : undefined;
      if (version) used.add(version.id);
      return { key: c.id, at: c.at, title: CHANGE_LABELS[c.kind], summary: c.summary, note: c.note, by: c.by, effectiveFrom: c.effectiveFrom, version };
    });
  for (const v of versions) {
    if (used.has(v.id)) continue;
    entries.push({ key: v.id, at: v.createdAt, title: "Rates set", summary: "", by: v.createdBy, effectiveFrom: v.effectiveFrom, version: v });
  }
  entries.sort((a, b) => ms(b.at) - ms(a.at));

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
        No changes recorded for this plan yet.
      </div>
    );
  }

  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-6">
      {entries.map((e) => {
        const active = e.version?.id === currentId;
        // A new plan's summary only lists its rates, which the bar already shows.
        const summary = e.version && e.summary.startsWith("Created") ? "" : e.summary;
        return (
          <li key={e.key} className="pl-5 relative">
            <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zeno-teal ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-slate-700">{e.title}</p>
              {e.version && (
                <>
                  <span className="font-mono text-[11px] text-slate-500">v{versionNumber(plan, e.version.id)}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-medium",
                      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {active ? "Active" : "Inactive"}
                  </span>
                </>
              )}
            </div>
            {summary && <p className="text-xs text-slate-600 mt-0.5">{summary}</p>}
            {e.version && (
              <DayBandBar className="mt-2 max-w-xl" items={versionBands(e.version.windows, defaultRate)} currency={currency} compact />
            )}
            {e.note && <p className="mt-1.5 border-l-2 border-slate-200 pl-3 text-xs text-slate-600 whitespace-pre-line">{e.note}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              {e.by} · {fmtEat(e.at)}
              {/* Changes now apply when made; older entries could take effect later. */}
              {e.effectiveFrom && Math.abs(ms(e.effectiveFrom) - ms(e.at)) > 60_000 && <> · effective {fmtEat(e.effectiveFrom)}</>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
