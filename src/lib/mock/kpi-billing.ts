export type SessionType = "swap" | "fast_charge" | "home_charge";

export interface BillingSession {
  id: string;
  date: string;
  type: SessionType;
  phone: string;
  name: string;
  imei?: string;
  stationId: string;
  skipped: boolean;
  flagged: boolean;
  totalKwh: number;
  totalPoints: number;
  slab1Kwh: number;
  slab1Points: number;
  slab2Kwh: number;
  slab2Points: number;
  multiday: boolean;
  rfidMismatch: boolean;
  rfid1?: string;
  ahDischarged1?: number;
  ahCharged1?: number;
  ahRegen1?: number;
  ahSwapChargeUsed1?: number;
  ahFcAdded1?: number;
  bin1?: string;
  dispenseSlot1?: number;
  collectSlot1?: number;
  leaseDuration1?: number;
  rfid2?: string;
  ahDischarged2?: number;
  ahCharged2?: number;
  ahRegen2?: number;
  ahSwapChargeUsed2?: number;
  bin2?: string;
  dispenseSlot2?: number;
  collectSlot2?: number;
  leaseDuration2?: number;
  fcStart?: string;
  fcEnd?: string;
  errorNote?: string;
}

const CUSTOMERS = [
  { name: "Peter Munyoki",      phone: "254-748688398", imei: "860300087748123" },
  { name: "NICKSON MWITI",      phone: "254-116195164", imei: "860300087759307" },
  { name: "Fredrick Ochieng",   phone: "254-722135002", imei: "860300087739945" },
  { name: "Augustine Mbevi",    phone: "254-795645403", imei: "860300087757509" },
  { name: "Zechariah Anita",    phone: "254-118831352", imei: "860300087750843" },
  { name: "Moses Mwangi",       phone: "254-748679190", imei: "860300087770882" },
  { name: "Vincent King'oo Kau",phone: "254-798793747", imei: "860300087760669" },
  { name: "James Ng'ang'a",     phone: "254-714542787", imei: "860300087760610" },
  { name: "Erick Nganda",       phone: "254-792913491", imei: "860300087727924" },
  { name: "MUVUNYI JEAN",       phone: "254-759566854", imei: "860300087758036" },
  { name: "Grace Wanjiku",      phone: "254-711234567", imei: "860300087741001" },
  { name: "David Kamau",        phone: "254-733445566", imei: "860300087742002" },
  { name: "Faith Akinyi",       phone: "254-720556677", imei: "860300087743003" },
  { name: "Samuel Kipchoge",    phone: "254-745667788", imei: "860300087744004" },
  { name: "Lucy Njoroge",       phone: "254-768778899", imei: "860300087745005" },
];

