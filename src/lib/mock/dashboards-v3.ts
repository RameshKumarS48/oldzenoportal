/**
 * Seed for the Dashboards (v3) sandbox: Zeno templates, four of your own (one
 * a copy of a template) and two shared with you. Mock only.
 *
 * Bump SEED_REVISION whenever this seed changes: it is the store's persist
 * version, so every browser drops its saved copy and starts from the new seed.
 */
import { metricById, type CategoryId, type ChartType } from "@/lib/dashboards-v3/catalogue";
import { DEFAULT_RANGE } from "@/lib/dashboards-v3/dates";
import { defaultSize } from "@/lib/dashboards-v3/rules";
import type { Dashboard, DashboardFilters, TemplateInfo, Widget } from "@/lib/dashboards-v3/types";

export const SEED_REVISION = 7;

const HOUR = 3_600_000;

function w(id: string, type: ChartType, metricId: string | undefined, extra: Partial<Widget> = {}): Widget {
  return {
    id,
    type,
    title: metricById(metricId)?.name ?? "",
    metricId,
    compare: type === "kpi",
    showValues: false,
    sort: "desc",
    size: defaultSize(type),
    ...extra,
  };
}

/**
 * A Zeno template: named after the job it does, with its purpose (also its
 * description), owner team, last review and version, filters suited to the
 * job, and widgets in order: numbers, trends, breakdowns, then a table.
 * Templates only use metrics whose definitions are confirmed.
 */
function template(id: string, name: string, category: CategoryId, info: TemplateInfo, filters: Partial<DashboardFilters>, widgets: Widget[]): Dashboard {
  return {
    id, name, category, widgets,
    description: info.purpose,
    template: info,
    visibility: "team", owner: "Zeno", isTemplate: true,
    filters: { range: DEFAULT_RANGE, country: null, regions: [], ...filters },
    createdAt: new Date(2026, 5, 1).toISOString(),
    lastViewedAt: null,
  };
}

