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

export type SwapStatus = "flagged" | "rfid_mismatch" | "skipped" | "recovered" | "ok";

// ── Derived helpers ──────────────────────────────────────────────────────────

export function hasRfidMismatch(r: SwapRecord): boolean {
  return r.batteries.some((b) => b.rfidMismatch);
}

export function isRecovered(r: SwapRecord): boolean {
  return /ORPHAN|RECOVERED/i.test(r.errorNote ?? "") || (r.recovery?.kwh ?? 0) > 0;
}

/** A swap that warrants a tampering review — flagged, rfid mismatch, or orphan recovery. */
export function isTamperingCandidate(r: SwapRecord): boolean {
  return r.flagged || hasRfidMismatch(r) || /ORPHAN/i.test(r.errorNote ?? "");
}

/** Single derived status for the records table. Order = severity. */
export function swapStatus(r: SwapRecord): SwapStatus {
  if (r.flagged) return "flagged";
  if (hasRfidMismatch(r)) return "rfid_mismatch";
  if (r.skipped) return "skipped";
  if (isRecovered(r)) return "recovered";
  return "ok";
}

export const SWAP_STATUS_META: Record<SwapStatus, { label: string; badge: string }> = {
  flagged:       { label: "Flagged",        badge: "bg-red-50 text-red-700" },
  rfid_mismatch: { label: "RFID Mismatch",  badge: "bg-orange-50 text-orange-700" },
  skipped:       { label: "Skipped",        badge: "bg-slate-100 text-slate-500" },
  recovered:     { label: "Recovered",      badge: "bg-amber-50 text-amber-700" },
  ok:            { label: "OK",             badge: "bg-emerald-50 text-emerald-700" },
};

// ── Mock data (adapted from the master-billing swap sample CSV) ───────────────

const MOCK_RECORDS: SwapRecord[] = [
  {
    id: "bs0021-20260326213618-237-04f0bda2983c80",
    occurredAt: "2026-03-27T08:01:07+03:00",
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
    dispenseTimestamp: "2026-03-26T21:36:18+03:00",
    collectTimestamp: "2026-03-27T08:00:16+03:00",
    collectSwapTransactionId: "bs0008-20260327080016-040-04f0bda2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0011-20260327074638-011-047b9eca7c1390",
    occurredAt: "2026-03-27T08:00:36+03:00",
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
    dispenseTimestamp: "2026-03-27T07:46:38+03:00",
    collectTimestamp: "2026-03-27T07:59:52+03:00",
    collectSwapTransactionId: "bs0011-20260327075952-671-047b9eca7c1390",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  {
    id: "bs0022-20260322140119-315-0481d7a2983c80",
    occurredAt: "2026-03-24T13:54:12+03:00",
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
    dispenseTimestamp: "2026-03-22T14:01:19+03:00",
    collectTimestamp: "2026-03-24T13:53:43+03:00",
    collectSwapTransactionId: "bs0043-20260324135343-925-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
    multiday: "2026-03-22: 3.000  2026-03-23: 0.039",
  },
  {
    id: "bs0043-20260317160846-675-0481d7a2983c80",
    occurredAt: "2026-03-22T14:01:52+03:00",
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
    dispenseTimestamp: "2026-03-17T16:08:46+03:00",
    collectTimestamp: "2026-03-22T14:01:19+03:00",
    collectSwapTransactionId: "bs0022-20260322140119-315-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
    errorNote: "RECOVERED_ORPHAN RECOVERED_ORPHAN",
    recovery: { confidence: "high", method: "orphan-pairing", kwh: 2.933, evidence: "matched dispense/collect UID + timestamp window" },
  },
  {
    id: "bs0043-20260316142205-894-0481d7a2983c80",
    occurredAt: "2026-03-17T16:09:20+03:00",
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
    dispenseTimestamp: "2026-03-16T14:22:05+03:00",
    collectTimestamp: "2026-03-17T16:09:21+03:00",
    collectSwapTransactionId: "bs0043-20260317160846-675-0481d7a2983c80",
    skipped: false,
    flagged: false,
    manualIgnore: false,
  },
  // ── Additional rows for filter/status variety ──────────────────────────────
  {
    id: "bs0005-20260326101245-118-04a1c2d3e4f590",
    occurredAt: "2026-03-26T10:12:45+03:00",
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
    dispenseTimestamp: "2026-03-26T09:55:02+03:00",
    collectTimestamp: "2026-03-26T10:12:20+03:00",
    collectSwapTransactionId: "bs0009-20260326101220-402-04a1c2d3e4f590",
    skipped: false,
    flagged: true,
    manualIgnore: false,
    errorNote: "RFID_TAG_MISMATCH",
  },
  {
    id: "bs0025-20260325184410-556-04bb11cc22dd90",
    occurredAt: "2026-03-25T18:44:10+03:00",
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
    dispenseTimestamp: "2026-03-25T18:40:01+03:00",
    collectTimestamp: "2026-03-25T18:44:00+03:00",
    collectSwapTransactionId: "bs0026-20260325184400-090-04bb11cc22dd90",
    skipped: false,
    flagged: true,
    manualIgnore: false,
    errorNote: "TWIN_STATION_WINDOW",
  },
  {
    id: "bs0002-20260324090015-771-04cd33ee44ff90",
    occurredAt: "2026-03-24T09:00:15+03:00",
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
    dispenseTimestamp: "2026-03-24T08:59:40+03:00",
    skipped: true,
    flagged: false,
    manualIgnore: false,
    errorNote: "NO_COLLECT_RECORD",
  },
  {
    id: "bs0009-20260323161130-233-04ee55aa66bb90",
    occurredAt: "2026-03-23T16:11:30+03:00",
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
    dispenseTimestamp: "2026-03-23T15:58:12+03:00",
    collectTimestamp: "2026-03-23T16:11:05+03:00",
    collectSwapTransactionId: "bs0009-20260323161105-611-04ee55aa66bb90",
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
    { name: "zeno-swap-transactions" }
  )
);
