"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toast";
import { useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_LEAD_HOURS, usePricingStore } from "@/store/pricing-plans";
import { ALL_STATION_IDS, PRICING_STATIONS } from "@/lib/mock/pricing-plans";
import {
  assignmentAt,
  nextVersionAfter,
  planStatus,
  resolvePlan,
  sortedVersions,
  stationsOnPlan,
  upcomingAssignments,
  versionAt,
} from "@/lib/pricing/engine";
import { eatLocalToIso, fmtEat, fmtRate, fmtWindow } from "@/lib/pricing/format";
import type { PricingPlan } from "@/lib/pricing/types";
import { DayBandBar } from "@/components/pricing-plans/DayBandBar";
import { NotificationPreview } from "@/components/pricing-plans/NotificationPreview";
import { ChangeHistory } from "@/components/pricing-plans/ChangeHistory";
import { PlanFormModal } from "@/components/pricing-plans/PlanFormModal";
import { AssignStationsModal } from "@/components/pricing-plans/AssignStationsModal";
import {
  PlanStatusBadge,
  inputCls,
  labelCls,
  nextEffectiveLocal,
  useActorName,
  usePricingBook,
} from "@/components/pricing-plans/shared";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "stations", label: "Stations" },
  { key: "versions", label: "Rate versions" },
  { key: "history", label: "History" },
];

const STATION_BY_ID = new Map(PRICING_STATIONS.map((s) => [s.id, s]));

