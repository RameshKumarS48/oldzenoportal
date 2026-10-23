"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
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
import { fmtEat, fmtRate, fmtWindow } from "@/lib/pricing/format";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { PlanStatusBadge, usePricingBook } from "@/components/pricing-plans/shared";
import { usePricingStore } from "@/store/pricing-plans";

const STATUS_ORDER = { default: 0, active: 1, scheduled: 2, inactive: 3 } as const;

export default function PricingPlansPage() {
  const router = useRouter();
  const book = usePricingBook();
  const changes = usePricingStore((s) => s.changes);
  const canWrite = useAccess().canWrite("pricing");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [now] = useState(() => new Date().toISOString());

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
        const lastUpdated = changes
          .filter((c) => c.planId === plan.id)
          .map((c) => c.at)
          .sort()
          .at(-1);
        return { plan, status, version, stations, nextChange, lastUpdated };
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
      <Topbar title="Pricing Plans" />
      <main className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <p className="text-xs text-slate-400 max-w-md">
            Custom Pricing: a Standard rate plus a Custom rate window per plan, assigned to swap stations. KES per kWh, EAT.
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
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Standard rate</th>
                  <th className="px-4 py-2.5">Custom window</th>
                  <th className="px-4 py-2.5 text-right">Custom rate</th>
                  <th className="px-4 py-2.5 text-right">Stations</th>
                  <th className="px-4 py-2.5">Next scheduled change</th>
                  <th className="px-4 py-2.5">Last updated</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-slate-400 text-sm">No plan matches “{query}”.</td>
                  </tr>
                )}
                {rows.map(({ plan, status, version, stations, nextChange, lastUpdated }) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/pricing-plans/${plan.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/pricing-plans/${plan.id}`} className="font-medium text-slate-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {plan.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{plan.description}</p>
                    </td>
                    <td className="px-4 py-3"><PlanStatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtRate(version.standardRate)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 whitespace-nowrap">{fmtWindow(version.customWindowStart, version.customWindowEnd)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-teal-700 whitespace-nowrap">{fmtRate(version.customRate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{stations}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {nextChange ? <span className="text-amber-700">{fmtEat(nextChange)}</span> : <span className="text-slate-300">–</span>}
                    </td>
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
