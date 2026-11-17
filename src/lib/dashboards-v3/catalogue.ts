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

/** Every station's region. Regions not listed here (Thika, Eldoret, Machakos, Mombasa) have no stations yet. */
export const STATION_REGION: Record<string, string> = {
  Westlands: "Nairobi",
  "CBD Moi Avenue": "Nairobi",
  Kilimani: "Nairobi",
  "Upper Hill": "Nairobi",
  Embakasi: "Nairobi",
  Karen: "Nairobi",
  "Thika Road Mall": "Nairobi",
  "Nanyuki Town": "Nanyuki",
  "Nyeri Central": "Nyeri",
  "Meru Makutano": "Meru",
  "Nakuru East": "Nakuru",
  "Kisumu Kondele": "Kisumu",
};

export const PROPERTY_ORDER: PropertyId[] = ["region", "station", "service", "customerType", "country", "batteryState"];

export type Unit = "points" | "kWh" | "count" | "%";
export type Aggregation = "sum" | "average" | "latest" | "unique";
export type ChartType = "kpi" | "line" | "bar" | "stacked" | "table" | "text";

export interface Metric {
  id: string;
  name: string;
  category: CategoryId;
  /** What it is, in one sentence. */
  definition: string;
  /** How it's counted over a period. */
  counted: string;
  /** What a good trend looks like. */
  goodTrend: string;
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
  /** What a count is of, written after the number: "200.8K swaps". Points, kWh and percentages say their unit instead. */
  noun?: string;
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
    counted: "Added up across every swap and charge session in the period.",
    goodTrend: "Rising with swaps and sessions; a rise with flat swaps can mean higher prices.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
    mock: { base: 412_000, trend: 0.22, weekend: 0.78 },
  },
  {
    id: "top-ups", name: "Top-ups", category: "revenue",
    definition: "Points riders added to their wallets, by M-Pesa or at a partner.",
    counted: "Added up across every top-up made in the period.",
    goodTrend: "Rising, ideally in step with points debited so balances stay positive.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: "Top-ups are made from a rider's wallet, not at a station", service: "A top-up isn't tied to a service" },
    mock: { base: 398_000, trend: 0.18, weekend: 0.7 },
  },
  {
    id: "kwh-billed", name: "kWh billed", category: "revenue",
    definition: "Energy charged to riders across every service.",
    counted: "Added up across every session billed in the period.",
    goodTrend: "Rising as more riders swap and charge.",
    unit: "kWh", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
    mock: { base: 9_400, trend: 0.25, weekend: 0.8 },
  },
  {
    id: "points-per-swap", name: "Average points per swap", category: "revenue",
    definition: "Points debited for swaps divided by the number of swaps.",
    counted: "Points debited for swaps divided by the number of swaps, averaged over the period.",
    goodTrend: "Steady; sudden moves usually mean a price change.",
    unit: "points", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "station", "customerType"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "This metric already covers swaps only" },
    mock: { base: 182, trend: 0.04, weekend: 1 },
  },

  // Swaps and stations
  {
    id: "swaps", noun: "swaps", name: "Swaps", category: "swaps",
    definition: "Completed battery swaps at stations.",
    counted: "Each completed swap counts once, added up over the period.",
    goodTrend: "Rising, with fewer dips on weekdays.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every swap is the Swap service" },
    mock: { base: 2_260, trend: 0.2, weekend: 0.76 },
  },
  {
    id: "station-uptime", name: "Station uptime", category: "swaps",
    definition: "Share of the time stations were online and able to swap.",
    counted: "Online time divided by total time, averaged across stations over the period.",
    goodTrend: "High and steady, close to 100%.",
    unit: "%", aggregation: "average", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    notAllowed: { customerType: "Uptime is the station's, not a rider's", service: "Uptime is for swap stations only" },
    mock: { base: 97.2, trend: 0.002, weekend: 1 },
  },
  {
    id: "failed-swaps", noun: "failed swaps", name: "Failed swaps", category: "swaps",
    definition: "Swaps a rider started that didn't complete.",
    counted: "Each swap that didn’t complete counts once, added up over the period.",
    goodTrend: "Falling; a jump usually points to a station fault.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: false,
    mock: { base: 46, trend: -0.15, weekend: 0.8 },
  },

  // Charging
  {
    id: "fast-charge-sessions", noun: "sessions", name: "Fast charge sessions", category: "charging",
    definition: "Completed charge sessions at fast chargers.",
    counted: "Each completed fast charge session counts once, added up over the period.",
    goodTrend: "Rising as fast chargers get used more.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every session here is Fast charge" },
    mock: { base: 640, trend: 0.35, weekend: 0.85 },
  },
  {
    id: "home-charge-sessions", noun: "sessions", name: "Home charge sessions", category: "charging",
    definition: "Completed charge sessions on riders' home chargers.",
    counted: "Each completed home charge session counts once, added up over the period.",
    goodTrend: "Rising as more riders charge at home.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: NO_STATION, service: "Every session here is Home charge" },
    mock: { base: 310, trend: 0.4, weekend: 1.15 },
  },
  {
    id: "energy-per-session", name: "Energy per charge session", category: "charging",
    definition: "Average kWh delivered in one fast or home charge session.",
    counted: "kWh delivered divided by the number of sessions, averaged over the period.",
    goodTrend: "Steady; a fall can mean sessions are being cut short.",
    unit: "kWh", aggregation: "average", defaultChart: "kpi", splitBy: ["service", "region"], filters: ["service", "region", "country"],
    higherIsBetter: true,
    mock: { base: 2.8, trend: 0.03, weekend: 1 },
  },

  // Batteries
  {
    id: "battery-inventory", noun: "batteries", name: "Battery inventory by state", category: "batteries",
    definition: "Batteries on record at the end of each day, by their onboarding or lifecycle state.",
    counted: "Batteries counted in each state at the end of the period’s last day.",
    goodTrend: "Most batteries Active, few in Quarantine.",
    unit: "count", aggregation: "latest", defaultChart: "stacked", defaultSplit: "batteryState",
    splitBy: ["batteryState", "region", "station"], filters: ["batteryState", "region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 6_800, trend: 0.12, weekend: 1 },
  },
  {
    id: "batteries-needing-service", noun: "batteries", name: "Batteries needing service", category: "batteries",
    definition: "Batteries flagged for repair or inspection at the end of each day.",
    counted: "Batteries flagged for service, counted at the end of the period’s last day.",
    goodTrend: "Low and falling as repairs keep up.",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: false,
    mock: { base: 128, trend: -0.1, weekend: 1 },
  },
  {
    id: "battery-health", name: "Average battery health", category: "batteries",
    definition: "Average remaining capacity of batteries in service, against new.",
    counted: "Remaining capacity against new, averaged across batteries in service.",
    goodTrend: "High and slow to fall.",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 91.5, trend: -0.02, weekend: 1 },
  },

  // Fleet
  {
    id: "active-vehicles", noun: "vehicles", name: "Active vehicles", category: "fleet",
    definition: "Vehicles that made at least one trip.",
    counted: "Each vehicle counts once, however many trips it made in the period.",
    goodTrend: "Rising as the fleet grows and gets used.",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 3_150, trend: 0.24, weekend: 0.82 },
  },
  {
    id: "vehicles-offline", noun: "vehicles", name: "Vehicles offline", category: "fleet",
    definition: "Vehicles whose tracker hasn't reported for over 24 hours, at the end of each day.",
    counted: "Vehicles not reporting for over 24 hours, counted at the end of the period’s last day.",
    goodTrend: "Low and falling.",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 84, trend: -0.05, weekend: 1.1 },
  },
  {
    id: "immobilised-vehicles", noun: "vehicles", name: "Immobilised vehicles", category: "fleet",
    definition: "Vehicles switched off remotely, at the end of each day.",
    counted: "Vehicles switched off remotely, counted at the end of the period’s last day.",
    goodTrend: "Low; a rise often follows missed payments.",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 37, trend: 0.08, weekend: 1 },
  },

  // Customers
  {
    id: "active-riders", noun: "riders", name: "Active riders", category: "customers",
    definition: "Riders who swapped or charged at least once.",
    counted: "Each rider counts once, however many times they swapped or charged.",
    goodTrend: "Rising as riders keep coming back.",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ALL, filters: ALL,
    higherIsBetter: true,
    mock: { base: 2_940, trend: 0.21, weekend: 0.8 },
  },
  {
    id: "negative-balance", noun: "riders", name: "Riders with negative balance", category: "customers",
    definition: "Riders whose wallet was below zero at the end of each day.",
    counted: "Riders with a wallet below zero, counted at the end of the period’s last day.",
    goodTrend: "Low and falling.",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
    mock: { base: 212, trend: 0.06, weekend: 1.05 },
  },
  {
    id: "riders-topped-up", noun: "riders", name: "Riders who topped up", category: "customers",
    definition: "Riders who added points to their wallet at least once.",
    counted: "Each rider counts once, however many times they topped up.",
    goodTrend: "Rising, close to the number of active riders.",
    unit: "count", aggregation: "unique", defaultChart: "bar", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 1_380, trend: 0.16, weekend: 0.7 },
  },

  // Partners
  {
    id: "partner-swaps", noun: "swaps", name: "Swaps at partner stations", category: "partners",
    definition: "Completed swaps at stations run by partners.",
    counted: "Each completed swap at a partner station counts once, added up over the period.",
    goodTrend: "Rising as partner stations get used more.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 720, trend: 0.3, weekend: 0.8 },
  },
  {
    id: "partner-points", name: "Points earned by partners", category: "partners",
    definition: "Points partners earned from swaps and top-ups at their stations.",
    counted: "Added up across every swap and top-up at partner stations in the period.",
    goodTrend: "Rising with partner swaps.",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    mock: { base: 64_000, trend: 0.28, weekend: 0.78 },
  },
  {
    id: "partner-share", name: "Partner share of swaps", category: "partners",
    definition: "Swaps at partner stations as a share of all swaps.",
    counted: "Partner station swaps divided by all swaps, averaged over the period.",
    goodTrend: "Depends on the plan: rising if the network is meant to grow through partners.",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "country"], filters: ["region", "country"],
    higherIsBetter: true,
    mock: { base: 31.5, trend: 0.06, weekend: 1 },
  },

  // Growth
  {
    id: "new-riders", noun: "riders", name: "New riders", category: "growth",
    definition: "Riders who completed their first swap or charge.",
    counted: "Each rider counts once, on the day of their first swap or charge.",
    goodTrend: "Rising, or steady at the level you plan for.",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 46, trend: 0.3, weekend: 0.9 },
  },
  {
    id: "referral-signups", noun: "sign-ups", name: "Referral sign-ups", category: "growth",
    definition: "New riders who joined with another rider's referral code.",
    counted: "Each new rider who used a referral code counts once, added up over the period.",
    goodTrend: "Rising.",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    mock: { base: 14, trend: 0.45, weekend: 1.1 },
  },
  {
    id: "rider-return-rate", name: "Riders who came back", category: "growth",
    definition: "Share of the previous period's active riders who were active again.",
    counted: "Riders active again this period divided by last period’s active riders.",
    goodTrend: "High and steady.",
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
