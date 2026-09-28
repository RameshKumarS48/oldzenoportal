export type ChartType = "line" | "bar" | "pie" | "area" | "stacked-bar" | "stat";
export type SeriesType = "actual" | "target" | "variance";

export interface WidgetSeries {
  metricKey: string;
  seriesType: SeriesType;
  color: string;
  label?: string;
}

export interface Widget {
  id: string;
  title: string;
  description?: string;
  chartType: ChartType;
  series: WidgetSeries[];
  dataSource?: "partner" | "infra" | "referral" | "wallet" | "energy" | "preorder";
  // Snapshot widgets (operational/telemetry pages)
  snapshotValue?: number | string;
  snapshotSource?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DashboardType = "preset" | "custom";
export type DashboardVisibility = "private" | "shared";
export type ShareTarget = "all-users" | "all-admins" | string[];

export interface Dashboard {
  id: string;
  title: string;
  description: string;
  type: DashboardType;
  category?: string;
  presetGroup?: "partner" | "infra";
  presetView?: "metrics-grid";
  presetPartnerId?: string;
  presetRegionId?: string;
  ownerId: string;
  ownerName?: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
  visibility?: DashboardVisibility;
  sharedWith?: ShareTarget;
  sharedAt?: string;
}

export const PRESET_DASHBOARDS: Dashboard[] = [
  // ── All Metrics ──────────────────────────────────────────────────────────
  {
    id: "preset-partner-metrics",
    title: "Partner Metrics",
    description: "All 30 partner KPIs: customers, sales, loan book, uptime and offroad cases",
    type: "preset",
    category: "all-metrics",
    presetGroup: "partner",
    presetView: "metrics-grid",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [],
  },
  {
    id: "preset-infra-metrics",
    title: "Infrastructure Metrics",
    description: "All 43 infrastructure KPIs: stations, batteries, energy, revenue and network ratios",
    type: "preset",
    category: "all-metrics",
    presetGroup: "infra",
    presetView: "metrics-grid",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [],
  },

  // ── Asset ─────────────────────────────────────────────────────────────────
  {
    id: "preset-fleet-health",
    title: "Fleet Health",
    description: "Uptime trends and offroad breakdown. Spot at a glance which bikes are earning vs sitting idle",
    type: "preset",
    category: "asset",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "fh-1", title: "Fleet Uptime (Overall)", chartType: "area",
        description: "Overall, original, and resale fleet uptime percentages week-over-week. Drops signal maintenance issues or field incidents requiring immediate action.",
        dataSource: "partner", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "uptimeOverall", seriesType: "actual", color: "#FF3B06", label: "Uptime %" },
          { metricKey: "uptimeOriginal", seriesType: "actual", color: "#003B49", label: "Original" },
          { metricKey: "uptimeResale", seriesType: "actual", color: "#10b981", label: "Resale" },
        ],
      },
      {
        id: "fh-2", title: "Offroad Root Cause", chartType: "stacked-bar",
        description: "Bikes taken offroad broken down by cause: accident, repossession, or other. Repo dominance signals financial stress; accident spikes indicate field safety issues.",
        dataSource: "partner", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "offroadAccidentOverall", seriesType: "actual", color: "#FF3B06", label: "Accident" },
          { metricKey: "offroadRepoOverall", seriesType: "actual", color: "#f59e0b", label: "Repo" },
          { metricKey: "offroadOtherOverall", seriesType: "actual", color: "#6366f1", label: "Other" },
        ],
      },
      {
        id: "fh-3", title: "Paused Bikes", chartType: "area",
        description: "Bikes temporarily paused by customers who have stopped using but not returned the bike. Rising paused counts are an early warning of churn and upcoming repos.",
        dataSource: "partner", x: 0, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "pausedOverall", seriesType: "actual", color: "#6366f1", label: "Paused" },
          { metricKey: "pausedOriginal", seriesType: "actual", color: "#003B49", label: "Orig Paused" },
        ],
      },
      {
        id: "fh-4", title: "Offroad Original vs Resale", chartType: "bar",
        description: "Accident-offroad rates compared between original and resale portfolios. Higher resale accident rates may reflect rider profile or bike condition differences.",
        dataSource: "partner", x: 4, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "offroadAccidentOriginal", seriesType: "actual", color: "#FF3B06", label: "Orig Accident" },
          { metricKey: "offroadAccidentResale", seriesType: "actual", color: "#f59e0b", label: "Resale Accident" },
        ],
      },
      {
        id: "fh-5", title: "Repo Rate (Financial Stress)", chartType: "line",
        description: "Weekly repossessions across original and resale portfolios. A leading credit health indicator. Sustained increases require immediate collections intervention.",
        dataSource: "partner", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "offroadRepoOverall", seriesType: "actual", color: "#FF3B06", label: "Repos" },
          { metricKey: "offroadRepoOriginal", seriesType: "actual", color: "#003B49", label: "Orig Repos" },
          { metricKey: "offroadRepoResale", seriesType: "actual", color: "#10b981", label: "Resale Repos" },
        ],
      },
    ],
  },
  {
    id: "preset-deployment-pipeline",
    title: "Deployment Pipeline",
    description: "Track bikes from sale → partner delivery → customer delivery to identify supply chain bottlenecks",
    type: "preset",
    category: "asset",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "dp-1", title: "Bikes Sold", chartType: "bar",
        description: "Bikes sold to partners per week. Compare against delivery metrics to identify gaps between order placement and physical fulfillment.",
        dataSource: "partner", x: 0, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "bikesSold", seriesType: "actual", color: "#FF3B06", label: "Sold" },
        ],
      },
      {
        id: "dp-2", title: "Delivered to Partner", chartType: "bar",
        description: "Bikes physically delivered from Zeno to the partner's warehouse. First leg of the delivery chain. Should closely follow bikes sold.",
        dataSource: "partner", x: 4, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "bikesDeliveredToPartner", seriesType: "actual", color: "#003B49", label: "To Partner" },
        ],
      },
      {
        id: "dp-3", title: "Delivered to Customer", chartType: "bar",
        description: "Bikes handed over from partner to end customer. This is when revenue recognition begins and the customer's loan repayment clock starts.",
        dataSource: "partner", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "bikesDeliveredToCustomer", seriesType: "actual", color: "#10b981", label: "To Customer" },
        ],
      },
      {
        id: "dp-4", title: "Sales vs Delivery Funnel", chartType: "area",
        description: "Three-stage funnel from bikes sold → delivered to partner → delivered to customer. Widening gaps between lines reveal bottlenecks in the supply chain.",
        dataSource: "partner", x: 0, y: 6, w: 8, h: 6,
        series: [
          { metricKey: "bikesSold", seriesType: "actual", color: "#FF3B06", label: "Sold" },
          { metricKey: "bikesDeliveredToPartner", seriesType: "actual", color: "#003B49", label: "→ Partner" },
          { metricKey: "bikesDeliveredToCustomer", seriesType: "actual", color: "#10b981", label: "→ Customer" },
        ],
      },
      {
        id: "dp-5", title: "Redeployed Customers", chartType: "stat",
        description: "Customers who had a bike taken offroad and were re-issued a replacement. Redeployments retain at-risk customers without counting as new sales.",
        dataSource: "partner", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "redeployedCustomers", seriesType: "actual", color: "#6366f1", label: "Redeployments" },
        ],
      },
    ],
  },
  {
    id: "preset-customer-growth",
    title: "Customer Growth",
    description: "Net new customers, week-over-week adds, redeployments. Is the base growing healthily?",
    type: "preset",
    category: "asset",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "cg-1", title: "Customer Base (Start vs End)", chartType: "area",
        description: "Customer count at the start vs end of each week. The gap between lines represents net adds or net churn for the period.",
        dataSource: "partner", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "startingCustomers", seriesType: "actual", color: "#003B49", label: "Start of Week" },
          { metricKey: "endingCustomers", seriesType: "actual", color: "#FF3B06", label: "End of Week" },
        ],
      },
      {
        id: "cg-2", title: "Total Customers", chartType: "stat",
        description: "Latest active customer count (end-of-week). The primary fleet size indicator and denominator for all per-customer metrics like ARPU.",
        dataSource: "partner", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "endingCustomers", seriesType: "actual", color: "#FF3B06", label: "Total Customers" },
        ],
      },
      {
        id: "cg-3", title: "Bikes Delivered to Customers", chartType: "bar",
        description: "New bikes delivered to customers per week, the primary driver of fleet growth. Each delivery opens a new revenue seat and loan repayment stream.",
        dataSource: "partner", x: 0, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "bikesDeliveredToCustomer", seriesType: "actual", color: "#10b981", label: "New Customers" },
        ],
      },
      {
        id: "cg-4", title: "Redeployments", chartType: "bar",
        description: "Replacement bikes issued to existing customers after offroad events. A retention safety valve. High redeployments indicate active churn prevention.",
        dataSource: "partner", x: 4, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "redeployedCustomers", seriesType: "actual", color: "#6366f1", label: "Redeployed" },
        ],
      },
      {
        id: "cg-5", title: "Weighted Avg Customers", chartType: "line",
        description: "Average customer count weighted by days active within the week. Used as the denominator in ARPU to smooth out mid-week deliveries and exits.",
        dataSource: "partner", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "weightedAvgCustomers", seriesType: "actual", color: "#f59e0b", label: "Weighted Avg" },
        ],
      },
    ],
  },
  {
    id: "preset-retention-risk",
    title: "Retention Risk",
    description: "Paused, repos, and offroad bikes signal customers under financial stress. Catch it before churn",
    type: "preset",
    category: "asset",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "rr-1", title: "Stress Signals", chartType: "stacked-bar",
        description: "Stacked view of paused, repo, and other offroad bikes per week. Rising stacks precede churn. Watch for inflection points requiring early intervention.",
        dataSource: "partner", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "pausedOverall", seriesType: "actual", color: "#f59e0b", label: "Paused" },
          { metricKey: "offroadRepoOverall", seriesType: "actual", color: "#FF3B06", label: "Repo" },
          { metricKey: "offroadOtherOverall", seriesType: "actual", color: "#6366f1", label: "Other Offroad" },
        ],
      },
      {
        id: "rr-2", title: "Total Repos (Latest)", chartType: "stat",
        description: "Latest weekly repossession count across all portfolios. If trending up week-over-week, escalate collections outreach immediately.",
        dataSource: "partner", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "offroadRepoOverall", seriesType: "actual", color: "#FF3B06", label: "Repos" },
        ],
      },
      {
        id: "rr-3", title: "Paused Trend (Orig vs Resale)", chartType: "line",
        description: "Paused bike trend over time split by portfolio. Resale portfolios typically show higher pause rates due to different customer risk profiles.",
        dataSource: "partner", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "pausedOverall", seriesType: "actual", color: "#f59e0b", label: "Overall" },
          { metricKey: "pausedOriginal", seriesType: "actual", color: "#003B49", label: "Original" },
          { metricKey: "pausedResale", seriesType: "actual", color: "#ec4899", label: "Resale" },
        ],
      },
      {
        id: "rr-4", title: "Repo vs Accident Offroad", chartType: "bar",
        description: "Financial (repo) vs non-financial (accident) reasons for bikes going offroad. Divergence indicates which intervention (collections vs field safety) is most needed.",
        dataSource: "partner", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "offroadRepoOverall", seriesType: "actual", color: "#FF3B06", label: "Repo" },
          { metricKey: "offroadAccidentOverall", seriesType: "actual", color: "#003B49", label: "Accident" },
        ],
      },
    ],
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: "preset-revenue-trends",
    title: "Revenue Trends",
    description: "ARPU trajectory and customer monetization. Is revenue per rider growing as the fleet scales?",
    type: "preset",
    category: "finance",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "rt-1", title: "ARPU Trend", chartType: "area",
        description: "Average revenue per user per week (KES). The core monetization KPI, which should trend upward as swap penetration improves and pricing evolves.",
        dataSource: "partner", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "arpu", seriesType: "actual", color: "#FF3B06", label: "ARPU (KES)" },
        ],
      },
      {
        id: "rt-2", title: "Weighted Avg Customers", chartType: "stat",
        description: "Weighted average active customers used as the ARPU denominator. A larger base means total revenue capacity is growing.",
        dataSource: "partner", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "weightedAvgCustomers", seriesType: "actual", color: "#003B49", label: "Avg Customers" },
        ],
      },
      {
        id: "rt-3", title: "Customer Base Growth", chartType: "area",
        description: "Start vs end customer count over time. The widening gap between the two lines shows net weekly growth, a key indicator of scale velocity.",
        dataSource: "partner", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "startingCustomers", seriesType: "actual", color: "#003B49", label: "Start" },
          { metricKey: "endingCustomers", seriesType: "actual", color: "#FF3B06", label: "End" },
        ],
      },
      {
        id: "rt-4", title: "ASP (Avg Selling Price)", chartType: "line",
        description: "Average bike selling price per week (KES). Compare against ARPU to understand upfront vs recurring revenue balance across the business.",
        dataSource: "partner", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "asp", seriesType: "actual", color: "#f59e0b", label: "ASP (KES)" },
        ],
      },
    ],
  },
  {
    id: "preset-loan-book",
    title: "Loan Book Health",
    description: "Gross vs net repayment rates for original and resale portfolios. Where is credit risk concentrating?",
    type: "preset",
    category: "finance",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "lb-1", title: "Overall Repayment Rate", chartType: "line",
        description: "Gross and net loan repayment rates for the total portfolio. Gross = all payments received; net = after adjustments and early settlements.",
        dataSource: "partner", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "loanRepaymentGrossOverall", seriesType: "actual", color: "#10b981", label: "Gross" },
          { metricKey: "loanRepaymentNetOverall", seriesType: "actual", color: "#FF3B06", label: "Net" },
        ],
      },
      {
        id: "lb-2", title: "Original vs Resale (Gross)", chartType: "bar",
        description: "Gross repayment rates compared between original and resale bike portfolios. Persistent divergence may indicate different credit risk profiles requiring separate underwriting.",
        dataSource: "partner", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "loanRepaymentGrossOriginal", seriesType: "actual", color: "#003B49", label: "Original" },
          { metricKey: "loanRepaymentGrossResale", seriesType: "actual", color: "#f59e0b", label: "Resale" },
        ],
      },
      {
        id: "lb-3", title: "Net Repayment Breakdown", chartType: "area",
        description: "Net repayment rates by portfolio over time. Net rate is the best proxy for actual credit performance after removing accounting adjustments.",
        dataSource: "partner", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "loanRepaymentNetOriginal", seriesType: "actual", color: "#003B49", label: "Net Original" },
          { metricKey: "loanRepaymentNetResale", seriesType: "actual", color: "#ec4899", label: "Net Resale" },
        ],
      },
      {
        id: "lb-4", title: "Gross vs Net Gap (Overall)", chartType: "bar",
        description: "Side-by-side gross vs net repayment for the full portfolio. The spread between bars reveals the magnitude of write-offs, adjustments, and early settlements.",
        dataSource: "partner", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "loanRepaymentGrossOverall", seriesType: "actual", color: "#10b981", label: "Gross" },
          { metricKey: "loanRepaymentNetOverall", seriesType: "actual", color: "#FF3B06", label: "Net" },
        ],
      },
    ],
  },

  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    id: "preset-swap-efficiency",
    title: "Swap Station Efficiency",
    description: "Revenue per kWh, wait times, and availability. Is the swap network performing at capacity?",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "se-1", title: "SS vs FC Revenue", chartType: "area",
        description: "Weekly revenue from swap stations vs fast chargers. Shows relative channel contribution. Use to guide capital allocation between station types.",
        dataSource: "infra", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "ssRevenue", seriesType: "actual", color: "#FF3B06", label: "SS Revenue (KES)" },
          { metricKey: "fcRevenue", seriesType: "actual", color: "#003B49", label: "FC Revenue (KES)" },
        ],
      },
      {
        id: "se-2", title: "Energy Throughput (kWh)", chartType: "bar",
        description: "Total kWh dispensed per week by swap stations and fast chargers. Volume metric that drives revenue. Should grow with fleet and station count.",
        dataSource: "infra", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "ssKwhSold", seriesType: "actual", color: "#FF3B06", label: "SS kWh" },
          { metricKey: "fcKwhSold", seriesType: "actual", color: "#10b981", label: "FC kWh" },
        ],
      },
      {
        id: "se-3", title: "Swaps Waiting >10 Mins", chartType: "line",
        description: "Count of swap sessions where customers waited more than 10 minutes. A quality-of-service indicator. High numbers signal station under-capacity or battery shortfalls.",
        dataSource: "infra", x: 0, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "swapsWaitOver10Mins", seriesType: "actual", color: "#f59e0b", label: "Long-wait Swaps" },
        ],
      },
      {
        id: "se-4", title: "Network Availability", chartType: "area",
        description: "Percentage of time swap stations and fast chargers were operational and available to customers. Below 95% warrants urgent maintenance investigation.",
        dataSource: "infra", x: 4, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "networkAvailability", seriesType: "actual", color: "#10b981", label: "Network" },
          { metricKey: "ssAvailability", seriesType: "actual", color: "#FF3B06", label: "SS" },
          { metricKey: "fcAvailability", seriesType: "actual", color: "#003B49", label: "FC" },
        ],
      },
      {
        id: "se-5", title: "Price vs Electric Rate", chartType: "line",
        description: "Swap station pricing per kWh vs electricity cost. The spread between these two lines is the gross margin per kWh. Monitor for margin compression.",
        dataSource: "infra", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "ssPricing", seriesType: "actual", color: "#FF3B06", label: "SS Price" },
          { metricKey: "ssElectricRate", seriesType: "actual", color: "#003B49", label: "SS Cost" },
        ],
      },
    ],
  },
  {
    id: "preset-infrastructure-buildout",
    title: "Infrastructure Build-out",
    description: "Cumulative station and battery deployment vs inventory. Are we building ahead of demand?",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "ib-1", title: "Swap Stations Deployed", chartType: "area",
        description: "Cumulative swap station installed base vs inventory buffer. Inventory should stay ahead of planned deployments to avoid supply gaps.",
        dataSource: "infra", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "ssTotalInstalledBase", seriesType: "actual", color: "#FF3B06", label: "Total Installed" },
          { metricKey: "ssInInventory", seriesType: "actual", color: "#003B49", label: "In Inventory" },
        ],
      },
      {
        id: "ib-2", title: "Fast Chargers Deployed", chartType: "area",
        description: "Cumulative fast charger installations vs inventory. Compare installation pace against fleet growth to ensure coverage is keeping up with demand.",
        dataSource: "infra", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "fcTotalInstalledBase", seriesType: "actual", color: "#10b981", label: "Total Installed" },
          { metricKey: "fcInInventory", seriesType: "actual", color: "#6366f1", label: "In Inventory" },
        ],
      },
      {
        id: "ib-3", title: "Battery Deployment", chartType: "line",
        description: "Total batteries split between deployed (in field), in-station (at swap stations), and inventory. Inventory buffer prevents station shortfalls that cause long customer wait times.",
        dataSource: "infra", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "totalBatteriesDeployed", seriesType: "actual", color: "#FF3B06", label: "Deployed" },
          { metricKey: "totalBatteriesInSS", seriesType: "actual", color: "#003B49", label: "In SS" },
          { metricKey: "totalBatteriesInventory", seriesType: "actual", color: "#10b981", label: "Inventory" },
        ],
      },
      {
        id: "ib-4", title: "Sites Pipeline", chartType: "bar",
        description: "Upper-funnel site candidates, active negotiations, and signed leases per week. A leading indicator for future network expansion. Slow pipeline = future deployment risk.",
        dataSource: "infra", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "ssUpperFunnelSites", seriesType: "actual", color: "#FF3B06", label: "SS Pipeline" },
          { metricKey: "fcUpperFunnelSites", seriesType: "actual", color: "#003B49", label: "FC Pipeline" },
          { metricKey: "leasesSigned", seriesType: "actual", color: "#10b981", label: "Leases Signed" },
        ],
      },
    ],
  },
  {
    id: "preset-energy-margin",
    title: "Energy Margin Analysis",
    description: "Price per kWh vs. electricity cost. Track the spread that determines infrastructure profitability",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "em-1", title: "SS: Price vs Cost per kWh", chartType: "line",
        description: "Swap station price charged to customers vs electricity cost per kWh. The spread is the gross margin per kWh. Narrowing spread means margin compression.",
        dataSource: "infra", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "ssPricing", seriesType: "actual", color: "#FF3B06", label: "SS Price/kWh" },
          { metricKey: "ssElectricRate", seriesType: "actual", color: "#003B49", label: "SS Cost/kWh" },
        ],
      },
      {
        id: "em-2", title: "FC: Price vs Cost per kWh", chartType: "line",
        description: "Fast charger margin analysis: price charged vs electricity cost. FC sessions typically have different cost structures due to higher power draw.",
        dataSource: "infra", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "fcPricing", seriesType: "actual", color: "#10b981", label: "FC Price/kWh" },
          { metricKey: "fcElectricRate", seriesType: "actual", color: "#6366f1", label: "FC Cost/kWh" },
        ],
      },
      {
        id: "em-3", title: "Blended Revenue Split", chartType: "stacked-bar",
        description: "Total energy revenue broken down by swap station and fast charger channels. High concentration in one channel indicates revenue risk if that channel underperforms.",
        dataSource: "infra", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "ssRevenue", seriesType: "actual", color: "#FF3B06", label: "SS Revenue" },
          { metricKey: "fcRevenue", seriesType: "actual", color: "#10b981", label: "FC Revenue" },
        ],
      },
      {
        id: "em-4", title: "Blended Pricing Trend", chartType: "area",
        description: "Network-wide blended price vs blended electricity cost per kWh. The most important infrastructure profitability indicator. Tracks margin across all station types.",
        dataSource: "infra", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "overallBlendedPricing", seriesType: "actual", color: "#FF3B06", label: "Blended Price" },
          { metricKey: "overallBlendedElectricRate", seriesType: "actual", color: "#003B49", label: "Blended Cost" },
        ],
      },
    ],
  },
  {
    id: "preset-network-reliability",
    title: "Network Reliability",
    description: "Uptime, availability, and wait-time SLAs. Is the charging network reliable enough to keep riders on the road?",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "nr-1", title: "Network Uptime vs Availability", chartType: "area",
        description: "Network uptime (system online) vs availability (ready for customer use). A gap between them means stations are online but not serving customers. Investigate blocking issues.",
        dataSource: "infra", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "networkUptime", seriesType: "actual", color: "#10b981", label: "Uptime" },
          { metricKey: "networkAvailability", seriesType: "actual", color: "#FF3B06", label: "Availability" },
        ],
      },
      {
        id: "nr-2", title: "Long Wait Swaps", chartType: "stat",
        description: "Latest week's count of swap sessions where customers waited more than 10 minutes. A direct customer satisfaction metric. Elevated counts require battery restocking or station expansion.",
        dataSource: "infra", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "swapsWaitOver10Mins", seriesType: "actual", color: "#f59e0b", label: ">10 min Swaps" },
        ],
      },
      {
        id: "nr-3", title: "SS vs FC Uptime", chartType: "line",
        description: "Swap station vs fast charger uptime compared over time. Divergence between the two channels may reveal maintenance issues or power supply problems specific to one type.",
        dataSource: "infra", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "ssUptime", seriesType: "actual", color: "#FF3B06", label: "SS Uptime" },
          { metricKey: "fcUptime", seriesType: "actual", color: "#003B49", label: "FC Uptime" },
        ],
      },
      {
        id: "nr-4", title: "Install Costs", chartType: "bar",
        description: "Average installation cost per new swap station and fast charger. Declining costs over time indicate improved processes and vendor relationships.",
        dataSource: "infra", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "newSSAvgInstallCost", seriesType: "actual", color: "#FF3B06", label: "SS Install" },
          { metricKey: "newFCAvgInstallCost", seriesType: "actual", color: "#003B49", label: "FC Install" },
        ],
      },
    ],
  },
  {
    id: "preset-battery-coverage",
    title: "Battery Coverage",
    description: "Battery-to-bike and battery-per-station ratios. Is infrastructure keeping pace with the fleet?",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "bc-1", title: "Battery Pair per Bike", chartType: "line",
        description: "Number of battery pairs available per active bike. Target ratio (≥2) ensures swap stations always have charged batteries ready. Drops below target create wait time.",
        dataSource: "infra", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "batteryPairPerBike", seriesType: "actual", color: "#FF3B06", label: "Pairs/Bike" },
        ],
      },
      {
        id: "bc-2", title: "Bike-to-Station Ratio", chartType: "line",
        description: "Active bikes per swap station and per fast charger. Rising ratios mean infrastructure isn't keeping pace with fleet growth. Plan station deployments accordingly.",
        dataSource: "infra", x: 6, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "bikeSsRatio", seriesType: "actual", color: "#003B49", label: "Bikes per SS" },
          { metricKey: "bikeFcRatio", seriesType: "actual", color: "#10b981", label: "Bikes per FC" },
        ],
      },
      {
        id: "bc-3", title: "Battery Inventory Buffer", chartType: "area",
        description: "Batteries in field vs in warehouse inventory. Buffer stock enables rapid station replenishment. A shrinking buffer risks stockouts and customer wait times.",
        dataSource: "infra", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "totalBatteriesDeployed", seriesType: "actual", color: "#FF3B06", label: "Deployed" },
          { metricKey: "totalBatteriesInventory", seriesType: "actual", color: "#10b981", label: "Inventory" },
        ],
      },
      {
        id: "bc-4", title: "Rental Revenue (SS vs FC)", chartType: "bar",
        description: "Average site rental income for swap stations and fast chargers. High rental costs in one channel may affect that channel's unit economics.",
        dataSource: "infra", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "ssAvgRental", seriesType: "actual", color: "#FF3B06", label: "SS Rental" },
          { metricKey: "fcAvgRental", seriesType: "actual", color: "#003B49", label: "FC Rental" },
        ],
      },
    ],
  },

  // ── Referral ──────────────────────────────────────────────────────────────
  {
    id: "preset-referral-data",
    title: "Referral Data",
    description: "Weekly referral funnel: entries, awards, attach rate, pending backlog, and days-to-award",
    type: "preset",
    category: "referral",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "rd-1", title: "Referrals Entered vs Awarded", chartType: "bar",
        description: "Referral codes entered by new customers vs codes validated and awarded per week. A large gap between bars indicates a growing processing backlog.",
        dataSource: "referral", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "referralsEntered",  seriesType: "actual", color: "#003B49", label: "Entered" },
          { metricKey: "referralsAwarded",  seriesType: "actual", color: "#FF3B06", label: "Awarded" },
        ],
      },
      {
        id: "rd-2", title: "Pending Referrals", chartType: "stat",
        description: "Current count of referral codes awaiting validation and award. A growing number risks damaging referrer trust. Target a near-zero pending backlog.",
        dataSource: "referral", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "pendingReferrals", seriesType: "actual", color: "#f59e0b", label: "Pending" },
        ],
      },
      {
        id: "rd-3", title: "Referral Attach Rate (%)", chartType: "area",
        description: "Percentage of weekly bike sales that carried a valid referral code. Measures how effectively the referral programme drives acquisitions. Target >40%.",
        dataSource: "referral", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "referralAttachRate", seriesType: "actual", color: "#FF3B06", label: "Attach Rate %" },
        ],
      },
      {
        id: "rd-4", title: "Total Sales / Deliveries", chartType: "bar",
        description: "Total bike sales and deliveries per week across all channels. Provides the denominator context for the referral attach rate calculation.",
        dataSource: "referral", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "totalSales", seriesType: "actual", color: "#003B49", label: "Sales" },
        ],
      },
      {
        id: "rd-5", title: "Avg Days: Entry → Award", chartType: "line",
        description: "Average calendar days from a referral code being entered to the award being issued. Should decrease as processes mature. Above 7 days risks referrer dissatisfaction.",
        dataSource: "referral", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "avgDaysToAward", seriesType: "actual", color: "#6366f1", label: "Avg Days" },
        ],
      },
      {
        id: "rd-6", title: "Pending Backlog Trend", chartType: "area",
        description: "Running accumulation of unprocessed referral codes over time. Should remain flat or decline. A rising trend means award processing can't keep up with entries.",
        dataSource: "referral", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "pendingReferrals", seriesType: "actual", color: "#f59e0b", label: "Pending" },
        ],
      },
      {
        id: "rd-7", title: "Referral Funnel (Entered vs Awarded)", chartType: "area",
        description: "Full referral lifecycle in one chart: codes entered, awards made, and pending backlog. The gap between entered and awarded lines is the unprocessed pipeline.",
        dataSource: "referral", x: 0, y: 18, w: 12, h: 6,
        series: [
          { metricKey: "referralsEntered",  seriesType: "actual", color: "#003B49", label: "Entered" },
          { metricKey: "referralsAwarded",  seriesType: "actual", color: "#FF3B06", label: "Awarded" },
          { metricKey: "pendingReferrals",  seriesType: "actual", color: "#f59e0b", label: "Pending" },
        ],
      },
    ],
  },

  // ── Wallet / Finance (PDF spec) ───────────────────────────────────────────
  {
    id: "preset-wallet-overview",
    title: "Wallet Overview",
    description: "Points issued vs redeemed, wallet liability, avg balance, recharge by method: full customer financials picture",
    type: "preset",
    category: "finance",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "wo-1", title: "Points Issued vs Redeemed", chartType: "area",
        description: "Points issued to customers vs points actually spent per week. A widening gap means more points are accumulating as unredeemed liability on the balance sheet.",
        dataSource: "wallet", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "pointsIssued",   seriesType: "actual", color: "#FF3B06", label: "Points Issued" },
          { metricKey: "pointsRedeemed", seriesType: "actual", color: "#003B49", label: "Points Redeemed" },
        ],
      },
      {
        id: "wo-2", title: "Wallet Liability (KES)", chartType: "stat",
        description: "Total monetary value of unredeemed loyalty points across all customers (1 pt = 1 KES). A balance sheet obligation. Large liability requires cash reserve planning.",
        dataSource: "wallet", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "walletLiabilityKES", seriesType: "actual", color: "#FF3B06", label: "Liability (KES)" },
        ],
      },
      {
        id: "wo-3", title: "Wallet Liability Trend", chartType: "area",
        description: "Running cumulative wallet liability over time. A rising trend means points are accumulating faster than redemption. Review expiry policy and redemption incentives.",
        dataSource: "wallet", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "walletLiabilityKES", seriesType: "actual", color: "#f59e0b", label: "Running Liability (KES)" },
        ],
      },
      {
        id: "wo-4", title: "Avg Wallet Balance", chartType: "line",
        description: "Average wallet balance per customer per week (KES). Healthy, growing averages signal engagement with the loyalty system; sharp drops mean customers are spending down or churning.",
        dataSource: "wallet", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "avgWalletBalance", seriesType: "actual", color: "#10b981", label: "Avg Balance (KES)" },
        ],
      },
      {
        id: "wo-5", title: "Customers at Zero Balance", chartType: "bar",
        description: "Count and percentage of customers with zero wallet balance. Zero-balance customers have no loyalty lock-in and are at higher churn risk. Alert threshold is >15%.",
        dataSource: "wallet", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "customersZeroBalance", seriesType: "actual", color: "#FF3B06", label: "Zero Balance #" },
          { metricKey: "pctZeroBalance",       seriesType: "actual", color: "#f59e0b", label: "Zero Balance %" },
        ],
      },
      {
        id: "wo-6", title: "Points by Type", chartType: "stacked-bar",
        description: "Weekly points breakdown by type: join bonus, referral earnings, and recharge rewards. Shows which programme mechanism is driving the most loyalty currency.",
        dataSource: "wallet", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "joinBonusPoints",      seriesType: "actual", color: "#003B49", label: "Join Bonus" },
          { metricKey: "referralEarnedPoints", seriesType: "actual", color: "#FF3B06", label: "Referral" },
          { metricKey: "rechargePoints",       seriesType: "actual", color: "#10b981", label: "Recharge" },
        ],
      },
    ],
  },
  {
    id: "preset-recharge-analytics",
    title: "Recharge Analytics",
    description: "Recharge volume by payment method (M-Pesa, card, bank), transaction count, avg top-up value",
    type: "preset",
    category: "finance",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "ra-1", title: "Total Recharge Value (KES)", chartType: "area",
        description: "Total KES recharged into customer wallets per week across all payment methods. Measures the flow of cash into the loyalty system. Growth indicates increasing customer trust.",
        dataSource: "wallet", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "rechargeValueKES", seriesType: "actual", color: "#FF3B06", label: "Total Recharged (KES)" },
        ],
      },
      {
        id: "ra-2", title: "Avg Recharge Value", chartType: "stat",
        description: "Average KES per recharge transaction. Higher averages indicate customers top up in larger amounts, a sign of confidence in the wallet system.",
        dataSource: "wallet", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "avgRechargeValueKES", seriesType: "actual", color: "#10b981", label: "Avg (KES)" },
        ],
      },
      {
        id: "ra-3", title: "Recharge by Payment Method", chartType: "stacked-bar",
        description: "Recharge value split by M-Pesa, card, and bank transfer. M-Pesa dominance is expected; meaningful shifts towards card/bank may indicate expanding customer demographics.",
        dataSource: "wallet", x: 0, y: 6, w: 8, h: 6,
        series: [
          { metricKey: "rechargeMpesaKES", seriesType: "actual", color: "#10b981", label: "M-Pesa" },
          { metricKey: "rechargeCardKES",  seriesType: "actual", color: "#003B49", label: "Card" },
          { metricKey: "rechargeBankKES",  seriesType: "actual", color: "#6366f1", label: "Bank Transfer" },
        ],
      },
      {
        id: "ra-4", title: "Recharge Transactions", chartType: "bar",
        description: "Number of recharge events per week. Combined with average recharge value, reveals whether growth comes from more frequent top-ups or larger top-up amounts.",
        dataSource: "wallet", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "rechargeTransactions", seriesType: "actual", color: "#FF3B06", label: "Transactions" },
        ],
      },
      {
        id: "ra-5", title: "Referral Programme Metrics", chartType: "line",
        description: "Active referrers, referral joiners, and organic joiners per week. Shows the relative scale and efficiency of the referral channel vs organic growth.",
        dataSource: "wallet", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "activeReferrers",        seriesType: "actual", color: "#FF3B06", label: "Active Referrers" },
          { metricKey: "referralJoiners",        seriesType: "actual", color: "#003B49", label: "Referral Joiners" },
          { metricKey: "organicJoiners",         seriesType: "actual", color: "#10b981", label: "Organic Joiners" },
        ],
      },
      {
        id: "ra-6", title: "Referral Conversion Rate", chartType: "area",
        description: "Percentage of referred contacts who completed a bike purchase. Below 40% may indicate friction in the referral journey. Review the onboarding experience.",
        dataSource: "wallet", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "referralConversionRate", seriesType: "actual", color: "#ec4899", label: "Conversion Rate %" },
        ],
      },
    ],
  },

  // ── Energy (PDF spec) ─────────────────────────────────────────────────────
  {
    id: "preset-energy-delivered",
    title: "Energy Delivered",
    description: "Total kWh by session type (swap/fast/home), cumulative delivery, CO₂ impact, and solar share",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "ed-1", title: "kWh by Session Type", chartType: "stacked-bar",
        description: "Total energy dispensed per week broken down by swap, fast charge, and home charge sessions. Shows channel mix. Swap should dominate as the primary service model.",
        dataSource: "energy", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "swapKwh",       seriesType: "actual", color: "#FF3B06", label: "Swap" },
          { metricKey: "fastChargeKwh", seriesType: "actual", color: "#003B49", label: "Fast Charge" },
          { metricKey: "homeChargeKwh", seriesType: "actual", color: "#10b981", label: "Home Charge" },
        ],
      },
      {
        id: "ed-2", title: "Cumulative kWh", chartType: "stat",
        description: "Running total of all energy delivered since network launch. Key ESG and sustainability reporting metric. Tracks the scale of clean energy delivered to riders.",
        dataSource: "energy", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "cumulativeKwh", seriesType: "actual", color: "#FF3B06", label: "Total kWh" },
        ],
      },
      {
        id: "ed-3", title: "Cumulative Energy Delivered", chartType: "area",
        description: "Growth trajectory of cumulative kWh over time. Should accelerate as the fleet and station count grows. A slowing slope indicates delivery capacity issues.",
        dataSource: "energy", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "cumulativeKwh", seriesType: "actual", color: "#FF3B06", label: "Cumulative kWh" },
        ],
      },
      {
        id: "ed-4", title: "CO₂ Avoided (kg/week)", chartType: "bar",
        description: "Estimated CO₂ emissions avoided vs equivalent petrol motorcycles, calculated at 0.32 kg CO₂ per kWh (Kenya grid factor). Used for ESG and impact reporting.",
        dataSource: "energy", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "co2AvoidedKg", seriesType: "actual", color: "#10b981", label: "CO₂ Avoided (kg)" },
        ],
      },
      {
        id: "ed-5", title: "Grid vs Solar Supply", chartType: "stacked-bar",
        description: "Energy consumed from grid vs solar sources per week. Increasing solar share reduces electricity costs and strengthens Zeno's sustainability story.",
        dataSource: "energy", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "gridKwh",  seriesType: "actual", color: "#6366f1", label: "Grid" },
          { metricKey: "solarKwh", seriesType: "actual", color: "#f59e0b", label: "Solar" },
        ],
      },
      {
        id: "ed-6", title: "Solar Share (%)", chartType: "area",
        description: "Percentage of total energy consumed from solar panels. Target is to increase solar share to reduce grid dependency, lower electricity costs, and improve ESG metrics.",
        dataSource: "energy", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "solarSharePct", seriesType: "actual", color: "#f59e0b", label: "Solar Share %" },
        ],
      },
    ],
  },
  {
    id: "preset-session-analytics",
    title: "Session Analytics",
    description: "Session counts, avg kWh per session, peak vs off-peak demand, energy revenue and gross margin",
    type: "preset",
    category: "infra",
    presetGroup: "infra",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "sa-1", title: "Sessions by Type", chartType: "stacked-bar",
        description: "Total charging sessions per week by service type (swap, fast charge, home charge). Volume indicator for each channel. Swap count growth tracks with fleet scale.",
        dataSource: "energy", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "swapSessionsCount",      seriesType: "actual", color: "#FF3B06", label: "Swap" },
          { metricKey: "fastChargeSessionsCount", seriesType: "actual", color: "#003B49", label: "Fast Charge" },
          { metricKey: "homeChargeSessionsCount", seriesType: "actual", color: "#10b981", label: "Home Charge" },
        ],
      },
      {
        id: "sa-2", title: "Total Sessions", chartType: "stat",
        description: "Latest weekly total charging session count across all stations and session types. A high-level indicator of network utilisation and rider activity.",
        dataSource: "energy", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "totalSessionsCount", seriesType: "actual", color: "#FF3B06", label: "Sessions" },
        ],
      },
      {
        id: "sa-3", title: "Avg kWh per Session", chartType: "line",
        description: "Average energy dispensed per charging session. Swap sessions are typically consistent; declining averages may indicate shorter rides or partial battery swaps.",
        dataSource: "energy", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "avgKwhPerSession", seriesType: "actual", color: "#6366f1", label: "kWh/Session" },
        ],
      },
      {
        id: "sa-4", title: "Peak vs Off-Peak Sessions", chartType: "bar",
        description: "Session count during peak vs off-peak hours. High peak concentration strains grid capacity and may trigger demand charges. Incentivise off-peak charging if skewed.",
        dataSource: "energy", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "peakHourSessions", seriesType: "actual", color: "#FF3B06", label: "Peak" },
          { metricKey: "offPeakSessions",  seriesType: "actual", color: "#003B49", label: "Off-Peak" },
        ],
      },
      {
        id: "sa-5", title: "Energy Revenue vs Cost/kWh", chartType: "area",
        description: "Weekly energy revenue from all charging sessions (KES). Growth should track closely with kWh delivered. Declining revenue per kWh indicates pricing pressure.",
        dataSource: "energy", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "energyRevenueKES", seriesType: "actual", color: "#FF3B06", label: "Revenue (KES)" },
        ],
      },
      {
        id: "sa-6", title: "Gross Margin (%)", chartType: "line",
        description: "Gross margin on energy operations: (energy revenue − electricity cost) / energy revenue. The profitability of the energy business on a unit-economics basis.",
        dataSource: "energy", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "grossMarginPct", seriesType: "actual", color: "#10b981", label: "Gross Margin %" },
          { metricKey: "costPerKwhKES",  seriesType: "actual", color: "#f59e0b", label: "Cost/kWh (KES)" },
        ],
      },
    ],
  },

  // ── Growth (PDF spec) ─────────────────────────────────────────────────────
  {
    id: "preset-preorder-funnel",
    title: "App & Pre-Order Funnel",
    description: "Download → register → pre-order → activate conversion funnel with organic vs referral channel breakdown",
    type: "preset",
    category: "growth",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "pf-1", title: "Weekly App Downloads", chartType: "bar",
        description: "App downloads per week broken down by acquisition channel (organic, referral, paid). Channel mix reveals which acquisition source is most active and cost-effective.",
        dataSource: "preorder", x: 0, y: 0, w: 6, h: 6,
        series: [
          { metricKey: "organicDownloads",  seriesType: "actual", color: "#003B49", label: "Organic" },
          { metricKey: "referralDownloads", seriesType: "actual", color: "#FF3B06", label: "Referral" },
          { metricKey: "paidDownloads",     seriesType: "actual", color: "#6366f1", label: "Paid" },
        ],
      },
      {
        id: "pf-2", title: "Cumulative Downloads", chartType: "stat",
        description: "Running total of app downloads since launch. Baseline audience size for all funnel conversion calculations. Growing this number is top of the growth agenda.",
        dataSource: "preorder", x: 6, y: 0, w: 3, h: 6,
        series: [
          { metricKey: "cumulativeDownloads", seriesType: "actual", color: "#FF3B06", label: "Total Downloads" },
        ],
      },
      {
        id: "pf-3", title: "Pre-orders Placed", chartType: "stat",
        description: "Total pre-orders placed per week: deposits paid and bike reserved. A leading indicator for future sales volume and pipeline value.",
        dataSource: "preorder", x: 9, y: 0, w: 3, h: 6,
        series: [
          { metricKey: "preorders", seriesType: "actual", color: "#10b981", label: "Pre-orders" },
        ],
      },
      {
        id: "pf-4", title: "Funnel Conversion Rates", chartType: "line",
        description: "Conversion rates at each funnel stage: download→registration, registration→pre-order, pre-order→activation. The lowest rate indicates where to focus optimisation efforts.",
        dataSource: "preorder", x: 0, y: 6, w: 8, h: 6,
        series: [
          { metricKey: "downloadToRegRate",          seriesType: "actual", color: "#FF3B06", label: "Download→Reg %" },
          { metricKey: "registrationToPreorderRate", seriesType: "actual", color: "#003B49", label: "Reg→Pre-order %" },
          { metricKey: "preorderToActivationRate",   seriesType: "actual", color: "#10b981", label: "Pre-order→Active %" },
        ],
      },
      {
        id: "pf-5", title: "Deposits Paid (KES)", chartType: "stat",
        description: "Total deposit value collected from pre-order customers this week. Represents committed pipeline revenue. Rising deposits directly predict near-term sales.",
        dataSource: "preorder", x: 8, y: 6, w: 4, h: 6,
        series: [
          { metricKey: "depositsPaidKES", seriesType: "actual", color: "#f59e0b", label: "Deposits (KES)" },
        ],
      },
      {
        id: "pf-6", title: "Organic vs Referral Pre-orders", chartType: "stacked-bar",
        description: "Pre-orders split by acquisition channel. Referral pre-orders typically have lower acquisition cost and higher activation rates than organic or paid channels.",
        dataSource: "preorder", x: 0, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "organicPreorders",  seriesType: "actual", color: "#003B49", label: "Organic" },
          { metricKey: "referralPreorders", seriesType: "actual", color: "#FF3B06", label: "Referral" },
        ],
      },
      {
        id: "pf-7", title: "Days to Pre-order & Activation", chartType: "area",
        description: "Average time from registration to pre-order, and from pre-order to bike activation. Shorter is better. Long lags indicate friction or fulfilment delays in the onboarding journey.",
        dataSource: "preorder", x: 6, y: 12, w: 6, h: 6,
        series: [
          { metricKey: "avgTimeToPreorderDays",   seriesType: "actual", color: "#6366f1", label: "Reg→Pre-order (days)" },
          { metricKey: "avgTimeToActivationDays", seriesType: "actual", color: "#f59e0b", label: "Pre-order→Active (days)" },
        ],
      },
      {
        id: "pf-8", title: "Drop-off & Cancellations", chartType: "bar",
        description: "Absolute drop-off counts at the registration and pre-order stages. Quantifies where the funnel leaks. High registration drop-off may indicate app UX friction.",
        dataSource: "preorder", x: 0, y: 18, w: 6, h: 6,
        series: [
          { metricKey: "dropOffAtRegistration", seriesType: "actual", color: "#FF3B06", label: "Drop-off at Reg" },
          { metricKey: "dropOffAtPreorder",     seriesType: "actual", color: "#f59e0b", label: "Drop-off at Pre-order" },
        ],
      },
      {
        id: "pf-9", title: "Cancellation Rate (%)", chartType: "line",
        description: "Percentage of pre-orders that are ultimately cancelled before bike activation. Rates above 10% warrant investigation into fulfilment timelines or customer communication.",
        dataSource: "preorder", x: 6, y: 18, w: 6, h: 6,
        series: [
          { metricKey: "cancellationRate", seriesType: "actual", color: "#ec4899", label: "Cancellation Rate %" },
        ],
      },
    ],
  },

  // ── Referral Programme (PDF spec) ─────────────────────────────────────────
  {
    id: "preset-referral-programme",
    title: "Referral Programme",
    description: "Referral acquisition channel: active referrers, joiners, conversion rate vs referral data dashboard",
    type: "preset",
    category: "referral",
    presetGroup: "partner",
    ownerId: "system",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    widgets: [
      {
        id: "rp-1", title: "Referral vs Organic Joiners", chartType: "stacked-bar",
        description: "New customers per week split by acquisition channel. Referral joiners = customers who signed up via a referral link. Rising referral share reduces CAC.",
        dataSource: "wallet", x: 0, y: 0, w: 8, h: 6,
        series: [
          { metricKey: "referralJoiners", seriesType: "actual", color: "#FF3B06", label: "Referral Joiners" },
          { metricKey: "organicJoiners",  seriesType: "actual", color: "#003B49", label: "Organic Joiners" },
        ],
      },
      {
        id: "rp-2", title: "Active Referrers", chartType: "stat",
        description: "Customers who made at least one referral in the current period. Measures programme participation breadth. Low active referrers despite large customer base indicates programme awareness gap.",
        dataSource: "wallet", x: 8, y: 0, w: 4, h: 6,
        series: [
          { metricKey: "activeReferrers", seriesType: "actual", color: "#FF3B06", label: "Active Referrers" },
        ],
      },
      {
        id: "rp-3", title: "Referral Conversion Rate (%)", chartType: "area",
        description: "Percentage of referral invitations that resulted in a completed bike activation. The core measure of referral programme quality. Target above 40%.",
        dataSource: "wallet", x: 0, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "referralConversionRate", seriesType: "actual", color: "#FF3B06", label: "Conversion %" },
        ],
      },
      {
        id: "rp-4", title: "Referral Points Earned", chartType: "area",
        description: "Points awarded to referrers per week. Tracks the incentive cost of the referral channel. Compare against referral joiners to calculate cost-per-acquisition.",
        dataSource: "wallet", x: 6, y: 6, w: 6, h: 6,
        series: [
          { metricKey: "referralEarnedPoints", seriesType: "actual", color: "#ec4899", label: "Referral Points" },
        ],
      },
      {
        id: "rp-5", title: "Programme Award Funnel", chartType: "bar",
        description: "End-to-end referral pipeline: codes entered, awards made, and pending. Healthy programmes have awards closely tracking entries with near-zero pending backlog.",
        dataSource: "referral", x: 0, y: 12, w: 8, h: 6,
        series: [
          { metricKey: "referralsEntered",  seriesType: "actual", color: "#003B49", label: "Codes Entered" },
          { metricKey: "referralsAwarded",  seriesType: "actual", color: "#FF3B06", label: "Awards Made" },
          { metricKey: "pendingReferrals",  seriesType: "actual", color: "#f59e0b", label: "Pending" },
        ],
      },
      {
        id: "rp-6", title: "Avg Days to Award", chartType: "line",
        description: "Average time from referral code entry to award being issued. Should be under 7 days for a healthy programme. Longer waits reduce referrer satisfaction and future participation.",
        dataSource: "referral", x: 8, y: 12, w: 4, h: 6,
        series: [
          { metricKey: "avgDaysToAward", seriesType: "actual", color: "#6366f1", label: "Days to Award" },
        ],
      },
    ],
  },
];

export const INITIAL_CUSTOM_DASHBOARDS: Dashboard[] = [];
