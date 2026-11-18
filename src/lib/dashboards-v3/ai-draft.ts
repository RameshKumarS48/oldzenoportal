/**
 * The Dashboards (v3) "describe the dashboard you need" draft. Sandbox
 * only: no AI and no API, just keywords matched against the metric
 * catalogue, split properties, regions and time phrases. Pure, so it can be
 * checked without a browser.
 */
import { metricById, PROPERTIES, REGION_COUNTRY, type CategoryId, type Metric, type PropertyId } from "./catalogue";
import { addDays, subMonths } from "date-fns";
import { DEFAULT_RANGE, isoDay, lastCompleteDay, rangeWithDates } from "./dates";
import { normalise, splitName } from "./editor";
import { hasNoData } from "./series";
import { orderWidgets } from "./rules";
import type { DateRange, Grouping, Visibility, Widget } from "./types";
import { makeWidget } from "./widgets";

/** Words that point at each metric, most specific first where they overlap ("failed swaps" before "swaps"). */
const METRIC_WORDS: Record<string, string[]> = {
  "points-debited": ["points debited", "debited", "points spent", "spend", "billing", "charges"],
  "top-ups": ["top-ups received", "top-ups", "top-up", "top ups", "top up", "topups", "m-pesa", "mpesa", "wallet loads"],
  "kwh-billed": ["kwh billed", "kwh", "energy billed", "energy sold", "energy"],
  "points-per-swap": ["points per swap", "price per swap", "average points", "per swap"],
  swaps: ["swaps", "swap", "swapping"],
  "station-uptime": ["station uptime", "uptime", "downtime", "station health"],
  "failed-swaps": ["failed swaps", "failed swap", "failures", "failed"],
  "fast-charge-sessions": ["fast charge sessions", "fast charging", "fast charge", "fast chargers"],
  "home-charge-sessions": ["home charge sessions", "home charging", "home charge", "home chargers"],
  "energy-per-session": ["energy per session", "kwh per session", "per session"],
  "battery-inventory": ["battery inventory", "inventory", "battery states", "battery state", "batteries by state", "quarantine", "retired", "stock"],
  "batteries-needing-service": ["batteries needing service", "needing service", "need service", "repairs", "repair", "faulty"],
  "battery-health": ["battery health", "capacity", "degradation"],
  "active-vehicles": ["active vehicles", "vehicles", "bikes", "fleet"],
  "vehicles-offline": ["vehicles offline", "offline", "not reporting"],
  "immobilised-vehicles": ["immobilised", "immobilized", "immobilisation", "immobilization"],
  "active-riders": ["active riders", "riders", "customers", "users"],
  "negative-balance": ["riders with negative balance", "negative balance", "negative balances", "in the red", "arrears", "owing", "debt"],
  "riders-topped-up": ["riders who topped up", "topped up"],
  "partner-swaps": ["swaps at partner stations", "partner swaps", "partner stations", "partners"],
  "partner-points": ["points earned by partners", "partner points", "partner earnings", "commission"],
  "partner-share": ["partner share", "share of swaps"],
  "new-riders": ["new riders", "sign-ups", "signups", "sign ups", "new customers", "acquisition", "onboarded"],
  "referral-signups": ["referral sign-ups", "referrals", "referral"],
  "rider-return-rate": ["riders who came back", "came back", "retention", "returning riders", "churn"],
};

/** Phrases that pick a split. */
const SPLIT_WORDS: { re: RegExp; property: PropertyId }[] = [
  { re: /\b(?:by|per|across|split by|for each)\s+(?:region|regions|area|areas|city|cities)\b/, property: "region" },
  { re: /\b(?:by|per|across|split by|for each)\s+(?:station|stations|site|sites)\b/, property: "station" },
  { re: /\b(?:by|per|across|split by|for each)\s+(?:service|services|product|products)\b/, property: "service" },
  { re: /\b(?:by|per|across|split by|for each)\s+(?:customer type|customer types|baas|plan type)\b|\bbaas\b/, property: "customerType" },
  { re: /\b(?:by|per|across|split by|for each)\s+(?:country|countries|market|markets)\b/, property: "country" },
  { re: /\b(?:by|per|across|split by|for each)\s+(?:state|states|battery state|lifecycle)\b|\bby state\b/, property: "batteryState" },
];

