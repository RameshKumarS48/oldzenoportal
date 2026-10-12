"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  detectionText, fmtClock, fmtClockSec, slotLabel, stepLabel,
  type Step, type SwapTxn,
} from "@/lib/mock/swap-audit";
import { stepToken, SUBLAB, SECTION } from "./tokens";
import { SlotStrip } from "./SlotStrip";

const REPLAY_MS = 1100;

/** StatCard's number style (ui/stat-card.tsx), for the card's three headline values. */
const FIGURE = "text-[20px] leading-none font-bold tabular-nums mt-1.5";

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={SUBLAB}>{label}</p>
      <p className="text-xs text-slate-700 mt-0.5 break-all">{value ?? "–"}</p>
    </div>
  );
}

/**
 * Everything behind one row, read top to bottom: what happened and why, the
 * slots before and after, the raw log, then the IDs for reference. The drawer
 * header carries who, where and when.
 */
export function SessionDetail({ txn }: { txn: SwapTxn }) {
  const v = txn.verdict;
  const n = txn.steps.length;

  /** null = every step applied (the end state); otherwise steps applied so far. */
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const atEnd = step === null;
  const k = step ?? n;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      const next = k + 1;
      if (next >= n) { setStep(null); setPlaying(false); } else { setStep(next); }
    }, REPLAY_MS);
    return () => clearTimeout(id);
  }, [playing, k, n]);

  const current: Step | undefined = k > 0 ? txn.steps[k - 1] : undefined;
  const state = k === 0 ? txn.before : txn.steps[k - 1].state;

  // At the end every slot the session touched keeps the colour of the last step
  // that touched it; mid-replay only the step being shown is marked.
  const marks = new Map<number, Step>();
  if (atEnd) {
    for (const s of txn.steps) for (const slot of s.type === "poll" ? s.slots ?? [] : [s.slot!]) marks.set(slot, s);
  } else if (current) {
    for (const slot of current.type === "poll" ? current.slots ?? [] : [current.slot!]) marks.set(slot, current);
  }

  const hasPoll = txn.steps.some((s) => s.type === "poll");
  const liveLabel = atEnd ? (hasPoll ? "After poll" : "After") : k === 0 ? "At start" : `After step ${k}`;

  const jump = (to: number) => { setPlaying(false); setStep(to >= n ? null : to); };


  // Battery movement
  const pollSlots = txn.steps.find((s) => s.type === "poll")?.slots ?? [];
  const collects = txn.steps.filter((s) => s.type === "collect");
  const confirmed = collects
    .filter((s) => s.bat && !pollSlots.includes(s.slot!))
    .map((s) => ({ sn: s.bat!.sn!, note: `${slotLabel(s.slot!)} · ${detectionText(s).text}` }));
  const unconfirmed = collects
    .filter((s) => !s.bat || pollSlots.includes(s.slot!))
    .map((s) => ({
      sn: s.bat?.sn ?? "S/N not read",
      note: `${slotLabel(s.slot!)} · ${s.bat ? "found empty by poll" : "empty at door close"}`,
    }));
  const dispensed = txn.steps
    .filter((s) => s.type === "dispense")
    .map((s) => ({ sn: s.bat?.sn ?? "–", note: `from ${slotLabel(s.slot!)} · ${s.bat?.soc ?? 0}%` }));

  // space-y-8: section headings share the field-label style, so 32px above each
  // (vs 8px below, 16px between field rows) is what keeps them reading as headings.
  return (
    <div className="px-6 py-4 bg-slate-50 space-y-8">
      <section>
        <h3 className={SECTION}>What happened</h3>
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold text-slate-700">{txn.sc.name}</p>
            <p className="mt-0.5 text-sm text-slate-700">{txn.sc.description}</p>
          </div>

          <Card>
            {/* The table row's Collects / Dispensed / Balance, same values and colours.
                border-l, not divide-x: globals.css only re-colours border-slate-200 in dark mode. */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="px-5 py-2.5">
                <p className={SUBLAB}>Collects</p>
                <p className={FIGURE} style={{ fontFamily: "var(--font-display)" }}>
                  <span className={v.Pc < v.Rc ? "text-red-600" : "text-slate-700"}>{v.Pc}</span>
                  <span className="text-slate-400"> / {v.Rc}</span>
                </p>
              </div>
              <div className="px-5 py-2.5 border-l border-slate-200">
                <p className={SUBLAB}>Dispensed</p>
                <p className={cn(FIGURE, "text-slate-700")} style={{ fontFamily: "var(--font-display)" }}>{v.Dn}</p>
              </div>
              <div className="px-5 py-2.5 border-l border-slate-200">
                <p className={SUBLAB}>Balance</p>
                <p
                  className={cn(FIGURE, v.bal !== 0 ? "text-red-600" : "text-slate-400")}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {v.bal > 0 ? `+${v.bal}` : v.bal}
                </p>
              </div>
            </div>

            {/* Fixed thirds with the strip's px-5, so label / serial / note sit under
                Collects / Dispensed / Balance and never resize between sessions. */}
            <div className="pb-2">
              <table className="w-full table-fixed text-[11px]">
                <colgroup>
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                </colgroup>
                <MovementGroup label="Checked out before swap" items={[{ sn: txn.checkedOut.join(", "), note: "" }]} first spanNote />
                <MovementGroup label={`Confirmed collected (${confirmed.length})`} items={confirmed} />
                <MovementGroup label={`Recorded, but no battery (${unconfirmed.length})`} items={unconfirmed} bad />
                <MovementGroup label={`Dispensed to ${txn.cust.name.split(" ")[0]} (${dispensed.length})`} items={dispensed} />
              </table>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <h3 className={SECTION}>Station before → after</h3>
        {/* Opens on the end of the session; the step controls sit centred underneath. */}
        <SlotStrip
          before={txn.before}
          state={state}
          steps={txn.steps}
          applied={k}
          marks={marks}
          liveLabel={liveLabel}
          event={atEnd ? txn.steps[n - 1] : current}
          startMinute={txn.startMinute}
          footer={
            <div className="flex items-center gap-2 flex-wrap">
              <StepBtn onClick={() => jump(Math.max(0, k - 1))} disabled={k === 0}>
                <ChevronLeft className="w-3 h-3" /> Step
              </StepBtn>
              <button
                type="button"
                onClick={() => { if (playing) { setPlaying(false); return; } setStep(0); setPlaying(true); }}
                disabled={n === 0}
                className="inline-flex min-w-[90px] items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors disabled:opacity-40"
              >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {playing ? "Pause" : "Replay"}
              </button>
              <StepBtn onClick={() => jump(k + 1)} disabled={k >= n}>
                Step <ChevronRight className="w-3 h-3" />
              </StepBtn>
              <span className="min-w-[90px] text-[11px] text-slate-400 tabular-nums">Step {k} of {n}</span>
            </div>
          }
        />
      </section>

      <section>
        <h3 className={SECTION}>Event log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[760px]">
            <thead>
              <tr className="text-left text-slate-400">
                {["#", "Time", "Event", "Slot", "S/N read", "SoC", "Detection"].map((h) => (
                  <th key={h} className="pb-1.5 pr-4 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {txn.steps.map((s, i) => {
                const d = detection(s);
                return (
                  <tr key={i}>
                    <td className="py-1.5 pr-4 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="py-1.5 pr-4 font-mono text-slate-600 whitespace-nowrap">{fmtClockSec(txn.startMinute, s.t)}</td>
                    <td className="py-1.5 pr-4">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider whitespace-nowrap", stepToken(s).badge)}>
                        {stepLabel(s)}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-slate-600 whitespace-nowrap">
                      {s.type === "poll" ? (s.slots ?? []).map(slotLabel).join(", ") : slotLabel(s.slot!)}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-slate-700">
                      {s.type === "poll" ? `expected ${(s.expected ?? []).join(", ")}` : s.bat?.sn ?? "–"}
                    </td>
                    <td className="py-1.5 pr-4 text-slate-600 tabular-nums">
                      {s.type !== "poll" && s.bat?.soc != null ? `${s.bat.soc}%` : "–"}
                    </td>
                    <td className={cn("py-1.5 pr-4", d.bad ? "font-semibold text-red-600" : "text-slate-600")}>{d.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className={SECTION}>Reference</h3>
        <div className="grid grid-cols-4 gap-4">
          <DetailField label="Swap Txn ID" value={<span className="font-mono">{txn.id}</span>} />
          <DetailField label="Customer ID" value={<span className="font-mono">{txn.cust.id}</span>} />
          <DetailField label="Phone" value={<span className="font-mono">{txn.cust.phone}</span>} />
          <DetailField label="RFID" value={<span className="font-mono">{txn.cust.rfid}</span>} />
          <DetailField label="Vehicle" value={<span className="font-mono">{txn.vehicle}</span>} />
          <DetailField label="Station" value={<><span className="font-mono">{txn.station.id}</span> · {txn.station.name}</>} />
          <DetailField label="Started" value={<span className="font-mono">{fmtClock(txn.startMinute)} IST</span>} />
          <DetailField label="Duration" value={<span className="font-mono">{txn.endT}s</span>} />
        </div>
      </section>
    </div>
  );
}

export function StepBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/**
 * One group as table rows: its label on the first line only, then serial and
 * note per battery ("None" when empty). Groups are split by a thin rule.
 */
function MovementGroup({
  label, items, bad, first, spanNote,
}: {
  label: string;
  items: { sn: string; note: string }[];
  bad?: boolean;
  first?: boolean;
  /** The serial takes the note column too (Checked out before swap has no note). */
  spanNote?: boolean;
}) {
  const labelCell = (show: boolean) => (
    <td className={cn(SUBLAB, "px-5 py-2 align-top", bad && items.length > 0 && "text-red-500")}>
      {show ? label : null}
    </td>
  );
  return (
    <tbody className={cn(!first && "border-t border-slate-100")}>
      {items.length === 0 ? (
        <tr>
          {labelCell(true)}
          <td colSpan={2} className="px-5 py-2 text-slate-400">None</td>
        </tr>
      ) : (
        items.map((it, i) => (
          <tr key={`${it.sn}-${i}`}>
            {labelCell(i === 0)}
            <td colSpan={spanNote ? 2 : 1} className="px-5 py-2 align-top font-mono font-semibold text-slate-700 break-all">
              {it.sn}
            </td>
            {!spanNote && <td className="px-5 py-2 align-top text-[10px] text-slate-400">{it.note}</td>}
          </tr>
        ))
      )}
    </tbody>
  );
}

function detection(step: Step): { text: string; bad: boolean } {
  if (step.type === "collect") {
    const d = detectionText(step);
    return { text: d.text, bad: d.bad };
  }
  if (step.type === "poll") {
    return { text: `No battery in ${(step.slots ?? []).map(slotLabel).join(", ")}`, bad: true };
  }
  if (step.type === "timeout") {
    return { text: step.mode === "dispense" ? "Battery not taken" : "Nothing inserted", bad: false };
  }
  return { text: "Removed by customer", bad: false };
}
