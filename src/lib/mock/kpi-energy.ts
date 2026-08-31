import { addWeeks, format } from "date-fns";

export interface EnergyWeekData {
  weekStart: string;
  swapSessionsCount: { actual: number };
  fastChargeSessionsCount: { actual: number };
  homeChargeSessionsCount: { actual: number };
  totalSessionsCount: { actual: number };
  swapKwh: { actual: number };
  fastChargeKwh: { actual: number };
  homeChargeKwh: { actual: number };
  totalKwh: { actual: number };
  cumulativeKwh: { actual: number };
  co2AvoidedKg: { actual: number };
  cumulativeCo2Kg: { actual: number };
  avgKwhPerSession: { actual: number };
  avgKwhPerBike: { actual: number };
  energyRevenueKES: { actual: number };
  costPerKwhKES: { actual: number };
  grossMarginPct: { actual: number };
  gridKwh: { actual: number };
  solarKwh: { actual: number };
  solarSharePct: { actual: number };
  peakHourSessions: { actual: number };
  offPeakSessions: { actual: number };
}

export const ENERGY_WEEKS = Array.from({ length: 18 }, (_, i) => {
  const date = addWeeks(new Date("2026-06-01"), i);
  return { weekStart: format(date, "yyyy-MM-dd"), label: format(date, "d-MMM-yy") };
});

let cumKwh = 0;
let cumCo2 = 0;

// CO2 factor: petrol motorbike emits ~0.12 kg/km, Zeno bike avg 40 km/kWh → 0.003 kg CO2/kWh avoided
// Simpler: 0.5 kg CO2 avoided per kWh (vs petrol equivalent)
const CO2_FACTOR = 0.5;

const BASE: Array<{
  swap: number; fast: number; home: number;
  swapKwh: number; fastKwh: number; homeKwh: number;
  revenueKES: number; costPerKwh: number; margin: number;
  grid: number; solar: number; peakSessions: number;
}> = [
  // wk1: ~820 bikes, 3 swaps/wk each, small fleet
  { swap:2420, fast:280,  home:180,  swapKwh:5808, fastKwh:840,  homeKwh:234,  revenueKES:48000,  costPerKwh:4.2, margin:22, grid:5600, solar:1282, peakSessions:1090 },
  { swap:2490, fast:300,  home:195,  swapKwh:5976, fastKwh:900,  homeKwh:254,  revenueKES:49500,  costPerKwh:4.2, margin:23, grid:5780, solar:1350, peakSessions:1120 },
  { swap:2560, fast:320,  home:210,  swapKwh:6144, fastKwh:960,  homeKwh:273,  revenueKES:51000,  costPerKwh:4.1, margin:24, grid:5900, solar:1477, peakSessions:1152 },
  { swap:2640, fast:340,  home:225,  swapKwh:6336, fastKwh:1020, homeKwh:293,  revenueKES:52500,  costPerKwh:4.1, margin:24, grid:6060, solar:1589, peakSessions:1188 },
  { swap:2720, fast:360,  home:240,  swapKwh:6528, fastKwh:1080, homeKwh:312,  revenueKES:54000,  costPerKwh:4.0, margin:25, grid:6210, solar:1710, peakSessions:1224 },
  { swap:2800, fast:380,  home:255,  swapKwh:6720, fastKwh:1140, homeKwh:332,  revenueKES:55800,  costPerKwh:4.0, margin:25, grid:6360, solar:1832, peakSessions:1260 },
  { swap:2890, fast:400,  home:272,  swapKwh:6936, fastKwh:1200, homeKwh:354,  revenueKES:57500,  costPerKwh:3.9, margin:26, grid:6510, solar:1980, peakSessions:1301 },
  { swap:2980, fast:420,  home:290,  swapKwh:7152, fastKwh:1260, homeKwh:377,  revenueKES:59500,  costPerKwh:3.9, margin:27, grid:6720, solar:2069, peakSessions:1341 },
  { swap:3070, fast:440,  home:308,  swapKwh:7368, fastKwh:1320, homeKwh:400,  revenueKES:61200,  costPerKwh:3.8, margin:28, grid:6870, solar:2218, peakSessions:1382 },
  { swap:3160, fast:460,  home:325,  swapKwh:7584, fastKwh:1380, homeKwh:423,  revenueKES:63200,  costPerKwh:3.8, margin:28, grid:7050, solar:2337, peakSessions:1422 },
  { swap:3250, fast:480,  home:342,  swapKwh:7800, fastKwh:1440, homeKwh:445,  revenueKES:65100,  costPerKwh:3.7, margin:29, grid:7200, solar:2485, peakSessions:1463 },
  { swap:3340, fast:500,  home:360,  swapKwh:8016, fastKwh:1500, homeKwh:468,  revenueKES:67000,  costPerKwh:3.7, margin:30, grid:7380, solar:2604, peakSessions:1503 },
  { swap:3430, fast:520,  home:378,  swapKwh:8232, fastKwh:1560, homeKwh:491,  revenueKES:68800,  costPerKwh:3.6, margin:30, grid:7530, solar:2753, peakSessions:1544 },
  { swap:3520, fast:540,  home:396,  swapKwh:8448, fastKwh:1620, homeKwh:515,  revenueKES:70900,  costPerKwh:3.6, margin:31, grid:7710, solar:2873, peakSessions:1584 },
  { swap:3620, fast:560,  home:415,  swapKwh:8688, fastKwh:1680, homeKwh:540,  revenueKES:73000,  costPerKwh:3.5, margin:31, grid:7880, solar:3028, peakSessions:1629 },
  { swap:3720, fast:580,  home:434,  swapKwh:8928, fastKwh:1740, homeKwh:564,  revenueKES:75000,  costPerKwh:3.5, margin:32, grid:8060, solar:3172, peakSessions:1674 },
  { swap:3820, fast:600,  home:453,  swapKwh:9168, fastKwh:1800, homeKwh:589,  revenueKES:77200,  costPerKwh:3.4, margin:32, grid:8220, solar:3337, peakSessions:1719 },
  { swap:3920, fast:620,  home:472,  swapKwh:9408, fastKwh:1860, homeKwh:614,  revenueKES:79400,  costPerKwh:3.4, margin:33, grid:8390, solar:3492, peakSessions:1764 },
];

