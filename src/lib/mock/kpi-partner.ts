import { addWeeks, format } from "date-fns";

export const PARTNERS = [
  { id: "overall", label: "Partner Overall" },
  { id: "gw", label: "Greenwheels" },
  { id: "mkopa", label: "M-KOPA" },
  { id: "watu", label: "Watu" },
  { id: "captive", label: "Captive" },
  { id: "fortune", label: "Fortune" },
  { id: "4g", label: "4G" },
  { id: "cash", label: "Cash" },
  { id: "zeno", label: "Zeno Finance" },
] as const;

export type PartnerId = (typeof PARTNERS)[number]["id"];

export const WEEKS: { weekStart: string; label: string }[] = Array.from(
  { length: 18 },
  (_, i) => {
    const date = addWeeks(new Date("2026-06-01"), i);
    return {
      weekStart: format(date, "yyyy-MM-dd"),
      label: format(date, "d-MMM-yy"),
    };
  }
);

export interface WeeklyMetric {
  actual: number;
  target: number;
  variance: number;
}

export interface PartnerWeekData {
  weekStart: string;
  startingCustomers: WeeklyMetric;
  bikesSold: WeeklyMetric;
  asp: WeeklyMetric;
  bikesDeliveredToPartner: WeeklyMetric;
  bikesDeliveredToCustomer: WeeklyMetric;
  endingCustomers: WeeklyMetric;
  weightedAvgCustomers: WeeklyMetric;
  arpu: WeeklyMetric;
  redeployedCustomers: WeeklyMetric;
  loanRepaymentGrossOverall: WeeklyMetric;
  loanRepaymentNetOverall: WeeklyMetric;
  loanRepaymentGrossOriginal: WeeklyMetric;
  loanRepaymentNetOriginal: WeeklyMetric;
  loanRepaymentGrossResale: WeeklyMetric;
  loanRepaymentNetResale: WeeklyMetric;
  uptimeOverall: WeeklyMetric;
  uptimeOriginal: WeeklyMetric;
  uptimeResale: WeeklyMetric;
  offroadAccidentOverall: WeeklyMetric;
  offroadAccidentOriginal: WeeklyMetric;
  offroadAccidentResale: WeeklyMetric;
  offroadRepoOverall: WeeklyMetric;
  offroadRepoOriginal: WeeklyMetric;
  offroadRepoResale: WeeklyMetric;
  offroadOtherOverall: WeeklyMetric;
  offroadOtherOriginal: WeeklyMetric;
  offroadOtherResale: WeeklyMetric;
  pausedOverall: WeeklyMetric;
  pausedOriginal: WeeklyMetric;
  pausedResale: WeeklyMetric;
}

function metric(actual: number, target: number): WeeklyMetric {
  return { actual, target, variance: actual - target };
}

const MULTIPLIERS: Record<PartnerId, number> = {
  overall: 1,
  gw: 0.35,
  mkopa: 0.28,
  watu: 0.15,
  captive: 0.08,
  fortune: 0.06,
  "4g": 0.05,
  cash: 0.03,
  zeno: 0.12,
};

