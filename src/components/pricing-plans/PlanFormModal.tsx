"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast";
import { DEFAULT_LEAD_HOURS, usePricingStore, type VersionInput } from "@/store/pricing-plans";
import { sortedVersions } from "@/lib/pricing/engine";
import { eatLocalToIso, fmtEat } from "@/lib/pricing/format";
import type { PricingPlan } from "@/lib/pricing/types";
import { DayBandBar } from "./DayBandBar";
import { NotificationPreview } from "./NotificationPreview";
import { inputCls, labelCls, nextEffectiveLocal, useActorName } from "./shared";

function defaultMessage(f: { effectiveLocal: string; standardRate: string; customRate: string; start: string; end: string }) {
  const when = f.effectiveLocal
    ? new Date(eatLocalToIso(f.effectiveLocal)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" })
    : "the effective date";
  return `From ${when}, swaps at this station cost KES ${f.standardRate || "–"}/kWh, and KES ${f.customRate || "–"}/kWh between ${f.start} and ${f.end}.`;
}

/**
 * New plan, or new rates for an existing one. Rates are never edited in place:
 * saving on an existing plan schedules a new version, so swaps already priced
 * (or in progress) keep the rates they started on.
 */
export function PlanFormModal({ plan, onClose }: { plan: PricingPlan | null; onClose: () => void }) {
  const createPlan = usePricingStore((s) => s.createPlan);
  const addVersion = usePricingStore((s) => s.addVersion);
  const renamePlan = usePricingStore((s) => s.renamePlan);
  const actor = useActorName();

  const latest = plan ? sortedVersions(plan).at(-1) : undefined;

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [standardRate, setStandardRate] = useState(String(latest?.standardRate ?? 90));
  const [customRate, setCustomRate] = useState(String(latest?.customRate ?? 70));
  const [start, setStart] = useState(latest?.customWindowStart ?? "22:00");
  const [end, setEnd] = useState(latest?.customWindowEnd ?? "06:00");
  const [leadHours, setLeadHours] = useState(String(latest?.notifyLeadHours ?? DEFAULT_LEAD_HOURS));
  const [effectiveLocal, setEffectiveLocal] = useState(() => nextEffectiveLocal(latest?.notifyLeadHours ?? DEFAULT_LEAD_HOURS));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = { effectiveLocal, standardRate, customRate, start, end };
  const text = message ?? defaultMessage(fields);
  const effectiveIso = effectiveLocal ? eatLocalToIso(effectiveLocal) : "";
  const ratesChanged =
    !latest ||
    Number(standardRate) !== latest.standardRate ||
    Number(customRate) !== latest.customRate ||
    start !== latest.customWindowStart ||
    end !== latest.customWindowEnd ||
    message !== null;

  function handleSave() {
    const version: VersionInput = {
      effectiveFrom: effectiveIso,
      standardRate: Number(standardRate),
      customRate: Number(customRate),
      customWindowStart: start,
      customWindowEnd: end,
      notifyLeadHours: Number(leadHours),
      notificationText: text,
    };

    if (!plan) {
      const res = createPlan({ name, description, version }, actor);
      if (!res.ok) return setError(res.error);
      toast.success("Plan created", `${name.trim()} takes effect ${fmtEat(effectiveIso)}. Assign stations to put it to use.`);
      return onClose();
    }

    const renamed = renamePlan(plan.id, name, description, actor);
    if (!renamed.ok) return setError(renamed.error);
    if (ratesChanged) {
      const res = addVersion(plan.id, version, actor);
      if (!res.ok) return setError(res.error);
      toast.success("New rates scheduled", `${name.trim()} changes on ${fmtEat(effectiveIso)}. Swaps before then keep today's rates.`);
    } else {
      toast.success("Plan updated", `${name.trim()} was saved.`);
    }
    onClose();
  }

  const nStd = Number(standardRate) || 0;
  const nCus = Number(customRate) || 0;

  return (
    <Modal open onClose={onClose} title={plan ? `Edit ${plan.name}` : "New pricing plan"} className="max-w-2xl">
      <div className="space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plan name</label>
            <input
              className={inputCls}
              value={name}
              disabled={plan?.isDefault}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi CBD"
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who it's for"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-700">Rates (KES per kWh, EAT)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Standard rate</label>
              <input className={inputCls} type="number" min={1} step="0.5" value={standardRate} onChange={(e) => setStandardRate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Custom window from</label>
              <input className={inputCls} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Custom window to</label>
              <input className={inputCls} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Custom rate</label>
              <input className={inputCls} type="number" min={1} step="0.5" value={customRate} onChange={(e) => setCustomRate(e.target.value)} />
            </div>
          </div>
          <DayBandBar standardRate={nStd} customRate={nCus} start={start} end={end} />
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-700">When it applies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Effective from (EAT)</label>
              <input
                className={inputCls}
                type="datetime-local"
                value={effectiveLocal}
                onChange={(e) => setEffectiveLocal(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Notify riders this many hours before</label>
              <input className={inputCls} type="number" min={1} value={leadHours} onChange={(e) => setLeadHours(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Swaps already in progress keep the rates in force when the rider tapped their RFID card.
          </p>
        </section>

        <section className="space-y-2">
          <label className={labelCls}>Rider message</label>
          <textarea
            className={`${inputCls} min-h-[64px]`}
            value={text}
            onChange={(e) => setMessage(e.target.value)}
          />
          <NotificationPreview text={text} leadHours={Number(leadHours) || 0} effectiveFrom={effectiveIso} />
        </section>

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="teal" onClick={handleSave}>
            {!plan ? "Create plan" : ratesChanged ? "Schedule new rates" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
