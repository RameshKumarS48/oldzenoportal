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
    values: ["Nairobi", "Nanyuki", "Nyeri", "Meru", "Nakuru", "Thika", "Kisumu", "Eldoret", "Machakos", "Mombasa", "Kampala", "Entebbe"],
  },
  station: {
    name: "Station",
    values: [
      "Westlands", "CBD Moi Avenue", "Kilimani", "Upper Hill", "Embakasi", "Karen",
      "Thika Road Mall", "Nanyuki Town", "Nanyuki Majengo", "Nanyuki Likii", "Nanyuki Airstrip", "Nyeri Central", "Meru Makutano", "Nakuru East", "Kisumu Kondele",
      "Kampala Central", "Ntinda", "Entebbe Town",
    ],
  },
  service: { name: "Service", values: ["Swap", "Fast charge", "Home charge"] },
  customerType: { name: "Customer type", values: ["BaaS", "Non-BaaS"] },
  country: { name: "Country", values: ["Kenya", "Uganda"] },
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
  "Nanyuki Majengo": "Nanyuki",
  "Nanyuki Likii": "Nanyuki",
  "Nanyuki Airstrip": "Nanyuki",
  "Nyeri Central": "Nyeri",
  "Meru Makutano": "Meru",
  "Nakuru East": "Nakuru",
  "Kisumu Kondele": "Kisumu",
  "Kampala Central": "Kampala",
  Ntinda: "Kampala",
  "Entebbe Town": "Entebbe",
};

/** Every region's country: country, region and station are one hierarchy, so a country is its regions and a region its stations. */
export const REGION_COUNTRY: Record<string, string> = {
  ...Object.fromEntries(PROPERTIES.region.values.map((r) => [r, "Kenya"])),
  Kampala: "Uganda",
  Entebbe: "Uganda",
};

/** The regions in a country, or every region when no country is chosen. */
export function regionsIn(country: string | null): string[] {
  return PROPERTIES.region.values.filter((r) => !country || REGION_COUNTRY[r] === country);
}

/** A property's values that can be chosen with this country selected: its regions, its stations; everything else as is. */
export function valuesIn(property: PropertyId, country: string | null): string[] {
  if (!country) return PROPERTIES[property].values;
  if (property === "region") return regionsIn(country);
  if (property === "station") return PROPERTIES.station.values.filter((s) => REGION_COUNTRY[STATION_REGION[s]] === country);
  if (property === "country") return [country];
  return PROPERTIES[property].values;
}

/** Country, region and station: where something happened, nested inside each other. */
export const LOCATION: PropertyId[] = ["country", "region", "station"];

export const PROPERTY_ORDER: PropertyId[] = ["region", "station", "service", "customerType", "country", "batteryState"];

export type Unit = "points" | "kWh" | "count" | "%";
/** ratio: one total over another for the whole period (points per swap = swap points ÷ swaps), not an average of daily ratios. */
export type Aggregation = "sum" | "average" | "latest" | "unique" | "ratio";
export type ChartType = "kpi" | "line" | "bar" | "stacked" | "table" | "text";
/** period: a total (or average) over a date range. snapshot: the state at one moment, such as now. */
export type MetricKind = "period" | "snapshot";

export interface Metric {
  id: string;
  name: string;
  category: CategoryId;
  /**
   * period: added up (or averaged) over the date range. snapshot: the value
   * at one moment; numbers, bars and tables show the current value and
   * ignore the date range, lines show the value at the end of each period.
   */
  kind: MetricKind;
  /** What it is, in one sentence. */
  definition: string;
  /** How it's counted over a period. */
  counted: string;
  /** What a good trend looks like. */
  goodTrend: string;
  /** What the figure leaves out, in a short phrase for a widget's footer. "[to confirm]" marks placeholders. */
  excludes: string;
  unit: Unit;
  aggregation: Aggregation;
  defaultChart: Exclude<ChartType, "text">;
  /** Properties it can be split by, and filtered by. Anything else is greyed out with `notAllowed`'s reason. */
  splitBy: PropertyId[];
  filters: PropertyId[];
  /** Split used when its default chart needs one (a stacked bar). */
  defaultSplit?: PropertyId;
  /**
   * Whether a rise is good news: sets the change colour (green or red); the
   * arrow and words always show. "neutral" for metrics where neither way is
   * good in itself, like points per swap: their change is grey.
   */
  higherIsBetter: boolean | "neutral";
  /** Why a property isn't offered for this metric, where the reason isn't obvious. */
  notAllowed?: Partial<Record<PropertyId, string>>;
  /** What a count is of, written after the number: "200.8K swaps". Points, kWh and percentages say their unit instead. */
  noun?: string;
}

