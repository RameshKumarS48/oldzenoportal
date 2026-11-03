"use client";

import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import { STATUS_LABELS, STATUS_ORDER, type BatteryStatus } from "@/lib/mock/battery-provisioning";
import { cn } from "@/lib/utils";
import type { BatteryFilters, FlagFilter } from "./filters";

/** The filter chips' selected tint, so a selected count reads as an active filter. */
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/** Each state's dot, matching its pill in the table (cells.tsx STATUS_TONE). */
const DOT: Record<BatteryStatus, string> = {
  pre_bringup: "bg-slate-400",
  ready_1: "bg-sky-500",
  storage: "bg-violet-500",
  ready_2: "bg-teal-500",
  active: "bg-green-500",
  quarantine: "bg-red-500",
  retired: "bg-stone-400",
};

/** Short names for the strip; the title gives the PRD's full name. */
const SHORT: Record<BatteryStatus, string> = {
  pre_bringup: "Pre-bring-up",
  ready_1: "Ready 1/2",
  storage: "In storage",
  ready_2: "Ready 2/2",
  active: "Active",
  quarantine: "Quarantine",
  retired: "Retired",
};

/**
 * How many batteries are in each provisioning state, in lifecycle order, then
 * the two flags. This answers the PRD's questions at a glance (how many are
 * ready to deploy, how many are in quarantine). The counts cover every
 * battery, whatever the filters. A count sets the Status (or Flag) filter, and
 * clicking it again clears it.
 */
export function StatusSummary({
  rows,
  filters,
  onFilters,
}: {
  rows: BatteryRecord[];
  filters: BatteryFilters;
  onFilters: (f: BatteryFilters) => void;
}) {
  const count = (f: (b: BatteryRecord) => boolean) => rows.filter(f).length;
  const flags: { value: Exclude<FlagFilter, "">; label: string; n: number; dot: string }[] = [
    { value: "repair", label: "Repair in progress", n: count((b) => b.repairInProgress), dot: "bg-amber-500" },
    { value: "charge", label: "Charge due", n: count((b) => b.chargeDue), dot: "bg-orange-500" },
  ];

  const item = (selected: boolean) =>
    cn(
      "flex flex-col items-start gap-0.5 rounded-lg px-3 py-1.5 text-left transition-colors",
      RING,
      selected ? TINT : "hover:bg-slate-50"
    );

  return (
    <div
      role="group"
      aria-label="Batteries by provisioning status"
      className="bg-white rounded-xl border border-slate-200 px-2 py-1.5 flex items-stretch gap-1 overflow-x-auto shrink-0"
    >
      {STATUS_ORDER.map((s) => {
        const selected = filters.status === s;
        const n = count((b) => b.status === s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={selected}
            title={`${STATUS_LABELS[s]}: ${n}`}
            onClick={() => onFilters({ ...filters, status: selected ? "" : s })}
            className={item(selected)}
          >
            <span className={cn("text-lg font-semibold leading-tight tabular-nums", selected ? "" : "text-slate-800")}>{n}</span>
            <span className={cn("flex items-center gap-1.5 text-xs whitespace-nowrap", selected ? "" : "text-slate-500")}>
              <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[s])} aria-hidden />
              {SHORT[s]}
            </span>
          </button>
        );
      })}
      <span className="w-px bg-slate-200 mx-1 shrink-0" aria-hidden />
      {flags.map((f) => {
        const selected = filters.flag === f.value;
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={selected}
            title={`${f.label}: ${f.n}`}
            onClick={() => onFilters({ ...filters, flag: selected ? "" : f.value })}
            className={item(selected)}
          >
            <span className={cn("text-lg font-semibold leading-tight tabular-nums", selected ? "" : "text-slate-800")}>{f.n}</span>
            <span className={cn("flex items-center gap-1.5 text-xs whitespace-nowrap", selected ? "" : "text-slate-500")}>
              <span className={cn("w-2 h-2 rounded-full shrink-0", f.dot)} aria-hidden />
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