function generatePartnerData(partnerId: PartnerId): PartnerWeekData[] {
  const m = MULTIPLIERS[partnerId];
  let customerBase = Math.round(180 * m);

  return WEEKS.map((w, i) => {
    const growth = 1 + i * 0.04;
    const noise = 0.9 + Math.random() * 0.2;
    const weekNum = i;

    const soldTarget = weekNum === 4 ? Math.round(200 * m) : weekNum === 8 ? Math.round(350 * m) : weekNum === 13 ? Math.round(200 * m) : weekNum === 16 ? Math.round(200 * m) : 0;
    const soldActual = soldTarget > 0 ? Math.round(soldTarget * noise) : Math.round(5 * m * noise * growth);

    const delivPartnerTarget = weekNum === 2 ? Math.round(15 * m) : weekNum === 3 ? Math.round(15 * m) : weekNum === 4 ? Math.round(72 * m) : weekNum === 5 ? Math.round(33 * m) : weekNum === 6 ? Math.round(34 * m) : weekNum === 7 ? Math.round(66 * m) : weekNum === 8 ? Math.round(217 * m) : weekNum >= 9 ? Math.round(33 * m) : 0;
    const delivPartnerActual = delivPartnerTarget > 0 ? Math.round(delivPartnerTarget * noise) : 0;

    const delivCustTarget = weekNum >= 6 ? Math.round(33 * m * (1 + (weekNum - 6) * 0.1)) : 0;
    const delivCustActual = delivCustTarget > 0 ? Math.round(delivCustTarget * noise) : 0;

    customerBase = customerBase + delivCustActual;
    const endingCust = customerBase;
    const startingCust = customerBase - delivCustActual;

    const loanGrossOverall = Math.min(98, 78 + i * 0.8 + (Math.random() * 4 - 2));
    const loanNetOverall = Math.min(95, 82 + i * 0.7 + (Math.random() * 3 - 1.5));

    const data: PartnerWeekData = {
      weekStart: w.weekStart,
      startingCustomers: metric(startingCust, Math.round(startingCust * 1.05)),
      bikesSold: metric(soldActual, soldTarget),
      asp: metric(Math.round((85000 + i * 500 + (Math.random() * 4000 - 2000)) * (partnerId === "cash" ? 0.9 : 1)), Math.round(88000 * (partnerId === "cash" ? 0.9 : 1))),
      bikesDeliveredToPartner: metric(delivPartnerActual, delivPartnerTarget),
      bikesDeliveredToCustomer: metric(delivCustActual, delivCustTarget),
      endingCustomers: metric(endingCust, Math.round(endingCust * 1.05)),
      weightedAvgCustomers: metric(Math.round((startingCust + endingCust) / 2), Math.round((startingCust + endingCust) / 2 * 1.05)),
      arpu: metric(Math.round((4200 + i * 80 + (Math.random() * 600 - 300)) * (m > 0.3 ? 1 : 0.95)), Math.round(4500 * (m > 0.3 ? 1 : 0.95))),
      redeployedCustomers: metric(Math.round(2 * m * noise), Math.round(3 * m)),
      loanRepaymentGrossOverall: metric(parseFloat(loanGrossOverall.toFixed(1)), 92),
      loanRepaymentNetOverall: metric(parseFloat(loanNetOverall.toFixed(1)), 90),
      loanRepaymentGrossOriginal: metric(parseFloat((loanGrossOverall + 1.5).toFixed(1)), 93),
      loanRepaymentNetOriginal: metric(parseFloat((loanNetOverall + 1.2).toFixed(1)), 91),
      loanRepaymentGrossResale: metric(parseFloat((loanGrossOverall - 3 + Math.random() * 2).toFixed(1)), 89),
      loanRepaymentNetResale: metric(parseFloat((loanNetOverall - 2.5 + Math.random() * 2).toFixed(1)), 87),
      uptimeOverall: metric(parseFloat((88 + i * 0.3 + (Math.random() * 4 - 2)).toFixed(1)), 92),
      uptimeOriginal: metric(parseFloat((89 + i * 0.3 + (Math.random() * 3 - 1.5)).toFixed(1)), 93),
      uptimeResale: metric(parseFloat((85 + i * 0.4 + (Math.random() * 5 - 2.5)).toFixed(1)), 90),
      offroadAccidentOverall: metric(Math.max(0, Math.round((8 - i * 0.2 + (Math.random() * 4 - 2)) * m)), Math.round(6 * m)),
      offroadAccidentOriginal: metric(Math.max(0, Math.round((6 - i * 0.15 + (Math.random() * 3 - 1.5)) * m)), Math.round(5 * m)),
      offroadAccidentResale: metric(Math.max(0, Math.round((2 - i * 0.05 + (Math.random() * 1)) * m)), Math.round(1 * m)),
      offroadRepoOverall: metric(Math.max(0, Math.round((15 - i * 0.3 + (Math.random() * 6 - 3)) * m)), Math.round(10 * m)),
      offroadRepoOriginal: metric(Math.max(0, Math.round((12 - i * 0.25 + (Math.random() * 4 - 2)) * m)), Math.round(8 * m)),
      offroadRepoResale: metric(Math.max(0, Math.round((3 + (Math.random() * 2)) * m)), Math.round(2 * m)),
      offroadOtherOverall: metric(Math.max(0, Math.round((5 + (Math.random() * 4 - 2)) * m)), Math.round(4 * m)),
      offroadOtherOriginal: metric(Math.max(0, Math.round((4 + (Math.random() * 3 - 1.5)) * m)), Math.round(3 * m)),
      offroadOtherResale: metric(Math.max(0, Math.round((1 + Math.random()) * m)), Math.round(1 * m)),
      pausedOverall: metric(Math.max(0, Math.round((7 + (Math.random() * 4 - 2)) * m)), Math.round(5 * m)),
      pausedOriginal: metric(Math.max(0, Math.round((5 + (Math.random() * 3 - 1.5)) * m)), Math.round(4 * m)),
      pausedResale: metric(Math.max(0, Math.round((2 + Math.random()) * m)), Math.round(1 * m)),
    };
    return data;
  });
}

