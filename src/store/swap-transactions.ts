import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SwapBattery {
  bin: string;              // bin.1 / bin.2 (battery serial)
  billedKWh: number;        // billed_kWh.1 / billed_kWh.2
  rfidMismatch: boolean;    // rfid_mismatch.1 / rfid_mismatch.2
  slotDispense?: number;    // dispense_slot.*
  slotCollect?: number;     // collect_slot.*
  ahDischarged?: number;    // ahDischarged.*
  ahCharged?: number;       // ahCharged.*
  ahRegen?: number;         // ahRegen.*
  rfidTagUid?: string;      // dispense_rfidTagUid.* / collect_rfidTagUid.*
}

export interface SwapRecovery {
  confidence?: string;      // recovery_confidence
  method?: string;          // recovery_method
  kwh?: number;             // recovery_kwh
  evidence?: string;        // recovery_evidence
}

export interface SwapRecord {
  id: string;               // dispense_swapTransactionId.1
  occurredAt: string;       // date (ISO)
  customerName: string;     // name
  phone: string;            // phone
  isCustomer: boolean;      // is_customer
  type: string;             // "swap"
  totalKWh: number;         // total_kWh
  totalPoints: number;      // total_points
  batteries: SwapBattery[]; // bin.1/.2 pairing
  dispenseStationId: string; // dispense_swapStationId.1
  collectStationId: string;  // collect_swapStationId.1
  dispenseTimestamp?: string; // dispense_timestamp.1 (ISO)
  collectTimestamp?: string;  // collect_timestamp.1 (ISO)
  collectSwapTransactionId?: string; // collect_swapTransactionId.1
  errorNote?: string;       // error_note (e.g. "RECOVERED_ORPHAN")
  skipped: boolean;         // skipped
  flagged: boolean;         // flagged
  manualIgnore: boolean;    // ManualIgnore
  multiday?: string;        // multiday breakdown text
  recovery?: SwapRecovery;
}

export type SwapStatus = "flagged" | "cross_station" | "rfid_mismatch" | "skipped" | "recovered" | "ok";

// ── Derived helpers ──────────────────────────────────────────────────────────

export function hasRfidMismatch(r: SwapRecord): boolean {
  return r.batteries.some((b) => b.rfidMismatch);
}

export function isRecovered(r: SwapRecord): boolean {
  return /ORPHAN|RECOVERED/i.test(r.errorNote ?? "") || (r.recovery?.kwh ?? 0) > 0;
}

/**
 * The distinct battery stations (`bs`) involved in a swap. A normal swap
 * dispenses and collects at a single station, so this is one entry.
 */
export function distinctStations(r: SwapRecord): string[] {
  return Array.from(new Set([r.dispenseStationId, r.collectStationId].filter(Boolean)));
}

/**
 * A swap that touches two different battery stations. Per ops rule: one `bs`
 * per swap is expected — a second station showing up is probably an alert.
 */
export function isCrossStation(r: SwapRecord): boolean {
  return distinctStations(r).length >= 2;
}

/** A swap that warrants a tampering review — flagged, cross-station, rfid mismatch, or orphan recovery. */
export function isTamperingCandidate(r: SwapRecord): boolean {
  return r.flagged || isCrossStation(r) || hasRfidMismatch(r) || /ORPHAN/i.test(r.errorNote ?? "");
}

/** Single derived status for the records table. Order = severity. */
export function swapStatus(r: SwapRecord): SwapStatus {
  if (r.flagged) return "flagged";
  if (isCrossStation(r)) return "cross_station";
  if (hasRfidMismatch(r)) return "rfid_mismatch";
  if (r.skipped) return "skipped";
  if (isRecovered(r)) return "recovered";
  return "ok";
}

