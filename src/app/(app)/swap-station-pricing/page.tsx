"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/InfoTip";
import { SearchInput } from "@/components/ui/FilterControls";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAccess } from "@/lib/access";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import {
  nextVersionAfter,
  planStatus,
  stationsOnPlan,
  upcomingAssignments,
  versionAt,
  sortedVersions,
} from "@/lib/pricing/engine";
import { fmtEat } from "@/lib/pricing/format";
import { fmtHHmmss, fmtSlabs, fmtWindowCount, parseHHmmss, windowAt } from "@/lib/pricing/windows";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { PlanStatusBadge, usePricingBook } from "@/components/pricing-plans/shared";
import { usePricingStore } from "@/store/pricing-plans";

const STATUS_ORDER = { default: 0, active: 1, scheduled: 2, inactive: 3 } as const;

const SLABS_TIP = "Slab 1: a rider’s first 3 kWh each day. Slab 2: everything after.";

/** "15 Nov 2026" in EAT. */
function fmtEatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}

export default function PricingPlansPage() {
  const router = useRouter();
  const book = usePricingBook();
  const changes = usePricingStore((s) => s.changes);
  const canWrite = useAccess().canWrite("pricing");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());

  // Price now follows the clock: re-read it every minute so "until" rolls over.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    return book.plans
      .map((plan) => {
        const status = planStatus(book, plan, ALL_STATION_IDS, now);
        // A plan that hasn't started yet shows the rates it will start with.
        const version = versionAt(plan, now) ?? sortedVersions(plan)[0];
        const stations = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;
        const nextVersion = nextVersionAfter(plan, now);
        const nextMove = upcomingAssignments(book, plan.id, now)[0];
        const nextChange = [nextVersion?.effectiveFrom, nextMove?.effectiveFrom]
          .filter((x): x is string => !!x)
          .sort()[0];
        // The window pricing swaps right now, and the second the next one takes over.
        const current = windowAt(version.windows, now);
        const until = current ? fmtHHmmss(parseHHmmss(current.end) + 1) : null;
        // A scheduled plan goes live once both its first stations and its first rates have started.
        const startsAt = [nextMove?.effectiveFrom, sortedVersions(plan)[0]?.effectiveFrom]
          .filter((x): x is string => !!x)
          .sort()
          .at(-1);
        const lastUpdated = changes
          .filter((c) => c.planId === plan.id)
          .map((c) => c.at)
          .sort()
          .at(-1);
        return { plan, status, version, stations, nextChange, current, until, startsAt, lastUpdated };
      })
      .filter(({ plan }) => {
        const q = query.trim().toLowerCase();
        return !q || plan.name.toLowerCase().includes(q) || plan.description.toLowerCase().includes(q);
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.plan.name.localeCompare(b.plan.name));
  }, [book, changes, query, now]);

  const defaultId = book.plans.find((p) => p.isDefault)?.id;
  const onDefault = defaultId ? stationsOnPlan(book, defaultId, ALL_STATION_IDS, now).length : 0;
  const scheduledCount = book.plans.reduce(
    (n, p) => n + (nextVersionAfter(p, now) ? 1 : 0) + upcomingAssignments(book, p.id, now).length,
    0
  );

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <p className="text-xs text-slate-400 max-w-md">
            Custom Pricing: time-of-day windows, each with two slab rates, per plan, assigned to swap stations. KES per kWh, EAT.
          </p>
          <div className="flex items-center gap-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search plans…" className="w-56" />
            {canWrite && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" />
                New plan
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-auto p-5 gap-4">
          <StatGrid cols={4}>
            <StatCard label="Pricing plans" value={book.plans.length} />
            <StatCard label="Stations on custom plans" value={ALL_STATION_IDS.length - onDefault} valueColor="text-teal-700" />
            <StatCard label="Stations on Default" value={onDefault} />
            <StatCard
              label="Scheduled changes"
              value={scheduledCount}
              valueColor={scheduledCount > 0 ? "text-amber-600" : undefined}
              sublabel="Rate versions and station moves"
            />
          </StatGrid>

          <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
            <table className="w-full table-fixed text-sm min-w-[760px]">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-10" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider align-top">
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      Price now
                      <InfoTip content={SLABS_TIP} placement="top" />
                    </span>
                    <span className="block mt-0.5 font-medium normal-case tracking-normal">KES/kWh · slab 1 / slab 2</span>
                  </th>
                  <th className="px-4 py-2.5 text-right">Stations</th>
                  <th className="px-4 py-2.5">Last updated</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-sm">No plan matches “{query}”.</td>
                  </tr>
                )}
                {rows.map(({ plan, status, version, stations, nextChange, current, until, startsAt, lastUpdated }) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/swap-station-pricing/${plan.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/swap-station-pricing/${plan.id}`} className="font-medium text-slate-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {plan.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{plan.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PlanStatusBadge status={status} />
                      {(status === "active" || status === "default") && nextChange && (
                        <p className="text-[11px] text-slate-400 mt-1 whitespace-nowrap">Changes {fmtEatDate(nextChange)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {status === "scheduled" ? (
                        <p className="text-slate-400">{startsAt ? `Starts ${fmtEatDate(startsAt)}` : "Not started"}</p>
                      ) : current ? (
                        <p className="tabular-nums text-slate-700">
                          {fmtSlabs(current)} <span className="text-slate-400">· until {until}</span>
                        </p>
                      ) : (
                        <p className="text-slate-300">–</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">{fmtWindowCount(version.windows.length)}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{stations}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{lastUpdated ? fmtEat(lastUpdated) : "–"}</td>
                    <td className="px-2 py-3 text-slate-300"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {creating && <PlanFormModal plan={null} onClose={() => setCreating(false)} />}
      </main>
    </AccessGuard>
  );
}