export const ENERGY_KPI_DATA: EnergyWeekData[] = BASE.map((b, i) => {
  const totalKwh = b.swapKwh + b.fastKwh + b.homeKwh;
  const totalSessions = b.swap + b.fast + b.home;
  cumKwh += totalKwh;
  const co2Week = totalKwh * CO2_FACTOR;
  cumCo2 += co2Week;
  return {
    weekStart: ENERGY_WEEKS[i].weekStart,
    swapSessionsCount:     { actual: b.swap },
    fastChargeSessionsCount:{ actual: b.fast },
    homeChargeSessionsCount:{ actual: b.home },
    totalSessionsCount:    { actual: totalSessions },
    swapKwh:               { actual: b.swapKwh },
    fastChargeKwh:         { actual: b.fastKwh },
    homeChargeKwh:         { actual: b.homeKwh },
    totalKwh:              { actual: Math.round(totalKwh) },
    cumulativeKwh:         { actual: Math.round(cumKwh) },
    co2AvoidedKg:          { actual: Math.round(co2Week) },
    cumulativeCo2Kg:       { actual: Math.round(cumCo2) },
    avgKwhPerSession:      { actual: Math.round((totalKwh / totalSessions) * 100) / 100 },
    avgKwhPerBike:         { actual: Math.round((totalKwh / (820 + i * 20)) * 10) / 10 },
    energyRevenueKES:      { actual: b.revenueKES },
    costPerKwhKES:         { actual: b.costPerKwh },
    grossMarginPct:        { actual: b.margin },
    gridKwh:               { actual: b.grid },
    solarKwh:              { actual: b.solar },
    solarSharePct:         { actual: Math.round((b.solar / totalKwh) * 1000) / 10 },
    peakHourSessions:      { actual: b.peakSessions },
    offPeakSessions:       { actual: totalSessions - b.peakSessions },
  };
});

