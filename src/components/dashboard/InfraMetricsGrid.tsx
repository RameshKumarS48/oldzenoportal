"use client";

import { format, parseISO } from "date-fns";
import { KpiCard } from "@/components/ui/kpi-card";
import { INFRA_METRIC_DEFINITIONS } from "@/lib/mock/kpi-infra";
import type { InfraWeekData } from "@/lib/mock/kpi-infra";
import { useComparisonStore } from "@/store/comparison";

const INFRA_CATEGORIES: { title: string; keys: (keyof InfraWeekData)[] }[] = [
  { title: "Swap Stations",       keys: ["ssIncrementalDeployed", "ssTotalInstalledBase", "ssInInventory"] },
  { title: "Fast Chargers",       keys: ["fcIncrementalDeployed", "fcTotalInstalledBase", "fcInInventory"] },
  { title: "Batteries",           keys: ["totalBatteriesDeployed", "totalBatteriesInSS", "totalBatteriesInventory"] },
  { title: "Availability & Uptime", keys: ["networkAvailability", "ssAvailability", "fcAvailability", "networkUptime", "ssUptime", "fcUptime", "swapsWaitOver10Mins"] },
  { title: "Install Costs",       keys: ["newSSAvgInstallCost", "newFCAvgInstallCost"] },
  { title: "Rentals",             keys: ["ssAvgRental", "fcAvgRental", "newSSAvgRental", "newFCAvgRental"] },
  { title: "Energy",              keys: ["ssKwhSold", "fcKwhSold", "ssSoldKwhPercent", "fcSoldKwhPercent"] },
  { title: "Revenue",             keys: ["ssRevenue", "fcRevenue", "ssRevenuePercent", "fcRevenuePercent"] },
  { title: "Pricing",             keys: ["overallBlendedPricing", "ssPricing", "fcPricing"] },
  { title: "Electric Rates",      keys: ["ssElectricRate", "fcElectricRate", "overallBlendedElectricRate"] },
  { title: "Sites Pipeline",      keys: ["leasesSigned", "cumulativeEVTariffSites", "ssUpperFunnelSites", "fcUpperFunnelSites"] },
  { title: "Network Ratios",      keys: ["bikeSsRatio", "bikeFcRatio", "batteryPairPerBike"] },
];

interface Props {
  row: InfraWeekData;
  allRows: InfraWeekData[];
  getDefinition: (key: string) => string;
  search?: string;
}

export function InfraMetricsGrid({ row, allRows, getDefinition, search = "" }: Props) {
  const getComparisonRow = useComparisonStore((s) => s.getComparisonRow);
  const getLabel = useComparisonStore((s) => s.getLabel);

  const compRow = getComparisonRow(allRows, row);
  const compLabel = getLabel();
  const q = search.toLowerCase().trim();

  const historyRows = allRows
    .filter((r) => r.weekStart <= row.weekStart)
    .slice(-5);

  return (
    <div className="space-y-8">
      {INFRA_CATEGORIES.map((cat) => {
        const visibleKeys = cat.keys.filter((key) => {
          if (!q) return true;
          const def = INFRA_METRIC_DEFINITIONS.find((d) => d.key === key);
          return (
            def?.label.toLowerCase().includes(q) ||
            def?.group.toLowerCase().includes(q) ||
            key.toLowerCase().includes(q)
          );
        });
        if (visibleKeys.length === 0) return null;

        return (
          <section key={cat.title}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-0.5 h-4 bg-[#FF3B06] rounded-full" />
              <h3
                className="text-[11px] font-bold text-slate-600 uppercase tracking-widest"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {cat.title}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleKeys.map((key) => {
                const def = INFRA_METRIC_DEFINITIONS.find((d) => d.key === key);
                const metric = row[key] as { actual: number } | undefined;
                const prevMetric = compRow ? (compRow[key] as { actual: number } | undefined) : undefined;
                if (!metric || !def) return null;

                const history = historyRows.map((r) => ({
                  weekLabel: format(parseISO(r.weekStart), "M/d"),
                  value: (r[key] as { actual: number }).actual,
                }));

                return (
                  <KpiCard
                    key={key}
                    label={def.label}
                    value={metric.actual}
                    previousValue={prevMetric?.actual}
                    comparisonLabel={compLabel}
                    unit={def.unit}
                    definition={getDefinition(key)}
                    history={history}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
