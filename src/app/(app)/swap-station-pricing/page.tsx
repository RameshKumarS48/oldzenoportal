"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/InfoTip";
import { Tabs } from "@/components/ui/tabs";
import { useAccess } from "@/lib/access";
import { ALL_STATION_IDS } from "@/lib/mock/pricing-plans";
import { Pagination } from "@/components/ui/Pagination";
import { stationsOnPlan, versionAt, sortedVersions } from "@/lib/pricing/engine";
import { fmtEat } from "@/lib/pricing/format";
import { countryOf } from "@/lib/pricing/country";
import { DayBandBar, versionBands } from "@/components/pricing-plans/DayBandBar";
import { PlanActionsMenu } from "@/components/pricing-plans/PlanActionsMenu";
import { DeletePlanModal } from "@/components/pricing-plans/DeletePlanModal";
import { useDefaultRate, usePricingBook, usePricingNow } from "@/components/pricing-plans/shared";
import { StationsDirectory } from "@/components/pricing-plans/StationsDirectory";
import { usePricingStore } from "@/store/pricing-plans";
import type { PricingPlan } from "@/lib/pricing/types";

const VIEWS = [
  { key: "plans", label: "Plans" },
  { key: "stations", label: "Stations" },
];

const SLABS_TIP = "The day from 00:00:00 to 23:59:59; the red line is now. Hover a stretch for its rates. Slab 1: a rider’s first 3 kWh each day. Slab 2: everything after.";

export default function PricingPlansPage() {
  const router = useRouter();
  const book = usePricingBook();
  const changes = usePricingStore((s) => s.changes);
  const canWrite = useAccess().canWrite("pricing");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<PricingPlan | null>(null);
  const [view, setView] = useState("plans");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  // Price now follows the clock, so the now-marker moves, and any change just made.
  const now = usePricingNow();
  const defaultRate = useDefaultRate(now);

  const rows = useMemo(() => {
    // Deleted plans stay in the book, so swaps priced on them still resolve, but aren't listed.
    return book.plans
      .filter((plan) => !plan.archived)
      .map((plan) => {
        // Changes apply when saved, so the latest version is the one in force.
        const version = versionAt(plan, now) ?? sortedVersions(plan)[0];
        const stations = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;
        const lastUpdated = changes
          .filter((c) => c.planId === plan.id)
          .map((c) => c.at)
          .sort()
          .at(-1);
        const country = countryOf(plan);
        // Grey means Default's Default Rate, which only a plan in Default's currency can charge.
        const bands = versionBands(version.windows, country.code === "KE" ? defaultRate : null);
        return { plan, country, bands, stations, lastUpdated };
      })
      .filter(({ plan }) => {
        const q = query.trim().toLowerCase();
        return !q || plan.name.toLowerCase().includes(q);
      })
      .sort((a, b) => Number(b.plan.isDefault) - Number(a.plan.isDefault) || a.plan.name.localeCompare(b.plan.name));
  }, [book, changes, query, now, defaultRate]);

  // A search or a delete can leave the page past the end, so clamp it.
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * perPage, current * perPage);

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <Tabs tabs={VIEWS} active={view} onChange={setView} className="w-56" />
          {canWrite && view === "plans" && (
            <Button variant="primary" onClick={() => router.push("/swap-station-pricing/new")}>
              <Plus className="w-4 h-4" />
              New plan
            </Button>
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-auto p-5 gap-4">
          {view === "stations" ? (
            <StationsDirectory />
          ) : (
          <>
          {/* Battery Tracking's filter bar (BatteryFilterBar.tsx): search, and a count on the right. */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search plans"
                aria-label="Search pricing plans by name"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-60"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-auto">
            <table className="w-full table-fixed text-sm min-w-[760px]">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[44%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-10" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider align-top">
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      Price now
                      <InfoTip content={SLABS_TIP} placement="top" />
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-right">Stations</th>
                  <th className="px-4 py-2.5">Last updated</th>
                  <th className="px-2 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-slate-400 text-sm">No plan matches “{query}”.</td>
                  </tr>
                )}
                {shown.map(({ plan, country, bands, stations, lastUpdated }) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/swap-station-pricing/${plan.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/swap-station-pricing/${plan.id}`} className="font-medium text-slate-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {plan.name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{country.name} · {country.currency}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <DayBandBar items={bands} now={now} currency={country.currency} compact />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{stations}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{lastUpdated ? fmtEat(lastUpdated) : "–"}</td>
                    <td className="px-1 py-2 text-right">
                      {canWrite && !plan.isDefault && (
                        <PlanActionsMenu
                          aria-label={`Actions for ${plan.name}`}
                          actions={[{ label: "Delete plan", danger: true, onSelect: () => setDeleting(plan) }]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <Pagination total={rows.length} page={current} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
          </div>
          </>
          )}
        </div>

        {deleting && <DeletePlanModal plan={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
      </main>
    </AccessGuard>
  );
}
