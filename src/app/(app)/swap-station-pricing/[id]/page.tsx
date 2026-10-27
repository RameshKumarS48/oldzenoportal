"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Pencil, Plus, Undo2 } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toast";
import { useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { assignmentAt, planStatus, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import { summarizeMoves } from "@/lib/pricing/moves";
import { fmtEat } from "@/lib/pricing/format";
import { BASE_LABEL, fmtCustomCount, fmtRateWindow, fmtSlabs, sortWindows, splitVersion } from "@/lib/pricing/windows";
import type { PricingPlan } from "@/lib/pricing/types";
import { DayBandBar, versionBands } from "@/components/pricing-plans/DayBandBar";
import { WindowRates } from "@/components/pricing-plans/WindowRates";
import { ChangeHistory } from "@/components/pricing-plans/ChangeHistory";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { PlanActionsMenu } from "@/components/pricing-plans/PlanActionsMenu";
import { DeletePlanModal } from "@/components/pricing-plans/DeletePlanModal";
import { AssignStationsModal } from "@/components/pricing-plans/AssignStationsModal";
import { StationHistoryDrawer } from "@/components/pricing-plans/StationHistoryDrawer";
import { PlanStatusBadge, useActorName, usePricingBook, usePricingNow } from "@/components/pricing-plans/shared";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "stations", label: "Stations" },
  { key: "versions", label: "Rate versions" },
  { key: "history", label: "History" },
];

const DEFAULT_NOTE = "Applies to every station that isn’t on another plan.";

const STATION_BY_ID = new Map(PRICING_STATIONS.map((s) => [s.id, s]));

export default function PricingPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const plan = usePricingStore((s) => s.plans.find((p) => p.id === id));

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {plan && !plan.archived ? (
          <PlanDetail plan={plan} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {plan ? (
              <EmptyState title="This plan was deleted" description="Its stations were moved to Default." />
            ) : (
              <EmptyState title="Plan not found" description="It may have been deleted." />
            )}
            <Link href="/swap-station-pricing" className="text-sm text-zeno-teal font-medium hover:underline">Back to Swap Station Pricing</Link>
          </div>
        )}
      </main>
    </AccessGuard>
  );
}

