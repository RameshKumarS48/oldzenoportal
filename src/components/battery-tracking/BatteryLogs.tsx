"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { DateRangeFilter, inEatRange, type DayRange } from "@/components/swap-transactions/DateRangeFilter";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { EVENT_TYPES, fmtUtc, type BatteryEvent, type BatteryEventType } from "@/lib/mock/battery-provisioning";
import { cn } from "@/lib/utils";
import { Dash, mapsUrl, showCoord, splitLocation, StatusBadge } from "./cells";

const CONTROL =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 " +
  "focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";

const HOURS: Record<"today" | "7d" | "30d", number> = { today: 24, "7d": 7 * 24, "30d": 30 * 24 };

/** Each event type's dot on the timeline. */
const DOT: Record<BatteryEventType, string> = {
  shipment: "bg-slate-400",
  bringup_1: "bg-sky-500",
  bringup_2: "bg-teal-500",
  storage: "bg-violet-500",
  repair: "bg-amber-500",
  quarantine: "bg-red-500",
  retest: "bg-emerald-500",
  vehicle: "bg-green-500",
  station: "bg-green-500",
  retired: "bg-stone-400",
};

const TYPE_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.label])) as Record<BatteryEventType, string>;

/**
 * When, as the PRD's logs say it: "Today 12:30", "Yesterday 09:10", then
 * "12 days ago", "100 days ago" (UTC days, matching Last Seen (UTC)).
 */
function relative(at: number, now: number): string {
  const day = (ms: number) => Math.floor(ms / 86_400_000);
  const diff = day(now) - day(at);
  const time = fmtUtc(at).slice(12);
  if (diff <= 0) return `Today ${time}`;
  if (diff === 1) return `Yesterday ${time}`;
  return `${diff} days ago`;
}

/** The event-type multi-select: a button opening a list of checkboxes. Esc or a click outside closes it. */
function TypePicker({ value, onChange }: { value: BatteryEventType[]; onChange: (v: BatteryEventType[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = value.length === 0 ? "All event types" : value.length === 1 ? TYPE_LABEL[value[0]] : `${value.length} event types`;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(CONTROL, "inline-flex items-center gap-1.5")}>
        {label}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <div role="group" aria-label="Event types" className="absolute left-0 top-full mt-1 z-20 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {EVENT_TYPES.map((t) => {
            const checked = value.includes(t.value);
            return (
              <label key={t.value} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? value.filter((v) => v !== t.value) : [...value, t.value])}
                  className="accent-zeno-teal"
                />
                <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[t.value])} aria-hidden />
                {t.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Battery Logs (PRD screen 3.3): the battery's full history, newest first.
 * Each entry says when (relative, the exact UTC time on hover), who (or
 * System), what happened, any state change as old → new pills, and the
 * lat/long the battery reported then. Filters: date range (Swap Transactions'
 * time filter) and event types, combined; Clear filter restores the list.
 */
export function BatteryLogs({ events, now }: { events: BatteryEvent[]; now: number }) {
  const [preset, setPreset] = useState("");
  const [range, setRange] = useState<DayRange | null>(null);
  const [types, setTypes] = useState<BatteryEventType[]>([]);

  const dateActive = preset !== "" && (preset !== "custom" || range !== null);
  const filtered = dateActive || types.length > 0;
  const shown = events.filter((e) => {
    if (types.length && !types.includes(e.type)) return false;
    if (!dateActive) return true;
    if (preset === "custom") return inEatRange(new Date(e.at).toISOString(), range!);
    return now - e.at <= HOURS[preset as keyof typeof HOURS] * 3_600_000;
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 flex-wrap px-5 py-2.5 border-b border-slate-100 shrink-0">
        <DateRangeFilter value={preset} range={range} onChange={(v, r) => { setPreset(v); setRange(r); }} className={CONTROL} />
        <TypePicker value={types} onChange={setTypes} />
        {filtered && (
          <ClearFiltersButton
            onClick={() => {
              setPreset("");
              setRange(null);
              setTypes([]);
            }}
          />
        )}
        <span aria-live="polite" className="ml-auto text-xs text-slate-500 tabular-nums">
          {filtered ? `${shown.length} of ${events.length} entries` : `${events.length} entries`}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">No log entries match these filters.</p>
        ) : (
          <ol className="px-5 py-3">
            {shown.map((e, i) => {
              const pair = splitLocation(e.location);
              return (
                <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-1">
                  {/* The timeline: a dot per entry on a line joining them. */}
                  {i < shown.length - 1 && <span className="absolute left-[4px] top-3 bottom-0 w-px bg-slate-200" aria-hidden />}
                  <span className={cn("relative mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-(--card-bg)", DOT[e.type])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-slate-800">{e.who}</span>
                      <time title={`${fmtUtc(e.at)} UTC`} className="text-slate-500 tabular-nums">{relative(e.at, now)}</time>
                      <span className="text-slate-400">· {TYPE_LABEL[e.type]}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 break-words">{e.text}</p>
                    {e.to && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {e.from ? <StatusBadge status={e.from} /> : <span className="text-xs text-slate-400">New battery</span>}
                        <ArrowRight className="w-3 h-3 text-slate-400" aria-label="to" />
                        <StatusBadge status={e.to} />
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-400 tabular-nums">
                      {pair ? (
                        <a
                          href={mapsUrl(e.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-zeno-teal hover:underline dark:hover:text-(--sidebar-text) rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                        >
                          {showCoord(pair[0])}, {showCoord(pair[1])}
                          <ExternalLink className="w-3 h-3" aria-hidden />
                          <span className="sr-only">(open in Google Maps)</span>
                        </a>
                      ) : (
                        <span title="No location reported with this entry">
                          Lat/long <Dash />
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
