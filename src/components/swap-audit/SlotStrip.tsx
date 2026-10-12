"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmtClockSec, slotLabel, stepLabel,
  type Battery, type SlotState, type Step,
} from "@/lib/mock/swap-audit";
import { SLOT_META, SLOT_LEGEND, stepToken, slotTag, SUBLAB, type LegendKey } from "./tokens";

/**
 * Every slot is this tall at every step, sized for the tallest content (a "No
 * battery" or STATION BATTERY slot wrapped at the strip's narrowest width), so
 * the rows and the controls under them never move. No overflow-hidden: if
 * content ever outgrows it, it must stay visible, not be clipped.
 */
const SLOT_H = "h-32";

/** Diagonal hatch for a slot the station believes is full but which is not. */
const HATCH = (rgba: string) => `repeating-linear-gradient(45deg, ${rgba} 0 4px, transparent 4px 8px)`;

const DOT = Object.fromEntries(SLOT_LEGEND.map((l) => [l.key, l.dot])) as Record<LegendKey, string>;

const stepSlots = (s: Step): number[] => (s.type === "poll" ? s.slots ?? [] : [s.slot!]);

const sameBattery = (a: Battery | null, b: Battery | null) =>
  a === null || b === null ? a === b : a.sn === b.sn && a.kind === b.kind;

/** The hover title a slot has always had, now also naming the slot state. */
function slotTitle(slot: number, bat: Battery | null): string {
  if (!bat) return `Slot ${slot} · empty`;
  return `Slot ${slot} · ${SLOT_META[bat.kind].label} · S/N ${bat.sn} · SoC ${bat.soc}%`;
}

/**
 * The station's ten slots, before the session and at the chosen point in it.
 * Slots nothing touched and that read the same in both rows shrink to a number
 * and a dot, so the eye goes to the slots that changed. Reading the two rows
 * against each other is how a faked collect becomes visible: the station's
 * record fills a slot that is physically empty.
 */