export default function PricingPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const plan = usePricingStore((s) => s.plans.find((p) => p.id === id));

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {plan ? (
          <PlanDetail plan={plan} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <EmptyState title="Plan not found" description="It may have been deleted." />
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
  const deletePlan = usePricingStore((s) => s.deletePlan);
  const canWrite = useAccess().canWrite("pricing");
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now] = useState(() => new Date().toISOString());

  const status = planStatus(book, plan, ALL_STATION_IDS, now);
  const current = versionAt(plan, now);
  const upcoming = nextVersionAfter(plan, now);
  const shown = current ?? sortedVersions(plan)[0];
  const stationCount = stationsOnPlan(book, plan.id, ALL_STATION_IDS, now).length;
  const deletable = !plan.isDefault && !book.assignments.some((a) => a.planId === plan.id);

  function handleDelete() {
    const res = deletePlan(plan.id);
    setConfirmDelete(false);
    if (!res.ok) return toast.error("Can't delete plan", res.error);
    toast.info("Plan deleted", `${plan.name} was removed.`);
    router.push("/swap-station-pricing");
  }

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
            <p className="text-xs text-slate-400 truncate">{plan.description}</p>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {deletable && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Edit rates
            </Button>
            <Button variant="primary" onClick={() => setAssigning(true)}>
              <Plus className="w-4 h-4" /> Assign stations
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} className="max-w-xl" />

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{current ? "Rates in force" : "Starting rates"}</h3>
                <span className="text-[11px] text-slate-400">since {fmtEat(shown.effectiveFrom)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Standard rate" value={fmtRate(shown.standardRate)} />
                <Stat label="Custom window" value={fmtWindow(shown.customWindowStart, shown.customWindowEnd)} />
                <Stat label="Custom rate" value={fmtRate(shown.customRate)} accent />
              </div>
              <DayBandBar
                standardRate={shown.standardRate}
                customRate={shown.customRate}
                start={shown.customWindowStart}
                end={shown.customWindowEnd}
              />
              <p className="text-xs text-slate-500">
                {plan.isDefault
                  ? `Prices every station without another plan: ${stationCount} today.`
                  : `${stationCount} station${stationCount === 1 ? "" : "s"} on this plan today.`}
              </p>
            </section>

            <section className="space-y-4">
              {upcoming && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <CalendarClock className="w-4 h-4" /> Scheduled for {fmtEat(upcoming.effectiveFrom)}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Standard rate" value={fmtRate(upcoming.standardRate)} />
                    <Stat label="Custom window" value={fmtWindow(upcoming.customWindowStart, upcoming.customWindowEnd)} />
                    <Stat label="Custom rate" value={fmtRate(upcoming.customRate)} accent />
                  </div>
                  <NotificationPreview text={upcoming.notificationText} leadHours={upcoming.notifyLeadHours} effectiveFrom={upcoming.effectiveFrom} />
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">How a swap is billed</h3>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                  <li>The plan and its rates are locked when the rider taps their RFID card.</li>
                  <li>Standard or Custom window is decided by when the swap completes.</li>
                  <li>Amount = billed kWh × that rate. A change that starts mid-swap doesn&apos;t touch it.</li>
                </ul>
                {!upcoming && (
                  <NotificationPreview text={shown.notificationText} leadHours={shown.notifyLeadHours} effectiveFrom={shown.effectiveFrom} />
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "stations" && <StationsTab plan={plan} now={now} canWrite={canWrite} onAssign={() => setAssigning(true)} />}

        {tab === "versions" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Effective from</th>
                  <th className="px-4 py-2.5 text-right">Standard</th>
                  <th className="px-4 py-2.5">Custom window</th>
                  <th className="px-4 py-2.5 text-right">Custom</th>
                  <th className="px-4 py-2.5">Notice</th>
                  <th className="px-4 py-2.5">Created by</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedVersions(plan).reverse().map((v) => {
                  const state = v.id === current?.id ? "In force" : new Date(v.effectiveFrom) > new Date(now) ? "Scheduled" : "Superseded";
                  return (
                    <tr key={v.id}>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtEat(v.effectiveFrom)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{fmtRate(v.standardRate)}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{fmtWindow(v.customWindowStart, v.customWindowEnd)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-teal-700 whitespace-nowrap">{fmtRate(v.customRate)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{v.notifyLeadHours} h</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{v.createdBy} · {fmtEat(v.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-medium",
                            state === "In force" && "bg-emerald-50 text-emerald-700",
                            state === "Scheduled" && "bg-amber-50 text-amber-700",
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
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${plan.name}?`}
        confirmLabel="Delete plan"
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        No station has ever been on this plan, so no swap was priced with it. This can&apos;t be undone.
      </ConfirmModal>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums mt-0.5", accent ? "text-teal-700" : "text-slate-800")}>{value}</p>
    </div>
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
  const cancelAssignment = usePricingStore((s) => s.cancelAssignment);
  const actor = useActorName();
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

  // Moves still to come: stations joining this plan, and stations leaving it.
  const joining = upcomingAssignments(book, plan.id, now);
  const leaving = book.assignments
    .filter((a) => new Date(a.effectiveFrom) > new Date(now) && a.planId !== plan.id)
    .filter((a) => resolvePlan(book, a.stationId, new Date(new Date(a.effectiveFrom).getTime() - 1000).toISOString()).plan.id === plan.id);
  const scheduled = [
    ...joining.map((a) => ({ a, direction: "joins" as const })),
    ...leaving.map((a) => ({ a, direction: "leaves" as const })),
  ].sort((x, y) => x.a.effectiveFrom.localeCompare(y.a.effectiveFrom));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = onPlan.length > 0 && onPlan.every((r) => selected.has(r.station.id));
  const canRemove = canWrite && !plan.isDefault;

  return (
    <div className="space-y-4">
      {scheduled.length > 0 && (
        <section className="bg-white border border-amber-200 rounded-xl overflow-hidden">
          <h3 className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-800 bg-amber-50/60 border-b border-amber-200">
            <CalendarClock className="w-3.5 h-3.5" /> Scheduled station moves
          </h3>
          <ul className="divide-y divide-slate-100">
            {scheduled.map(({ a, direction }) => {
              const s = STATION_BY_ID.get(a.stationId);
              const target = a.planId ? book.plans.find((p) => p.id === a.planId)?.name : "Default";
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
                  <span className="font-mono text-slate-700">{a.stationId}</span>
                  <span className="text-slate-500">{s?.shortAddress}</span>
                  <span className={direction === "joins" ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                    {direction === "joins" ? "joins this plan" : `moves to ${target}`}
                  </span>
                  <span className="text-slate-400">on {fmtEat(a.effectiveFrom)} · by {a.assignedBy}</span>
                  {canWrite && (
                    <button
                      onClick={() => {
                        const res = cancelAssignment(a.id, actor);
                        if (res.ok) toast.info("Move cancelled", `${a.stationId} stays where it is.`);
                        else toast.error("Can't cancel", res.error);
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-slate-400 hover:text-zeno-red"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700">
            On this plan today <span className="text-slate-400 font-normal">· {onPlan.length}</span>
          </h3>
          {canRemove && selected.size > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setRemoving(true)}>
              <Undo2 className="w-3.5 h-3.5" /> Move {selected.size} to Default
            </Button>
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
                  <tr key={station.id} className={cn(selected.has(station.id) && "bg-teal-50/60")}>
                    {canRemove && (
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selected.has(station.id)} onChange={() => toggle(station.id)} aria-label={`Select ${station.id}`} />
                      </td>
                    )}
                    <td className="px-4 py-2 font-mono text-slate-700">{station.id}</td>
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
          onClose={() => setRemoving(false)}
          onDone={() => {
            setRemoving(false);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}

function MoveToDefaultModal({
  ids,
  planName,
  onClose,
  onDone,
}: {
  ids: string[];
  planName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const assignStations = usePricingStore((s) => s.assignStations);
  const actor = useActorName();
  const [effectiveLocal, setEffectiveLocal] = useState(() => nextEffectiveLocal(ASSIGNMENT_LEAD_HOURS));
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const iso = eatLocalToIso(effectiveLocal);
    const res = assignStations(null, ids, iso, actor);
    if (!res.ok) return setError(res.error);
    toast.success(
      `${ids.length} station${ids.length === 1 ? "" : "s"} scheduled`,
      `They leave ${planName} for Default on ${fmtEat(iso)}.`
    );
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`Move ${ids.length} station${ids.length === 1 ? "" : "s"} to Default`}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">{ids.join(", ")}</p>
        <div>
          <label className={labelCls}>Effective from (EAT)</label>
          <input className={inputCls} type="datetime-local" value={effectiveLocal} onChange={(e) => setEffectiveLocal(e.target.value)} />
          <p className="text-[11px] text-slate-400 mt-1">At least {ASSIGNMENT_LEAD_HOURS} h from now, so riders get notice.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="teal" onClick={handleConfirm}>Schedule move</Button>
        </div>
      </div>
    </Modal>
  );
}
