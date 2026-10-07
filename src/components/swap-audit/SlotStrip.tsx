"use client";

import { cn } from "@/lib/utils";
import {
  slotLabel,
  type Battery, type SlotState, type Step,
} from "@/lib/mock/swap-audit";
import { SLOT_META, SLOT_LEGEND, stepToken, slotTag, SUBLAB } from "./tokens";

/** Diagonal hatch for a slot the station believes is full but which is not. */
const HATCH = (rgba: string) => `repeating-linear-gradient(45deg, ${rgba} 0 4px, transparent 4px 8px)`;

/**
 * The station's ten slots, before the session and at the chosen point in it.
 * Reading the two rows against each other is how a faked collect becomes
 * visible: the station's record fills a slot that is physically empty.
 */
export function SlotStrip({
  before, state, marks, liveLabel, now, nowClass,
}: {
  before: SlotState;
  state: SlotState;
  marks: Map<number, Step>;
  liveLabel: string;
  now?: string;
  nowClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
        <p className={SUBLAB}>Station · 10 slots · as the station records them</p>
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400">
          {SLOT_LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-sm", l.dot)} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px] space-y-2">
          <Row label="Before" state={before} before={before} marks={new Map()} isBefore />
          <Row label={liveLabel} now={now} nowClass={nowClass} state={state} before={before} marks={marks} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label, now, nowClass, state, before, marks, isBefore,
}: {
  label: string;
  now?: string;
  nowClass?: string;
  state: SlotState;
  before: SlotState;
  marks: Map<number, Step>;
  isBefore?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 flex-wrap">
        <span className={SUBLAB}>{label}</span>
        {now && <span className={cn("font-mono text-[10px]", nowClass)}>{now}</span>}
      </p>
      <div className="grid grid-cols-10 gap-1.5">
        {state.map((bat, i) => (
          <Slot key={i} slot={i + 1} bat={bat} hadBattery={Boolean(before[i])} mark={marks.get(i + 1)} isBefore={isBefore} />
        ))}
      </div>
    </div>
  );
}

function Slot({
  slot, bat, hadBattery, mark, isBefore,
}: {
  slot: number;
  bat: Battery | null;
  hadBattery: boolean;
  mark?: Step;
  isBefore?: boolean;
}) {
  const tone = mark ? stepToken(mark) : undefined;
  const outline = tone ? cn("border-2", tone.border) : "";

  if (!bat) {
    return (
      <div
        title={`Slot ${slot} · empty`}
        className={cn("min-h-[82px] rounded-lg p-1.5 flex flex-col border border-dashed border-slate-300", outline)}
        style={{ background: HATCH("rgba(100,116,139,0.10)") }}
      >
        <Head slot={slot} mark={mark} tone={tone?.text} />
        <p className="mt-auto text-center text-[10px] text-slate-400">
          {isBefore ? "Empty" : hadBattery ? "Dispensed" : "Empty"}
        </p>
      </div>
    );
  }

  if (bat.kind === "phantom") {
    const m = SLOT_META.phantom;
    return (
      <div
        title={`Station recorded a collect in slot ${slot}, but the slot is empty`}
        className={cn("min-h-[82px] rounded-lg p-1.5 flex flex-col gap-1", m.card, outline)}
        style={{ background: HATCH("rgba(220,38,38,0.12)") }}
      >
        <Head slot={slot} mark={mark} tone={tone?.text} />
        <span className={cn("self-start rounded px-1 py-0.5 text-[9px] font-bold", m.badge)}>{m.label}</span>
        <p className="font-mono text-[10px] text-slate-400 line-through">{bat.sn ?? "S/N not read"}</p>
        <p className="mt-auto text-[9px] font-semibold text-red-600">
          {bat.why === "poll" ? "Found empty by poll" : "Door closed empty"}
        </p>
      </div>
    );
  }

  const m = SLOT_META[bat.kind as "charged" | "depleted" | "foreign"];
  const suspect = bat.origin ? (bat.origin.type === "dispensed" ? "STATION BATTERY" : "READ TWICE") : null;

  return (
    <div
      title={`Slot ${slot} · S/N ${bat.sn} · SoC ${bat.soc}%`}
      className={cn("min-h-[82px] rounded-lg p-1.5 flex flex-col gap-1", m.card, suspect && "ring-2 ring-inset ring-red-500", outline)}
    >
      <Head slot={slot} mark={mark} tone={tone?.text} />
      <span className={cn("self-start rounded px-1 py-0.5 text-[9px] font-bold whitespace-nowrap", m.badge)}>{m.label}</span>
      <p className="font-mono text-[10px] text-slate-600 break-all leading-tight">{bat.sn}</p>
      {suspect && <p className="text-[9px] font-bold text-red-600 leading-tight">{suspect}</p>}
      <div className="mt-auto">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className={cn("h-full rounded-full", m.bar)} style={{ width: `${Math.max(6, bat.soc ?? 0)}%` }} />
        </div>
        <p className="text-[9px] text-slate-400 mt-0.5">SoC {bat.soc}%</p>
      </div>
    </div>
  );
}

function Head({ slot, mark, tone }: { slot: number; mark?: Step; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[10px] font-bold text-slate-500">{slotLabel(slot)}</span>
      {mark && <span className={cn("text-[8px] font-bold tracking-wider", tone)}>{slotTag(mark)}</span>}
    </div>
  );
}
