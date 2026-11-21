"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isValid, parse, startOfDay } from "date-fns";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DATE_FORMAT, fmtDate, fmtSpan, isoDay, PRESET_GROUPS, rangeLabel, resolveRange, type PresetId } from "@/lib/dashboards-v3/dates";
import type { DateRange } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";

const CONTROL =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
const FIELD =
  "min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

/** "17 Nov 2026" typed in, or null when it isn't a date. */
function readDate(text: string): Date | null {
  const d = parse(text.trim(), DATE_FORMAT, new Date());
  return isValid(d) ? startOfDay(d) : null;
}

/**
 * The dashboard's date range: presets on the left (rolling, then calendar,
 * applied on click), a custom range on the right (typed "17 Nov 2026" dates
 * with a calendar button each, applied with Apply). The trigger names the
 * preset with its exact dates ("Last 30 days · 19 Oct – 17 Nov 2026"), or
 * shows the custom dates. Each preset row shows its dates too.
 *
 * ↑ ↓ move through the presets, Enter picks one, Escape closes, and focus
 * goes back to the trigger.
 */
/** The popover's size: presets and custom dates side by side. */
const POP_W = 480;
const POP_H = 340;

export function DateRangePicker({ value, onChange, fullWidth = false }: { value: DateRange; onChange: (r: DateRange) => void; fullWidth?: boolean }) {
  /** Fixed beside the button, so a scrolling column (the widget panel) never clips it. */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;
  const setOpen = (o: boolean | ((was: boolean) => boolean)) => {
    const next = typeof o === "function" ? o(open) : o;
    const r = trigger.current?.getBoundingClientRect();
    if (!next || !r) { setPos(null); return; }
    const top = r.bottom + 4 + POP_H > window.innerHeight && r.top - 4 - POP_H > 0 ? r.top - 4 - POP_H : r.bottom + 4;
    setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8)) });
  };
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const resolved = resolveRange(value);
  const exact = fmtSpan(resolved.from, resolved.to);

  function close(returnFocus = true) {
    setPos(null);
    if (returnFocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    (pop.current?.querySelector<HTMLElement>("[data-preset][aria-checked=true]") ?? pop.current?.querySelector<HTMLElement>("[data-preset]"))?.focus();
    const onDown = (e: MouseEvent) => {
      if (!pop.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setPos(null);
    };
    const onScroll = (e: Event) => { if (!pop.current?.contains(e.target as Node)) setPos(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function onPresetKey(e: React.KeyboardEvent) {
    const items = Array.from(pop.current?.querySelectorAll<HTMLElement>("[data-preset]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    items[(to + items.length) % items.length]?.focus();
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date range: ${rangeLabel(value)}${value.preset === "custom" ? "" : `, ${exact}`}`}
        // One line; cut short with an ellipsis where there's no room, the whole of it on hover.
        title={value.preset === "custom" ? exact : `${rangeLabel(value)} · ${exact}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(CONTROL, "min-w-0 max-w-full whitespace-nowrap", fullWidth && "w-full")}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="font-medium text-slate-800">{rangeLabel(value)}</span>
          {value.preset !== "custom" && <span className="text-slate-600"> · {exact}</span>}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      </button>

      {open && (
        <div
          ref={pop}
          role="dialog"
          aria-label="Date range"
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}
          style={pos ? { position: "fixed", top: pos.top, left: pos.left } : undefined}
          className="z-50 flex rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="w-64 py-1" onKeyDown={onPresetKey}>
            {PRESET_GROUPS.map((g, gi) => (
              <div key={g.label} role="radiogroup" aria-labelledby={`${id}-${gi}`}>
                {gi > 0 && <div aria-hidden className="my-1 border-t border-slate-100" />}
                <p id={`${id}-${gi}`} className="px-3 pb-0.5 pt-1.5 text-xs font-semibold text-slate-500">{GROUP_HEADING[g.label] ?? g.label}</p>
                {g.presets.map((p) => (
                  <PresetRow
                    key={p.value}
                    preset={p.value}
                    label={p.label}
                    active={value.preset === p.value}
                    onPick={() => { onChange({ preset: p.value }); close(); }}
                  />
                ))}
              </div>
            ))}
          </div>
          <CustomRange
            id={id}
            initial={resolved}
            onCancel={() => close()}
            onApply={(from, to) => { onChange({ preset: "custom", from: isoDay(from), to: isoDay(to) }); close(); }}
          />
        </div>
      )}
    </div>
  );
}

/** The groups' visible headings, so rolling and calendar presets read as different kinds. */
const GROUP_HEADING: Record<string, string> = { Rolling: "Rolling periods", Calendar: "Calendar periods" };

function PresetRow({ preset, label, active, onPick }: { preset: PresetId; label: string; active: boolean; onPick: () => void }) {
  const dates = resolveRange({ preset });
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-preset
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zeno-teal/40",
        active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50"
      )}
    >
      <span className="flex-1">
        <span className="block">{label}</span>
        <span className="block text-xs font-normal text-slate-500">{fmtSpan(dates.from, dates.to)}</span>
      </span>
      <Check className={cn("h-3.5 w-3.5 shrink-0 text-zeno-teal", !active && "invisible")} aria-hidden />
    </button>
  );
}

/** From and To as typed dates, each with a calendar; checked on Apply, errors under the field. */
function CustomRange({ id, initial, onCancel, onApply }: { id: string; initial: { from: Date; to: Date }; onCancel: () => void; onApply: (from: Date, to: Date) => void }) {
  const [from, setFrom] = useState(fmtDate(initial.from));
  const [to, setTo] = useState(fmtDate(initial.to));
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const today = startOfDay(new Date());

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const f = readDate(from);
    const t = readDate(to);
    const next: { from?: string; to?: string } = {};
    if (!f) next.from = "Enter a date like 17 Nov 2026";
    else if (f > today) next.from = "Can’t be in the future";
    if (!t) next.to = "Enter a date like 17 Nov 2026";
    else if (t > today) next.to = "Can’t be in the future";
    else if (f && t < f) next.to = "Can’t be before the From date";
    setErrors(next);
    if (f && t && !next.from && !next.to) onApply(f, t);
  }

  return (
    <form onSubmit={apply} noValidate className="w-72 border-l border-slate-200 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">Custom range</p>
      <div className="space-y-2.5">
        <DateField id={`${id}-from`} label="From" value={from} onChange={setFrom} error={errors.from} max={today} />
        <DateField id={`${id}-to`} label="To" value={to} onChange={setTo} error={errors.to} max={today} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="outline" size="sm">Apply</Button>
      </div>
    </form>
  );
}

function DateField({ id, label, value, onChange, error, max }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; max: Date }) {
  const native = useRef<HTMLInputElement>(null);
  const parsed = readDate(value);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="DD MMM YYYY"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(FIELD, error ? "border-red-400" : "border-slate-300")}
        />
        <button
          type="button"
          aria-label={`Choose the ${label.toLowerCase()} date on a calendar`}
          onClick={() => native.current?.showPicker?.()}
          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
        {/* The browser's own calendar, opened by the button; picking a day writes it into the field. */}
        <input
          ref={native}
          type="date"
          tabIndex={-1}
          aria-hidden
          max={isoDay(max)}
          value={parsed ? isoDay(parsed) : ""}
          onChange={(e) => { const d = parse(e.target.value, "yyyy-MM-dd", new Date()); if (isValid(d)) onChange(fmtDate(d)); }}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
