/** Dashboards other people have already shared, so the Shared tab has something to open. */
import type { Card, Dashboard, FieldRef, Measure } from "./types";

let n = 0;
const chart = (measure: Measure, over: Partial<Card> = {}): Card => ({
  id: `seed-card-${++n}`, kind: "chart", measures: [measure], overTime: false, splits: [], filters: [], time: {}, ...over,
});
const count = (record: string): Measure => ({ record, fn: "count" });
const sum = (record: string, field: string): Measure => ({ record, fn: "sum", field });
const metric = (record: string, metricId: string): Measure => ({ record, fn: "metric", metricId });
const via = (record: string, field: string): FieldRef => ({ via: record, field });

const base = (id: string, name: string, ownerId: string, ownerName: string, cards: Card[], preset: Dashboard["range"]["preset"] = "30d"): Dashboard => ({
  id, name, visibility: "public", ownerId, ownerName, range: { preset }, filters: [], cards,
  createdAt: "2026-11-10T08:00:00.000Z", updatedAt: "2026-11-21T09:30:00.000Z", updatedBy: ownerName, version: 1,
});

export const DASHBOARD_SEED: Dashboard[] = [
  base("seed-network", "Network daily", "u2", "Willie Omondi", [
    chart(count("swaps")),
    chart(metric("swaps", "swap_success_rate")),
    chart(metric("stations", "station_uptime")),
    chart(count("station_outages")),
    chart(count("swaps"), { overTime: true }),
    chart(count("swaps"), { splits: [via("stations", "name")] }),
    chart(count("swaps"), { overTime: true, splits: [{ field: "status" }], view: "stacked_columns" }),
    chart(sum("station_outages", "minutes"), { splits: [{ field: "cause" }], view: "donut" }),
  ], "7d"),
  base("seed-finance", "Finance month-end", "u17", "Priya Raghavan", [
    chart(metric("swap_charges", "swap_revenue")),
    chart(sum("recharges", "amount")),
    chart(metric("recharges", "recharge_success_rate")),
    chart(sum("refunds", "amount")),
    chart(metric("swap_charges", "swap_revenue"), { overTime: true, view: "columns" }),
    chart(metric("swap_charges", "swap_revenue"), { splits: [via("stations", "region")] }),
    chart(sum("wallet_transactions", "amount"), { overTime: true, splits: [{ field: "category" }], view: "stacked_area" }),
    chart(sum("sites", "monthlyRent"), { splits: [{ field: "town" }] }),
  ], "last_month"),
  base("seed-battery", "Battery fleet", "u16", "Daniel Chege", [
    chart(count("batteries")),
    chart({ record: "batteries", fn: "avg", field: "health" }),
    chart(count("batteries"), { filters: [{ field: { field: "state" }, values: ["Quarantine"] }], title: "Batteries in quarantine" }),
    chart(count("batteries"), { splits: [{ field: "state" }] }),
    chart(count("batteries"), { splits: [{ field: "region" }, { field: "assetType" }] }),
    chart(count("battery_events"), { overTime: true, splits: [{ field: "type" }] }),
  ]),
];
