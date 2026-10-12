"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  detectionText, fmtClock, fmtClockSec, slotLabel, stepLabel,
  type Step, type SwapTxn,
} from "@/lib/mock/swap-audit";
import { stepToken, SUBLAB, SECTION } from "./tokens";
import { SlotStrip } from "./SlotStrip";

const REPLAY_MS = 1100;


export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={SUBLAB}>{label}</p>
      <p className="text-xs text-slate-700 mt-0.5 break-all">{value ?? "–"}</p>
    </div>
  );
}

/**
 * Everything behind one row, read top to bottom: the slots before and after,
 * the raw log, then the IDs for reference. The drawer header carries who,
 * where and when.
 */
export function SessionDetail({ txn }: { txn: SwapTxn }) {
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
  // Step 0 shows only the Before row, so it needs no label here.
  const liveLabel = atEnd ? (hasPoll ? "After poll" : "After") : `After step ${k}`;

  const jump = (to: number) => { setPlaying(false); setStep(to >= n ? null : to); };


  // space-y-8: section headings share the field-label style, so 32px above each
  // (vs 8px below, 16px between field rows) is what keeps them reading as headings.
  return (
    <div className="px-6 py-4 bg-slate-50 space-y-8">
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
              <StepBtn onClick={() => jump(0)} disabled={k === 0}>
                <ChevronsLeft className="w-3 h-3" /> Start
              </StepBtn>
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
              <StepBtn onClick={() => jump(n)} disabled={atEnd}>
                End <ChevronsRight className="w-3 h-3" />
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
                {["#", "Time (EAT)", "Event", "Slot", "S/N read", "SoC", "Detection"].map((h) => (
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
                      {/* Single serials copy; a poll's "expected …" list is a phrase, not one value. */}
                      {s.type === "poll" ? (
                        `expected ${(s.expected ?? []).join(", ")}`
                      ) : s.bat?.sn ? (
                        <CopyButton value={s.bat.sn} label={`Battery serial ${s.bat.sn}`} />
                      ) : (
                        "–"
                      )}
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
          <div className="col-span-2">
            <DetailField
              label="Checked out before swap"
              value={<span className="font-mono">{txn.checkedOut.join(", ")}</span>}
            />
          </div>
          <DetailField label="Swap Txn ID" value={<CopyButton value={txn.id} label="Swap Txn ID" className="font-mono" />} />
          <DetailField
            label="Customer ID"
            value={<CopyButton value={txn.cust.id} label="Customer ID" className="font-mono" />}
          />
          <DetailField
            label="Phone"
            value={
              <CopyButton value={txn.cust.phone} label="Phone" className="font-mono" />
            }
          />
          <DetailField
            label="RFID"
            value={<CopyButton value={txn.cust.rfid} label="RFID" className="font-mono" />}
          />
          <DetailField
            label="Vehicle"
            value={<CopyButton value={txn.vehicle} label="Vehicle" className="font-mono" />}
          />
          <DetailField
            label="Station"
            value={
              <>
                <CopyButton value={txn.station.id} label="Station code" className="font-mono" />
                <span className="mx-2.5">·</span>
                {txn.station.name}
              </>
            }
          />
          <DetailField label="Started" value={<span className="font-mono">{fmtClock(txn.startMinute)}</span>} />
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
