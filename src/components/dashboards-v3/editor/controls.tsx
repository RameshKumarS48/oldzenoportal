"use client";

import { useId } from "react";
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
  label, options, value, onChange, hint, hideLabel = false,
}: {
  label: string; options: Option<T>[]; value: T; onChange: (v: T) => void; hint?: string;
  /** The section heading already says it: the label is for screen readers only. */
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-medium text-slate-700"}>{label}</p>
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

export const FIELD_LABEL = "mb-1 block text-sm font-medium text-slate-700";
export const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
