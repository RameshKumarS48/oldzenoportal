"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/InfoTip";
import { useAccess } from "@/lib/access";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { planStatus, stationsOnPlan, versionAt, sortedVersions } from "@/lib/pricing/engine";
import { displayStatus, fmtEat } from "@/lib/pricing/format";
import { fmtCustomCount, fmtHHmmss, fmtSlabs, splitVersion, windowAt, windowBoundary } from "@/lib/pricing/windows";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { PlanActionsMenu } from "@/components/pricing-plans/PlanActionsMenu";
import { DeletePlanModal } from "@/components/pricing-plans/DeletePlanModal";
import { PlanStatusBadge, usePricingBook } from "@/components/pricing-plans/shared";
import { usePricingStore } from "@/store/pricing-plans";
import type { PricingPlan } from "@/lib/pricing/types";

const STATUS_ORDER = { default: 0, active: 1, inactive: 2 } as const;

const SLABS_TIP = "Slab 1: a rider’s first 3 kWh each day. Slab 2: everything after.";

export default function PricingPlansPage() {
  const router = useRouter();
  const book = usePricingBook();
  const changes = usePricingStore((s) => s.changes);
  const canWrite = useAccess().canWrite("pricing");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PricingPlan | null>(null);
  const [now, setNow] = useState(() => new Date().toISOString());

  // Price now follows the clock: re-read it every minute so "until" rolls over.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    // Deleted plans stay in the book, so swaps priced on them still resolve, but aren't listed.
    return book.plans
      .filter((plan) => !plan.archived)
      .map((plan) => {
        const status = displayStatus(planStatus(book, plan, ALL_STATION_IDS, now));
        // Changes apply when saved, so the latest version is the one in force.
        const version = versionAt(plan, now) ?? sortedVersions(plan)[0];
        const stations = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;
        // The window pricing swaps right now, and the second the next one takes over.
        const current = windowAt(version.windows, now);
        const until = current ? fmtHHmmss(windowBoundary(current)) : null;
        const lastUpdated = changes
          .filter((c) => c.planId === plan.id)
          .map((c) => c.at)
          .sort()
          .at(-1);
        return { plan, status, version, stations, current, until, lastUpdated };
      })
      .filter(({ plan }) => {
        const q = query.trim().toLowerCase();
        return !q || plan.name.toLowerCase().includes(q);
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.plan.name.localeCompare(b.plan.name));
  }, [book, changes, query, now]);

  const defaultId = book.plans.find((p) => p.isDefault)?.id;
  const onDefault = defaultId ? stationsOnPlan(book, defaultId, ALL_STATION_IDS, now).length : 0;

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <p className="text-xs text-slate-400 max-w-md">
            Custom Pricing: time-of-day windows, each with two slab rates, per plan, assigned to swap stations. KES per kWh, EAT.
          </p>
          {canWrite && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              New plan
            </Button>
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-auto p-5 gap-4">
          {/* Battery Tracking's filter bar (BatteryFilterBar.tsx): search, and a count on the right. */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plans"
                aria-label="Search pricing plans by name"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60"
              />
            </div>
            <span className="ml-auto text-xs text-slate-500 tabular-nums">
              {onDefault.toLocaleString()} {onDefault === 1 ? "station" : "stations"} on Default
            </span>
          </div>

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
                  <th className="px-2 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-sm">No plan matches “{query}”.</td>
                  </tr>
                )}
                {rows.map(({ plan, status, version, stations, current, until, lastUpdated }) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/swap-station-pricing/${plan.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/swap-station-pricing/${plan.id}`} className="font-medium text-slate-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {plan.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <PlanStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {current ? (
                        <p className="tabular-nums text-slate-700">
                          {fmtSlabs(current)} <span className="text-slate-400">· until {until}</span>
                        </p>
                      ) : (
                        <p className="text-slate-300">–</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">{fmtCustomCount(splitVersion(version).custom.length)}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{stations}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{lastUpdated ? fmtEat(lastUpdated) : "–"}</td>
                    <td className="px-1 py-2 text-right">
                      {!plan.isDefault && (
                        <PlanActionsMenu
                          aria-label={`Actions for ${plan.name}`}
                          actions={[
                            { label: "Open plan", onSelect: () => router.push(`/swap-station-pricing/${plan.id}`) },
                            ...(canWrite ? [{ label: "Delete plan", danger: true, onSelect: () => setDeleting(plan) }] : []),
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {creating && <PlanFormModal plan={null} onClose={() => setCreating(false)} />}
        {deleting && <DeletePlanModal plan={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
      </main>
    </AccessGuard>
  );
}