/** Time phrases, longest first. "Last week" reads as the last 7 days: the presets count back from today. */
const TIME_WORDS: { re: RegExp; range: () => DateRange }[] = [
  { re: /\b(?:this month|month to date|mtd)\b/, range: () => ({ preset: "mtd" }) },
  { re: /\b(?:last|previous) month\b/, range: () => ({ preset: "lastMonth" }) },
  { re: /\b(?:this quarter|quarter to date)\b/, range: () => ({ preset: "qtd" }) },
  { re: /\b(?:last|past|previous) (?:12 months|year)\b|\bthis year\b|\byear to date\b/, range: () => ({ preset: "12m" }) },
  // No preset for six months any more: the same span as custom dates.
  { re: /\b(?:last|past|previous) (?:6 months|half year)\b/, range: () => sixMonths() },
  { re: /\b(?:last|past|previous) (?:90 days|3 months|three months|quarter)\b/, range: () => ({ preset: "90d" }) },
  { re: /\b(?:past|previous) month\b|\b(?:last|past|previous) (?:30 days|4 weeks|four weeks)\b/, range: () => ({ preset: "30d" }) },
  { re: /\b(?:last|past|previous) (?:7 days|week|seven days)\b|\bthis week\b|\byesterday\b/, range: () => ({ preset: "7d" }) },
  { re: /\btoday\b|\bso far today\b/, range: () => ({ preset: "today" }) },
];

function sixMonths(): DateRange {
  const to = lastCompleteDay();
  return { preset: "custom", from: isoDay(addDays(subMonths(to, 6), 1)), to: isoDay(to) };
}

const GROUPING_WORDS: { re: RegExp; grouping: Grouping }[] = [
  { re: /\b(?:daily|per day|each day|day by day)\b/, grouping: "day" },
  { re: /\b(?:weekly|per week|each week|week by week)\b/, grouping: "week" },
  { re: /\b(?:monthly|per month|each month|month by month)\b/, grouping: "month" },
];

export interface Reading {
  metrics: Metric[];
  split?: PropertyId;
  /** A split asked for that the main metric can't use. */
  splitDropped?: PropertyId;
  /** A country named on its own, or the one every named region is in. */
  country: string | null;
  regions: string[];
  range?: DateRange;
  grouping?: Grouping;
}

export interface DashboardDraft {
  name: string;
  category: CategoryId;
  widgets: Widget[];
  range: DateRange;
  country: string | null;
  regions: string[];
  visibility: Visibility;
  reading: Reading;
}

export type DraftResult =
  | { kind: "draft"; draft: DashboardDraft }
  /** "Revenue" could be either: ask before drafting. */
  | { kind: "ask"; question: string; options: { label: string; metricId: string }[] }
  | { kind: "none" };

export const REVENUE_QUESTION = {
  question: "Revenue as points debited or top-ups received?",
  options: [
    { label: "Points debited", metricId: "points-debited" },
    { label: "Top-ups received", metricId: "top-ups" },
  ],
};

