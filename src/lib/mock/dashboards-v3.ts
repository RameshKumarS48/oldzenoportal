/**
 * Seed for the Dashboards (v3) sandbox: Zeno templates, two of your own and
 * two shared with you. Mock only.
 *
 * Bump SEED_REVISION whenever this seed changes: it is the store's persist
 * version, so every browser drops its saved copy and starts from the new seed.
 */
import { metricById, type CategoryId, type ChartType } from "@/lib/dashboards-v3/catalogue";
import { DEFAULT_RANGE } from "@/lib/dashboards-v3/dates";
import { defaultSize } from "@/lib/dashboards-v3/rules";
import type { Dashboard, Widget } from "@/lib/dashboards-v3/types";

export const SEED_REVISION = 2;

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

function template(id: string, name: string, category: CategoryId, description: string, widgets: Widget[]): Dashboard {
  return {
    id, name, description, category, widgets,
    visibility: "team", owner: "Zeno", isTemplate: true,
    filters: { range: DEFAULT_RANGE, regions: [] },
    createdAt: new Date(2026, 5, 1).toISOString(),
    lastViewedAt: null,
  };
}

export function buildSeed(now: number): Dashboard[] {
  const ago = (hours: number) => new Date(now - hours * HOUR).toISOString();

  const templates: Dashboard[] = [
    template("t-revenue", "Revenue overview", "revenue", "Points debited, top-ups and energy billed across the network.", [
      w("t-revenue-1", "kpi", "points-debited"),
      w("t-revenue-2", "kpi", "top-ups"),
      w("t-revenue-3", "kpi", "kwh-billed"),
      w("t-revenue-4", "kpi", "points-per-swap"),
      w("t-revenue-5", "line", "points-debited", { title: "Points debited by service", splitBy: "service", size: "full" }),
      w("t-revenue-6", "bar", "top-ups", { title: "Top-ups by region", splitBy: "region" }),
      w("t-revenue-7", "table", "kwh-billed", { title: "kWh billed by customer type", splitBy: "customerType" }),
    ]),
    template("t-stations", "Station performance", "swaps", "Swaps, uptime and failed swaps for every station.", [
      w("t-stations-1", "kpi", "swaps"),
      w("t-stations-2", "kpi", "station-uptime"),
      w("t-stations-3", "kpi", "failed-swaps"),
      w("t-stations-4", "line", "swaps", { title: "Swaps over time" }),
      w("t-stations-5", "bar", "swaps", { title: "Swaps by station", splitBy: "station" }),
      w("t-stations-6", "table", "station-uptime", { title: "Uptime by station", splitBy: "station", sort: "asc" }),
    ]),
    template("t-charging", "Charging activity", "charging", "Fast and home charge sessions and the energy they deliver.", [
      w("t-charging-1", "kpi", "fast-charge-sessions"),
      w("t-charging-2", "kpi", "home-charge-sessions"),
      w("t-charging-3", "kpi", "energy-per-session"),
      w("t-charging-4", "stacked", "kwh-billed", { title: "kWh billed by service", splitBy: "service", grouping: "week" }),
      w("t-charging-5", "line", "fast-charge-sessions", { title: "Fast charge sessions by region", splitBy: "region" }),
    ]),
    template("t-batteries", "Battery health", "batteries", "Where every battery is, and which ones need service.", [
      w("t-batteries-1", "kpi", "batteries-needing-service"),
      w("t-batteries-2", "kpi", "battery-health"),
      w("t-batteries-3", "stacked", "battery-inventory", { splitBy: "batteryState", size: "full", grouping: "week" }),
      w("t-batteries-4", "bar", "batteries-needing-service", { title: "Batteries needing service by station", splitBy: "station" }),
      w("t-batteries-5", "table", "battery-health", { title: "Battery health by region", splitBy: "region", sort: "asc" }),
    ]),
    template("t-fleet", "Fleet status", "fleet", "Active, offline and immobilised vehicles by region.", [
      w("t-fleet-1", "kpi", "active-vehicles"),
      w("t-fleet-2", "kpi", "vehicles-offline"),
      w("t-fleet-3", "kpi", "immobilised-vehicles"),
      w("t-fleet-4", "line", "active-vehicles", { title: "Active vehicles over time" }),
      w("t-fleet-5", "bar", "vehicles-offline", { title: "Vehicles offline by region", splitBy: "region" }),
    ]),
    template("t-balances", "Rider balances", "customers", "Active riders, top-ups and riders in the red.", [
      w("t-balances-1", "kpi", "active-riders"),
      w("t-balances-2", "kpi", "negative-balance"),
      w("t-balances-3", "kpi", "riders-topped-up"),
      w("t-balances-4", "line", "negative-balance", { title: "Riders with negative balance over time" }),
      w("t-balances-5", "bar", "negative-balance", { title: "Riders with negative balance by region", splitBy: "region" }),
      w("t-balances-6", "table", "active-riders", { title: "Active riders by customer type", splitBy: "customerType" }),
    ]),
    template("t-partners", "Partner stations", "partners", "Swaps and points at stations run by partners.", [
      w("t-partners-1", "kpi", "partner-swaps"),
      w("t-partners-2", "kpi", "partner-points"),
      w("t-partners-3", "kpi", "partner-share"),
      w("t-partners-4", "bar", "partner-swaps", { title: "Partner swaps by station", splitBy: "station" }),
      w("t-partners-5", "line", "partner-points", { title: "Points earned by partners over time" }),
    ]),
    template("t-growth", "Rider growth", "growth", "New riders, referrals and how many come back.", [
      w("t-growth-1", "kpi", "new-riders"),
      w("t-growth-2", "kpi", "referral-signups"),
      w("t-growth-3", "kpi", "rider-return-rate"),
      w("t-growth-4", "line", "new-riders", { title: "New riders by customer type", splitBy: "customerType", size: "full" }),
      w("t-growth-5", "bar", "referral-signups", { title: "Referral sign-ups by region", splitBy: "region" }),
    ]),
  ];

  const yours: Dashboard[] = [
    {
      id: "d-nairobi-ops", name: "Nairobi weekly ops", category: "swaps",
      description: "Swaps, uptime and failed swaps for the Nairobi stations.",
      visibility: "team", owner: null, isTemplate: false,
      filters: { range: { preset: "90d" }, regions: ["Nairobi"] },
      widgets: [
        w("d-nairobi-ops-1", "kpi", "swaps"),
        w("d-nairobi-ops-2", "kpi", "station-uptime"),
        w("d-nairobi-ops-3", "kpi", "failed-swaps"),
        w("d-nairobi-ops-4", "line", "swaps", { title: "Swaps per week" }),
        w("d-nairobi-ops-5", "bar", "failed-swaps", { title: "Failed swaps by station", splitBy: "station" }),
      ],
      createdAt: ago(24 * 40), lastViewedAt: ago(3),
    },
    {
      id: "d-pricing-check", name: "Q4 pricing check", category: "revenue",
      description: "Points per swap before and after the October price change.",
      visibility: "private", owner: null, isTemplate: false,
      filters: { range: DEFAULT_RANGE, regions: [] },
      widgets: [],
      createdAt: ago(24 * 2), lastViewedAt: ago(26),
    },
  ];

  const shared: Dashboard[] = [
    {
      id: "s-finance", name: "Finance month-end", category: "revenue",
      description: "Billing totals for closing the month.",
      visibility: "team", owner: "Finance team", isTemplate: false,
      filters: { range: { preset: "mtd" }, regions: [] },
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
      filters: { range: { preset: "7d" }, regions: [] },
      widgets: [
        w("s-battery-ops-1", "kpi", "batteries-needing-service"),
        w("s-battery-ops-2", "stacked", "battery-inventory", { splitBy: "batteryState", size: "full" }),
      ],
      createdAt: ago(24 * 30), lastViewedAt: null,
    },
  ];

  return [...yours, ...shared, ...templates];
}
