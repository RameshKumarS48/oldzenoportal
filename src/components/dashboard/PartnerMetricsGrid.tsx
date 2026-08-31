"use client";

import { format, parseISO } from "date-fns";
import { KpiCard } from "@/components/ui/kpi-card";
import { METRIC_DEFINITIONS } from "@/lib/mock/kpi-partner";
import type { PartnerWeekData } from "@/lib/mock/kpi-partner";
import { useComparisonStore } from "@/store/comparison";
import { useActualsStore, shouldAutoSync } from "@/store/actuals";
import { useEffect } from "react";

const PARTNER_CATEGORIES: { title: string; keys: (keyof PartnerWeekData)[] }[] = [
  { title: "Customer Base",       keys: ["startingCustomers", "endingCustomers", "weightedAvgCustomers"] },
  { title: "Sales & Delivery",    keys: ["bikesSold", "asp", "bikesDeliveredToPartner", "bikesDeliveredToCustomer", "redeployedCustomers"] },
  { title: "Revenue",             keys: ["arpu"] },
  { title: "Loan Book Repayment", keys: ["loanRepaymentGrossOverall", "loanRepaymentNetOverall", "loanRepaymentGrossOriginal", "loanRepaymentNetOriginal", "loanRepaymentGrossResale", "loanRepaymentNetResale"] },
  { title: "Uptime",              keys: ["uptimeOverall", "uptimeOriginal", "uptimeResale"] },
  { title: "Fleet Offroad",       keys: ["offroadAccidentOverall", "offroadRepoOverall", "offroadOtherOverall", "pausedOverall", "offroadAccidentOriginal", "offroadRepoOriginal", "offroadOtherOriginal", "pausedOriginal", "offroadAccidentResale", "offroadRepoResale", "offroadOtherResale", "pausedResale"] },
];

const CITIES = [
  { key: "nbo",      label: "Nairobi (NBO)" },
  { key: "nanyuki",  label: "Nanyuki" },
  { key: "naromoru", label: "Naro Moru" },
  { key: "nyeri",    label: "Nyeri" },
] as const;

interface Props {
  row: PartnerWeekData;
  allRows: PartnerWeekData[];
  getDefinition: (key: string) => string;
  search?: string;
  partnerId?: string;
}

function weekLabel(weekStart: string): string {
  return format(parseISO(weekStart), "M/d");
}

export function PartnerMetricsGrid({ row, allRows, getDefinition, search = "", partnerId = "overall" }: Props) {
  const getComparisonRow = useComparisonStore((s) => s.getComparisonRow);
  const getLabel = useComparisonStore((s) => s.getLabel);
  const sync = useActualsStore((s) => s.sync);
  const lastSyncedAt = useActualsStore((s) => s.lastSyncedAt);
  const getBikesSold = useActualsStore((s) => s.getBikesSold);
  const getCitySplit = useActualsStore((s) => s.getCitySplit);
  const hasAnyActuals = useActualsStore((s) => s.weeks.length > 0);
  const actualsWeeks = useActualsStore((s) => s.weeks);

  useEffect(() => {
    if (shouldAutoSync(lastSyncedAt)) void sync();
  }, [lastSyncedAt, sync]);

  const compRow = getComparisonRow(allRows, row);
  const compLabel = getLabel();
  const q = search.toLowerCase().trim();

  // Use exact week if available; otherwise fall back to latest synced week
  const latestActualsStart = actualsWeeks[actualsWeeks.length - 1]?.weekStart ?? null;
  const lookupWeek = (getBikesSold(row.weekStart, partnerId) !== null)
    ? row.weekStart
    : latestActualsStart;
  const liveOverall = lookupWeek ? getBikesSold(lookupWeek, partnerId) : null;
  const hasLive = liveOverall !== null;
  const liveCities = lookupWeek ? getCitySplit(lookupWeek, partnerId) : null;

  const bikesSoldDisplay = hasLive ? liveOverall! : row.bikesSold.actual;
  const nboVal     = liveCities?.nbo     ?? Math.round(bikesSoldDisplay * 0.6);
  const nanyukiVal = liveCities?.nanyuki ?? Math.round(bikesSoldDisplay * 0.2);
  const nyeriVal   = liveCities?.nyeri   ?? Math.round(bikesSoldDisplay * 0.2);
  const cityVals: Record<string, number> = { nbo: nboVal, nanyuki: nanyukiVal, nyeri: nyeriVal };

  // Last 5 rows up to and including the current row
  const historyRows = allRows
    .filter((r) => r.weekStart <= row.weekStart)
    .slice(-5);

  return (
    <div className="space-y-8">
      {PARTNER_CATEGORIES.map((cat) => {
        const visibleKeys = cat.keys.filter((key) => {
          if (!q) return true;
          const def = METRIC_DEFINITIONS.find((d) => d.key === key);
          return (
            def?.label.toLowerCase().includes(q) ||
            def?.group.toLowerCase().includes(q) ||
            key.toLowerCase().includes(q)
          );
        });
        if (visibleKeys.length === 0) return null;

        const isSalesSection = cat.title === "Sales & Delivery";

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
                const def = METRIC_DEFINITIONS.find((d) => d.key === key);
                const metric = row[key] as { actual: number } | undefined;
                const prevMetric = compRow ? (compRow[key] as { actual: number } | undefined) : undefined;
                if (!metric || !def) return null;

                const isLive = key === "bikesSold" && hasAnyActuals;
                const displayValue = isLive ? liveOverall! : metric.actual;

                // Bikes Sold history: use real actuals data; all others use mock rows
                const history = (key === "bikesSold" && hasAnyActuals)
                  ? actualsWeeks.slice(-5).map((w) => ({
                      weekLabel: weekLabel(w.weekStart),
                      value: (!partnerId || partnerId === "overall")
                        ? w.overall
                        : (w.byPartner[partnerId] ?? 0),
                    }))
                  : historyRows.map((r) => ({
                      weekLabel: weekLabel(r.weekStart),
                      value: (r[key] as { actual: number }).actual,
                    }));

                return (
                  <KpiCard
                    key={key}
                    label={def.label}
                    value={displayValue}
                    previousValue={prevMetric?.actual}
                    comparisonLabel={compLabel}
                    unit={def.unit}
                    definition={getDefinition(key)}
                    isLive={isLive}
                    history={history}
                  />
                );
              })}
            </div>

            {isSalesSection && !q && (
              <div className="mt-3 pl-4 border-l-2 border-slate-100">
                <p
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Bikes Sold by City
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map(({ key: cityKey, label: cityLabel }) => {
                    const cityHistory = actualsWeeks.slice(-5).map((w) => ({
                      weekLabel: format(parseISO(w.weekStart), "M/d"),
                      value: w.byCity[cityKey] ?? 0,
                    }));
                    return (
                    <KpiCard
                      key={cityKey}
                      label={cityLabel}
                      value={cityVals[cityKey] ?? 0}
                      unit="#s"
                      isLive={hasAnyActuals}
                      definition={`Bikes sold in the ${cityLabel} region this week.`}
                      history={cityHistory.length > 1 ? cityHistory : undefined}
                    />
                  );})}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
