/** Number formatting and colour slots shared by every view. */

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];
export const OTHER = "var(--s-other)";
export const RAMP = ["var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)", "var(--ramp-5)", "var(--ramp-6)"];

/** Colour follows the series' place in the list; "Other" is always neutral. */
export const seriesColor = (name: string, i: number) => (name === "Other" ? OTHER : SERIES[i % SERIES.length]);

/** The ramp step for a value between 0 and max. */
export const rampColor = (v: number, max: number) => (v <= 0 || max <= 0 ? "transparent" : RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))]);
/** Text that stays readable on a ramp step. */
export const rampInk = (v: number, max: number) => (max > 0 && v / max >= 0.5 ? "#ffffff" : "var(--viz-ink)");

/** "KES 1,234", "97.2%", "1.9 kWh", "5,204". */
export function full(v: number, unit = ""): string {
  if (!Number.isFinite(v)) return "–";
  const n = v.toLocaleString("en-KE", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });
  if (unit === "KES") return `KES ${n}`;
  if (unit === "%") return `${n}%`;
  return unit ? `${n} ${unit}` : n;
}

/** "5.2k", "1.4M": for axes and big tiles, where space is short. */
export function compact(v: number, unit = ""): string {
  if (!Number.isFinite(v)) return "–";
  const a = Math.abs(v);
  const n = a >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : a >= 1e4 ? `${(v / 1e3).toFixed(1)}k` : v.toLocaleString("en-KE", { maximumFractionDigits: a >= 100 ? 0 : 2 });
  const tidy = n.replace(/\.0(?=[kMB])/, "");
  if (unit === "KES") return `KES ${tidy}`;
  if (unit === "%") return `${tidy}%`;
  return unit ? `${tidy} ${unit}` : tidy;
}

/** Percentage change from `before` to `now`, or null when there is nothing to compare with. */
export const change = (now: number, before: number | null) => (before == null || before === 0 ? null : ((now - before) / before) * 100);