const ALL: PropertyId[] = ["region", "station", "service", "customerType", "country"];
const NO_STATION = "Home charging doesn't happen at a station";
const ONLY_BATTERIES = "Only battery metrics have a battery state";

export const METRICS: Metric[] = [
  // Revenue and billing
  {
    id: "points-debited", name: "Points debited", category: "revenue", kind: "period",
    definition: "Wallet points taken from riders' balances for swaps and charging.",
    counted: "Added up across every swap and charge session in the period.",
    goodTrend: "Rising with swaps and sessions; a rise with flat swaps can mean higher prices.",
    excludes: "Excludes refunds and manual wallet adjustments",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
  },
  {
    id: "top-ups", name: "Top-ups", category: "revenue", kind: "period",
    definition: "Points riders added to their wallets, by M-Pesa or at a partner.",
    counted: "Added up across every top-up made in the period.",
    goodTrend: "Rising, ideally in step with points debited so balances stay positive.",
    excludes: "Excludes reversed M-Pesa payments",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: "Top-ups are made from a rider's wallet, not at a station", service: "A top-up isn't tied to a service" },
  },
  {
    id: "kwh-billed", name: "kWh billed", category: "revenue", kind: "period",
    definition: "Energy charged to riders across every service.",
    counted: "Added up across every session billed in the period.",
    goodTrend: "Rising as more riders swap and charge.",
    excludes: "Excludes unbilled fast charges",
    unit: "kWh", aggregation: "sum", defaultChart: "line", splitBy: ALL, filters: ALL, higherIsBetter: true,
  },
  {
    id: "points-per-swap", name: "Average points per swap", category: "revenue", kind: "period",
    definition: "Points debited for swaps divided by the number of swaps.",
    counted: "All points debited for swaps in the period divided by all swaps in it.",
    goodTrend: "Steady; sudden moves usually mean a price change.",
    excludes: "Excludes free swaps from promotions",
    unit: "points", aggregation: "ratio", defaultChart: "kpi", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: "neutral",
    notAllowed: { service: "This metric already covers swaps only" },
  },

  // Swaps and stations
  {
    id: "swaps", noun: "swaps", name: "Swaps", category: "swaps", kind: "period",
    definition: "Completed battery swaps at stations.",
    counted: "Each completed swap counts once, added up over the period.",
    goodTrend: "Rising, with fewer dips on weekdays.",
    excludes: "Excludes test stations",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every swap is the Swap service" },
  },
  {
    id: "station-uptime", name: "Station uptime", category: "swaps", kind: "snapshot",
    definition: "Share of stations online and able to swap.",
    counted: "Stations online divided by all stations, at each morning’s 06:00 refresh.",
    goodTrend: "High and steady, close to 100%.",
    excludes: "Excludes test stations and planned maintenance",
    unit: "%", aggregation: "latest", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
    notAllowed: { customerType: "Uptime is the station's, not a rider's", service: "Uptime is for swap stations only" },
  },
  {
    id: "failed-swaps", noun: "failed swaps", name: "Failed swaps", category: "swaps", kind: "period",
    definition: "Swaps a rider started that didn't complete.",
    counted: "Each swap that didn’t complete counts once, added up over the period.",
    goodTrend: "Falling; a jump usually points to a station fault.",
    excludes: "Excludes test stations",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: false,
  },

  // Charging
  {
    id: "fast-charge-sessions", noun: "sessions", name: "Fast charge sessions", category: "charging", kind: "period",
    definition: "Completed charge sessions at fast chargers.",
    counted: "Each completed fast charge session counts once, added up over the period.",
    goodTrend: "Rising as fast chargers get used more.",
    excludes: "Excludes unbilled fast charges",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "customerType", "country"], filters: ["region", "station", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { service: "Every session here is Fast charge" },
  },
  {
    id: "home-charge-sessions", noun: "sessions", name: "Home charge sessions", category: "charging", kind: "period",
    definition: "Completed charge sessions on riders' home chargers.",
    counted: "Each completed home charge session counts once, added up over the period.",
    goodTrend: "Rising as more riders charge at home.",
    excludes: "Excludes sessions under 0.1 kWh",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
    notAllowed: { station: NO_STATION, service: "Every session here is Home charge" },
  },
  {
    id: "energy-per-session", name: "Energy per charge session", category: "charging", kind: "period",
    definition: "Average kWh delivered in one fast or home charge session.",
    counted: "All kWh delivered in the period divided by all sessions in it.",
    goodTrend: "Steady; a fall can mean sessions are being cut short.",
    excludes: "Excludes unbilled fast charges",
    unit: "kWh", aggregation: "ratio", defaultChart: "kpi", splitBy: ["service", "region"], filters: ["service", "region", "country"],
    higherIsBetter: "neutral",
  },

  // Batteries
  {
    id: "battery-inventory", noun: "batteries", name: "Battery inventory by state", category: "batteries", kind: "snapshot",
    definition: "Batteries on record, by their onboarding or lifecycle state.",
    counted: "Batteries in each state at the 06:00 refresh.",
    goodTrend: "Most batteries Active, few in Quarantine.",
    excludes: "Excludes batteries in transit between sites",
    unit: "count", aggregation: "latest", defaultChart: "stacked", defaultSplit: "batteryState",
    splitBy: ["batteryState", "region", "station"], filters: ["batteryState", "region", "station", "country"],
    higherIsBetter: true,
  },
  {
    id: "batteries-needing-service", noun: "batteries", name: "Batteries needing service", category: "batteries", kind: "snapshot",
    definition: "Batteries flagged for repair or inspection.",
    counted: "Batteries flagged for service at the 06:00 refresh.",
    goodTrend: "Low and falling as repairs keep up.",
    excludes: "Excludes Retired batteries",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: false,
  },
  {
    id: "battery-health", name: "Average battery health", category: "batteries", kind: "snapshot",
    definition: "Average remaining capacity of batteries in service, against new.",
    counted: "Remaining capacity against new, averaged across batteries in service at the 06:00 refresh.",
    goodTrend: "High and slow to fall.",
    excludes: "Excludes Quarantine and Retired batteries",
    unit: "%", aggregation: "latest", defaultChart: "kpi", splitBy: ["region", "station"], filters: ["region", "station", "country"],
    higherIsBetter: true,
  },

  // Fleet
  {
    id: "active-vehicles", noun: "vehicles", name: "Active vehicles", category: "fleet", kind: "period",
    definition: "Vehicles that made at least one trip.",
    counted: "Each vehicle counts once, however many trips it made in the period.",
    goodTrend: "Rising as the fleet grows and gets used.",
    excludes: "Excludes test and staff vehicles",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
  },
  {
    id: "vehicles-offline", noun: "vehicles", name: "Vehicles offline", category: "fleet", kind: "snapshot",
    definition: "Vehicles whose tracker hasn't reported for over 24 hours.",
    counted: "Vehicles not reporting for over 24 hours at the 06:00 refresh.",
    goodTrend: "Low and falling.",
    excludes: "Excludes immobilised vehicles",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
  },
  {
    id: "immobilised-vehicles", noun: "vehicles", name: "Immobilised vehicles", category: "fleet", kind: "snapshot",
    definition: "Vehicles switched off remotely.",
    counted: "Vehicles switched off remotely at the 06:00 refresh.",
    goodTrend: "Low; a rise often follows missed payments.",
    excludes: "Excludes vehicles off the road for repairs [to confirm]",
    unit: "count", aggregation: "latest", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
  },

  // Customers
  {
    id: "active-riders", noun: "riders", name: "Active riders", category: "customers", kind: "period",
    definition: "Riders who swapped or charged at least once.",
    counted: "Each rider counts once, however many times they swapped or charged.",
    goodTrend: "Rising as riders keep coming back.",
    excludes: "Excludes staff and test accounts",
    unit: "count", aggregation: "unique", defaultChart: "line", splitBy: ALL, filters: ALL,
    higherIsBetter: true,
  },
  {
    id: "negative-balance", noun: "riders", name: "Riders with negative balance", category: "customers", kind: "snapshot",
    definition: "Riders whose wallet is below zero.",
    counted: "Riders with a wallet below zero at the 06:00 refresh.",
    goodTrend: "Low and falling.",
    excludes: "Excludes closed accounts",
    unit: "count", aggregation: "latest", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: false,
  },
  {
    id: "riders-topped-up", noun: "riders", name: "Riders who topped up", category: "customers", kind: "period",
    definition: "Riders who added points to their wallet at least once.",
    counted: "Each rider counts once, however many times they topped up.",
    goodTrend: "Rising, close to the number of active riders.",
    excludes: "Excludes staff and test accounts [to confirm]",
    unit: "count", aggregation: "unique", defaultChart: "bar", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
  },

  // Partners
  {
    id: "partner-swaps", noun: "swaps", name: "Swaps at partner stations", category: "partners", kind: "period",
    definition: "Completed swaps at stations run by partners.",
    counted: "Each completed swap at a partner station counts once, added up over the period.",
    goodTrend: "Rising as partner stations get used more.",
    excludes: "Excludes test stations",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
  },
  {
    id: "partner-points", name: "Points earned by partners", category: "partners", kind: "period",
    definition: "Points partners earned from swaps and top-ups at their stations.",
    counted: "Added up across every swap and top-up at partner stations in the period.",
    goodTrend: "Rising with partner swaps.",
    excludes: "Excludes points still pending settlement",
    unit: "points", aggregation: "sum", defaultChart: "line", splitBy: ["region", "station", "country"], filters: ["region", "station", "country"],
    higherIsBetter: true,
  },
  {
    id: "partner-share", name: "Partner share of swaps", category: "partners", kind: "period",
    definition: "Swaps at partner stations as a share of all swaps.",
    counted: "Swaps at partner stations in the period divided by all swaps in it.",
    goodTrend: "Depends on the plan: rising if the network is meant to grow through partners.",
    excludes: "Excludes test stations",
    unit: "%", aggregation: "ratio", defaultChart: "kpi", splitBy: ["region", "country"], filters: ["region", "country"],
    higherIsBetter: "neutral",
  },

  // Growth
  {
    id: "new-riders", noun: "riders", name: "New riders", category: "growth", kind: "period",
    definition: "Riders who completed their first swap or charge.",
    counted: "Each rider counts once, on the day of their first swap or charge.",
    goodTrend: "Rising, or steady at the level you plan for.",
    excludes: "Excludes staff and test accounts",
    unit: "count", aggregation: "sum", defaultChart: "line", splitBy: ["region", "customerType", "country"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
  },
  {
    id: "referral-signups", noun: "sign-ups", name: "Referral sign-ups", category: "growth", kind: "period",
    definition: "New riders who joined with another rider's referral code.",
    counted: "Each new rider who used a referral code counts once, added up over the period.",
    goodTrend: "Rising.",
    excludes: "Excludes self-referrals [to confirm]",
    unit: "count", aggregation: "sum", defaultChart: "bar", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
  },
  {
    id: "rider-return-rate", name: "Riders who came back", category: "growth", kind: "period",
    definition: "Share of the previous period's active riders who were active again.",
    counted: "Riders active again this period divided by last period’s active riders.",
    goodTrend: "High and steady.",
    excludes: "Excludes riders who joined this period [to confirm]",
    unit: "%", aggregation: "average", defaultChart: "kpi", splitBy: ["region", "customerType"], filters: ["region", "customerType", "country"],
    higherIsBetter: true,
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

/** Money metrics: never added up across countries, whose currencies aren't combined. */
export const isMoney = (m: Metric) => m.unit === "points";
export const MONEY_NOTE = "1 point = 1 KES. Uganda conversion not yet agreed.";

/** What a metric's figure is, in plain words, for the panel and the definition. */
export function kindLabel(m: Metric): string {
  if (m.kind === "snapshot") return "Current value";
  if (m.aggregation === "average" || m.aggregation === "ratio") return "Average over the selected period";
  if (m.aggregation === "unique") return "Counted once over the selected period";
  return "Total over the selected period";
}

/** Whether a metric's definition has been confirmed: nothing in it still marked "[to confirm]". Templates only use confirmed metrics. */
export function isConfirmed(m: Metric): boolean {
  return ![m.definition, m.counted, m.excludes].some((t) => t.includes("[to confirm]"));
}

/** Why a property can't be used to split or filter a metric, or null when it can. */
export function propertyBlocked(metric: Metric, property: PropertyId, use: "split" | "filter"): string | null {
  const allowed = use === "split" ? metric.splitBy : metric.filters;
  if (allowed.includes(property)) return null;
  return metric.notAllowed?.[property] ?? `${metric.name} can't be ${use === "split" ? "split" : "filtered"} by ${PROPERTIES[property].name.toLowerCase()}`;
}
