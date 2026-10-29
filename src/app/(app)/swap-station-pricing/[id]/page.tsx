"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Pencil, Plus, Undo2, X } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "@/store/toast";
import { useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import { planStatus, sortedVersions, stationsOnPlan, versionAt } from "@/lib/pricing/engine";
import { summarizeMoves } from "@/lib/pricing/moves";
import { fmtEat } from "@/lib/pricing/format";
import { compareWindows, fmtSlabs } from "@/lib/pricing/windows";
import { countryOf } from "@/lib/pricing/country";
import type { PricingPlan } from "@/lib/pricing/types";
import { DayBandBar, versionBands } from "@/components/pricing-plans/DayBandBar";
import { WindowRates } from "@/components/pricing-plans/WindowRates";
import { ChangeHistory } from "@/components/pricing-plans/ChangeHistory";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { PlanActionsMenu } from "@/components/pricing-plans/PlanActionsMenu";
import { DeletePlanModal } from "@/components/pricing-plans/DeletePlanModal";
import { AssignStationsModal } from "@/components/pricing-plans/AssignStationsModal";
import { StationHistoryDrawer } from "@/components/pricing-plans/StationHistoryDrawer";
import { PlanCombobox } from "@/components/pricing-plans/PlanCombobox";
import { PlanStatusBadge, useActorName, usePricingBook, usePricingNow } from "@/components/pricing-plans/shared";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "stations", label: "Stations" },
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
  /** The window under the pointer (its start), shared by the day bar and the rates table. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const now = usePricingNow();

  const status = planStatus(book, plan, ALL_STATION_IDS, now);
  // Changes apply when saved, so a plan's latest version is in force.
  const current = versionAt(plan, now) ?? sortedVersions(plan)[0];
  const country = countryOf(plan);
  // Grey is the Default Rate: all of Default, or hours another plan links to it.
  const bands = versionBands(current.windows, plan.isDefault);
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
            <p className="text-xs text-slate-400 truncate">
              {country.name} · {country.currency}
              {plan.isDefault && <> · {DEFAULT_NOTE}</>}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Edit plan
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
              <DayBandBar items={bands} currency={country.currency} highlighted={highlight} onHighlight={setHighlight} />
              <WindowRates bands={bands} highlighted={highlight} onHighlight={setHighlight} />
              <p className="text-[11px] text-slate-400">{country.currency} per kWh. Slab 1 is a rider&apos;s first 3 kWh each day; slab 2 is everything after.</p>
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

        {tab === "history" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <ChangeHistory plan={plan} currentId={current.id} />
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
    () => stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).map((id) => STATION_BY_ID.get(id)!),
    [book, plan.id, now]
  );
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  // Moving stations away shrinks the list, so clamp the page.
  const pages = Math.max(1, Math.ceil(onPlan.length / perPage));
  const current = Math.min(page, pages);
  const shown = onPlan.slice((current - 1) * perPage, current * perPage);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Every station on the plan is moving, so it would be left empty.
  const allSelected = onPlan.length > 0 && onPlan.every((s) => selected.has(s.id));
  // The header checkbox acts on the rows on this page.
  const allShown = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const flipShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      shown.forEach((s) => (allShown ? next.delete(s.id) : next.add(s.id)));
      return next;
    });
  // Stations on Default can move to another plan; stations elsewhere can also go back to Default.
  const canRemove = canWrite;
  const [moving, setMoving] = useState(false);
  const clearSelection = () => setSelected(new Set());
  /** The station whose history is open. */
  const [historyId, setHistoryId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* A fixed height, so the rows don't jump when the selection actions appear. */}
        <div className="flex h-12 items-center justify-between gap-3 px-4 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700">
            On this plan today <span className="text-slate-400 font-normal">· {onPlan.length}</span>
          </h3>
          {canRemove && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{selected.size} selected</span>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="w-3.5 h-3.5" /> Clear selection
              </Button>
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
          <>
          {/* The count bar above doesn't scroll; the header row sticks while the rows do. */}
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_#e2e8f0]">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {canRemove && (
                    <th className="px-4 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allShown}
                        onChange={flipShown}
                        aria-label="Select all stations on this page"
                      />
                    </th>
                  )}
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Short address</th>
                  <th className="px-4 py-2">Long address</th>
                  <th className="px-4 py-2">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((station) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={onPlan.length} page={current} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
          </>
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
  // Stations stay in their country, so only plans in this plan's country are offered.
  const targets = book.plans
    .filter((p) => !p.archived && p.id !== from.id && countryOf(p).code === countryOf(from).code)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
  const [targetId, setTargetId] = useState("");
  const target = targets.find((p) => p.id === targetId);
  const summary = target
    ? summarizeMoves(book, ids, target.isDefault ? null : target.id, ALL_STATION_IDS, now)
    : null;
  const count = `${ids.length} station${ids.length === 1 ? "" : "s"}`;
  const ratesOf = (p: PricingPlan) => (versionAt(p, now) ?? sortedVersions(p)[0]).windows;
  const compare = target ? compareWindows(ratesOf(from), ratesOf(target)) : [];

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
      confirmLabel="Move stations"
      tone="neutral"
      confirmDisabled={!target}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <label htmlFor="move-target" className="block text-xs text-slate-500">Move to</label>
      <div className="mt-1">
        <PlanCombobox id="move-target" plans={targets} value={targetId} onChange={setTargetId} />
      </div>
      {target && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-2">Time (EAT)</th>
                <th className="px-3 py-2 text-right">Now</th>
                <th className="px-3 py-2 text-right">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compare.map((r) => {
                const changed = r.before?.slab1 !== r.after?.slab1 || r.before?.slab2 !== r.after?.slab2;
                return (
                  <tr key={r.start}>
                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{r.start}–{r.end}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500 whitespace-nowrap">{r.before ? fmtSlabs(r.before) : "–"}</td>
                    <td className={cn("px-3 py-1.5 text-right whitespace-nowrap", changed ? "font-semibold text-slate-800" : "text-slate-500")}>
                      {r.after ? fmtSlabs(r.after) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            {countryOf(from).currency} per kWh, slab 1 / slab 2. Now: {from.name}. After: {target.name}.
          </p>
        </div>
      )}
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