export const SWAP_STATUS_META: Record<SwapStatus, { label: string; badge: string }> = {
  flagged:       { label: "Flagged",        badge: "bg-red-50 text-red-700" },
  cross_station: { label: "Cross-Station",  badge: "bg-rose-100 text-rose-800" },
  rfid_mismatch: { label: "RFID Mismatch",  badge: "bg-orange-50 text-orange-700" },
  skipped:       { label: "Skipped",        badge: "bg-slate-100 text-slate-500" },
  recovered:     { label: "Recovered",      badge: "bg-amber-50 text-amber-700" },
  ok:            { label: "OK",             badge: "bg-emerald-50 text-emerald-700" },
};

// ── Mock data (adapted from the master-billing swap sample CSV) ───────────────

const MOCK_RECORDS: SwapRecord[] = [
  {
    id: "bs0021-20260326213618-237-04f0bda2983c80",
    occurredAt: "2026-08-31T08:01:07+03:00",
    customerName: "Stephen Njoroge",
    phone: "254-724172171",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.017,
    totalPoints: 181.52,
    batteries: [
      { bin: "2ME9YBRP1B001350", billedKWh: 1.01024, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.63, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001375", billedKWh: 1.006656, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.55, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0021",
    collectStationId: "bs0008",
    dispenseTimestamp: "2026-08-30T21:36:18+03:00",
    collectTimestamp: "2026-08-31T08:00:16+03:00",
    collectSwapTransactionId: "bs0008-20260327080016-040-04f0bda2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0011-20260327074638-011-047b9eca7c1390",
    occurredAt: "2026-08-31T08:00:36+03:00",
    customerName: "Rakesh Kumar",
    phone: "91-9467937034",
    isCustomer: true,
    type: "swap",
    totalKWh: 0.244,
    totalPoints: 21.97,
    batteries: [
      { bin: "2ME9YBRP1B000009", billedKWh: 0.122752, rfidMismatch: false, slotDispense: 5, slotCollect: 8, ahDischarged: 3.05, ahCharged: 0.07, ahRegen: 0.24, rfidTagUid: "047B9ECA7C1390" },
      { bin: "2ME9YBRP1B001698", billedKWh: 0.121408, rfidMismatch: false, slotDispense: 6, slotCollect: 6, ahDischarged: 2.97, ahCharged: 0.01, ahRegen: 0.25, rfidTagUid: "047B9ECA7C1390" },
    ],
    dispenseStationId: "bs0011",
    collectStationId: "bs0011",
    dispenseTimestamp: "2026-08-31T07:46:38+03:00",
    collectTimestamp: "2026-08-31T07:59:52+03:00",
    collectSwapTransactionId: "bs0011-20260327075952-671-047b9eca7c1390",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0022-20260322140119-315-0481d7a2983c80",
    occurredAt: "2026-08-28T13:54:12+03:00",
    customerName: "Michael Spencer",
    phone: "254-706216840",
    isCustomer: true,
    type: "swap",
    totalKWh: 3.039,
    totalPoints: 273.49,
    batteries: [
      { bin: "2ME9YBRP1B000965", billedKWh: 1.516928, rfidMismatch: false, slotDispense: 5, slotCollect: 2, ahDischarged: 38.23, ahCharged: 0, ahRegen: 4.37, rfidTagUid: "0481D7A2983C80" },
      { bin: "2ME9YBRP1B001607", billedKWh: 1.521856, rfidMismatch: false, slotDispense: 3, slotCollect: 8, ahDischarged: 38.35, ahCharged: 0, ahRegen: 4.38, rfidTagUid: "0481D7A2983C80" },
    ],
    dispenseStationId: "bs0022",
    collectStationId: "bs0043",
    dispenseTimestamp: "2026-08-26T14:01:19+03:00",
    collectTimestamp: "2026-08-28T13:53:43+03:00",
    collectSwapTransactionId: "bs0043-20260324135343-925-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
    multiday: "2026-08-26: 3.000  2026-08-27: 0.039",
  },
  {
    id: "bs0043-20260317160846-675-0481d7a2983c80",
    occurredAt: "2026-08-26T14:01:52+03:00",
    customerName: "Michael Spencer",
    phone: "254-706216840",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.933,
    totalPoints: 263.93,
    batteries: [
      { bin: "2ME9YBRP1B000915", billedKWh: 1.464512, rfidMismatch: false, slotDispense: 7, slotCollect: 2, ahDischarged: 67.52, ahCharged: 26.92, ahRegen: 7.91, rfidTagUid: "0481D7A2983C80" },
      { bin: "2ME9YBRP1B001533", billedKWh: 1.468096, rfidMismatch: false, slotDispense: 5, slotCollect: 3, ahDischarged: 67.91, ahCharged: 27.17, ahRegen: 7.97, rfidTagUid: "0481D7A2983C80" },
    ],
    dispenseStationId: "bs0043",
    collectStationId: "bs0022",
    dispenseTimestamp: "2026-08-21T16:08:46+03:00",
    collectTimestamp: "2026-08-26T14:01:19+03:00",
    collectSwapTransactionId: "bs0022-20260322140119-315-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
    errorNote: "RECOVERED_ORPHAN RECOVERED_ORPHAN",
    recovery: { confidence: "high", method: "orphan-pairing", kwh: 2.933, evidence: "matched dispense/collect UID + timestamp window" },
  },
  {
    id: "bs0043-20260316142205-894-0481d7a2983c80",
    occurredAt: "2026-08-21T16:09:20+03:00",
    customerName: "Michael Spencer",
    phone: "254-706216840",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.949,
    totalPoints: 175.39,
    batteries: [
      { bin: "2ME9YBRP1B000508", billedKWh: 0.975296, rfidMismatch: false, slotDispense: 6, slotCollect: 8, ahDischarged: 24.92, ahCharged: 0, ahRegen: 3.15, rfidTagUid: "0481D7A2983C80" },
      { bin: "2ME9YBRP1B000575", billedKWh: 0.973504, rfidMismatch: false, slotDispense: 4, slotCollect: 5, ahDischarged: 24.85, ahCharged: 0, ahRegen: 3.12, rfidTagUid: "0481D7A2983C80" },
    ],
    dispenseStationId: "bs0043",
    collectStationId: "bs0043",
    dispenseTimestamp: "2026-08-20T14:22:05+03:00",
    collectTimestamp: "2026-08-21T16:09:21+03:00",
    collectSwapTransactionId: "bs0043-20260317160846-675-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  // ── Additional rows for filter/status variety ──────────────────────────────
  {
    id: "bs0005-20260326101245-118-04a1c2d3e4f590",
    occurredAt: "2026-08-30T10:12:45+03:00",
    customerName: "Zechariah Anita",
    phone: "254-711045221",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.204,
    totalPoints: 198.36,
    batteries: [
      { bin: "2ME9YBRP1B002210", billedKWh: 1.103, rfidMismatch: true, slotDispense: 3, slotCollect: 1, ahDischarged: 27.4, ahCharged: 0, ahRegen: 1.2, rfidTagUid: "04A1C2D3E4F590" },
      { bin: "2ME9YBRP1B002244", billedKWh: 1.101, rfidMismatch: false, slotDispense: 4, slotCollect: 7, ahDischarged: 27.1, ahCharged: 0, ahRegen: 1.1, rfidTagUid: "04A1C2D3E4F590" },
    ],
    dispenseStationId: "bs0005",
    collectStationId: "bs0009",
    dispenseTimestamp: "2026-08-30T09:55:02+03:00",
    collectTimestamp: "2026-08-30T10:12:20+03:00",
    collectSwapTransactionId: "bs0009-20260326101220-402-04a1c2d3e4f590",
    skipped: false,
    flagged: true,
    manualIgnore: false,
    errorNote: "RFID_TAG_MISMATCH",
  },
  {
    id: "bs0025-20260325184410-556-04bb11cc22dd90",
    occurredAt: "2026-08-29T18:44:10+03:00",
    customerName: "Erick Nganda",
    phone: "254-720998112",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.512,
    totalPoints: 136.08,
    batteries: [
      { bin: "2ME9YBRP1B003001", billedKWh: 0.756, rfidMismatch: false, slotDispense: 2, slotCollect: 2, ahDischarged: 18.9, ahCharged: 0, ahRegen: 0.9, rfidTagUid: "04BB11CC22DD90" },
      { bin: "2ME9YBRP1B003044", billedKWh: 0.756, rfidMismatch: false, slotDispense: 6, slotCollect: 3, ahDischarged: 18.8, ahCharged: 0, ahRegen: 0.9, rfidTagUid: "04BB11CC22DD90" },
    ],
    dispenseStationId: "bs0025",
    collectStationId: "bs0026",
    dispenseTimestamp: "2026-08-29T18:40:01+03:00",
    collectTimestamp: "2026-08-29T18:44:00+03:00",
    collectSwapTransactionId: "bs0026-20260325184400-090-04bb11cc22dd90",
    skipped: false,
    flagged: true,
    manualIgnore: false,
    errorNote: "TWIN_STATION_WINDOW",
  },
  {
    id: "bs0002-20260324090015-771-04cd33ee44ff90",
    occurredAt: "2026-08-28T09:00:15+03:00",
    customerName: "Moses Mwangi",
    phone: "254-733220145",
    isCustomer: true,
    type: "swap",
    totalKWh: 0,
    totalPoints: 0,
    batteries: [
      { bin: "2ME9YBRP1B004100", billedKWh: 0, rfidMismatch: false, slotDispense: 1, slotCollect: undefined, ahDischarged: 0, ahCharged: 0, ahRegen: 0, rfidTagUid: "04CD33EE44FF90" },
    ],
    dispenseStationId: "bs0002",
    collectStationId: "",
    dispenseTimestamp: "2026-08-28T08:59:40+03:00",
    skipped: true,
    flagged: false,
    manualIgnore: false,
    errorNote: "NO_COLLECT_RECORD",
  },
  {
    id: "bs0009-20260323161130-233-04ee55aa66bb90",
    occurredAt: "2026-08-27T16:11:30+03:00",
    customerName: "Nickson Mwiti",
    phone: "254-701556789",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.688,
    totalPoints: 241.92,
    batteries: [
      { bin: "2ME9YBRP1B005500", billedKWh: 1.344, rfidMismatch: false, slotDispense: 8, slotCollect: 4, ahDischarged: 33.6, ahCharged: 0, ahRegen: 2.1, rfidTagUid: "04EE55AA66BB90" },
      { bin: "2ME9YBRP1B005533", billedKWh: 1.344, rfidMismatch: false, slotDispense: 7, slotCollect: 5, ahDischarged: 33.5, ahCharged: 0, ahRegen: 2.0, rfidTagUid: "04EE55AA66BB90" },
    ],
    dispenseStationId: "bs0009",
    collectStationId: "bs0009",
    dispenseTimestamp: "2026-08-27T15:58:12+03:00",
    collectTimestamp: "2026-08-27T16:11:05+03:00",
    collectSwapTransactionId: "bs0009-20260323161105-611-04ee55aa66bb90",
    skipped: false,
    flagged: false,
    manualIgnore: true,
  },
  {
    id: "bs0021-20260926071200-01-0a11",
    occurredAt: "2026-09-26T07:12:00+03:00",
    customerName: "Patrick Kamau",
    phone: "254-712345678",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.98,
    totalPoints: 178.2,
    batteries: [
      { bin: "2ME9YBRP1B001410", billedKWh: 0.99, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001411", billedKWh: 0.99, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0021",
    collectStationId: "bs0021",
    dispenseTimestamp: "2026-09-25T07:12:12+03:00",
    collectTimestamp: "2026-09-26T07:12:41+03:00",
    collectSwapTransactionId: "bs0021-20260926071241-01-0a11",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0008-20260926094000-02-0a12",
    occurredAt: "2026-09-26T09:40:00+03:00",
    customerName: "Diana Wanjiku",
    phone: "254-733456789",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.04,
    totalPoints: 183.6,
    batteries: [
      { bin: "2ME9YBRP1B001412", billedKWh: 1.02, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001413", billedKWh: 1.02, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0008",
    collectStationId: "bs0008",
    dispenseTimestamp: "2026-09-25T09:40:12+03:00",
    collectTimestamp: "2026-09-26T09:40:41+03:00",
    collectSwapTransactionId: "bs0008-20260926094041-02-0a12",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0025-20260925065500-03-0a13",
    occurredAt: "2026-09-25T06:55:00+03:00",
    customerName: "Samuel Odhiambo",
    phone: "254-754567890",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.87,
    totalPoints: 168.3,
    batteries: [
      { bin: "2ME9YBRP1B001414", billedKWh: 0.935, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001415", billedKWh: 0.935, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0025",
    collectStationId: "bs0025",
    dispenseTimestamp: "2026-09-24T06:55:12+03:00",
    collectTimestamp: "2026-09-25T06:55:41+03:00",
    collectSwapTransactionId: "bs0025-20260925065541-03-0a13",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0005-20260925172200-04-0a14",
    occurredAt: "2026-09-25T17:22:00+03:00",
    customerName: "Grace Akinyi",
    phone: "254-701234567",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.11,
    totalPoints: 189.9,
    batteries: [
      { bin: "2ME9YBRP1B001416", billedKWh: 1.055, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001417", billedKWh: 1.055, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0005",
    collectStationId: "bs0005",
    dispenseTimestamp: "2026-09-24T17:22:12+03:00",
    collectTimestamp: "2026-09-25T17:22:41+03:00",
    collectSwapTransactionId: "bs0005-20260925172241-04-0a14",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0027-20260924080800-05-0a15",
    occurredAt: "2026-09-24T08:08:00+03:00",
    customerName: "Brian Mutua",
    phone: "254-722345678",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.95,
    totalPoints: 175.5,
    batteries: [
      { bin: "2ME9YBRP1B001418", billedKWh: 0.975, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001419", billedKWh: 0.975, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0027",
    collectStationId: "bs0027",
    dispenseTimestamp: "2026-09-23T08:08:12+03:00",
    collectTimestamp: "2026-09-24T08:08:41+03:00",
    collectSwapTransactionId: "bs0027-20260924080841-05-0a15",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0009-20260924124700-06-0a16",
    occurredAt: "2026-09-24T12:47:00+03:00",
    customerName: "Joseph Kariuki",
    phone: "254-764789012",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.08,
    totalPoints: 187.2,
    batteries: [
      { bin: "2ME9YBRP1B001420", billedKWh: 1.04, rfidMismatch: false, slotDispense: 1, slotCollect: 4, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001421", billedKWh: 1.04, rfidMismatch: false, slotDispense: 2, slotCollect: 6, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0009",
    collectStationId: "bs0009",
    dispenseTimestamp: "2026-09-23T12:47:12+03:00",
    collectTimestamp: "2026-09-24T12:47:41+03:00",
    collectSwapTransactionId: "bs0009-20260924124741-06-0a16",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0021-20260923183000-11-0b21",
    occurredAt: "2026-09-23T18:30:00+03:00",
    customerName: "Anne Njeri",
    phone: "254-785890123",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.12,
    totalPoints: 190.8,
    batteries: [
      { bin: "2ME9YBRP1B001520", billedKWh: 1.06, rfidMismatch: false, slotDispense: 3, slotCollect: 5, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0021",
    collectStationId: "bs0043",
    dispenseTimestamp: "2026-09-22T18:30:12+03:00",
    collectTimestamp: "2026-09-23T18:30:41+03:00",
    collectSwapTransactionId: "bs0043-20260923183041-11-0b21",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0006-20260922074500-12-0b22",
    occurredAt: "2026-09-22T07:45:00+03:00",
    customerName: "Mary Wambui",
    phone: "254-732012345",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.99,
    totalPoints: 179.1,
    batteries: [
      { bin: "2ME9YBRP1B001522", billedKWh: 0.995, rfidMismatch: false, slotDispense: 3, slotCollect: 5, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0006",
    collectStationId: "bs0029",
    dispenseTimestamp: "2026-09-21T07:45:12+03:00",
    collectTimestamp: "2026-09-22T07:45:41+03:00",
    collectSwapTransactionId: "bs0029-20260922074541-12-0b22",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0045-20260921161000-13-0b23",
    occurredAt: "2026-09-21T16:10:00+03:00",
    customerName: "Rose Wanjiru",
    phone: "254-774234567",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.2,
    totalPoints: 198.0,
    batteries: [
      { bin: "2ME9YBRP1B001524", billedKWh: 1.1, rfidMismatch: false, slotDispense: 3, slotCollect: 5, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0045",
    collectStationId: "bs0002",
    dispenseTimestamp: "2026-09-20T16:10:12+03:00",
    collectTimestamp: "2026-09-21T16:10:41+03:00",
    collectSwapTransactionId: "bs0002-20260921161041-13-0b23",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0011-20260920110500-21-0c31",
    occurredAt: "2026-09-20T11:05:00+03:00",
    customerName: "David Maina",
    phone: "254-795345678",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.06,
    totalPoints: 185.4,
    batteries: [
      { bin: "2ME9YBRP1B001630", billedKWh: 1.03, rfidMismatch: false, slotDispense: 1, slotCollect: 3, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001631", billedKWh: 1.03, rfidMismatch: true, slotDispense: 2, slotCollect: 7, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04DEADBEEF0000" },
    ],
    dispenseStationId: "bs0011",
    collectStationId: "bs0011",
    dispenseTimestamp: "2026-09-19T11:05:12+03:00",
    collectTimestamp: "2026-09-20T11:05:41+03:00",
    errorNote: "RFID_TAG_MISMATCH_ON_COLLECT",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0047-20260919145200-22-0c32",
    occurredAt: "2026-09-19T14:52:00+03:00",
    customerName: "Lucy Waithera",
    phone: "254-716456789",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.92,
    totalPoints: 172.8,
    batteries: [
      { bin: "2ME9YBRP1B001632", billedKWh: 0.96, rfidMismatch: false, slotDispense: 1, slotCollect: 3, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
      { bin: "2ME9YBRP1B001633", billedKWh: 0.96, rfidMismatch: true, slotDispense: 2, slotCollect: 7, ahDischarged: 22.5, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04DEADBEEF0001" },
    ],
    dispenseStationId: "bs0047",
    collectStationId: "bs0047",
    dispenseTimestamp: "2026-09-18T14:52:12+03:00",
    collectTimestamp: "2026-09-19T14:52:41+03:00",
    errorNote: "RFID_TAG_MISMATCH_ON_COLLECT",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0025-20260918203000-31-0d41",
    occurredAt: "2026-09-18T20:30:00+03:00",
    customerName: "Michael Kimani",
    phone: "254-737567890",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.08,
    totalPoints: 187.2,
    batteries: [
      { bin: "2ME9YBRP1B001640", billedKWh: 1.04, rfidMismatch: false, slotDispense: 4, slotCollect: 8, ahDischarged: 23.9, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0025",
    collectStationId: "bs0025",
    dispenseTimestamp: "2026-09-17T20:30:12+03:00",
    collectTimestamp: "2026-09-18T20:30:41+03:00",
    errorNote: "MANUAL_FLAG_OPS_REVIEW",
    skipped: false,
    flagged: true,
    manualIgnore: false,
  },
  {
    id: "bs0009-20260917065500-32-0d42",
    occurredAt: "2026-09-17T06:55:00+03:00",
    customerName: "Agnes Nyambura",
    phone: "254-758678901",
    isCustomer: true,
    type: "swap",
    totalKWh: 0,
    totalPoints: 0,
    batteries: [
      { bin: "2ME9YBRP1B001645", billedKWh: 0, rfidMismatch: false, slotDispense: 1, slotCollect: 1, ahDischarged: 0, ahCharged: 0, ahRegen: 0, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0009",
    collectStationId: "bs0009",
    dispenseTimestamp: "2026-09-16T06:55:12+03:00",
    collectTimestamp: "2026-09-17T06:55:41+03:00",
    errorNote: "SESSION_ABORTED_BEFORE_DISPENSE",
    skipped: true,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0043-20260916132000-33-0d43",
    occurredAt: "2026-09-16T13:20:00+03:00",
    customerName: "Paul Omondi",
    phone: "254-779789012",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.06,
    totalPoints: 185.4,
    batteries: [
      { bin: "2ME9YBRP1B001650", billedKWh: 1.03, rfidMismatch: false, slotDispense: 2, slotCollect: 5, ahDischarged: 23.1, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0043",
    collectStationId: "bs0043",
    dispenseTimestamp: "2026-09-15T13:20:12+03:00",
    collectTimestamp: "2026-09-16T13:20:41+03:00",
    errorNote: "RECOVERED_ORPHAN",
    skipped: false,
    flagged: false,
    manualIgnore: false,
    recovery: { confidence: "high", method: "telemetry_reconstruction", kwh: 2.06, evidence: "Matched dispense telemetry to a collect event 41 minutes later on the same bin pair." },
  },
  {
    id: "bs0002-20260915094500-34-0d44",
    occurredAt: "2026-09-15T09:45:00+03:00",
    customerName: "Esther Mumbi",
    phone: "254-742012345",
    isCustomer: true,
    type: "swap",
    totalKWh: 2.12,
    totalPoints: 190.8,
    batteries: [
      { bin: "2ME9YBRP1B001655", billedKWh: 1.06, rfidMismatch: false, slotDispense: 3, slotCollect: 6, ahDischarged: 24.2, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0002",
    collectStationId: "bs0002",
    dispenseTimestamp: "2026-09-14T09:45:12+03:00",
    collectTimestamp: "2026-09-15T09:45:41+03:00",
    multiday: "Dispensed 14 Sep 21:10, collected 15 Sep 09:45 — billed across two days",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0005-20260914110000-35-0d45",
    occurredAt: "2026-09-14T11:00:00+03:00",
    customerName: "George Onyango",
    phone: "254-763123456",
    isCustomer: true,
    type: "swap",
    totalKWh: 1.96,
    totalPoints: 176.4,
    batteries: [
      { bin: "2ME9YBRP1B001660", billedKWh: 0.98, rfidMismatch: false, slotDispense: 1, slotCollect: 2, ahDischarged: 21.8, ahCharged: 0, ahRegen: 0.08, rfidTagUid: "04F0BDA2983C80" },
    ],
    dispenseStationId: "bs0005",
    collectStationId: "bs0005",
    dispenseTimestamp: "2026-09-13T11:00:12+03:00",
    collectTimestamp: "2026-09-14T11:00:41+03:00",
    errorNote: "DUPLICATE_OF_EARLIER_SESSION",
    skipped: false,
    flagged: false,
    manualIgnore: true,
  },
];

// ── Store ────────────────────────────────────────────────────────────────────

interface SwapTransactionsState {
  records: SwapRecord[];
}

export const useSwapTransactionsStore = create<SwapTransactionsState>()(
  persist(
    () => ({
      records: MOCK_RECORDS,
    }),
    // v1: seed dates shifted into the recent window so the default "last 7 days"
    // filter shows data. Bump version so already-persisted clients re-seed.
    { name: "zeno-swap-transactions", version: 2, migrate: () => ({ records: MOCK_RECORDS }) }
  )
);