export function buildSeed(now: number): Dashboard[] {
  const ago = (hours: number) => new Date(now - hours * HOUR).toISOString();

  const templates: Dashboard[] = [
    template("t-revenue", "Month-end revenue review", "revenue",
      { purpose: "For finance’s month-end review of billing and top-ups", ownerTeam: "Finance team", lastReviewed: "2026-11-03", version: 3 },
      { range: { preset: "lastMonth" }, country: "Kenya" }, [
        w("t-revenue-1", "kpi", "points-debited"),
        w("t-revenue-2", "kpi", "top-ups"),
        w("t-revenue-3", "kpi", "kwh-billed"),
        w("t-revenue-4", "kpi", "points-per-swap"),
        w("t-revenue-5", "line", "points-debited", { title: "Points debited per day", size: "full" }),
        w("t-revenue-6", "bar", "points-debited", { title: "Points debited by service", splitBy: "service" }),
        w("t-revenue-7", "table", "top-ups", { title: "Top-ups by region", splitBy: "region", compare: true }),
      ]),
    template("t-stations", "Daily station check", "swaps",
      { purpose: "For station ops to spot stations that need attention today", ownerTeam: "Station ops team", lastReviewed: "2026-11-10", version: 2 },
      { range: { preset: "7d" }, country: "Kenya" }, [
        w("t-stations-1", "kpi", "swaps"),
        w("t-stations-2", "kpi", "station-uptime"),
        w("t-stations-3", "kpi", "failed-swaps"),
        w("t-stations-4", "line", "swaps", { title: "Swaps per day" }),
        // A top list of stations, with a Region tab for the same figures by region.
        w("t-stations-5", "toplist", "failed-swaps", { title: "Failed swaps", splitBy: "station", switchable: ["station", "region"] }),
        w("t-stations-6", "table", "station-uptime", { title: "Uptime by station, lowest first", splitBy: "station", sort: "asc" }),
      ]),
    template("t-charging", "Charging network review", "charging",
      { purpose: "For the charging team’s weekly look at fast and home charging", ownerTeam: "Charging team", lastReviewed: "2026-10-28", version: 2 },
      { range: { preset: "30d" }, country: "Kenya" }, [
        w("t-charging-1", "kpi", "fast-charge-sessions"),
        w("t-charging-2", "kpi", "home-charge-sessions"),
        w("t-charging-3", "kpi", "energy-per-session"),
        w("t-charging-4", "line", "fast-charge-sessions", { title: "Fast charge sessions per day" }),
        w("t-charging-5", "stacked", "kwh-billed", { title: "kWh billed by service", splitBy: "service", grouping: "week" }),
        w("t-charging-6", "table", "fast-charge-sessions", { title: "Fast charge sessions by station", splitBy: "station" }),
      ]),
    template("t-batteries", "Battery fleet health", "batteries",
      { purpose: "For the battery team’s weekly review of stock and repairs", ownerTeam: "Battery ops team", lastReviewed: "2026-11-05", version: 4 },
      { range: { preset: "30d" } }, [
        w("t-batteries-1", "kpi", "batteries-needing-service"),
        w("t-batteries-2", "kpi", "battery-health"),
        w("t-batteries-3", "stacked", "battery-inventory", { splitBy: "batteryState", size: "full", grouping: "week" }),
        w("t-batteries-4", "line", "batteries-needing-service", { title: "Batteries needing service over time" }),
        // One widget where there'd be a "by station" and a "by region" pair: viewers switch with tabs.
        w("t-batteries-5", "bar", "batteries-needing-service", { title: "Batteries needing service", splitBy: "station", switchable: ["station", "region"] }),
        w("t-batteries-6", "table", "battery-health", { title: "Battery health by region, lowest first", splitBy: "region", sort: "asc" }),
      ]),
    template("t-fleet", "Fleet availability", "fleet",
      { purpose: "For fleet ops to track how many vehicles are on the road", ownerTeam: "Fleet ops team", lastReviewed: "2026-10-30", version: 2 },
      { range: { preset: "30d" }, country: "Kenya" }, [
        w("t-fleet-1", "kpi", "active-vehicles"),
        w("t-fleet-2", "kpi", "vehicles-offline"),
        w("t-fleet-3", "line", "active-vehicles", { title: "Active vehicles per day" }),
        w("t-fleet-4", "line", "vehicles-offline", { title: "Vehicles offline over time" }),
        w("t-fleet-5", "bar", "vehicles-offline", { title: "Vehicles offline by region", splitBy: "region" }),
        w("t-fleet-6", "table", "active-vehicles", { title: "Active vehicles by customer type", splitBy: "customerType" }),
      ]),
    template("t-balances", "Rider balances and collections", "customers",
      { purpose: "For the collections team’s weekly follow-up on riders in the red", ownerTeam: "Collections team", lastReviewed: "2026-11-12", version: 3 },
      { range: { preset: "30d" }, country: "Kenya" }, [
        w("t-balances-1", "kpi", "active-riders"),
        w("t-balances-2", "kpi", "negative-balance"),
        w("t-balances-3", "kpi", "top-ups"),
        w("t-balances-4", "line", "negative-balance", { title: "Riders with negative balance over time" }),
        w("t-balances-5", "bar", "negative-balance", { title: "Riders with negative balance by region", splitBy: "region" }),
        w("t-balances-6", "table", "top-ups", { title: "Top-ups by customer type", splitBy: "customerType", compare: true }),
      ]),
    template("t-partners", "Partner settlement", "partners",
      { purpose: "For the partnerships team’s monthly partner statement", ownerTeam: "Partnerships team", lastReviewed: "2026-11-01", version: 2 },
      { range: { preset: "lastMonth" }, country: "Kenya" }, [
        w("t-partners-1", "kpi", "partner-swaps"),
        w("t-partners-2", "kpi", "partner-points"),
        w("t-partners-3", "kpi", "partner-share"),
        w("t-partners-4", "line", "partner-points", { title: "Points earned by partners per day" }),
        w("t-partners-5", "bar", "partner-swaps", { title: "Partner swaps by station", splitBy: "station" }),
        w("t-partners-6", "table", "partner-points", { title: "Points earned by partner station", splitBy: "station", compare: true }),
      ]),
    template("t-growth", "Weekly growth review", "growth",
      { purpose: "For the growth team’s weekly look at new and active riders", ownerTeam: "Growth team", lastReviewed: "2026-11-06", version: 1 },
      { range: { preset: "90d" } }, [
        w("t-growth-1", "kpi", "new-riders"),
        w("t-growth-2", "kpi", "active-riders"),
        w("t-growth-3", "line", "new-riders", { title: "New riders per week", grouping: "week", size: "full" }),
        w("t-growth-4", "bar", "new-riders", { title: "New riders by region", splitBy: "region" }),
        w("t-growth-5", "table", "new-riders", { title: "New riders by customer type", splitBy: "customerType", compare: true }),
      ]),
  ];

  const yours: Dashboard[] = [
    {
      id: "d-nairobi-ops", name: "Nairobi weekly ops", category: "swaps",
      description: "Swaps, uptime and failed swaps for the Nairobi stations.",
      visibility: "team", owner: null, isTemplate: false,
      filters: { range: { preset: "90d" }, country: "Kenya", regions: ["Nairobi"] },
      widgets: [
        w("d-nairobi-ops-1", "kpi", "swaps"),
        w("d-nairobi-ops-2", "kpi", "station-uptime"),
        w("d-nairobi-ops-3", "kpi", "failed-swaps"),
        w("d-nairobi-ops-6", "kpi", "kwh-billed", {
          title: "kWh billed for BaaS swaps",
          filters: [{ property: "service", values: ["Swap"] }, { property: "customerType", values: ["BaaS"] }],
        }),
        w("d-nairobi-ops-4", "line", "swaps", { title: "Swaps per week" }),
        w("d-nairobi-ops-5", "bar", "failed-swaps", { title: "Failed swaps by station", splitBy: "station" }),
      ],
      createdAt: ago(24 * 40), lastViewedAt: ago(3),
    },
    {
      // The mock data's events, day by day: the Nanyuki outage (12–19 Oct), Mashujaa Day (20 Oct) and the flat swap rate (1 Nov).
      id: "d-network-events", name: "Network events, Oct–Nov", category: "swaps",
      description: "Day-by-day view of the Nanyuki outage, Mashujaa Day and the flat swap rate.",
      visibility: "private", owner: null, isTemplate: false,
      filters: { range: { preset: "90d" }, country: "Kenya", regions: [] },
      widgets: [
        w("d-network-events-1", "kpi", "swaps"),
        w("d-network-events-2", "kpi", "points-per-swap"),
        w("d-network-events-3", "line", "swaps", { title: "Swaps per day", grouping: "day", size: "full" }),
        w("d-network-events-4", "line", "swaps", { title: "Swaps in Nanyuki per day", grouping: "day", filters: [{ property: "region", values: ["Nanyuki"] }] }),
        w("d-network-events-5", "line", "failed-swaps", { title: "Failed swaps in Nanyuki per day", grouping: "day", filters: [{ property: "region", values: ["Nanyuki"] }] }),
        w("d-network-events-6", "line", "points-per-swap", { title: "Average points per swap per day", grouping: "day" }),
        w("d-network-events-7", "line", "station-uptime", { title: "Station uptime by region", splitBy: "region", grouping: "day" }),
      ],
      createdAt: ago(24 * 5), lastViewedAt: ago(1),
    },
    {
      // A copy of the month-end template, renamed and narrowed to Nairobi; no description of its own, so the overview says what it's based on.
      id: "d-revenue-copy", name: "Month-end review, Nairobi", category: "revenue",
      visibility: "private", owner: null, isTemplate: false, basedOnTemplateId: "t-revenue",
      filters: { range: { preset: "lastMonth" }, country: "Kenya", regions: ["Nairobi"] },
      widgets: [
        w("d-revenue-copy-1", "kpi", "points-debited"),
        w("d-revenue-copy-2", "kpi", "top-ups"),
        w("d-revenue-copy-3", "line", "points-debited", { title: "Points debited per day", size: "full" }),
        w("d-revenue-copy-4", "bar", "points-debited", { title: "Points debited by service", splitBy: "service" }),
      ],
      createdAt: ago(24 * 12), updatedAt: ago(24 * 2), lastViewedAt: ago(30),
    },
    {
      id: "d-pricing-check", name: "Q4 pricing check", category: "revenue",
      description: "Points per swap before and after the October price change.",
      visibility: "private", owner: null, isTemplate: false,
      filters: { range: DEFAULT_RANGE, country: null, regions: [] },
      widgets: [],
      createdAt: ago(24 * 2), lastViewedAt: ago(26),
    },
  ];

  const shared: Dashboard[] = [
    {
      id: "s-finance", name: "Finance month-end", category: "revenue",
      description: "Billing totals for closing the month.",
      visibility: "team", owner: "Finance team", isTemplate: false,
      filters: { range: { preset: "mtd" }, country: null, regions: [] },
      widgets: [
        w("s-finance-1", "kpi", "points-debited"),
        w("s-finance-2", "kpi", "top-ups"),
        w("s-finance-3", "kpi", "kwh-billed"),
        w("s-finance-4", "kpi", "negative-balance"),
        w("s-finance-5", "table", "points-debited", { title: "Points debited by country", splitBy: "country", mockError: true }),
        w("s-finance-6", "table", "top-ups", { title: "Top-ups by region", splitBy: "region", size: "half" }),
      ],
      createdAt: ago(24 * 90), lastViewedAt: ago(24 * 6),
    },
    {
      id: "s-battery-ops", name: "Battery ops daily", category: "batteries",
      description: "Inventory and service queue for the battery team.",
      visibility: "team", owner: "Ops team", isTemplate: false,
      filters: { range: { preset: "7d" }, country: null, regions: [] },
      widgets: [
        w("s-battery-ops-1", "kpi", "batteries-needing-service"),
        w("s-battery-ops-2", "stacked", "battery-inventory", { splitBy: "batteryState", size: "full" }),
      ],
      createdAt: ago(24 * 30), lastViewedAt: null,
    },
  ];

  return [...yours, ...shared, ...templates];
}