export const EXAMPLE_PROMPTS = [
  "Swaps by station in Nairobi this month",
  "Battery inventory by state and batteries needing service",
  "Riders with negative balance by region, last 90 days",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every metric the text names, in the order it names them, each phrase used once. */
function findMetrics(text: string): Metric[] {
  const phrases = Object.entries(METRIC_WORDS)
    .flatMap(([id, words]) => words.map((w) => ({ id, w })))
    .sort((a, b) => b.w.length - a.w.length);
  const taken: [number, number][] = [];
  const found: { id: string; at: number }[] = [];
  for (const { id, w } of phrases) {
    const re = new RegExp(`(?:^|[^a-z0-9])(${escape(w)})(?=$|[^a-z0-9])`, "g");
    for (const m of text.matchAll(re)) {
      const start = m.index! + m[0].length - m[1].length;
      const end = start + m[1].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      if (!found.some((f) => f.id === id)) found.push({ id, at: start });
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => metricById(f.id)!);
}

/** What the text asks for, before any drafting. */
export function readPrompt(raw: string, chosenMetricId?: string): Reading & { mentionsRevenue: boolean } {
  const text = raw.toLowerCase();
  let metrics = findMetrics(text);
  if (chosenMetricId) metrics = [metricById(chosenMetricId)!, ...metrics.filter((m) => m.id !== chosenMetricId)];
  const split = SPLIT_WORDS.find((s) => s.re.test(text))?.property;
  const regions = PROPERTIES.region.values.filter((r) => new RegExp(`\\b${escape(r.toLowerCase())}\\b`).test(text));
  const named = PROPERTIES.country.values.filter((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(text));
  const regionCountries = [...new Set(regions.map((r) => REGION_COUNTRY[r]))];
  // One country, named or implied by the regions; none when the text spans two.
  const countries = [...new Set([...named, ...regionCountries])];
  const country = countries.length === 1 ? countries[0] : null;
  const range = TIME_WORDS.find((t) => t.re.test(text))?.range();
  const grouping = GROUPING_WORDS.find((g) => g.re.test(text))?.grouping;
  return { metrics, split, country, regions, range, grouping, mentionsRevenue: /\b(?:revenue|income|sales|takings)\b/.test(text) };
}

/** Turns a prompt into a draft dashboard, a question, or "nothing matched". */
export function draftFromPrompt(raw: string, chosenMetricId?: string): DraftResult {
  const r = readPrompt(raw, chosenMetricId);
  const revenueNamed = r.metrics.some((m) => m.id === "points-debited" || m.id === "top-ups");
  if (r.mentionsRevenue && !revenueNamed && !chosenMetricId) return { kind: "ask", ...REVENUE_QUESTION };
  if (r.metrics.length === 0) return { kind: "none" };

  const [main, ...others] = r.metrics;
  const split = r.split && main.splitBy.includes(r.split) ? r.split : undefined;
  // A region split filtered to one region says little; compare stations there instead.
  const compareBy: PropertyId =
    split ?? (r.regions.length === 1 && main.splitBy.includes("station") ? "station" : main.defaultSplit ?? main.splitBy.find((p) => p !== "region") ?? main.splitBy[0]);

  const make = (m: Metric, type: Widget["type"], splitBy?: PropertyId, extra: Partial<Widget> = {}) =>
    normalise({ ...makeWidget(m, type), splitBy, ...extra }, false);

  const widgets: Widget[] = [make(main, "kpi")];
  if (others[0]) widgets.push(make(others[0], "kpi"));
  widgets.push(
    main.unit !== "%" && split && main.aggregation === "latest"
      ? make(main, "stacked", split, { grouping: r.grouping })
      : make(main, "line", split, { grouping: r.grouping })
  );
  widgets.push(make(main, "bar", compareBy));
  if (widgets.length < 4) widgets.push(others[1] ? make(others[1], "kpi") : make(main, "table", compareBy, { compare: true }));

  const ordered = orderWidgets(widgets.slice(0, 4)).map((w) => ({ ...w, title: titleFor(w) }));
  const where = r.regions.length > 0 ? ` in ${r.regions.join(" and ")}` : r.country ? ` in ${r.country}` : "";
  return {
    kind: "draft",
    draft: {
      name: `${splitName(main, split)}${where}`.slice(0, 60),
      category: main.category,
      widgets: ordered,
      range: r.range ?? DEFAULT_RANGE,
      country: r.country,
      regions: r.regions,
      visibility: "private",
      reading: { metrics: r.metrics, split, splitDropped: r.split && !split ? r.split : undefined, country: r.country, regions: r.regions, range: r.range, grouping: r.grouping },
    },
  };
}

function titleFor(w: Widget): string {
  return splitName(metricById(w.metricId)!, w.type === "kpi" ? undefined : w.splitBy);
}

/** "Metric: Points debited · Split by: Service · Country: Kenya · Region: Nairobi · Last 30 days · 19 Oct – 17 Nov 2026" */
export function readingLine(r: Reading): string {
  const parts = [`${r.metrics.length > 1 ? "Metrics" : "Metric"}: ${r.metrics.map((m) => m.name).join(", ")}`];
  if (r.split) parts.push(`Split by: ${PROPERTIES[r.split].name}`);
  if (r.splitDropped) parts.push(`Not split by ${PROPERTIES[r.splitDropped].name.toLowerCase()} (${r.metrics[0].name} can’t be)`);
  if (r.country) parts.push(`Country: ${r.country}`);
  if (r.regions.length > 0) parts.push(`${r.regions.length > 1 ? "Regions" : "Region"}: ${r.regions.join(", ")}`);
  const empty = r.regions.filter((x) => hasNoData("region", x));
  if (empty.length > 0) parts.push(`No data for ${empty.join(" and ")} yet`);
  parts.push(r.range ? rangeWithDates(r.range) : `${rangeWithDates(DEFAULT_RANGE)} (no time given)`);
  if (r.grouping) parts.push({ day: "Daily", week: "Weekly", month: "Monthly" }[r.grouping]);
  return parts.join(" · ");
}
