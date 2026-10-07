/**
 * Swap Audit's colour vocabulary, in one place.
 *
 * Shaped like dome's other `*_META` maps (`SWAP_STATUS_META`, `CATEGORY_META`):
 * `{ label, badge }` per state, consumed by every cell that renders it. No hex
 * values inline, per docs/design-system.md.
 *
 * Surfaces stick to `bg-white` / `bg-slate-50` / `border-slate-200` / `text-slate-*`
 * because globals.css only rewrites those utilities under `.dark main`.
 */

import type { Step, VerdictStatus } from "@/lib/mock/swap-audit";
import { isSuspicious } from "@/lib/mock/swap-audit";

export const VERDICT_META: Record<VerdictStatus, { label: string; badge: string; dot: string }> = {
  "COMPLIANT":     { label: "Compliant",     badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  "NON-COMPLIANT": { label: "Non-compliant", badge: "bg-red-50 text-red-700",         dot: "bg-red-500" },
  "REVIEW":        { label: "Review",        badge: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
  "NO SWAP":       { label: "No swap",       badge: "bg-slate-100 text-slate-500",    dot: "bg-slate-400" },
};

export type StepTone = "collect" | "collectBad" | "dispense" | "timeout" | "poll";

export interface StepToken {
  label: string;
  badge: string;
  fill: string;
  border: string;
  text: string;
}

const STEP_TOKENS: Record<StepTone, Omit<StepToken, "label">> = {
  collect:    { badge: "bg-amber-50 text-amber-700", fill: "bg-amber-500", border: "border-amber-500", text: "text-amber-700" },
  collectBad: { badge: "bg-red-600 text-white",      fill: "bg-red-600",   border: "border-red-600",   text: "text-red-600" },
  dispense:   { badge: "bg-blue-50 text-blue-700",   fill: "bg-blue-500",  border: "border-blue-500",  text: "text-blue-700" },
  timeout:    { badge: "bg-slate-100 text-slate-500", fill: "bg-slate-300", border: "border-slate-400", text: "text-slate-500" },
  // The poll is drawn in ink. In dark mode ink vanishes into the card, so it
  // flips to a light fill rather than losing the step entirely.
  poll: {
    badge:  "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
    fill:   "bg-slate-700 dark:bg-slate-300",
    border: "border-slate-700 dark:border-slate-300",
    text:   "text-slate-700 dark:text-slate-200",
  },
};

export function stepTone(step: Step): StepTone {
  if (step.type === "dispense") return "dispense";
  if (step.type === "timeout") return "timeout";
  if (step.type === "poll") return "poll";
  return isSuspicious(step) ? "collectBad" : "collect";
}

export const stepToken = (step: Step): Omit<StepToken, "label"> => STEP_TOKENS[stepTone(step)];

/** The short tag beside a slot number when a step touched that slot. */
export function slotTag(step: Step): string {
  if (step.type === "timeout") return "TIMEOUT";
  if (step.type === "poll") return "POLL";
  if (step.type === "dispense") return "DISPENSE";
  return step.bat ? "COLLECT" : "EMPTY";
}

/** Verdict flag chips in the expanded row. */
export const FLAG_BADGE: Record<"bad" | "warn" | "ok" | "", string> = {
  bad:  "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-700",
  ok:   "bg-emerald-50 text-emerald-700",
  "":   "bg-slate-100 text-slate-500",
};

/** Slot-card treatment per battery kind. `phantom` is the station believing a lie. */
export const SLOT_META: Record<"charged" | "depleted" | "foreign" | "phantom", {
  label: string; badge: string; bar: string; card: string;
}> = {
  charged:  { label: "Charged",   badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", card: "bg-white border border-slate-200" },
  depleted: { label: "Depleted",  badge: "bg-amber-50 text-amber-700",     bar: "bg-amber-500",   card: "bg-white border border-slate-200" },
  foreign:  { label: "Other cust", badge: "bg-red-600 text-white",         bar: "bg-red-500",     card: "bg-white border border-slate-200" },
  phantom:  { label: "No battery", badge: "bg-red-600 text-white",         bar: "bg-red-500",     card: "border-2 border-dashed border-red-400 bg-red-50/60" },
};

/** Legend above the slot strip. */
export const SLOT_LEGEND: { label: string; dot: string }[] = [
  { label: "Charged",                  dot: "bg-emerald-500" },
  { label: "Customer's depleted",      dot: "bg-amber-500" },
  { label: "No battery / suspect S/N", dot: "bg-red-500" },
  { label: "Empty",                    dot: "bg-slate-300" },
  { label: "Dispensed",                dot: "bg-blue-500" },
];

/** The small uppercase caption dome puts above a sub-section of a detail row. */
export const SUBLAB = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";