export function SlotStrip({
  before, state, steps, applied, marks, liveLabel, event, startMinute, footer,
}: {
  before: SlotState;
  state: SlotState;
  /** Every step of the session; `applied` of them are reflected in `state`. */
  steps: Step[];
  applied: number;
  marks: Map<number, Step>;
  liveLabel: string;
  /** The event the live row is showing, for its caption; none at the start. */
  event?: Step;
  startMinute: number;
  /** Centred under both rows (the step controls). */
  footer?: React.ReactNode;
}) {
  // Event-log row numbers per slot, for the steps applied so far.
  const badges = new Map<number, number[]>();
  steps.slice(0, applied).forEach((s, i) => {
    for (const slot of stepSlots(s)) badges.set(slot, [...(badges.get(slot) ?? []), i + 1]);
  });

  const compact = (i: number) => !badges.has(i + 1) && sameBattery(before[i], state[i]);

  // Only the legend entries something on screen is actually drawn in.
  const shown = new Set<LegendKey>();
  for (const row of [before, state]) {
    for (const bat of row) {
      if (!bat) shown.add("empty");
      else if (bat.kind === "phantom" || bat.kind === "foreign" || bat.origin) shown.add("bad");
      else if (bat.kind === "depleted") shown.add("depleted");
      else shown.add("charged");
    }
  }
  if (state.some((bat, i) => !bat && before[i])) shown.add("dispensed");

  return (
    <div>
      <p className={cn(SUBLAB, "mb-2")}>Station · 10 slots · as the station records them</p>
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400 mb-2">
        {SLOT_LEGEND.filter((l) => shown.has(l.key)).map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-sm", l.dot)} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px] space-y-2">
          <Row label="Before" state={before} before={before} marks={new Map()} compact={compact} isBefore />
          <Row
            label={liveLabel}
            event={event}
            startMinute={startMinute}
            state={state}
            before={before}
            marks={marks}
            badges={badges}
            compact={compact}
          />
        </div>
      </div>
      {footer && <div className="mt-6 flex justify-center">{footer}</div>}
    </div>
  );
}

function Row({
  label, event, startMinute, state, before, marks, badges, compact, isBefore,
}: {
  label: string;
  event?: Step;
  startMinute?: number;
  state: SlotState;
  before: SlotState;
  marks: Map<number, Step>;
  badges?: Map<number, number[]>;
  compact: (i: number) => boolean;
  isBefore?: boolean;
}) {
  return (
    <div>
      {/* Fixed h-5 whether it holds a label or the full event caption. */}
      <p className="mb-1 h-5 flex items-center gap-2 whitespace-nowrap">
        <span className={SUBLAB}>{label}</span>
        {event && startMinute !== undefined && <EventCaption event={event} startMinute={startMinute} />}
      </p>
      <div className="grid grid-cols-10 gap-1.5">
        {state.map((bat, i) =>
          compact(i) ? (
            <CompactSlot key={i} slot={i + 1} bat={bat} />
          ) : (
            <Slot
              key={i}
              slot={i + 1}
              bat={bat}
              hadBattery={Boolean(before[i])}
              mark={marks.get(i + 1)}
              steps={badges?.get(i + 1)}
              isBefore={isBefore}
            />
          )
        )}
      </div>
    </div>
  );
}

/**
 * The event-log time, the event's own tag, then slot and serial, in that order
 * of weight.
 */
function EventCaption({ event, startMinute }: { event: Step; startMinute: number }) {
  const where = event.type === "poll" ? (event.slots ?? []).map(slotLabel).join(", ") : slotLabel(event.slot!);
  const sn = event.type === "poll" ? `expected ${(event.expected ?? []).join(", ")}` : event.bat?.sn ?? "–";
  return (
    <>
      <span className="mr-1 inline-flex items-center gap-1 font-mono text-sm font-semibold text-slate-800">
        <Clock className="w-3.5 h-3.5" />
        {fmtClockSec(startMinute, event.t)}
      </span>
      <span className={cn("px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider whitespace-nowrap", stepToken(event).badge)}>
        {stepLabel(event)}
      </span>
      <span className="min-w-0 truncate font-mono text-[10px] text-slate-400">{where} · {sn}</span>
    </>
  );
}

/**
 * A slot nothing changed: its box and border as before, but only the number
 * and dot, pinned to the top. Focusable so keyboard users reach the same
 * detail the hover title gives.
 */
function CompactSlot({ slot, bat }: { slot: number; bat: Battery | null }) {
  const tip = slotTitle(slot, bat);
  return (
    <div
      tabIndex={0}
      role="img"
      title={tip}
      aria-label={tip}
      className={cn(
        SLOT_H, "rounded-lg p-1.5 flex items-start",
        bat ? SLOT_META.charged.card : "border border-dashed border-slate-300"
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-500">{slotLabel(slot)}</span>
        <span className={cn("w-2 h-2 rounded-sm", bat ? DOT.charged : DOT.empty)} />
      </span>
    </div>
  );
}

function Slot({
  slot, bat, hadBattery, mark, steps, isBefore,
}: {
  slot: number;
  bat: Battery | null;
  hadBattery: boolean;
  mark?: Step;
  steps?: number[];
  isBefore?: boolean;
}) {
  const tone = mark ? stepToken(mark) : undefined;

  if (!bat) {
    // No hatch on empty or dispensed. Dispensed takes the legend's blue for its
    // border and the dispense tag's blue-700 for its word (blue-500 text is
    // 3.5:1); the word replaces the tag.
    const dispensed = !isBefore && hadBattery;
    return (
      <div
        title={slotTitle(slot, null)}
        className={cn(
          SLOT_H, "rounded-lg p-1.5 flex flex-col gap-1 border border-dashed",
          dispensed ? "border-blue-500" : "border-slate-300"
        )}
      >
        <Head slot={slot} mark={dispensed ? undefined : mark} tone={tone?.text} steps={steps} />
        <p className={cn("text-[10px]", dispensed ? "text-blue-700" : "text-slate-400")}>
          {dispensed ? "Dispensed" : "Empty"}
        </p>
      </div>
    );
  }

  if (bat.kind === "phantom") {
    const m = SLOT_META.phantom;
    return (
      <div
        title={`Station recorded a collect in slot ${slot}, but the slot is empty`}
        className={cn(SLOT_H, "rounded-lg p-1.5 flex flex-col gap-1", m.card)}
        style={{ background: HATCH("rgba(220,38,38,0.12)") }}
      >
        <Head slot={slot} mark={mark} tone={tone?.text} steps={steps} />
        <span className={cn("self-start rounded px-1 py-0.5 text-[9px] font-bold", m.badge)}>{m.label}</span>
        <p className="font-mono text-[10px] text-slate-400 line-through">{bat.sn ?? "S/N not read"}</p>
        <p className="text-[9px] font-semibold text-red-600">
          {bat.why === "poll" ? "Found empty by poll" : "Door closed empty"}
        </p>
      </div>
    );
  }

  const m = SLOT_META[bat.kind as "charged" | "depleted" | "foreign"];
  const suspect = bat.origin ? (bat.origin.type === "dispensed" ? "STATION BATTERY" : "READ TWICE") : null;

  return (
    <div title={slotTitle(slot, bat)} className={cn(SLOT_H, "rounded-lg p-1.5 flex flex-col gap-1", m.card)}>
      <Head slot={slot} mark={mark} tone={tone?.text} steps={steps} />
      <span className={cn("self-start rounded px-1 py-0.5 text-[9px] font-bold whitespace-nowrap", m.badge)}>{m.label}</span>
      <p className="font-mono text-[10px] text-slate-600 break-all leading-tight">{bat.sn}</p>
      {suspect && <p className="text-[9px] font-bold text-red-600 leading-tight">{suspect}</p>}
      <p className="text-[9px] text-slate-400">SoC {bat.soc}%</p>
    </div>
  );
}

/** Slot number, the event-log steps that touched it, and the event tag. */
function Head({ slot, mark, tone, steps }: { slot: number; mark?: Step; tone?: string; steps?: number[] }) {
  return (
    <div className="flex items-baseline justify-between gap-x-1 flex-wrap">
      <span className="inline-flex items-baseline gap-1">
        <span className="text-[10px] font-bold text-slate-500">{slotLabel(slot)}</span>
        {steps && steps.length > 0 && (
          <span className={SUBLAB}>{steps.join(", ")}</span>
        )}
      </span>
      {mark && <span className={cn("text-[8px] font-bold tracking-wider", tone)}>{slotTag(mark)}</span>}
    </div>
  );
}
