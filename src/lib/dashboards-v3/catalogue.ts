/**
 * Dashboards (v3) sandbox: the fixed categories, the properties a metric can
 * be split or filtered by, and the named metric catalogue. Mock only; nothing
 * here reads real data or the existing Dashboards.
 */

export const CATEGORIES = [
  { id: "revenue", name: "Revenue and billing" },
  { id: "swaps", name: "Swaps and stations" },
  { id: "charging", name: "Charging" },
  { id: "batteries", name: "Batteries" },
  { id: "fleet", name: "Fleet" },
  { id: "customers", name: "Customers" },
  { id: "partners", name: "Partners" },
  { id: "growth", name: "Growth" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

/** Chip colours, one per category. Static class names so Tailwind emits them; the chip always shows its name too. */
export const CATEGORY_CHIP: Record<CategoryId, string> = {
  revenue: "bg-lime-50 text-lime-800",
  swaps: "bg-teal-50 text-teal-800",
  charging: "bg-amber-50 text-amber-800",
  batteries: "bg-violet-50 text-violet-700",
  fleet: "bg-sky-50 text-sky-800",
  customers: "bg-rose-50 text-rose-700",
  partners: "bg-fuchsia-50 text-fuchsia-700",
  growth: "bg-slate-100 text-slate-700",
};

export type PropertyId = "region" | "station" | "service" | "customerType" | "country" | "batteryState";

export const PROPERTIES: Record<PropertyId, { name: string; values: string[] }> = {
  region: {
    name: "Region",
    values: ["Nairobi", "Nanyuki", "Nyeri", "Meru", "Nakuru", "Thika", "Kisumu", "Eldoret", "Machakos", "Mombasa"],
  },
  station: {
    name: "Station",
    values: [
      "Westlands", "CBD Moi Avenue", "Kilimani", "Upper Hill", "Embakasi", "Karen",
      "Thika Road Mall", "Nanyuki Town", "Nyeri Central", "Meru Makutano", "Nakuru East", "Kisumu Kondele",
    ],
  },
  service: { name: "Service", values: ["Swap", "Fast charge", "Home charge"] },
  customerType: { name: "Customer type", values: ["BaaS", "Non-BaaS"] },
  country: { name: "Country", values: ["Kenya", "Uganda", "Rwanda"] },
  // The lifecycle states from the Battery Onboarding PRD, in order.
  batteryState: {
    name: "Battery state",
    values: ["Pre-bring-up", "Deployment-ready 1/2", "Register for storage", "Deployment-ready 2/2", "Active", "Quarantine", "Retired"],
  },
};

export const PROPERTY_ORDER: PropertyId[] = ["region", "station", "service", "customerType", "country", "batteryState"];

export type Unit = "points" | "kWh" | "count" | "%";
export type Aggregation = "sum" | "average" | "latest" | "unique";
export type ChartType = "kpi" | "line" | "bar" | "stacked" | "table" | "text";

export interface Metric {
  id: string;
  name: string;
  category: CategoryId;
  definition: string;
  unit: Unit;
  aggregation: Aggregation;
  defaultChart: Exclude<ChartType, "text">;
  /** Properties it can be split by, and filtered by. Anything else is greyed out with `notAllowed`'s reason. */
  splitBy: PropertyId[];
  filters: PropertyId[];
  /** Split used when its default chart needs one (a stacked bar). */
  defaultSplit?: PropertyId;
  /** Whether a rise is good news: sets the KPI change colour; the arrow and words always show. */
  higherIsBetter: boolean;
  /** Why a property isn't offered for this metric, where the reason isn't obvious. */
  notAllowed?: Partial<Record<PropertyId, string>>;
  /** Shape of the mock numbers: a typical day, growth over a year, and how much weekends dip. */
  mock: { base: number; trend: number; weekend: number };
}

const ALL: PropertyId[] = ["region", "station", "service", "customerType", "country"];
const NO_STATION = "Home charging doesn't happen at a station";
const ONLY_BATTERIES = "Only battery metrics have a battery state";

export const METRICS: Metric[] = [
  // Revenue and billing
  {
    id: "points-debited", name: "Points debited", category: "revenue",
    definition: "Wallet points taken from riders' balances for swaps and charging.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
    mock: { base: 412_000, trend: 0.22, weekend: 0.78 },
  },
  {
    id: "top-ups", name: "Top-ups", category: "revenue",
    definition: "Points riders added to their wallets, by M-Pesa or at a partner.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: "Top-ups are made from a rider's wallet, not at a station", service: "A top-up isn't tied to a service" },
    mock: { base: 398_000, trend: 0.18, weekend: 0.7 },
  },
  {
    id: "kwh-billed", name: "kWh billed", category: "revenue",
    definition: "Energy charged to riders across every service.",
    unit: "kWh", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
    mock: { base: 9_400, trend: 0.25, weekend: 0.8 },
  },
  {
    id: "points-per-swap", name: "Average points per swap", category: "revenue",
    definition: "Points debited for swaps divided by the number of swaps.",
    unit: "points", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "station", "customerType"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "This metric already covers swaps only" },
    mock: { base: 182, trend: 0.04, weekend: 1 },
  },

  // Swaps and stations
  {
    id: "swaps", name: "Swaps", category: "swaps",
    definition: "Completed battery swaps at stations.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every swap is the Swap service" },
    mock: { base: 2_260, trend: 0.2, weekend: 0.76 },
  },
  {
    id: "station-uptime", name: "Station uptime", category: "swaps",
    definition: "Share of the time stations were online and able to swap.",
    unit: "%", aggregation: "average", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    notAllowed: { customerType: "Uptime is the station's, not a rider's", service: "Uptime is for swap stations only" },
    mock: { base: 97.2, trend: 0.01, weekend: 1 },
  },
  {
    id: "failed-swaps", name: "Failed swaps", category: "swaps",
    definition: "Swaps a rider started that didn't complete.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: false,
    mock: { base: 46, trend: -0.15, weekend: 0.8 },
  },

  // Charging
  {
    id: "fast-charge-sessions", name: "Fast charge sessions", category: "charging",
    definition: "Completed charge sessions at fast chargers.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every session here is Fast charge" },
    mock: { base: 640, trend: 0.35, weekend: 0.85 },
  },
  {
    id: "home-charge-sessions", name: "Home charge sessions", category: "charging",
    definition: "Completed charge sessions on riders' home chargers.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: NO_STATION, service: "Every session here is Home charge" },
    mock: { base: 310, trend: 0.4, weekend: 1.15 },
  },
  {
    id: "energy-per-session", name: "Energy per charge session", category: "charging",
    definition: "Average kWh delivered in one fast or home charge session.",
    unit: "kWh", aggregation: "average", defaultChart: "kpi", splitBy: ["service", "region"], filters: ["service", "region", "country"],
    higherIsBetter: true,
    mock: { base: 2.8, trend: 0.03, weekend: 1 },
  },

  // Batteries
  {
    id: "battery-inventory", name: "Battery inventory by state", category: "batteries",
    definition: "Batteries on record at the end of each day, by their onboarding or lifecycle state.",
    unit: "count", aggregation: "latest", defaultChart: "stacked", defaultSplit: "batteryState",
    splitBy: ["batteryState", "region", "station"], filters: ["batteryState", "region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 6_800, trend: 0.12, weekend: 1 },
  },
  {
    id: "batteries-needing-service", name: "Batteries needing service", category: "batteries",
    definition: "Batteries flagged for repair or inspection at the end of each day.",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: false,
    mock: { base: 128, trend: -0.1, weekend: 1 },
  },
  {
    id: "battery-health", name: "Average battery health", category: "batteries",
    definition: "Average remaining capacity of batteries in service, against new.",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 91.5, trend: -0.02, weekend: 1 },
  },

  // Fleet
  {
    id: "active-vehicles", name: "Active vehicles", category: "fleet",
    definition: "Vehicles that made at least one trip.",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 3_150, trend: 0.24, weekend: 0.82 },
  },
  {
    id: "vehicles-offline", name: "Vehicles offline", category: "fleet",
    definition: "Vehicles whose tracker hasn't reported for over 24 hours, at the end of each day.",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 84, trend: -0.05, weekend: 1.1 },
  },
  {
    id: "immobilised-vehicles", name: "Immobilised vehicles", category: "fleet",
    definition: "Vehicles switched off remotely, at the end of each day.",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 37, trend: 0.08, weekend: 1 },
  },

  // Customers
  {
    id: "active-riders", name: "Active riders", category: "customers",
    definition: "Riders who swapped or charged at least once.",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ALL, filters: ALL,
    higherIsBetter: true,
    mock: { base: 2_940, trend: 0.21, weekend: 0.8 },
  },
  {
    id: "negative-balance", name: "Riders with negative balance", category: "customers",
    definition: "Riders whose wallet was below zero at the end of each day.",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 212, trend: 0.06, weekend: 1.05 },
  },
  {
    id: "riders-topped-up", name: "Riders who topped up", category: "customers",
    definition: "Riders who added points to their wallet at least once.",
    unit: "count", aggregation: "unique", defaultChart: "bar", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 1_380, trend: 0.16, weekend: 0.7 },
  },

  // Partners
  {
    id: "partner-swaps", name: "Swaps at partner stations", category: "partners",
    definition: "Completed swaps at stations run by partners.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 720, trend: 0.3, weekend: 0.8 },
  },
  {
    id: "partner-points", name: "Points earned by partners", category: "partners",
    definition: "Points partners earned from swaps and top-ups at their stations.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 64_000, trend: 0.28, weekend: 0.78 },
  },
  {
    id: "partner-share", name: "Partner share of swaps", category: "partners",
    definition: "Swaps at partner stations as a share of all swaps.",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "country"], filters: ["region", "country"],
    higherIsBetter: true,
    mock: { base: 31.5, trend: 0.06, weekend: 1 },
  },

  // Growth
  {
    id: "new-riders", name: "New riders", category: "growth",
    definition: "Riders who completed their first swap or charge.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 46, trend: 0.3, weekend: 0.9 },
  },
  {
    id: "referral-signups", name: "Referral sign-ups", category: "growth",
    definition: "New riders who joined with another rider's referral code.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 14, trend: 0.45, weekend: 1.1 },
  },
  {
    id: "rider-return-rate", name: "Riders who came back", category: "growth",
    definition: "Share of the previous period's active riders who were active again.",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 78.4, trend: 0.03, weekend: 1 },
  },
];

// Battery state is only meaningful for batteries; every other metric gets the reason.
for (const m of METRICS) {
  if (m.category !== "batteries") m.notAllowed = { ...m.notAllowed, batteryState: ONLY_BATTERIES };
}

const BY_ID = new Map(METRICS.map((m) => [m.id, m]));

export function metricById(id: string | undefined): Metric | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The first three metrics in a category: suggested at the top of the metric picker and on a blank dashboard. */
export function suggestedMetrics(category: CategoryId): Metric[] {
  return METRICS.filter((m) => m.category === category).slice(0, 3);
}

/** Why a property can't be used to split or filter a metric, or null when it can. */
export function propertyBlocked(metric: Metric, property: PropertyId, use: "split" | "filter"): string | null {
  const allowed = use === "split" ? metric.splitBy : metric.filters;
  if (allowed.includes(property)) return null;
  return metric.notAllowed?.[property] ?? `${metric.name} can't be ${use === "split" ? "split" : "filtered"} by ${PROPERTIES[property].name.toLowerCase()}`;
}