export const PARTNER_KPI_DATA: Record<PartnerId, PartnerWeekData[]> = {
  overall: generatePartnerData("overall"),
  gw: generatePartnerData("gw"),
  mkopa: generatePartnerData("mkopa"),
  watu: generatePartnerData("watu"),
  captive: generatePartnerData("captive"),
  fortune: generatePartnerData("fortune"),
  "4g": generatePartnerData("4g"),
  cash: generatePartnerData("cash"),
  zeno: generatePartnerData("zeno"),
};

export const METRIC_DEFINITIONS = [
  { key: "startingCustomers", label: "Starting # of Customers", unit: "#s", group: "Customers", definition: "Number of active customers at the beginning of the reporting week, before any new activations or churns." },
  { key: "bikesSold", label: "Bikes Sold", unit: "#s", group: "Sales", definition: "Total number of bikes sold to customers during the week, including both new and redeployed units." },
  { key: "asp", label: "ASP (Avg Selling Price)", unit: "KES", group: "Sales", definition: "Average Selling Price in KES per bike sold during the week, across all product tiers." },
  { key: "bikesDeliveredToPartner", label: "Bikes Delivered to Partner", unit: "#s", group: "Operations", definition: "Number of bikes physically dispatched from Zeno's warehouse to the partner's holding location." },
  { key: "bikesDeliveredToCustomer", label: "Bikes Delivered to Customer", unit: "#s", group: "Operations", definition: "Number of bikes activated and delivered directly into a customer's hands during the week." },
  { key: "endingCustomers", label: "Ending # of Customers", unit: "#s", group: "Customers", definition: "Number of active customers at the close of the reporting week, after all activations and exits." },
  { key: "weightedAvgCustomers", label: "Weighted Avg # of Customers", unit: "#s", group: "Customers", definition: "Time-weighted average of the customer base over the week, used for per-customer rate calculations." },
  { key: "arpu", label: "ARPU", unit: "KES", group: "Revenue", definition: "Average Revenue Per User per week, calculated as total collections divided by weighted average customers." },
  { key: "redeployedCustomers", label: "Redeployed Customers Delivered", unit: "#s", group: "Operations", definition: "Bikes recovered from churned customers and reactivated with new customers during the reporting week." },
  { key: "loanRepaymentGrossOverall", label: "Loan Repayment % Gross (Overall)", unit: "%", group: "Loan Book", definition: "Gross repayment rate across all customers: total payments received divided by total payments due, before any adjustments." },
  { key: "loanRepaymentNetOverall", label: "Loan Repayment % Net (Overall)", unit: "%", group: "Loan Book", definition: "Net repayment rate after excluding paused accounts and other deferred obligations from the denominator." },
  { key: "loanRepaymentGrossOriginal", label: "Loan Repayment % Gross (Original)", unit: "%", group: "Loan Book", definition: "Gross repayment rate for the Original cohort, customers on their first Zeno bike." },
  { key: "loanRepaymentNetOriginal", label: "Loan Repayment % Net (Original)", unit: "%", group: "Loan Book", definition: "Net repayment rate for the Original cohort, excluding paused accounts from the denominator." },
  { key: "loanRepaymentGrossResale", label: "Loan Repayment % Gross (Resale)", unit: "%", group: "Loan Book", definition: "Gross repayment rate for the Resale cohort, customers on a redeployed or second-hand Zeno bike." },
  { key: "loanRepaymentNetResale", label: "Loan Repayment % Net (Resale)", unit: "%", group: "Loan Book", definition: "Net repayment rate for the Resale cohort, excluding paused accounts from the denominator." },
  { key: "uptimeOverall", label: "Uptime % (Overall)", unit: "%", group: "Fleet", definition: "Percentage of the fleet that was operational and revenue-generating across all cohorts during the week." },
  { key: "uptimeOriginal", label: "Uptime % (Original)", unit: "%", group: "Fleet", definition: "Uptime percentage for Original cohort bikes, the share that were active versus offroad or paused." },
  { key: "uptimeResale", label: "Uptime % (Resale)", unit: "%", group: "Fleet", definition: "Uptime percentage for Resale cohort bikes, the share that were active versus offroad or paused." },
  { key: "offroadAccidentOverall", label: "Offroad Accident Cases (Overall)", unit: "#s", group: "Offroad", definition: "Number of bikes removed from service due to accidents across all cohorts during the reporting week." },
  { key: "offroadAccidentOriginal", label: "Offroad Accident Cases (Original)", unit: "#s", group: "Offroad", definition: "Accident-related offroad cases within the Original cohort." },
  { key: "offroadAccidentResale", label: "Offroad Accident Cases (Resale)", unit: "#s", group: "Offroad", definition: "Accident-related offroad cases within the Resale cohort." },
  { key: "offroadRepoOverall", label: "Offroad Repo Cases (Overall)", unit: "#s", group: "Offroad", definition: "Bikes repossessed from customers due to sustained non-payment, across all cohorts." },
  { key: "offroadRepoOriginal", label: "Offroad Repo Cases (Original)", unit: "#s", group: "Offroad", definition: "Repossession cases within the Original cohort." },
  { key: "offroadRepoResale", label: "Offroad Repo Cases (Resale)", unit: "#s", group: "Offroad", definition: "Repossession cases within the Resale cohort." },
  { key: "offroadOtherOverall", label: "Offroad Other Cases (Overall)", unit: "#s", group: "Offroad", definition: "Bikes taken offroad for reasons other than accidents or repossessions (e.g., maintenance, theft), across all cohorts." },
  { key: "offroadOtherOriginal", label: "Offroad Other Cases (Original)", unit: "#s", group: "Offroad", definition: "Other offroad cases within the Original cohort." },
  { key: "offroadOtherResale", label: "Offroad Other Cases (Resale)", unit: "#s", group: "Offroad", definition: "Other offroad cases within the Resale cohort." },
  { key: "pausedOverall", label: "Paused Cases (Overall)", unit: "#s", group: "Offroad", definition: "Customers whose accounts are temporarily paused (e.g., hospitalization, emergency) across all cohorts." },
  { key: "pausedOriginal", label: "Paused Cases (Original)", unit: "#s", group: "Offroad", definition: "Paused account cases within the Original cohort." },
  { key: "pausedResale", label: "Paused Cases (Resale)", unit: "#s", group: "Offroad", definition: "Paused account cases within the Resale cohort." },
] as const;

export type MetricKey = (typeof METRIC_DEFINITIONS)[number]["key"];
