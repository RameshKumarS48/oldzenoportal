import { WEEKS } from "./kpi-partner";
import type { WeeklyMetric } from "./kpi-partner";

export const INFRA_REGIONS = [
  { id: "overall", label: "Infra: All Kenya" },
  { id: "nbo", label: "Infra: Nairobi" },
  { id: "nanyuki", label: "Infra: Nanyuki" },
  { id: "nyeri", label: "Infra: Nyeri" },
] as const;

export type InfraRegionId = (typeof INFRA_REGIONS)[number]["id"];

export interface SwapStation {
  id: string;
  name: string;
  location: string;
  region: "nbo" | "nanyuki" | "nyeri";
  live: boolean;
  operational: boolean;
  installationType: "single_phase" | "three_phase";
  batteriesInstalled: number;
  batteriesAvailable: number;
  energyConsumptionKwh: number;
  rating: "L" | "M" | "H";
  startDate: string;
  rent: number;
}

export interface FastCharger {
  id: string;
  name: string;
  location: string;
  region: "nbo" | "nanyuki" | "nyeri";
  delivered: boolean;
  wired: boolean;
  poweredOn: boolean;
  live: boolean;
  installationType: "single_phase" | "three_phase";
  chargersInstalled: number;
  billingType: "pre_paid" | "post_paid";
  installDate: string;
}

