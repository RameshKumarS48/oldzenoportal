/**
 * Chart colours for Dashboards (v3), as approved. Hex values because
 * Recharts draws SVG; each comes from an existing token or Tailwind's
 * palette, and every one is at least 3:1 on white.
 */
import type { PropertyId } from "./catalogue";

/** Default for anything that isn't being emphasised: slate-500. */
export const NEUTRAL = "#64748b";
/** Emphasis: zeno-teal. */
export const ACCENT = "#003B49";
/** Goal and previous-period lines, always dashed: slate-400. */
export const REFERENCE = "#94a3b8";
/** Light gridlines: slate-100. */
export const GRID = "#f1f5f9";
/** Axis text: slate-500, so tick labels pass 4.5:1. */
export const AXIS_TEXT = "#64748b";

/** The same colour for a service in every chart. */
export const SERVICE_COLOR: Record<string, string> = {
  Swap: "#003B49",
  "Fast charge": "#d97706",
  "Home charge": "#0284c7",
};

/** Split series in order; "Other" is always neutral. Five named plus Other is the six-series cap. */
export const SPLIT_COLORS = ["#003B49", "#0284c7", "#d97706", "#7c3aed", "#db2777"];

/** Every series' colour for a split: services by name, anything else by rank, Other neutral. */
export function seriesColors(splitBy: PropertyId | undefined, names: string[]): string[] {
  let i = 0;
  return names.map((name) => {
    if (name === "Other") return NEUTRAL;
    if (splitBy === "service" && SERVICE_COLOR[name]) return SERVICE_COLOR[name];
    return SPLIT_COLORS[i++ % SPLIT_COLORS.length];
  });
}

/** KPI change text: emerald-700 for good news, red-700 for bad, slate-600 when flat. Always with ▲ ▼ and words. */
export const CHANGE_CLASS = { good: "text-emerald-700", bad: "text-red-700", flat: "text-slate-600" } as const;