function PlanDetail({ plan }: { plan: PricingPlan }) {
  const router = useRouter();
  const book = usePricingBook();
  const canWrite = useAccess().canWrite("pricing");
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** The window under the pointer (a slot's start, or baseBandId for a rest-of-day stretch), shared by the day bar and the rates table. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const now = usePricingNow();

  const status = planStatus(book, plan, ALL_STATION_IDS, now);
  // Changes apply when saved, so a plan's latest version is in force.
  const current = versionAt(plan, now) ?? sortedVersions(plan)[0];
  const split = splitVersion(current);
  const stationCount = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/swap-station-pricing" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Back to Swap Station Pricing">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800 truncate">{plan.name}</h2>
              <PlanStatusBadge status={status} />
            </div>
            {plan.isDefault && <p className="text-xs text-slate-400 truncate">{DEFAULT_NOTE}</p>}
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Edit rates
            </Button>
            <Button variant="primary" onClick={() => setAssigning(true)}>
              <Plus className="w-4 h-4" /> Assign stations
            </Button>
            {!plan.isDefault && (
              <PlanActionsMenu
                aria-label={`More actions for ${plan.name}`}
                actions={[{ label: "Delete plan", danger: true, onSelect: () => setDeleting(true) }]}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} className="max-w-xl" />

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Rates in force</h3>
                <span className="text-[11px] text-slate-400">Updated {fmtEat(current.effectiveFrom)}</span>
              </div>
              <DayBandBar items={versionBands(split)} now={now} highlighted={highlight} onHighlight={setHighlight} />
              <WindowRates split={split} now={now} highlighted={highlight} onHighlight={setHighlight} />
              <p className="text-[11px] text-slate-400">KES per kWh. Slab 1 is a rider&apos;s first 3 kWh each day; slab 2 is everything after.</p>
              <p className="text-xs text-slate-500">
                {plan.isDefault
                  ? `Prices every station without another plan: ${stationCount} today.`
                  : `${stationCount} station${stationCount === 1 ? "" : "s"} on this plan today.`}
              </p>
            </section>

            <section className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">How a swap is billed</h3>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                  <li>The plan and its rates are locked when the rider taps their RFID card.</li>
                  <li>The time window is decided by when the swap completes.</li>
                  <li>Slab 1 applies to a rider&apos;s first 3 kWh that day, slab 2 to the rest. A change that starts mid-swap doesn&apos;t touch it.</li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {tab === "stations" && <StationsTab plan={plan} now={now} canWrite={canWrite} onAssign={() => setAssigning(true)} />}

        {tab === "versions" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Effective from</th>
                  <th className="px-4 py-2.5">Windows · slab 1 / slab 2</th>
                  <th className="px-4 py-2.5">Created by</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedVersions(plan).reverse().map((v) => {
                  const state = v.id === current.id ? "In force" : "Superseded";
                  const { baseWindows, custom } = splitVersion(v);
                  const isBase = new Set(baseWindows.map((w) => w.start));
                  return (
                    <tr key={v.id} className="align-top">
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtEat(v.effectiveFrom)}</td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-400 mb-1">{fmtCustomCount(custom.length)}</p>
                        <ul className="space-y-0.5 text-xs tabular-nums whitespace-nowrap">
                          {sortWindows(v.windows).map((w) => (
                            <li key={w.start}>
                              <span className="text-slate-500">{fmtRateWindow(w)}</span>
                              <span className="ml-3 text-slate-800">{fmtSlabs(w)}</span>
                              {isBase.has(w.start) && <span className="ml-2 text-[11px] text-slate-400">{BASE_LABEL}</span>}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{v.createdBy} · {fmtEat(v.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-medium",
                            state === "In force" && "bg-emerald-50 text-emerald-700",
                            state === "Superseded" && "bg-slate-100 text-slate-500"
                          )}
                        >
                          {state}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "history" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <ChangeHistory planId={plan.id} />
          </div>
        )}
      </div>

      {editing && <PlanFormModal plan={plan} onClose={() => setEditing(false)} />}
      {assigning && <AssignStationsModal plan={plan} onClose={() => setAssigning(false)} />}
      {deleting && (
        <DeletePlanModal plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.push("/swap-station-pricing")} />
      )}
    </>
  );
}

function StationsTab({
  plan,
  now,
  canWrite,
  onAssign,
}: {
  plan: PricingPlan;
  now: string;
  canWrite: boolean;
  onAssign: () => void;
}) {
  const book = usePricingBook();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  const onPlan = useMemo(
    () =>
      stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).map((id) => ({
        station: STATION_BY_ID.get(id)!,
        since: assignmentAt(book, id, now)?.effectiveFrom,
      })),
    [book, plan.id, now]
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = onPlan.length > 0 && onPlan.every((r) => selected.has(r.station.id));
  // Stations on Default can move to another plan; stations elsewhere can also go back to Default.
  const canRemove = canWrite;
  const [moving, setMoving] = useState(false);
  const clearSelection = () => setSelected(new Set());
  /** The station whose history is open. */
  const [historyId, setHistoryId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700">
            On this plan today <span className="text-slate-400 font-normal">· {onPlan.length}</span>
          </h3>
          {canRemove && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{selected.size} selected</span>
              <Button size="sm" variant="secondary" onClick={() => setMoving(true)}>
                <ArrowRightLeft className="w-3.5 h-3.5" /> Move to another plan…
              </Button>
              {!plan.isDefault && (
                <Button size="sm" variant="secondary" onClick={() => setRemoving(true)}>
                  <Undo2 className="w-3.5 h-3.5" /> Move to Default
                </Button>
              )}
            </div>
          )}
        </div>
        {onPlan.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No station is on this plan today.
            {canWrite && (
              <button onClick={onAssign} className="block mx-auto mt-2 text-zeno-teal font-medium hover:underline">
                Assign stations
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {canRemove && (
                    <th className="px-4 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(onPlan.map((r) => r.station.id)))}
                        aria-label="Select all stations"
                      />
                    </th>
                  )}
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Short address</th>
                  <th className="px-4 py-2">Long address</th>
                  <th className="px-4 py-2">Region</th>
                  <th className="px-4 py-2">On plan since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {onPlan.map(({ station, since }) => (
                  <tr
                    key={station.id}
                    onClick={() => setHistoryId(station.id)}
                    title="Open this station's history"
                    className={cn("cursor-pointer hover:bg-slate-50", selected.has(station.id) && "bg-teal-50/60 hover:bg-teal-50")}
                  >
                    {canRemove && (
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(station.id)} onChange={() => toggle(station.id)} aria-label={`Select ${station.id}`} />
                      </td>
                    )}
                    <td className="px-4 py-2 font-mono text-slate-700">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryId(station.id);
                        }}
                        className="rounded hover:text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/30"
                        aria-label={`${station.id}: open history`}
                      >
                        {station.id}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{station.shortAddress}</td>
                    <td className="px-4 py-2 text-slate-500">{station.longAddress}</td>
                    <td className="px-4 py-2 text-slate-500">{station.regionLabel}</td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {since && !plan.isDefault ? fmtEat(since) : <span className="text-slate-300">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {removing && (
        <MoveToDefaultModal
          ids={Array.from(selected)}
          planName={plan.name}
          emptiesPlan={allSelected}
          onClose={() => setRemoving(false)}
          onDone={() => {
            setRemoving(false);
            clearSelection();
          }}
        />
      )}
      <StationHistoryDrawer stationId={historyId} onClose={() => setHistoryId(null)} />
      {moving && (
        <MoveStationsModal
          ids={Array.from(selected)}
          from={plan}
          now={now}
          onClose={() => setMoving(false)}
          onDone={() => {
            setMoving(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}

function MoveToDefaultModal({
  ids,
  planName,
  emptiesPlan,
  onClose,
  onDone,
}: {
  ids: string[];
  planName: string;
  /** Every station on the plan is moving. */
  emptiesPlan: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const assignStations = usePricingStore((s) => s.assignStations);
  const actor = useActorName();
  const count = `${ids.length} station${ids.length === 1 ? "" : "s"}`;

  function handleConfirm() {
    const res = assignStations(null, ids, actor);
    if (!res.ok) {
      toast.error("Can't move stations", res.error);
      return onClose();
    }
    toast.success(`${count} moved`, `They left ${planName} for Default from now.`);
    onDone();
  }

  return (
    <ConfirmModal
      open
      title={`Move ${count} to Default?`}
      confirmLabel="Confirm"
      tone="neutral"
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      Their new rates apply to swaps from now. Swaps in progress keep the plan they started on.
      <span className="block mt-2 text-xs text-slate-500">{ids.join(", ")}</span>
      {emptiesPlan && <Callout variant="warning" className="mt-3">{planName} will have no stations left.</Callout>}
    </ConfirmModal>
  );
}

/**
 * Move stations from this plan to another one. The target can't be this plan
 * or a deleted one; the confirmation names any plan left with no stations.
 */
function MoveStationsModal({
  ids,
  from,
  now,
  onClose,
  onDone,
}: {
  ids: string[];
  from: PricingPlan;
  now: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const assignStations = usePricingStore((s) => s.assignStations);
  const book = usePricingBook();
  const actor = useActorName();
  const targets = book.plans
    .filter((p) => !p.archived && p.id !== from.id)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
  const [targetId, setTargetId] = useState("");
  const target = targets.find((p) => p.id === targetId);
  const summary = target
    ? summarizeMoves(book, ids, target.isDefault ? null : target.id, ALL_STATION_IDS, now)
    : null;
  const count = `${ids.length} station${ids.length === 1 ? "" : "s"}`;

  function handleConfirm() {
    if (!target) return;
    const res = assignStations(target.isDefault ? null : target.id, ids, actor);
    if (!res.ok) {
      toast.error("Can't move stations", res.error);
      return onClose();
    }
    toast.success(`${count} moved`, `They left ${from.name} for ${target.name} from now.`);
    onDone();
  }

  return (
    <ConfirmModal
      open
      title={`Move ${count} to another plan`}
      confirmLabel={target ? `Move to ${target.name}` : "Move"}
      tone="neutral"
      confirmDisabled={!target}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <span className="block text-xs text-slate-500">{ids.join(", ")}</span>
      <label htmlFor="move-target" className="mt-3 block text-xs text-slate-500">Move to</label>
      <select
        id="move-target"
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
      >
        <option value="">Choose a plan…</option>
        {targets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {summary && (
        <div className="mt-3">
          Their new rates apply to swaps from now. Swaps in progress keep the plan they started on.
          {summary.emptied.length > 0 && (
            <Callout variant="warning" className="mt-3">{summary.emptied.map((p) => p.name).join(", ")} will have no stations left.</Callout>
          )}
        </div>
      )}
    </ConfirmModal>
  );
}
