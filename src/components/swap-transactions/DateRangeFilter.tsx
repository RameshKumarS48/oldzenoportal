"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/** A calendar day in EAT, as YYYY-MM-DD. */
export interface DayRange {
  from: string;
  to: string;
}

/**
 * Stations are in Nairobi, so days are EAT days, as Swap Audit labels them:
 * a range covers from 00:00 EAT on its first day to the end of its last.
 */
const EAT_MS = 3 * 3_600_000;

const ymd = (iso: string) => iso.split("-").map(Number) as [number, number, number];

export function inEatRange(timestamp: string, range: DayRange): boolean {
  const t = new Date(timestamp).getTime();
  const [fy, fm, fd] = ymd(range.from);
  const [ty, tm, td] = ymd(range.to);
  return t >= Date.UTC(fy, fm - 1, fd) - EAT_MS && t < Date.UTC(ty, tm - 1, td + 1) - EAT_MS;
}

/** Today's date in EAT, YYYY-MM-DD. */
const eatToday = () => new Date(Date.now() + EAT_MS).toISOString().slice(0, 10);

/** The calendar shows plain local dates; these convert to and from YYYY-MM-DD. */
const toDate = (iso: string) => { const [y, m, d] = ymd(iso); return new Date(y, m - 1, d); };
const toIso = (d: Date) => format(d, "yyyy-MM-dd");

/** "12 Sep – 30 Sep 2026", "28 Dec 2025 – 3 Jan 2026", or "12 Sep 2026" for one day. */
export function rangeLabel(range: DayRange): string {
  const a = toDate(range.from);
  const b = toDate(range.to);
  if (range.from === range.to) return format(a, "d MMM yyyy");
  return a.getFullYear() === b.getFullYear()
    ? `${format(a, "d MMM")} – ${format(b, "d MMM yyyy")}`
    : `${format(a, "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
}

const PRESETS: [string, string][] = [
  ["", "All Time"], ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"],
];

/** The filters' native date field, as Vehicle Tracking's "Pick Date" draws it. */
const FIELD =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

/**
 * The time dropdown, plus "Custom range…": a popover with From / To fields
 * over a two-month range calendar. Nothing filters until Apply; Esc, Cancel
 * or a click outside closes it unchanged, and focus returns to the dropdown.
 */
export function DateRangeFilter({
  value, range, onChange, className,
}: {
  /** "", "today", "7d", "30d", or "custom" when `range` applies. */
  value: string;
  range: DayRange | null;
  onChange: (value: string, range: DayRange | null) => void;
  /** The view's own dropdown style, so it matches the filters beside it. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);
  const [month, setMonth] = useState<Date>(() => new Date());
  const selectRef = useRef<HTMLSelectElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);

  const today = eatToday();
  const todayDate = toDate(today);

  const openPicker = () => {
    const current = range ? { from: toDate(range.from), to: toDate(range.to) } : undefined;
    setDraft(current);
    // Show the range's end month on the right, so both months are in view.
    const anchor = current?.to ?? todayDate;
    setMonth(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    selectRef.current?.focus();
  };

  const apply = () => {
    if (!draft?.from) return;
    const from = toIso(draft.from);
    onChange("custom", { from, to: draft.to ? toIso(draft.to) : from });
    close();
  };

  // Focus moves into the popover when it opens.
  useEffect(() => {
    if (open) fromRef.current?.focus();
  }, [open]);

  // A click outside closes it unchanged, like Cancel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!popRef.current?.contains(e.target as Node) && e.target !== selectRef.current) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // First click sets the start, the second the end; a click before the start, or
  // after a finished range, starts again.
  const pick = (_: DateRange | undefined, day: Date) => {
    if (!draft?.from || draft.to || day < draft.from) setDraft({ from: day, to: undefined });
    else setDraft({ from: draft.from, to: day });
  };

  const typed = (which: "from" | "to", iso: string) => {
    if (!iso || iso > today) return;
    const d = toDate(iso);
    if (which === "from") setDraft({ from: d, to: draft?.to && draft.to >= d ? draft.to : undefined });
    else if (draft?.from && d >= draft.from) setDraft({ from: draft.from, to: d });
    setMonth(new Date(d.getFullYear(), d.getMonth() - (which === "to" ? 1 : 0), 1));
  };

  return (
    <div className="relative">
      <select
        ref={selectRef}
        aria-label="Time range"
        value={value === "custom" && range ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "__pick") openPicker();
          else onChange(e.target.value, null);
        }}
        className={className}
      >
        {PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        {/* The applied range has its own option so "Custom range…" can be chosen again. */}
        {range && <option value="custom">{rangeLabel(range)}</option>}
        <option value="__pick">Custom range…</option>
      </select>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Choose a date range"
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
          className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-slate-500 font-medium">
              From
              <input
                ref={fromRef}
                type="date"
                max={today}
                value={draft?.from ? toIso(draft.from) : ""}
                onChange={(e) => typed("from", e.target.value)}
                className={FIELD}
              />
            </label>
            <label className="text-[11px] text-slate-500 font-medium">
              To
              <input
                type="date"
                min={draft?.from ? toIso(draft.from) : undefined}
                max={today}
                value={draft?.to ? toIso(draft.to) : ""}
                onChange={(e) => typed("to", e.target.value)}
                className={FIELD}
              />
            </label>
          </div>

          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={pick}
            month={month}
            onMonthChange={setMonth}
            endMonth={todayDate}
            weekStartsOn={1}
            disabled={[{ after: todayDate }, ...(draft?.from && !draft.to ? [{ before: draft.from }] : [])]}
            classNames={{
              root: "text-xs text-slate-700",
              months: "relative flex gap-6",
              month: "space-y-2",
              month_caption: "flex h-7 items-center justify-center",
              caption_label: "text-xs font-semibold text-slate-700",
              nav: "absolute inset-x-0 top-0 flex justify-between",
              button_previous: "p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40",
              button_next: "p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40",
              chevron: "w-4 h-4 fill-current",
              month_grid: "border-collapse",
              weekday: "w-8 h-6 text-[10px] font-bold text-slate-400 uppercase",
              day: "p-0 text-center",
              day_button: "w-8 h-8 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition-colors",
              today: "[&>button]:font-semibold",
              outside: "[&>button]:text-slate-300",
              // The selected-row teal between the ends; filled teal on the ends.
              range_middle: "bg-zeno-teal/5 dark:bg-(--sidebar-text)/10 [&>button]:rounded-none",
              range_start: "[&>button]:bg-zeno-teal [&>button]:text-white [&>button]:hover:bg-zeno-teal-hover",
              range_end: "[&>button]:bg-zeno-teal [&>button]:text-white [&>button]:hover:bg-zeno-teal-hover",
              disabled: "[&>button]:text-slate-300 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent",
            }}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!draft?.from}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zeno-teal text-white hover:bg-zeno-teal-hover transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
