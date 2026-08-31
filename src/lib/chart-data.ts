import { PARTNER_KPI_DATA, WEEKS, METRIC_DEFINITIONS } from "./mock/kpi-partner";
import type { PartnerId, PartnerWeekData } from "./mock/kpi-partner";
import { INFRA_KPI_DATA, INFRA_METRIC_DEFINITIONS } from "./mock/kpi-infra";
import type { InfraRegionId, InfraWeekData } from "./mock/kpi-infra";
import { REFERRAL_KPI_DATA, REFERRAL_WEEKS, REFERRAL_METRIC_DEFINITIONS } from "./mock/kpi-referral";
import type { ReferralWeekData } from "./mock/kpi-referral";
import { WALLET_KPI_DATA, WALLET_WEEKS, WALLET_METRIC_DEFINITIONS } from "./mock/kpi-wallet";
import type { WalletWeekData } from "./mock/kpi-wallet";
import { ENERGY_KPI_DATA, ENERGY_WEEKS, ENERGY_METRIC_DEFINITIONS } from "./mock/kpi-energy";
import type { EnergyWeekData } from "./mock/kpi-energy";
import { PREORDER_KPI_DATA, PREORDER_WEEKS, PREORDER_METRIC_DEFINITIONS } from "./mock/kpi-preorder";
import type { PreorderWeekData } from "./mock/kpi-preorder";
import type { Widget, WidgetSeries } from "./mock/dashboards";

const ALL_DEFINITIONS = [
  ...METRIC_DEFINITIONS,
  ...INFRA_METRIC_DEFINITIONS,
  ...REFERRAL_METRIC_DEFINITIONS,
  ...WALLET_METRIC_DEFINITIONS,
  ...ENERGY_METRIC_DEFINITIONS,
  ...PREORDER_METRIC_DEFINITIONS,
];

function getMetricValue(row: PartnerWeekData | InfraWeekData | ReferralWeekData | WalletWeekData | EnergyWeekData | PreorderWeekData, metricKey: string, seriesType: "actual" | "target" | "variance"): number {
  const data = (row as unknown as Record<string, unknown>)[metricKey];
  if (data && typeof data === "object" && seriesType in (data as object)) {
    return ((data as Record<string, number>)[seriesType]) ?? 0;
  }
  return 0;
}

function makeSeriesKey(s: WidgetSeries): string {
  return `${s.metricKey}_${s.seriesType}`;
}

function getSeriesLabel(s: WidgetSeries): string {
  if (s.label) return s.label;
  const def = ALL_DEFINITIONS.find((d) => d.key === s.metricKey);
  return `${def?.label ?? s.metricKey} (${s.seriesType})`;
}

export function buildChartData(
  widget: Widget,
  partnerId: PartnerId,
  infraRegionId: InfraRegionId,
  dateFrom: string,
  dateTo: string
): { rows: Record<string, unknown>[]; series: { key: string; label: string; color: string }[] } {
  let sourceData: (PartnerWeekData | InfraWeekData | ReferralWeekData | WalletWeekData | EnergyWeekData | PreorderWeekData)[];
  let weekLabelsSource: { weekStart: string; label: string }[];

  if (widget.dataSource === "infra") {
    sourceData = INFRA_KPI_DATA[infraRegionId];
    weekLabelsSource = WEEKS;
  } else if (widget.dataSource === "referral") {
    sourceData = REFERRAL_KPI_DATA;
    weekLabelsSource = REFERRAL_WEEKS;
  } else if (widget.dataSource === "wallet") {
    sourceData = WALLET_KPI_DATA;
    weekLabelsSource = WALLET_WEEKS;
  } else if (widget.dataSource === "energy") {
    sourceData = ENERGY_KPI_DATA;
    weekLabelsSource = ENERGY_WEEKS;
  } else if (widget.dataSource === "preorder") {
    sourceData = PREORDER_KPI_DATA;
    weekLabelsSource = PREORDER_WEEKS;
  } else {
    sourceData = PARTNER_KPI_DATA[partnerId];
    weekLabelsSource = WEEKS;
  }

  const filtered = sourceData.filter(
    (row) => row.weekStart >= dateFrom && row.weekStart <= dateTo
  );

  const weekLabels = weekLabelsSource.filter(
    (w) => w.weekStart >= dateFrom && w.weekStart <= dateTo
  );

  const rows = filtered.map((row, i) => {
    const entry: Record<string, unknown> = {
      week: weekLabels[i]?.label ?? row.weekStart,
    };
    widget.series.forEach((s) => {
      entry[makeSeriesKey(s)] = getMetricValue(row, s.metricKey, s.seriesType);
    });
    return entry;
  });

  const series = widget.series.map((s) => ({
    key: makeSeriesKey(s),
    label: getSeriesLabel(s),
    color: s.color,
  }));

  return { rows, series };
}

export function buildPieData(
  widget: Widget,
  partnerId: PartnerId,
  infraRegionId: InfraRegionId,
  dateFrom: string,
  dateTo: string
): { name: string; value: number; color: string }[] {
  let sourceData: (PartnerWeekData | InfraWeekData | ReferralWeekData | WalletWeekData | EnergyWeekData | PreorderWeekData)[];

  if (widget.dataSource === "infra") {
    sourceData = INFRA_KPI_DATA[infraRegionId];
  } else if (widget.dataSource === "referral") {
    sourceData = REFERRAL_KPI_DATA;
  } else if (widget.dataSource === "wallet") {
    sourceData = WALLET_KPI_DATA;
  } else if (widget.dataSource === "energy") {
    sourceData = ENERGY_KPI_DATA;
  } else if (widget.dataSource === "preorder") {
    sourceData = PREORDER_KPI_DATA;
  } else {
    sourceData = PARTNER_KPI_DATA[partnerId];
  }

  const filtered = sourceData.filter(
    (row) => row.weekStart >= dateFrom && row.weekStart <= dateTo
  );

  return widget.series.map((s) => {
    const total = filtered.reduce(
      (sum, row) => sum + getMetricValue(row, s.metricKey, s.seriesType),
      0
    );
    return {
      name: getSeriesLabel(s),
      value: Math.round(total),
      color: s.color,
    };
  });
}