const SWAP_STATIONS = ["bs0010","bs0005","bs0002","bs0025","bs0009","bs0029","bs0006","bs0045","bs0047","bs0003"];
const FC_STATIONS   = ["fc-nbo-01","fc-nbo-02","fc-nbo-03","fc-nan-01","fc-nbo-05"];
const RFIDS = ["04A517CAC61990","04B721FAD82881","04C833EBE94972","04D945FCF05063","04E057ADFF1154","04F169BEA12245","04A28ACFB23336","04B39BDFC34427"];
const BINS  = ["2ME9YBRP1B001211","2ME9YBRP1B001677","2ME9YBRP1B001423","2ME9YBRP1B001547","2ME9YBRP1B001905","2ME9YBRP1B001934","2ME9YBRP1B001942","2ME9YBRP1B001616","2ME9YBRP1B001938","2ME9YBRP1B002011"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number, dp = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

function makeDate(daysBack: number, hour = 10): string {
  const d = new Date("2026-07-29T00:00:00+03:00");
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return d.toISOString();
}

export const BILLING_SESSIONS: BillingSession[] = [
  // ── Peter Munyoki — 15 swap sessions (most active) ──────────────────────────
  ...Array.from({ length: 15 }, (_, i) => {
    const slab1 = rand(0.35, 0.50);
    const total = rand(1.9, 3.1);
    const slab2 = parseFloat((total - slab1).toFixed(2));
    const ahD1 = rand(25, 29, 2); const ahC1 = rand(0, 1.5, 2); const ahR1 = rand(0.10, 0.28, 2);
    const ahD2 = rand(25, 29, 2); const ahC2 = rand(0, 1.5, 2); const ahR2 = rand(0.10, 0.28, 2);
    const ld = Math.round(rand(20000, 43000, 0));
    const fcStart = makeDate(89 - i * 5, 7 + (i % 12));
    return {
      id: `BS-${String(i + 1).padStart(3, "0")}`,
      date: makeDate(89 - i * 5, 8 + (i % 13)),
      type: "swap" as SessionType,
      phone: "254-748688398", name: "Peter Munyoki", imei: "860300087748123",
      stationId: pick(SWAP_STATIONS),
      skipped: false, flagged: i === 7, multiday: i === 3, rfidMismatch: i === 11,
      totalKwh: total, totalPoints: parseFloat((slab1 * 90 + slab2 * 70).toFixed(2)),
      slab1Kwh: slab1, slab1Points: parseFloat((slab1 * 90).toFixed(2)),
      slab2Kwh: slab2, slab2Points: parseFloat((slab2 * 70).toFixed(2)),
      rfid1: pick(RFIDS), bin1: pick(BINS), dispenseSlot1: Math.ceil(Math.random() * 6), collectSlot1: Math.ceil(Math.random() * 6),
      ahDischarged1: ahD1, ahCharged1: ahC1, ahRegen1: ahR1, ahSwapChargeUsed1: parseFloat((ahD1 - ahC1 - ahR1).toFixed(2)),
      rfid2: pick(RFIDS), bin2: pick(BINS), dispenseSlot2: Math.ceil(Math.random() * 6), collectSlot2: Math.ceil(Math.random() * 6),
      ahDischarged2: ahD2, ahCharged2: ahC2, ahRegen2: ahR2, ahSwapChargeUsed2: parseFloat((ahD2 - ahC2 - ahR2).toFixed(2)),
      leaseDuration1: ld, leaseDuration2: Math.round(rand(20000, 43000, 0)),
      fcStart, fcEnd: undefined,
      errorNote: i === 7 ? "Flagged: unusual kWh spike" : i === 11 ? "RFID mismatch detected" : undefined,
    };
  }),

  // ── Remaining customers — 35 more swap sessions ──────────────────────────────
  ...Array.from({ length: 35 }, (_, i) => {
    const cx = CUSTOMERS[1 + (i % (CUSTOMERS.length - 1))];
    const slab1 = rand(0.32, 0.50);
    const total = rand(1.8, 3.2);
    const slab2 = parseFloat((total - slab1).toFixed(2));
    const ahD1 = rand(24, 30, 2); const ahC1 = rand(0, 2, 2); const ahR1 = rand(0.10, 0.30, 2);
    const ahD2 = rand(24, 30, 2); const ahC2 = rand(0, 2, 2); const ahR2 = rand(0.10, 0.30, 2);
    const isSkipped = i === 2 || i === 18 || i === 29;
    const isFlagged = i === 5 || i === 14 || i === 22;
    const isRfid = i === 9;
    const isMulti = i === 1 || i === 8 || i === 20 || i === 31;
    return {
      id: `BS-${String(i + 16).padStart(3, "0")}`,
      date: makeDate(Math.floor(i * 2.5), 6 + (i % 14)),
      type: "swap" as SessionType,
      phone: cx.phone, name: cx.name, imei: cx.imei,
      stationId: pick(SWAP_STATIONS),
      skipped: isSkipped, flagged: isFlagged, multiday: isMulti, rfidMismatch: isRfid,
      totalKwh: isSkipped ? 0 : total,
      totalPoints: isSkipped ? 0 : parseFloat((slab1 * 90 + slab2 * 70).toFixed(2)),
      slab1Kwh: isSkipped ? 0 : slab1, slab1Points: isSkipped ? 0 : parseFloat((slab1 * 90).toFixed(2)),
      slab2Kwh: isSkipped ? 0 : slab2, slab2Points: isSkipped ? 0 : parseFloat((slab2 * 70).toFixed(2)),
      rfid1: pick(RFIDS), bin1: pick(BINS), dispenseSlot1: Math.ceil(Math.random() * 6), collectSlot1: Math.ceil(Math.random() * 6),
      ahDischarged1: ahD1, ahCharged1: ahC1, ahRegen1: ahR1, ahSwapChargeUsed1: parseFloat((ahD1 - ahC1 - ahR1).toFixed(2)),
      rfid2: pick(RFIDS), bin2: pick(BINS), dispenseSlot2: Math.ceil(Math.random() * 6), collectSlot2: Math.ceil(Math.random() * 6),
      ahDischarged2: ahD2, ahCharged2: ahC2, ahRegen2: ahR2, ahSwapChargeUsed2: parseFloat((ahD2 - ahC2 - ahR2).toFixed(2)),
      leaseDuration1: Math.round(rand(20000, 45000, 0)), leaseDuration2: Math.round(rand(20000, 45000, 0)),
      errorNote: isSkipped ? "Session incomplete — no billing" : isFlagged ? "Flagged for review" : isRfid ? "RFID mismatch detected" : undefined,
    };
  }),

  // ── 12 fast_charge sessions ───────────────────────────────────────────────────
  ...Array.from({ length: 12 }, (_, i) => {
    const cx = CUSTOMERS[i % CUSTOMERS.length];
    const total = rand(0.5, 1.5);
    const slab1 = rand(0.3, Math.min(0.45, total));
    const slab2 = parseFloat((total - slab1).toFixed(2));
    const fcStart = makeDate(85 - i * 6, 9 + (i % 10));
    const dur = Math.round(rand(1800, 5400, 0));
    const fcEnd = new Date(new Date(fcStart).getTime() + dur * 1000).toISOString();
    return {
      id: `BS-FC-${String(i + 1).padStart(3, "0")}`,
      date: fcEnd,
      type: "fast_charge" as SessionType,
      phone: cx.phone, name: cx.name, imei: cx.imei,
      stationId: pick(FC_STATIONS),
      skipped: false, flagged: false, multiday: false, rfidMismatch: false,
      totalKwh: total, totalPoints: parseFloat((slab1 * 90 + slab2 * 70).toFixed(2)),
      slab1Kwh: slab1, slab1Points: parseFloat((slab1 * 90).toFixed(2)),
      slab2Kwh: slab2, slab2Points: parseFloat((slab2 * 70).toFixed(2)),
      rfid1: pick(RFIDS), bin1: pick(BINS),
      ahDischarged1: 0, ahCharged1: 0, ahRegen1: 0, ahSwapChargeUsed1: 0,
      ahFcAdded1: rand(5, 15, 1),
      leaseDuration1: dur,
      fcStart, fcEnd,
    };
  }),

  // ── 8 home_charge sessions ────────────────────────────────────────────────────
  ...Array.from({ length: 8 }, (_, i) => {
    const cx = CUSTOMERS[(i + 3) % CUSTOMERS.length];
    const total = rand(1.0, 2.5);
    const slab1 = rand(0.3, 0.45);
    const slab2 = parseFloat((total - slab1).toFixed(2));
    return {
      id: `BS-HC-${String(i + 1).padStart(3, "0")}`,
      date: makeDate(75 - i * 8, 20 + (i % 4)),
      type: "home_charge" as SessionType,
      phone: cx.phone, name: cx.name, imei: cx.imei,
      stationId: "home",
      skipped: false, flagged: false, multiday: false, rfidMismatch: false,
      totalKwh: total, totalPoints: parseFloat((slab1 * 90 + slab2 * 70).toFixed(2)),
      slab1Kwh: slab1, slab1Points: parseFloat((slab1 * 90).toFixed(2)),
      slab2Kwh: slab2, slab2Points: parseFloat((slab2 * 70).toFixed(2)),
    };
  }),
];

const _swap = BILLING_SESSIONS.filter(s => s.type === "swap");
const _kwh  = parseFloat(BILLING_SESSIONS.reduce((a, s) => a + s.totalKwh, 0).toFixed(2));

export const BILLING_SUMMARY = {
  totalSessions:    BILLING_SESSIONS.length,
  totalKwh:         _kwh,
  totalPoints:      parseFloat(BILLING_SESSIONS.reduce((a, s) => a + s.totalPoints, 0).toFixed(2)),
  avgKwhPerSession: parseFloat((_kwh / BILLING_SESSIONS.length).toFixed(2)),
  swapCount:        _swap.length,
  fastChargeCount:  BILLING_SESSIONS.filter(s => s.type === "fast_charge").length,
  homeChargeCount:  BILLING_SESSIONS.filter(s => s.type === "home_charge").length,
  flaggedCount:     BILLING_SESSIONS.filter(s => s.flagged).length,
  skippedCount:     BILLING_SESSIONS.filter(s => s.skipped).length,
  rfidMismatchCount:BILLING_SESSIONS.filter(s => s.rfidMismatch).length,
};
