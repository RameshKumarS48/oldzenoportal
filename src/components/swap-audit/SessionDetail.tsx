"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  detectionText, fmtClock, fmtClockSec, fmtRel, slotLabel, stepLabel,
  type Step, type SwapTxn,
} from "@/lib/mock/swap-audit";
import { stepToken, FLAG_BADGE, SUBLAB } from "./tokens";
import { SlotStrip } from "./SlotStrip";

const REPLAY_MS = 1100;

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={SUBLAB}>{label}</p>
      <p className="text-xs text-slate-700 mt-0.5 break-all">{value ?? "–"}</p>
    </div>
  );
}

/**
 * Everything behind one row: who swapped, what the station counted, the slots
 * before and after, where each battery went, and the raw log. Opened by
 * clicking the row, same as every other table in dome.
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

  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
      {/* Session-level fields */}
      <div className="grid grid-cols-4 gap-4">
        <DetailField label="Swap Txn ID" value={<span className="font-mono">{txn.id}</span>} />
        <DetailField label="Customer ID" value={<span className="font-mono">{txn.cust.id}</span>} />
        <DetailField label="RFID" value={<span className="font-mono">{txn.cust.rfid}</span>} />
        <DetailField label="Vehicle" value={<span className="font-mono">{txn.vehicle}</span>} />
        <DetailField label="Station" value={<>{txn.station.name} · <span className="font-mono">{txn.station.id}</span></>} />
        <DetailField label="Started" value={<span className="font-mono">{fmtClock(txn.startMinute)} IST</span>} />
        <DetailField label="Duration" value={<span className="font-mono">{txn.endT}s</span>} />
        <DetailField label="Scenario" value={txn.sc.name} />
        <div className="col-span-2">
          <DetailField
            label="Checked out before swap"
            value={<span className="font-mono">{txn.checkedOut.join(", ")}</span>}
          />
        </div>
        <div className="col-span-2">
          <DetailField label="What this is" value={txn.sc.description} />
        </div>
      </div>

      {/* Why the verdict came out that way */}
      <div>
        <p className={cn(SUBLAB, "mb-2")}>Why this verdict</p>
        <div className="flex flex-wrap gap-1.5">
          {v.flags.map((f, i) => (
            <span key={i} className={cn("px-2 py-0.5 rounded text-[11px] font-medium", FLAG_BADGE[f.k])}>
              {f.t}
            </span>
          ))}
        </div>
      </div>

      {/* Slots, with a step-through so the moment of the fake is visible */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <StepBtn onClick={() => jump(Math.max(0, k - 1))} disabled={k === 0}>
            <ChevronLeft className="w-3 h-3" /> Step
          </StepBtn>
          <button
            type="button"
            onClick={() => { if (playing) { setPlaying(false); return; } setStep(0); setPlaying(true); }}
            disabled={n === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#003B49] text-white hover:bg-[#00505f] transition-colors disabled:opacity-40"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? "Pause" : "Replay"}
          </button>
          <StepBtn onClick={() => jump(k + 1)} disabled={k >= n}>
            Step <ChevronRight className="w-3 h-3" />
          </StepBtn>
          <span className="text-[11px] text-slate-400 tabular-nums">{k} of {n} steps applied</span>
        </div>

        <SlotStrip
          before={txn.before}
          state={state}
          marks={marks}
          liveLabel={liveLabel}
          now={!atEnd && current ? nowText(current) : undefined}
          nowClass={!atEnd && current ? stepToken(current).text : undefined}
        />
      </div>

      {/* Battery movement */}
      <div className="grid grid-cols-3 gap-4">
        <MovementList label={`Confirmed collected (${confirmed.length})`} items={confirmed} />
        <MovementList label={`Recorded, but no battery (${unconfirmed.length})`} items={unconfirmed} bad />
        <MovementList label={`Dispensed to ${txn.cust.name.split(" ")[0]} (${dispensed.length})`} items={dispensed} />
      </div>

      {/* Event log */}
      <div>
        <p className={cn(SUBLAB, "mb-2")}>Event log</p>
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
      </div>
    </div>
  );
}

function StepBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
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

function MovementList({ label, items, bad }: { label: string; items: { sn: string; note: string }[]; bad?: boolean }) {
  return (
    <div>
      <p className={cn(SUBLAB, bad && items.length > 0 && "text-red-500")}>{label}</p>
      <div className="mt-1.5 space-y-1">
        {items.length === 0 ? (
          <p className="text-[11px] text-slate-400">None</p>
        ) : (
          items.map((it, i) => (
            <div key={`${it.sn}-${i}`} className="flex items-baseline justify-between gap-2 rounded bg-white border border-slate-200 px-2 py-1">
              <span className="font-mono text-[11px] font-semibold text-slate-700">{it.sn}</span>
              <span className="text-[10px] text-slate-400 text-right">{it.note}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function nowText(step: Step): string {
  const where = step.type === "poll" ? (step.slots ?? []).map(slotLabel).join(", ") : slotLabel(step.slot!);
  const sn = step.type === "poll" ? (step.expected ?? []).join(", ") : step.bat?.sn ?? "—";
  return `${fmtRel(step.t)} · ${stepLabel(step)} · ${where} · ${sn}`;
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
