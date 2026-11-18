"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Why it can't be chosen; shown on hover and read out. */
  blocked?: string | null;
}

/**
 * One choice from a few, as chips. Blocked chips stay in place, greyed,
 * with the reason on hover and for screen readers.
 */
export function OptionChips<T extends string>({
  label, options, value, onChange, hint,
}: {
  label: string; options: Option<T>[]; value: T; onChange: (v: T) => void; hint?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!!o.blocked}
              aria-describedby={o.blocked ? `${id}-why-${i}` : undefined}
              title={o.blocked ?? undefined}
              onClick={() => { if (!o.blocked) onChange(o.value); }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                o.blocked
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  : on
                    ? "border-zeno-teal bg-zeno-teal text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              )}
            >
              {o.label}
              {o.blocked && <span id={`${id}-why-${i}`} className="sr-only">: {o.blocked}</span>}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** An on/off setting that says why when it's not available. */
export function Toggle({ label, checked, onChange, blocked, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; blocked?: string | null; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label className={cn("flex items-center gap-2.5 text-sm", blocked ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700")} title={blocked ?? undefined}>
        <input
          type="checkbox"
          checked={checked && !blocked}
          disabled={!!blocked}
          aria-describedby={blocked || hint ? `${id}-note` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-[#003B49]"
        />
        <span className="font-medium">{label}</span>
      </label>
      {(blocked || hint) && <p id={`${id}-note`} className="ml-[26px] mt-0.5 text-xs text-slate-500">{blocked ?? hint}</p>}
    </div>
  );
}

/** An on/off switch that says why when it's not available: a button with role="switch", filled teal when on. */
export function Switch({ label, checked, onChange, blocked }: { label: string; checked: boolean; onChange: (v: boolean) => void; blocked?: string | null }) {
  const id = useId();
  const on = checked && !blocked;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-label`} className={cn("text-sm font-semibold", blocked ? "text-slate-400" : "text-slate-800")}>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-label`}
          aria-disabled={!!blocked}
          aria-describedby={blocked ? `${id}-why` : undefined}
          title={blocked ?? undefined}
          onClick={() => { if (!blocked) onChange(!checked); }}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
            on ? "bg-zeno-teal" : "bg-slate-300",
            blocked && "cursor-not-allowed opacity-50"
          )}
        >
          <span aria-hidden className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
        </button>
      </div>
      {blocked && <p id={`${id}-why`} className="mt-0.5 text-xs text-slate-500">{blocked}</p>}
    </div>
  );
}

/** A collapsed group of options; its summary says what's set inside without opening it. */
export function Disclosure({
  title, summary, children, defaultOpen = false, sticky = false,
}: { title: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean; sticky?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="rounded-lg border border-slate-200">
      {/* Sticky: the heading stays at the top of the scroll area while its options are in view. */}
      <h3 className={cn(sticky && "sticky top-0 z-10 rounded-t-lg bg-white")}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", !open && "-rotate-90")} aria-hidden />
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {summary && <span className="ml-auto truncate text-xs text-slate-500">{summary}</span>}
        </button>
      </h3>
      {open && <div id={id} className="space-y-4 border-t border-slate-100 px-3 py-3">{children}</div>}
    </section>
  );
}

export const FIELD_LABEL = "mb-1 block text-sm font-medium text-slate-700";
export const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