export const ENERGY_METRIC_DEFINITIONS = [
  { key: "swapSessionsCount",      label: "Swap Sessions",           group: "Sessions",  unit: "#",   definition: "Total battery swap sessions completed at swap stations this week." },
  { key: "fastChargeSessionsCount",label: "Fast Charge Sessions",    group: "Sessions",  unit: "#",   definition: "Total fast-charge sessions (DC) at roadside charge points this week." },
  { key: "homeChargeSessionsCount",label: "Home Charge Sessions",    group: "Sessions",  unit: "#",   definition: "Total home overnight charge sessions detected via app telemetry this week." },
  { key: "totalSessionsCount",     label: "Total Sessions",          group: "Sessions",  unit: "#",   definition: "Sum of all energy sessions (swap + fast + home) completed this week." },
  { key: "swapKwh",                label: "Swap kWh Delivered",      group: "Energy",    unit: "kWh", definition: "kWh dispensed across all battery swap operations this week." },
  { key: "fastChargeKwh",          label: "Fast Charge kWh",         group: "Energy",    unit: "kWh", definition: "kWh delivered via fast-charge stations this week." },
  { key: "homeChargeKwh",          label: "Home Charge kWh",         group: "Energy",    unit: "kWh", definition: "kWh consumed by home charging sessions this week (estimated via BMS telemetry)." },
  { key: "totalKwh",               label: "Total kWh Delivered",     group: "Energy",    unit: "kWh", definition: "Total energy delivered across all session types this week." },
  { key: "cumulativeKwh",          label: "Cumulative kWh",          group: "Energy",    unit: "kWh", definition: "Running total of all kWh delivered since programme launch." },
  { key: "co2AvoidedKg",           label: "CO₂ Avoided (kg)",        group: "Impact",    unit: "kg",  definition: "Estimated kg of CO₂ avoided vs petrol equivalent (0.5 kg/kWh factor)." },
  { key: "cumulativeCo2Kg",        label: "Cumulative CO₂ Avoided",  group: "Impact",    unit: "kg",  definition: "Running total of CO₂ avoided since launch." },
  { key: "avgKwhPerSession",       label: "Avg kWh / Session",       group: "Efficiency",unit: "kWh", definition: "Average energy per session. Swap sessions avg 2.4 kWh." },
  { key: "avgKwhPerBike",          label: "Avg kWh / Bike",          group: "Efficiency",unit: "kWh", definition: "Average weekly energy consumption per active bike in fleet." },
  { key: "energyRevenueKES",       label: "Energy Revenue (KES)",    group: "Finance",   unit: "KES", definition: "Revenue attributed to energy delivery (subscription portion allocated to swap/charge services)." },
  { key: "costPerKwhKES",          label: "Cost per kWh (KES)",      group: "Finance",   unit: "KES", definition: "Blended cost per kWh (grid + solar CAPEX amortised). Target: <3.50 KES." },
  { key: "grossMarginPct",         label: "Energy Gross Margin (%)", group: "Finance",   unit: "%",   definition: "Energy revenue minus energy cost, as a % of energy revenue. Target >30%." },
  { key: "gridKwh",                label: "Grid kWh Consumed",       group: "Supply",    unit: "kWh", definition: "kWh sourced from the public grid this week." },
  { key: "solarKwh",               label: "Solar kWh Generated",     group: "Supply",    unit: "kWh", definition: "kWh generated by on-site solar panels across all swap stations this week." },
  { key: "solarSharePct",          label: "Solar Share (%)",         group: "Supply",    unit: "%",   definition: "Solar kWh as a % of total kWh delivered. Target >35%." },
  { key: "peakHourSessions",       label: "Peak Hour Sessions",      group: "Demand",    unit: "#",   definition: "Sessions occurring between 07:00–10:00 and 17:00–20:00 (peak demand windows)." },
  { key: "offPeakSessions",        label: "Off-Peak Sessions",       group: "Demand",    unit: "#",   definition: "Sessions occurring outside peak demand windows." },
];