export const SWAP_STATIONS: SwapStation[] = [
  { id: "BS0005", name: "Nan Matt 1, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1683, rating: "H", startDate: "2025-01-29", rent: 10000 },
  { id: "BS0002", name: "Peak Place, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1207, rating: "H", startDate: "2025-11-02", rent: 10000 },
  { id: "BS0016", name: "Peak Place 2, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1001, rating: "H", startDate: "2025-11-02", rent: 10000 },
  { id: "BS0006", name: "Zeno Hub, Nyeri", location: "Central Kenya", region: "nyeri", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1292, rating: "H", startDate: "2025-01-01", rent: 0 },
  { id: "BS0003", name: "Dormans, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 962, rating: "H", startDate: "2025-01-01", rent: 10000 },
  { id: "BS0010", name: "Zeno Hub, Thika Town", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 4, batteriesAvailable: 4, energyConsumptionKwh: 138, rating: "L", startDate: "2025-04-17", rent: 12500 },
  { id: "BS0009", name: "Zeno Hub, Eastern Bypass", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 6, batteriesAvailable: 6, energyConsumptionKwh: 553, rating: "M", startDate: "2025-03-20", rent: 12500 },
  { id: "BS0025", name: "Kasarani Hub, Nairobi", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 6, batteriesAvailable: 6, energyConsumptionKwh: 982, rating: "H", startDate: "2025-05-19", rent: 60000 },
  { id: "BS0014", name: "Jubilee House, Imara Daima", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 4, batteriesAvailable: 4, energyConsumptionKwh: 105, rating: "L", startDate: "2025-05-14", rent: 10000 },
  { id: "BS0017", name: "Extra Miles, Eastleigh", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 6, batteriesAvailable: 6, energyConsumptionKwh: 687, rating: "M", startDate: "2025-05-09", rent: 5000 },
  { id: "BS0032", name: "Jam Rescue, Jogoo Rd", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 7, batteriesAvailable: 6, energyConsumptionKwh: 423, rating: "M", startDate: "2025-05-22", rent: 15000 },
  { id: "BS0019", name: "District Mall, Mombasa Rd", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 4, batteriesAvailable: 4, energyConsumptionKwh: 311, rating: "M", startDate: "2025-07-30", rent: 13000 },
  { id: "BS0018", name: "Be Energy, Kayole", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 429, rating: "M", startDate: "2025-06-30", rent: 5000 },
  { id: "BS0022", name: "Pop Up Mall, Parklands", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 465, rating: "M", startDate: "2025-06-13", rent: 8000 },
  { id: "BS0007", name: "Zeno Hub, King'ara", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 2, energyConsumptionKwh: 176, rating: "L", startDate: "2025-03-20", rent: 60000 },
  { id: "BS0008", name: "Zeno Hub Rungiri (OFF)", location: "Nairobi", region: "nbo", live: false, operational: false, installationType: "single_phase", batteriesInstalled: 0, batteriesAvailable: 0, energyConsumptionKwh: 39, rating: "L", startDate: "2025-03-19", rent: 60000 },
  { id: "BS0029", name: "Cumulus Suppliers, Nyeri", location: "Central Kenya", region: "nyeri", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1314, rating: "H", startDate: "2025-03-14", rent: 7000 },
  { id: "BS0031", name: "Wabi Energy, Jogoo Rd", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 2, energyConsumptionKwh: 273, rating: "M", startDate: "2025-06-01", rent: 20000 },
  { id: "BS0024", name: "Mavuno Garage, Upperhill", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 4, batteriesAvailable: 4, energyConsumptionKwh: 232, rating: "M", startDate: "2025-05-26", rent: 10000 },
  { id: "BS0027", name: "Zeno Hub, Westlands", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 415, rating: "M", startDate: "2025-06-10", rent: 0 },
  { id: "BS0021", name: "M Square, Kilimani", location: "Nairobi", region: "nbo", live: true, operational: false, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 574, rating: "M", startDate: "2025-09-23", rent: 25000 },
  { id: "BS0030", name: "Headquarters Inn, Langata", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 4, energyConsumptionKwh: 114, rating: "L", startDate: "2025-06-05", rent: 60000 },
  { id: "BS0040", name: "Kenya Continental Hotel, Rhapta", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 464, rating: "M", startDate: "2025-06-03", rent: 20000 },
  { id: "BS0043", name: "Zeno HQ, Baba Dogo", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 4, energyConsumptionKwh: 497, rating: "M", startDate: "2025-07-14", rent: 0 },
  { id: "BS0047", name: "Nan Matt 2, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 8, energyConsumptionKwh: 1201, rating: "H", startDate: "2025-01-01", rent: 10000 },
  { id: "BS0034", name: "Ngangarithi, Nyeri", location: "Central Kenya", region: "nyeri", live: true, operational: true, installationType: "single_phase", batteriesInstalled: 6, batteriesAvailable: 6, energyConsumptionKwh: 602, rating: "M", startDate: "2025-01-01", rent: 10000 },
  { id: "BS0037", name: "Quickmart, Ruaka", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 2, energyConsumptionKwh: 293, rating: "M", startDate: "2025-09-24", rent: 10000 },
  { id: "BS0038", name: "Quickmart, Kileleshwa", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 4, energyConsumptionKwh: 151, rating: "L", startDate: "2025-10-27", rent: 10000 },
  { id: "BS0033", name: "Quickmart, Kilimani", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 736, rating: "H", startDate: "2026-10-27", rent: 10000 },
  { id: "BS0045", name: "KFA Naromoru, Nanyuki", location: "Central Kenya", region: "nanyuki", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 8, batteriesAvailable: 6, energyConsumptionKwh: 823, rating: "H", startDate: "2025-09-26", rent: 8000 },
  { id: "BS0065", name: "One Stop Arcade, Karen", location: "Nairobi", region: "nbo", live: true, operational: true, installationType: "three_phase", batteriesInstalled: 6, batteriesAvailable: 6, energyConsumptionKwh: 1, rating: "L", startDate: "2026-01-01", rent: 26200 },
];

export function getInfraByRegion(regionId: InfraRegionId): SwapStation[] {
  if (regionId === "overall") return SWAP_STATIONS;
  return SWAP_STATIONS.filter((s) => s.region === regionId);
}

export interface InfraKpiSummary {
  totalStations: number;
  liveStations: number;
  operationalStations: number;
  totalBatteriesInstalled: number;
  totalBatteriesAvailable: number;
  avgUtilizationPct: number;
  singlePhaseCount: number;
  threePhaseCount: number;
  totalEnergyKwh: number;
  highRatingCount: number;
  mediumRatingCount: number;
  lowRatingCount: number;
}

export function getInfraKpiSummary(regionId: InfraRegionId): InfraKpiSummary {
  const stations = getInfraByRegion(regionId);
  const totalBatteriesInstalled = stations.reduce((s, x) => s + x.batteriesInstalled, 0);
  const totalBatteriesAvailable = stations.reduce((s, x) => s + x.batteriesAvailable, 0);
  return {
    totalStations: stations.length,
    liveStations: stations.filter((s) => s.live).length,
    operationalStations: stations.filter((s) => s.operational).length,
    totalBatteriesInstalled,
    totalBatteriesAvailable,
    avgUtilizationPct: totalBatteriesInstalled > 0 ? parseFloat(((totalBatteriesAvailable / totalBatteriesInstalled) * 100).toFixed(1)) : 0,
    singlePhaseCount: stations.filter((s) => s.installationType === "single_phase").length,
    threePhaseCount: stations.filter((s) => s.installationType === "three_phase").length,
    totalEnergyKwh: stations.reduce((s, x) => s + x.energyConsumptionKwh, 0),
    highRatingCount: stations.filter((s) => s.rating === "H").length,
    mediumRatingCount: stations.filter((s) => s.rating === "M").length,
    lowRatingCount: stations.filter((s) => s.rating === "L").length,
  };
}

// ─── Weekly KPI time-series (37 metrics, mirrors the Excel Infra-Overall sheet) ───

export interface InfraWeekData {
  weekStart: string;
  // Swap Stations
  ssIncrementalDeployed: WeeklyMetric;
  ssTotalInstalledBase: WeeklyMetric;
  ssInInventory: WeeklyMetric;
  // Fast Chargers
  fcIncrementalDeployed: WeeklyMetric;
  fcTotalInstalledBase: WeeklyMetric;
  fcInInventory: WeeklyMetric;
  // Batteries
  totalBatteriesDeployed: WeeklyMetric;
  totalBatteriesInSS: WeeklyMetric;
  totalBatteriesInventory: WeeklyMetric;
  // Availability & Uptime
  networkAvailability: WeeklyMetric;
  ssAvailability: WeeklyMetric;
  fcAvailability: WeeklyMetric;
  networkUptime: WeeklyMetric;
  ssUptime: WeeklyMetric;
  fcUptime: WeeklyMetric;
  swapsWaitOver10Mins: WeeklyMetric;
  // Costs & Rentals
  newSSAvgInstallCost: WeeklyMetric;
  newFCAvgInstallCost: WeeklyMetric;
  ssAvgRental: WeeklyMetric;
  fcAvgRental: WeeklyMetric;
  newSSAvgRental: WeeklyMetric;
  newFCAvgRental: WeeklyMetric;
  // Energy
  ssKwhSold: WeeklyMetric;
  fcKwhSold: WeeklyMetric;
  ssSoldKwhPercent: WeeklyMetric;
  fcSoldKwhPercent: WeeklyMetric;
  // Revenue
  ssRevenue: WeeklyMetric;
  fcRevenue: WeeklyMetric;
  ssRevenuePercent: WeeklyMetric;
  fcRevenuePercent: WeeklyMetric;
  overallBlendedPricing: WeeklyMetric;
  ssPricing: WeeklyMetric;
  fcPricing: WeeklyMetric;
  // Leases & Sites
  leasesSigned: WeeklyMetric;
  cumulativeEVTariffSites: WeeklyMetric;
  ssElectricRate: WeeklyMetric;
  fcElectricRate: WeeklyMetric;
  overallBlendedElectricRate: WeeklyMetric;
  ssUpperFunnelSites: WeeklyMetric;
  fcUpperFunnelSites: WeeklyMetric;
  // Network Ratios
  bikeSsRatio: WeeklyMetric;
  bikeFcRatio: WeeklyMetric;
  batteryPairPerBike: WeeklyMetric;
}

function infraMetric(actual: number, target: number): WeeklyMetric {
  return { actual, target, variance: actual - target };
}

const INFRA_BASES: Record<InfraRegionId, {
  ssBase: number; fcBase: number; battBase: number; kwhBase: number; revBase: number; evBase: number;
}> = {
  overall: { ssBase: 70, fcBase: 8,  battBase: 850, kwhBase: 20000, revBase: 600000, evBase: 15 },
  nbo:     { ssBase: 59, fcBase: 6,  battBase: 680, kwhBase: 14000, revBase: 450000, evBase: 10 },
  nanyuki: { ssBase: 7,  fcBase: 1,  battBase: 100, kwhBase: 4000,  revBase: 100000, evBase: 3  },
  nyeri:   { ssBase: 4,  fcBase: 1,  battBase: 70,  kwhBase: 2000,  revBase: 50000,  evBase: 2  },
};

function generateInfraData(regionId: InfraRegionId): InfraWeekData[] {
  const b = INFRA_BASES[regionId];
  let ssTotal = b.ssBase;
  let fcTotal = b.fcBase;
  let battDeployed = b.battBase;
  let evSites = b.evBase;

  return WEEKS.map((w, i) => {
    const noise = () => 0.9 + Math.random() * 0.2;

    const ssNew = Math.random() < 0.4 ? 1 : Math.random() < 0.08 ? 2 : 0;
    ssTotal += ssNew;
    const fcNew = Math.random() < 0.15 ? 1 : 0;
    fcTotal += fcNew;
    battDeployed += Math.round(2 + Math.random() * 4);
    evSites += Math.random() < 0.25 ? 1 : 0;

    const battInSS = Math.round(battDeployed * 0.55 * noise());
    const battInventory = Math.max(0, battDeployed - battInSS - Math.round(battDeployed * 0.35));

    const kwhSS = Math.round(b.kwhBase * noise() * (1 + i * 0.012));
    const kwhFC = Math.round(kwhSS * 0.12 * noise());
    const revSS = Math.round(kwhSS * 28);
    const revFC = Math.round(kwhFC * 35);

    const ssAvail = parseFloat(Math.min(99, 82 + i * 0.2 + (Math.random() * 6 - 3)).toFixed(1));
    const fcAvail = parseFloat(Math.min(99, 78 + i * 0.3 + (Math.random() * 8 - 4)).toFixed(1));
    const netAvail = parseFloat(Math.min(99, 80 + i * 0.25 + (Math.random() * 5 - 2.5)).toFixed(1));

    return {
      weekStart: w.weekStart,
      ssIncrementalDeployed:  infraMetric(ssNew, 1),
      ssTotalInstalledBase:   infraMetric(ssTotal, ssTotal + 2),
      ssInInventory:          infraMetric(Math.max(0, Math.round(3 - i * 0.1)), 0),
      fcIncrementalDeployed:  infraMetric(fcNew, 0),
      fcTotalInstalledBase:   infraMetric(fcTotal, fcTotal + 1),
      fcInInventory:          infraMetric(Math.max(0, 2 - Math.floor(i / 5)), 0),
      totalBatteriesDeployed: infraMetric(battDeployed, Math.round(b.battBase * (1 + i * 0.02))),
      totalBatteriesInSS:     infraMetric(battInSS, Math.round(battDeployed * 0.6)),
      totalBatteriesInventory:infraMetric(battInventory, Math.round(battDeployed * 0.05)),
      networkAvailability:    infraMetric(netAvail, 85),
      ssAvailability:         infraMetric(ssAvail, 87),
      fcAvailability:         infraMetric(fcAvail, 82),
      networkUptime:          infraMetric(parseFloat((netAvail - 2).toFixed(1)), 83),
      ssUptime:               infraMetric(parseFloat((ssAvail - 1.5).toFixed(1)), 85),
      fcUptime:               infraMetric(parseFloat((fcAvail - 2).toFixed(1)), 80),
      swapsWaitOver10Mins:    infraMetric(parseFloat(Math.max(0, 15 - i * 0.3 + (Math.random() * 4 - 2)).toFixed(1)), 10),
      newSSAvgInstallCost:    infraMetric(Math.round(350000 + (Math.random() * 50000 - 25000)), 350000),
      newFCAvgInstallCost:    infraMetric(Math.round(280000 + (Math.random() * 40000 - 20000)), 280000),
      ssAvgRental:            infraMetric(Math.round(12000 + (Math.random() * 2000 - 1000)), 12000),
      fcAvgRental:            infraMetric(Math.round(18000 + (Math.random() * 3000 - 1500)), 18000),
      newSSAvgRental:         infraMetric(Math.round(14000 + (Math.random() * 2000 - 1000)), 14000),
      newFCAvgRental:         infraMetric(Math.round(20000 + (Math.random() * 3000 - 1500)), 20000),
      ssKwhSold:              infraMetric(kwhSS, Math.round(b.kwhBase * 1.05)),
      fcKwhSold:              infraMetric(kwhFC, Math.round(b.kwhBase * 0.13)),
      ssSoldKwhPercent:       infraMetric(parseFloat(Math.min(99, 75 + i * 0.5 + (Math.random() * 4 - 2)).toFixed(1)), 80),
      fcSoldKwhPercent:       infraMetric(parseFloat(Math.min(99, 65 + i * 0.5 + (Math.random() * 4 - 2)).toFixed(1)), 70),
      ssRevenue:              infraMetric(revSS, Math.round(b.revBase * 1.05)),
      fcRevenue:              infraMetric(revFC, Math.round(b.revBase * 0.15)),
      ssRevenuePercent:       infraMetric(parseFloat(Math.min(99, 78 + i * 0.3 + (Math.random() * 4 - 2)).toFixed(1)), 82),
      fcRevenuePercent:       infraMetric(parseFloat(Math.min(99, 68 + i * 0.3 + (Math.random() * 4 - 2)).toFixed(1)), 72),
      overallBlendedPricing:  infraMetric(parseFloat((26 + i * 0.1 + (Math.random() * 2 - 1)).toFixed(1)), 28),
      ssPricing:              infraMetric(parseFloat((25 + i * 0.1 + (Math.random() * 2 - 1)).toFixed(1)), 27),
      fcPricing:              infraMetric(parseFloat((32 + i * 0.1 + (Math.random() * 2 - 1)).toFixed(1)), 34),
      leasesSigned:             infraMetric(Math.random() < 0.4 ? 1 : Math.random() < 0.08 ? 2 : 0, 1),
      cumulativeEVTariffSites:  infraMetric(evSites, evSites + 2),
      ssElectricRate:           infraMetric(parseFloat((14 + (Math.random() * 2 - 1)).toFixed(1)), 15),
      fcElectricRate:           infraMetric(parseFloat((18 + (Math.random() * 2 - 1)).toFixed(1)), 18),
      overallBlendedElectricRate: infraMetric(parseFloat((15.5 + (Math.random() * 1.5 - 0.75)).toFixed(1)), 16),
      ssUpperFunnelSites:       infraMetric(Math.round((b.ssBase * 0.25) + i * 0.4), Math.round((b.ssBase * 0.3) + i * 0.5)),
      fcUpperFunnelSites:       infraMetric(Math.round((b.fcBase * 2.5) + i * 0.3), Math.round((b.fcBase * 3) + i * 0.4)),
      bikeSsRatio:              infraMetric(parseFloat((ssTotal > 0 ? (b.battBase * 1.1 / ssTotal) : 0).toFixed(1)), 10),
      bikeFcRatio:              infraMetric(parseFloat((fcTotal > 0 ? (b.battBase * 1.1 / fcTotal) : 0).toFixed(1)), 40),
      batteryPairPerBike:       infraMetric(parseFloat(Math.min(2, 1.2 + i * 0.01 + (Math.random() * 0.1)).toFixed(2)), 1.5),
    };
  });
}

export const INFRA_KPI_DATA: Record<InfraRegionId, InfraWeekData[]> = {
  overall: generateInfraData("overall"),
  nbo:     generateInfraData("nbo"),
  nanyuki: generateInfraData("nanyuki"),
  nyeri:   generateInfraData("nyeri"),
};

export const INFRA_METRIC_DEFINITIONS = [
  // Swap Stations
  { key: "ssIncrementalDeployed",  label: "SS Deployed (This Week)", unit: "#s",      group: "Swap Stations",   definition: "Number of new swap stations deployed and installed during the reporting week." },
  { key: "ssTotalInstalledBase",   label: "SS Total in Network",     unit: "#s",      group: "Swap Stations",   definition: "Cumulative total of swap stations deployed across all regions to date." },
  { key: "ssInInventory",          label: "SS in Inventory",         unit: "#s",      group: "Swap Stations",   definition: "Swap stations procured but not yet deployed. Sitting in warehouse inventory." },
  // Fast Chargers
  { key: "fcIncrementalDeployed",  label: "FC Deployed (This Week)", unit: "#s",      group: "Fast Chargers",   definition: "Number of new fast chargers installed during the reporting week." },
  { key: "fcTotalInstalledBase",   label: "FC Total in Network",     unit: "#s",      group: "Fast Chargers",   definition: "Cumulative total of fast chargers deployed across all regions to date." },
  { key: "fcInInventory",          label: "FC in Inventory",         unit: "#s",      group: "Fast Chargers",   definition: "Fast chargers procured but not yet deployed. Sitting in warehouse inventory." },
  // Batteries
  { key: "totalBatteriesDeployed", label: "Batteries Deployed (Total)", unit: "#s",   group: "Batteries",       definition: "Total batteries deployed across the entire network: in swap stations, on bikes, and in fast chargers." },
  { key: "totalBatteriesInSS",     label: "Batteries in Swap Stations", unit: "#s",   group: "Batteries",       definition: "Number of batteries currently housed inside swap station cabinets and actively available for swapping." },
  { key: "totalBatteriesInventory",label: "Batteries in Inventory",  unit: "#s",      group: "Batteries",       definition: "Batteries held in central inventory. Not yet deployed to stations or customers." },
  // Availability & Uptime
  { key: "networkAvailability",    label: "Network Availability %",  unit: "%",       group: "Availability",    definition: "Percentage of the total network (SS + FC) that was available for customer use during the week." },
  { key: "ssAvailability",         label: "SS Availability %",       unit: "%",       group: "Availability",    definition: "Percentage of swap stations that were available and powered on during the reporting week." },
  { key: "fcAvailability",         label: "FC Availability %",       unit: "%",       group: "Availability",    definition: "Percentage of fast chargers that were available and powered on during the reporting week." },
  { key: "networkUptime",          label: "Network Uptime %",        unit: "%",       group: "Availability",    definition: "Percentage of scheduled uptime hours that the network actually served customers without interruption." },
  { key: "ssUptime",               label: "SS Uptime %",             unit: "%",       group: "Availability",    definition: "Percentage of uptime hours for swap stations. Excludes planned maintenance windows." },
  { key: "fcUptime",               label: "FC Uptime %",             unit: "%",       group: "Availability",    definition: "Percentage of uptime hours for fast chargers. Excludes planned maintenance windows." },
  { key: "swapsWaitOver10Mins",    label: "Swaps w/ Wait > 10 mins", unit: "%",       group: "Availability",    definition: "Percentage of swap transactions where the customer waited more than 10 minutes for a charged battery." },
  // Costs & Rentals
  { key: "newSSAvgInstallCost",    label: "New SS Avg Install Cost", unit: "KES",     group: "Costs & Rentals", definition: "Average total installation cost for a new swap station, including hardware, civil works, and commissioning." },
  { key: "newFCAvgInstallCost",    label: "New FC Avg Install Cost", unit: "KES",     group: "Costs & Rentals", definition: "Average total installation cost for a new fast charger, including hardware and electrical work." },
  { key: "ssAvgRental",            label: "SS Avg Rental (Overall)", unit: "KES",     group: "Costs & Rentals", definition: "Average monthly rental paid to host sites for swap station placement, across all active stations." },
  { key: "fcAvgRental",            label: "FC Avg Rental (Overall)", unit: "KES",     group: "Costs & Rentals", definition: "Average monthly rental paid to host sites for fast charger placement, across all active units." },
  { key: "newSSAvgRental",         label: "New SS Avg Rental",       unit: "KES",     group: "Costs & Rentals", definition: "Average monthly rental rate for swap stations deployed during the current week." },
  { key: "newFCAvgRental",         label: "New FC Avg Rental",       unit: "KES",     group: "Costs & Rentals", definition: "Average monthly rental rate for fast chargers deployed during the current week." },
  // Energy
  { key: "ssKwhSold",              label: "SS Energy Sold",          unit: "kWh",     group: "Energy",          definition: "Total kilowatt-hours of energy dispensed by swap stations to customers during the week." },
  { key: "fcKwhSold",              label: "FC Energy Sold",          unit: "kWh",     group: "Energy",          definition: "Total kilowatt-hours of energy dispensed by fast chargers to customers during the week." },
  { key: "ssSoldKwhPercent",       label: "SS Sold kWh %",           unit: "%",       group: "Energy",          definition: "Energy sold as a percentage of total energy throughput capacity for swap stations." },
  { key: "fcSoldKwhPercent",       label: "FC Sold kWh %",           unit: "%",       group: "Energy",          definition: "Energy sold as a percentage of total energy throughput capacity for fast chargers." },
  // Revenue
  { key: "ssRevenue",              label: "SS Revenue",              unit: "KES",     group: "Revenue",         definition: "Total revenue generated from swap station energy sales during the reporting week." },
  { key: "fcRevenue",              label: "FC Revenue",              unit: "KES",     group: "Revenue",         definition: "Total revenue generated from fast charger energy sales during the reporting week." },
  { key: "ssRevenuePercent",       label: "SS Revenue %",            unit: "%",       group: "Revenue",         definition: "Swap station revenue as a percentage of total infrastructure revenue for the week." },
  { key: "fcRevenuePercent",       label: "FC Revenue %",            unit: "%",       group: "Revenue",         definition: "Fast charger revenue as a percentage of total infrastructure revenue for the week." },
  { key: "overallBlendedPricing",  label: "Overall Blended KES/kWh", unit: "KES/kWh", group: "Revenue",        definition: "Blended average energy price per kWh across all network types (SS + FC) for the reporting week." },
  { key: "ssPricing",              label: "SS KES/kWh Price",        unit: "KES/kWh", group: "Revenue",        definition: "Average price charged per kWh dispensed through swap stations during the week." },
  { key: "fcPricing",              label: "FC KES/kWh Price",        unit: "KES/kWh", group: "Revenue",        definition: "Average price charged per kWh dispensed through fast chargers during the week." },
  // Leases & Sites
  { key: "leasesSigned",           label: "Leases Signed",           unit: "#s",      group: "Leases & Sites",  definition: "Number of new site lease agreements signed with host partners during the reporting week." },
  { key: "cumulativeEVTariffSites",label: "Cumulative EV Tariff Sites", unit: "#s",   group: "Leases & Sites",  definition: "Total number of sites that have been approved and onboarded for the EV electricity tariff to date." },
  { key: "ssElectricRate",            label: "SS Electric Rate (KES/kWh)",      unit: "KES/kWh", group: "Leases & Sites",  definition: "Blended electricity purchase rate per kWh for swap station sites, the cost of input energy." },
  { key: "fcElectricRate",            label: "FC Electric Rate (KES/kWh)",      unit: "KES/kWh", group: "Leases & Sites",  definition: "Blended electricity purchase rate per kWh for fast charger sites, the cost of input energy." },
  { key: "overallBlendedElectricRate",label: "Overall Blended Electric Rate",   unit: "KES/kWh", group: "Leases & Sites",  definition: "Network-wide blended electricity purchase rate per kWh, weighted across all SS and FC sites." },
  { key: "ssUpperFunnelSites",        label: "SS Upper Funnel Sites Assessed",  unit: "#s",      group: "Leases & Sites",  definition: "Number of potential swap station host sites that have been assessed and are in the site-selection pipeline." },
  { key: "fcUpperFunnelSites",        label: "FC Upper Funnel Sites Assessed",  unit: "#s",      group: "Leases & Sites",  definition: "Number of potential fast charger host sites that have been assessed and are in the site-selection pipeline." },
  // Network Ratios
  { key: "bikeSsRatio",               label: "Bikes per SS",                    unit: "#s",      group: "Network Ratios",  definition: "Number of active customer bikes per swap station in the network, a measure of swap station utilisation density." },
  { key: "bikeFcRatio",               label: "Bikes per FC",                    unit: "#s",      group: "Network Ratios",  definition: "Number of active customer bikes per fast charger in the network." },
  { key: "batteryPairPerBike",        label: "Battery Pairs per Bike",          unit: "#s",      group: "Network Ratios",  definition: "Average number of battery pairs deployed per active customer bike. Indicates battery buffer in the network." },
] as const;

export type InfraMetricKey = (typeof INFRA_METRIC_DEFINITIONS)[number]["key"];
