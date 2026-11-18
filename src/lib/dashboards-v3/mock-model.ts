/**
 * The Dashboards (v3) mock data model. Nothing here reads real data.
 *
 * Every figure is built per place (a station, or a region for things that
 * don't happen at stations) and per day, as
 *
 *   base × share of the place × trend × weekly pattern × events × smooth noise
 *
 * and metrics are derived from a few shared series, so they agree with each
 * other: points debited are kWh billed at each service's rate, points per
 * swap are swap points ÷ swaps, top-ups follow points debited, failed swaps
 * are a small share of swaps. Every value comes from a seeded hash, so it
 * is the same on every render and every visit.
 */
import { differenceInCalendarDays } from "date-fns";
import { PROPERTIES, REGION_COUNTRY, STATION_REGION, type PropertyId } from "./catalogue";
import type { PropertyFilter } from "./types";

/** FNV-1a, then one mulberry32 step: a stable number in [0, 1) for any key. */
export function seeded(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── Calendar and events ──────────────────────────────────────────────────

/** Bases are typical weekday values around this day; the trend runs from here. */
const REF_DAY = new Date(2026, 10, 1);
const DAYS_PER_MONTH = 30.44;

/** Weekdays highest, Saturday about 8% lower, Sunday about 15% lower. Sunday first, as getDay counts. */
export const WEEKLY = [0.85, 1, 1, 1, 1, 1, 0.92];

/** Mashujaa Day, 20 October: the whole network about 20% lower that day. */
export const HOLIDAY_DIP = 0.8;
export const isHoliday = (d: Date) => d.getMonth() === 9 && d.getDate() === 20;

/** 12–19 Oct 2026: two Nanyuki stations offline; riders move to the other two, so Nanyuki swaps drop about 40%. */
export const OUTAGE = {
  from: new Date(2026, 9, 12),
  to: new Date(2026, 9, 19),
  region: "Nanyuki",
  offline: ["Nanyuki Majengo", "Nanyuki Likii"],
  /** The stations still open take this much more traffic, and fail this many times more often. */
  overflow: 1.2,
  failures: 3,
};
const inOutage = (d: Date) => d >= OUTAGE.from && d <= OUTAGE.to;

/** From 1 Nov 2026 a swap costs a flat number of points, instead of a rate per kWh. */
export const FLAT_RATE_FROM = new Date(2026, 10, 1);
export const RATES = { swapPerKwh: 90, flatSwap: 175, fastPerKwh: 65, homePerKwh: 50 };
export const KWH = { swap: 1.88, fast: 3.25, home: 2.4 };

/** Uganda starts here: nothing before, then volumes ramp up over four months. */
export const UGANDA_LAUNCH = new Date(2026, 6, 1);

/**
 * The model's events, for markers on time charts: what happened, when, and
 * where (a country or a region); no place means the whole network.
 */
export const EVENTS: { date: Date; label: string; country?: string; region?: string }[] = [
  { date: new Date(2025, 9, 20), label: "Mashujaa Day", country: "Kenya" },
  { date: UGANDA_LAUNCH, label: "Uganda launch", country: "Uganda" },
  { date: OUTAGE.from, label: "Nanyuki outage", country: "Kenya", region: OUTAGE.region },
  { date: new Date(2026, 9, 20), label: "Mashujaa Day", country: "Kenya" },
  { date: FLAT_RATE_FROM, label: "Flat swap rate" },
];

/** Stations run by partners: their swaps are partner swaps, and partners earn a share of the swap points. */
export const PARTNER_STATIONS = new Set(["Embakasi", "Karen", "Thika Road Mall", "Kisumu Kondele", "Nanyuki Airstrip", "Ntinda"]);
const PARTNER_COMMISSION = 0.12;

/** A rider's average swaps, fast charges and home charges per active day, and points per top-up. */
const PER_RIDER = { swap: 1.6, fast: 1.3, home: 1.1 };
const POINTS_PER_TOP_UP = 450;

// ── Places ───────────────────────────────────────────────────────────────

/** Each station's share of station traffic, in percent of Kenya's: Nairobi about 60%. Uganda's are added on top. */
const STATION_WEIGHT: Record<string, number> = {
  Westlands: 11, "CBD Moi Avenue": 12, Kilimani: 8, "Upper Hill": 7, Embakasi: 8, Karen: 5, "Thika Road Mall": 9,
  "Nanyuki Town": 3, "Nanyuki Majengo": 2.5, "Nanyuki Likii": 2.5, "Nanyuki Airstrip": 2,
  "Nyeri Central": 7, "Meru Makutano": 6, "Nakuru East": 9, "Kisumu Kondele": 8,
  "Kampala Central": 1.6, Ntinda: 1.1, "Entebbe Town": 0.6,
};

/** Each region's share of rider activity that isn't at a station (home charging, top-ups, sign-ups). Mombasa has none yet. */
const REGION_WEIGHT: Record<string, number> = {
  Nairobi: 55, Nanyuki: 7, Nyeri: 6, Meru: 5, Nakuru: 8, Thika: 6, Kisumu: 7, Eldoret: 3, Machakos: 3, Mombasa: 0,
  Kampala: 2.2, Entebbe: 0.8,
};

type Level = "station" | "region";

const regionOf = (level: Level, place: string) => (level === "station" ? STATION_REGION[place] : place);

/** A place's share, with Uganda at nothing before its launch and ramping up after. */
function share(level: Level, place: string, day: Date): number {
  const w = (level === "station" ? STATION_WEIGHT[place] : REGION_WEIGHT[place]) ?? 0;
  if (REGION_COUNTRY[regionOf(level, place)] !== "Uganda") return w / 100;
  const since = differenceInCalendarDays(day, UGANDA_LAUNCH);
  return since < 0 ? 0 : (w / 100) * Math.min(1, 0.25 + (0.75 * since) / 120);
}

// ── Building blocks ──────────────────────────────────────────────────────

const dayNumber = (d: Date) => differenceInCalendarDays(d, REF_DAY);

/** Growth of `perMonth` (0.025 = +2.5% a month), compounding from the reference day. */
const growth = (perMonth: number, n: number) => Math.pow(1 + perMonth, n / DAYS_PER_MONTH);

/**
 * Smooth noise around 1, within ±amp: seeded values every `every` days,
 * eased into each other, so each day stays close to the one before.
 */
function smooth(key: string, n: number, amp: number, every = 6): number {
  const k = Math.floor(n / every);
  const t = (n - k * every) / every;
  const a = seeded(`${key}|${k}`) - 0.5;
  const b = seeded(`${key}|${k + 1}`) - 0.5;
  const w = (1 - Math.cos(Math.PI * t)) / 2;
  return 1 + 2 * amp * (a + (b - a) * w);
}

/** Network-wide ups and downs (weather, fuel prices) that every station shares, ±3%. */
const network = (key: string, n: number) => smooth(`net|${key}`, n, 0.03, 5);

/** A last touch of day-to-day variation, ±0.5%. */
const jitter = (key: string, n: number) => 1 + (seeded(`${key}|d${n}`) - 0.5) * 0.01;

/** How busy a day is for activity people choose to do: the weekly pattern and the holiday. */
const busy = (day: Date) => WEEKLY[day.getDay()] * (isHoliday(day) ? HOLIDAY_DIP : 1);

/** A station's traffic during the Nanyuki outage: none at the offline two, more at the others. */
function outageTraffic(station: string, day: Date): number {
  if (!inOutage(day) || STATION_REGION[station] !== OUTAGE.region) return 1;
  return OUTAGE.offline.includes(station) ? 0 : OUTAGE.overflow;
}

const cache = new Map<string, number>();
/** Remembers a series' value for a place and day: the same ones are asked for by many widgets and splits. */
function memo(key: string, f: () => number): number {
  let v = cache.get(key);
  if (v === undefined) {
    if (cache.size > 400_000) cache.clear();
    v = f();
    cache.set(key, v);
  }
  return v;
}

// ── Shared series, per place and day ─────────────────────────────────────

/** Completed swaps at a station. */
const swaps = (st: string, day: Date, n: number) =>
  memo(`swaps|${st}|${n}`, () => 2_800 * share("station", st, day) * growth(0.025, n) * busy(day) * outageTraffic(st, day) * network("swaps", n) * smooth(`swaps|${st}`, n, 0.03) * jitter(`swaps|${st}`, n));

const kwhPerSwap = (st: string, n: number) => memo(`kps|${st}|${n}`, () => KWH.swap * smooth(`kps|${st}`, n, 0.02, 10));

/** Points debited for a station's swaps: per kWh before the flat rate, flat after. */
const swapPoints = (st: string, day: Date, n: number) =>
  swaps(st, day, n) * (day < FLAT_RATE_FROM ? RATES.swapPerKwh * kwhPerSwap(st, n) : RATES.flatSwap);

/** Completed fast charge sessions at a station; stations have more or fewer chargers than their swap traffic suggests. */
const fast = (st: string, day: Date, n: number) =>
  memo(`fast|${st}|${n}`, () =>
    520 * share("station", st, day) * (0.6 + 0.8 * seeded(`fast|${st}`)) * growth(0.03, n) * busy(day) * outageTraffic(st, day) * network("fast", n) * smooth(`fast|${st}`, n, 0.035) * jitter(`fast|${st}`, n));

/** Home charge sessions by riders living in a region (BaaS riders only). */
const home = (r: string, day: Date, n: number) =>
  memo(`home|${r}|${n}`, () => 200 * share("region", r, day) * growth(0.035, n) * busy(day) * network("home", n) * smooth(`home|${r}`, n, 0.04) * jitter(`home|${r}`, n));

const homePoints = (r: string, day: Date, n: number) => home(r, day, n) * KWH.home * RATES.homePerKwh;
const fastPoints = (st: string, day: Date, n: number) => fast(st, day, n) * KWH.fast * RATES.fastPerKwh;

const stationsOf = (r: string) => PROPERTIES.station.values.filter((s) => STATION_REGION[s] === r);

/** All points debited from riders of a region: their station swaps and fast charges, and their home charging. */
const regionPoints = (r: string, day: Date, n: number) =>
  memo(`rpts|${r}|${n}`, () => stationsOf(r).reduce((a, st) => a + swapPoints(st, day, n) + fastPoints(st, day, n), 0) + homePoints(r, day, n));

/**
 * How far a month's top-ups run ahead of its points debited: riders top up
 * a little before they spend, 3–7% more, different each month, so the two
 * are close but never the same for any period.
 */
function topUpGap(day: Date): number {
  return 1.03 + 0.04 * seeded(`topgap|${day.getFullYear()}-${day.getMonth()}`);
}

/** Top-ups follow points debited, a few percent ahead, with their own day-to-day noise. */
const topUps = (r: string, day: Date, n: number) =>
  memo(`topup|${r}|${n}`, () => regionPoints(r, day, n) * topUpGap(day) * smooth(`topup|${r}`, n, 0.03));

/** Riders active in a region on a day, from the sessions they had. */
const regionRiders = (r: string, day: Date, n: number) =>
  memo(`rriders|${r}|${n}`, () =>
    stationsOf(r).reduce((a, st) => a + swaps(st, day, n) / PER_RIDER.swap + fast(st, day, n) / PER_RIDER.fast, 0) + home(r, day, n) / PER_RIDER.home);

/** Share of a station's swaps that fail: 1–3%, three times more at the open Nanyuki stations during the outage. */
const failRate = (st: string, day: Date, n: number) =>
  (0.012 + 0.012 * seeded(`fail|${st}`)) * smooth(`fail|${st}`, n, 0.15, 5) *
  (inOutage(day) && STATION_REGION[st] === OUTAGE.region ? OUTAGE.failures : 1);

/** A station's uptime at the morning refresh: 97–99.8%, an occasional dip, and 0 while offline. */
function uptime(st: string, day: Date, n: number): number {
  if (inOutage(day) && OUTAGE.offline.includes(st)) return 0;
  const level = 99.6 - 1.4 * seeded(`up|${st}`) + (smooth(`up|${st}`, n, 0.002, 7) - 1) * 100;
  // About one dip every ten weeks per station, deepest on the day and half the next day.
  const window = Math.floor(n / 9);
  let dip = 0;
  if (seeded(`dip|${st}|${window}`) < 0.12) {
    const at = window * 9 + Math.floor(seeded(`dipday|${st}|${window}`) * 8);
    const depth = 2 + 4 * seeded(`dipdepth|${st}|${window}`);
    dip = n === at ? depth : n === at + 1 ? depth / 2 : 0;
  }
  return Math.min(99.8, level) - dip;
}

/** Slowly moving counts: no weekly pattern, no daily jitter, noise eased over two or three weeks. */
const slow = (key: string, base: number, perMonth: number, amp: number, every: number) => (level: Level, place: string, day: Date, n: number) =>
  memo(`${key}|${place}|${n}`, () => base * share(level, place, day) * growth(perMonth, n) * smooth(`${key}|${place}`, n, amp, every));

/** A little more riders go negative once the flat rate starts, over ten days. */
const afterFlatRate = (day: Date) => 1 + 0.04 * Math.min(1, Math.max(0, differenceInCalendarDays(day, FLAT_RATE_FROM) / 10));

const negativeBalance = slow("neg", 212, 0.005, 0.05, 14);
const batteries = slow("bat", 6_800, 0.012, 0.01, 21);
const needingService = slow("svc", 128, -0.01, 0.08, 12);
const offlineVehicles = slow("voff", 84, 0.005, 0.1, 10);
const immobilised = slow("imm", 37, 0.01, 0.12, 12);

/** Batteries by lifecycle state, in order; each share drifts slowly. */
const STATE_SHARE: Record<string, number> = {
  "Pre-bring-up": 0.03, "Deployment-ready 1/2": 0.03, "Register for storage": 0.04, "Deployment-ready 2/2": 0.06,
  Active: 0.785, Quarantine: 0.03, Retired: 0.025,
};
const stateShare = (state: string, n: number) => (STATE_SHARE[state] ?? 0) * smooth(`state|${state}`, n, 0.08, 20);

const health = (st: string, n: number) => (92.5 - 2.5 * seeded(`health|${st}`)) * growth(-0.0008, n) * smooth(`health|${st}`, n, 0.002, 30);
const returnRate = (r: string, n: number) => 78.4 + 4 * (seeded(`ret|${r}`) - 0.5) + (smooth(`ret|${r}`, n, 0.01, 14) - 1) * 78;

const newRiders = (r: string, day: Date, n: number) =>
  memo(`new|${r}|${n}`, () => {
    // A burst of sign-ups in a newly launched country, settling over two months.
    const launch = REGION_COUNTRY[r] === "Uganda" ? 1 + 1.5 * Math.max(0, 1 - differenceInCalendarDays(day, UGANDA_LAUNCH) / 60) : 1;
    return 46 * share("region", r, day) * growth(0.02, n) * busy(day) * launch * smooth(`new|${r}`, n, 0.06) * jitter(`new|${r}`, n);
  });

// ── Metrics ──────────────────────────────────────────────────────────────

/** A figure as a total and, for ratios and percentages, what it's divided by. Pairs add up across places and days. */
export interface Pair {
  num: number;
  den: number;
}

type Service = "Swap" | "Fast charge" | "Home charge";

interface Stream {
  level: Level;
  /** The service it's part of, for metrics split or filtered by service. */
  service?: Service;
  /** BaaS riders' share; the rest is Non-BaaS. */
  baas: number;
  value: (place: string, day: Date, n: number) => Pair;
}

interface Model {
  streams: Stream[];
  /** Percentages: how far each customer type sits from the place's level, in points. */
  typeOffset?: Record<string, number>;
  /** Battery state applies. */
  byState?: boolean;
}

const BAAS = { swap: 0.68, fast: 0.3, home: 1, rider: 0.62 };
const sum = (num: number): Pair => ({ num, den: 0 });
/** A percentage as a weighted value: places with more traffic count for more. */
const pct = (value: number, weight: number): Pair => ({ num: value * weight, den: weight });

const swapStream = (f: (st: string, day: Date, n: number) => number, baas = BAAS.swap): Stream => ({ level: "station", service: "Swap", baas, value: (st, d, n) => sum(f(st, d, n)) });
const fastStream = (f: (st: string, day: Date, n: number) => number): Stream => ({ level: "station", service: "Fast charge", baas: BAAS.fast, value: (st, d, n) => sum(f(st, d, n)) });
const homeStream = (f: (r: string, day: Date, n: number) => number): Stream => ({ level: "region", service: "Home charge", baas: BAAS.home, value: (r, d, n) => sum(f(r, d, n)) });
const regionStream = (f: (r: string, day: Date, n: number) => number, baas = BAAS.rider): Stream => ({ level: "region", baas, value: (r, d, n) => sum(f(r, d, n)) });
const stationStream = (f: (st: string, day: Date, n: number) => number, baas = BAAS.swap): Stream => ({ level: "station", baas, value: (st, d, n) => sum(f(st, d, n)) });

const partnerSwaps = (st: string, d: Date, n: number) => (PARTNER_STATIONS.has(st) ? swaps(st, d, n) : 0);

export const MODELS: Record<string, Model> = {
  "points-debited": { streams: [swapStream(swapPoints), fastStream(fastPoints), homeStream(homePoints)] },
  "top-ups": { streams: [regionStream(topUps, 0.66)] },
  "kwh-billed": {
    streams: [swapStream((st, d, n) => swaps(st, d, n) * kwhPerSwap(st, n)), fastStream((st, d, n) => fast(st, d, n) * KWH.fast), homeStream((r, d, n) => home(r, d, n) * KWH.home)],
  },
  "points-per-swap": { streams: [{ level: "station", service: "Swap", baas: BAAS.swap, value: (st, d, n) => ({ num: swapPoints(st, d, n), den: swaps(st, d, n) }) }] },
  swaps: { streams: [swapStream(swaps)] },
  "station-uptime": { streams: [{ level: "station", baas: 1, value: (st, d, n) => pct(uptime(st, d, n), STATION_WEIGHT[st] * (share("station", st, d) > 0 ? 1 : 0)) }] },
  "failed-swaps": { streams: [swapStream((st, d, n) => swaps(st, d, n) * failRate(st, d, n))] },
  "fast-charge-sessions": { streams: [fastStream(fast)] },
  "home-charge-sessions": { streams: [homeStream(home)] },
  "energy-per-session": {
    streams: [
      { level: "station", service: "Fast charge", baas: BAAS.fast, value: (st, d, n) => ({ num: fast(st, d, n) * KWH.fast, den: fast(st, d, n) }) },
      { level: "region", service: "Home charge", baas: BAAS.home, value: (r, d, n) => ({ num: home(r, d, n) * KWH.home, den: home(r, d, n) }) },
    ],
  },
  "battery-inventory": { byState: true, streams: [stationStream((st, d, n) => batteries("station", st, d, n))] },
  "batteries-needing-service": { streams: [stationStream((st, d, n) => needingService("station", st, d, n))] },
  "battery-health": { streams: [{ level: "station", baas: 1, value: (st, d, n) => pct(health(st, n), share("station", st, d)) }] },
  "active-vehicles": { streams: [regionStream((r, d, n) => regionRiders(r, d, n) * 1.05)] },
  "vehicles-offline": { streams: [regionStream((r, d, n) => offlineVehicles("region", r, d, n))] },
  "immobilised-vehicles": { streams: [regionStream((r, d, n) => immobilised("region", r, d, n))] },
  "active-riders": {
    streams: [
      swapStream((st, d, n) => swaps(st, d, n) / PER_RIDER.swap),
      fastStream((st, d, n) => fast(st, d, n) / PER_RIDER.fast),
      homeStream((r, d, n) => home(r, d, n) / PER_RIDER.home),
    ],
  },
  "negative-balance": { streams: [regionStream((r, d, n) => negativeBalance("region", r, d, n) * afterFlatRate(d))] },
  "riders-topped-up": { streams: [regionStream((r, d, n) => topUps(r, d, n) / POINTS_PER_TOP_UP)] },
  "partner-swaps": { streams: [swapStream(partnerSwaps)] },
  "partner-points": { streams: [swapStream((st, d, n) => (PARTNER_STATIONS.has(st) ? swapPoints(st, d, n) * PARTNER_COMMISSION : 0))] },
  "partner-share": {
    streams: [{
      level: "region",
      baas: BAAS.swap,
      value: (r, d, n) => stationsOf(r).reduce((a, st) => ({ num: a.num + 100 * partnerSwaps(st, d, n), den: a.den + swaps(st, d, n) }), { num: 0, den: 0 }),
    }],
  },
  "new-riders": { streams: [regionStream(newRiders)] },
  "referral-signups": { streams: [regionStream((r, d, n) => newRiders(r, d, n) * 0.3 * smooth(`ref|${r}`, n, 0.08))] },
  "rider-return-rate": {
    streams: [{ level: "region", baas: BAAS.rider, value: (r, d, n) => pct(returnRate(r, n), share("region", r, d)) }],
    typeOffset: { BaaS: 2.5, "Non-BaaS": -4 },
  },
};

// ── Evaluating a segment ─────────────────────────────────────────────────

/** The values every filter on a property allows, or null when none constrains it. Two filters on one property narrow each other. */
export function allowed(parts: PropertyFilter[], property: PropertyId): string[] | null {
  let out: string[] | null = null;
  for (const p of parts) {
    if (p.property !== property) continue;
    out = out ? out.filter((v) => p.values.includes(v)) : [...p.values];
  }
  return out;
}

/**
 * One metric's figure for the places, services, customer types and battery
 * states the filters leave, on one day. Home charging isn't at a station, so
 * a station filter leaves it out.
 */
export function evaluate(metricId: string, day: Date, parts: PropertyFilter[]): Pair {
  const model = MODELS[metricId];
  const n = dayNumber(day);
  const countries = allowed(parts, "country");
  const regions = allowed(parts, "region");
  const stations = allowed(parts, "station");
  const services = allowed(parts, "service");
  const types = allowed(parts, "customerType");
  const states = model.byState ? allowed(parts, "batteryState") : null;
  const stateFactor = model.byState ? (states ?? PROPERTIES.batteryState.values).reduce((a, s) => a + stateShare(s, n), 0) : 1;
  const inPlace = (region: string) => (!countries || countries.includes(REGION_COUNTRY[region])) && (!regions || regions.includes(region));

  let num = 0;
  let den = 0;
  for (const stream of model.streams) {
    if (services && (!stream.service || !services.includes(stream.service))) continue;
    const typeShares: [string, number][] = (types ?? ["all"]).map((t) => [t, t === "all" ? 1 : t === "BaaS" ? stream.baas : 1 - stream.baas]);
    const places = stream.level === "station"
      ? PROPERTIES.station.values.filter((st) => inPlace(STATION_REGION[st]) && (!stations || stations.includes(st)))
      : stations ? [] : PROPERTIES.region.values.filter(inPlace);
    for (const place of places) {
      const p = stream.value(place, day, n);
      for (const [t, sh] of typeShares) {
        if (sh === 0) continue;
        num += (p.num + (model.typeOffset?.[t] ?? 0) * p.den) * sh * stateFactor;
        den += p.den * sh * stateFactor;
      }
    }
  }
  return { num, den };
}
