import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTransactionsStore } from "./transactions";

export type ViolationType =
  | "battery_mismatch"
  | "unexpected_battery_movement"
  | "swap_validation_failure"
  | "twin_station_abuse"
  | "suspected_tampering";

export type AlertStatus = "pending" | "approved" | "rejected" | "investigating";

export interface TamperingAlert {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  batteryIds: string[];
  swapStationId: string;
  swapStationName: string;
  detectedAt: string;
  swapEventId: string;
  violationType: ViolationType;
  detectionReason: string;
  offenceCount: 1 | 2 | 3 | 4;
  isDoubleBill: boolean;
  status: AlertStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  penaltyAmountKES?: number;
  penaltyApplied?: boolean;
  penaltyAppliedAt?: string;
  notificationSent?: boolean;
  notificationSentAt?: string;
  rfidDisabled?: boolean;
  rfidDisabledAt?: string;
  rfidReenabledAt?: string;
  createdAt: string;
}

const MOCK_ALERTS: TamperingAlert[] = [
  // ── Pending alerts (5) ──────────────────────────────────────────────────────
  {
    id: "AL-001",
    customerId: "CX-1005", customerName: "Zechariah Anita",
    vehicleId: "ME92ZPSFB1J001942",
    batteryIds: ["ZBT-2026-0395"],
    swapStationId: "BS0005", swapStationName: "Westlands — BS0005",
    detectedAt: "2026-08-24T08:12:00Z",
    swapEventId: "SWP-88411",
    violationType: "battery_mismatch",
    detectionReason: "Battery ZBT-2026-0395 is registered to station BS0009, not BS0005. Possible cross-station battery movement.",
    offenceCount: 1,
    isDoubleBill: false,
    status: "pending",
    createdAt: "2026-08-24T08:12:00Z",
  },
  {
    id: "AL-002",
    customerId: "CX-1003", customerName: "Erick Nganda",
    vehicleId: "ME92ZPSFB1J001934",
    batteryIds: ["ZBT-2026-0401", "ZBT-2026-0402"],
    swapStationId: "BS0025", swapStationName: "Parklands — BS0025",
    detectedAt: "2026-08-24T11:45:00Z",
    swapEventId: "SWP-88412",
    violationType: "twin_station_abuse",
    detectionReason: "Customer performed swap at BS0025 and again at adjacent BS0026 within 4-minute window, collecting a second battery before timeout lock activated.",
    offenceCount: 1,
    isDoubleBill: true,
    status: "pending",
    createdAt: "2026-08-24T11:45:00Z",
  },
  {
    id: "AL-003",
    customerId: "CX-1006", customerName: "Moses Mwangi",
    vehicleId: "ME92ZPSFB1J001938",
    batteryIds: ["ZBT-2026-0407"],
    swapStationId: "BS0002", swapStationName: "CBD Uchumi — BS0002",
    detectedAt: "2026-08-23T14:22:00Z",
    swapEventId: "SWP-88398",
    violationType: "swap_validation_failure",
    detectionReason: "RFID tag scan succeeded but vehicle ID returned from on-board unit does not match registered VIN. Possible RFID spoofing.",
    offenceCount: 1,
    isDoubleBill: false,
    status: "pending",
    createdAt: "2026-08-23T14:22:00Z",
  },
  {
    id: "AL-004",
    customerId: "CX-1013", customerName: "Grace Akinyi",
    vehicleId: "ME92ZPSFB1J002021",
    batteryIds: ["ZBT-2026-0413"],
    swapStationId: "BS0025", swapStationName: "Parklands — BS0025",
    detectedAt: "2026-08-22T09:05:00Z",
    swapEventId: "SWP-88375",
    violationType: "suspected_tampering",
    detectionReason: "Third consecutive flagged swap event. Station camera footage shows manual bypass of battery lock mechanism before RFID scan.",
    offenceCount: 3,
    isDoubleBill: false,
    status: "pending",
    createdAt: "2026-08-22T09:05:00Z",
  },
  {
    id: "AL-005",
    customerId: "CX-1001", customerName: "Nickson Mwiti",
    vehicleId: "ME92ZPSFB1J001988",
    batteryIds: ["ZBT-2026-0431"],
    swapStationId: "BS0009", swapStationName: "Roysambu — BS0009",
    detectedAt: "2026-08-25T07:30:00Z",
    swapEventId: "SWP-88430",
    violationType: "unexpected_battery_movement",
    detectionReason: "Battery ZBT-2026-0431 GPS telemetry shows it moved 3.2 km from BS0009 without a completed swap transaction record.",
    offenceCount: 2,
    isDoubleBill: false,
    status: "pending",
    createdAt: "2026-08-25T07:30:00Z",
  },
  // ── Approved alerts (4) ─────────────────────────────────────────────────────
  {
    id: "AL-006",
    customerId: "CX-1001", customerName: "Nickson Mwiti",
    vehicleId: "ME92ZPSFB1J001988",
    batteryIds: ["ZBT-2026-0395"],
    swapStationId: "BS0005", swapStationName: "Westlands — BS0005",
    detectedAt: "2026-08-18T10:20:00Z",
    swapEventId: "SWP-88211",
    violationType: "battery_mismatch",
    detectionReason: "Battery assigned to BS0009 found in vehicle at BS0005. No transfer record exists.",
    offenceCount: 1,
    isDoubleBill: false,
    status: "approved",
    reviewedBy: "u2",
    reviewedAt: "2026-08-18T14:00:00Z",
    reviewNote: "Confirmed via station logs. First offence — penalty applied, warning issued.",
    penaltyAmountKES: 280,
    penaltyApplied: true,
    penaltyAppliedAt: "2026-08-18T14:01:00Z",
    notificationSent: true,
    notificationSentAt: "2026-08-18T14:05:00Z",
    createdAt: "2026-08-18T10:20:00Z",
  },
  {
    id: "AL-007",
    customerId: "CX-1002", customerName: "Fredrick Ochieng",
    vehicleId: "ME92ZPSFB1J001905",
    batteryIds: ["ZBT-2026-0411", "ZBT-2026-0398"],
    swapStationId: "BS0006", swapStationName: "South B — BS0006",
    detectedAt: "2026-08-20T15:33:00Z",
    swapEventId: "SWP-88290",
    violationType: "twin_station_abuse",
    detectionReason: "Dual swap at BS0006 and BS0007 within 6 minutes. Customer collected two batteries — double bill applies.",
    offenceCount: 1,
    isDoubleBill: true,
    status: "approved",
    reviewedBy: "u1",
    reviewedAt: "2026-08-21T09:00:00Z",
    reviewNote: "Twin-station abuse confirmed. Double bill charged per policy.",
    penaltyAmountKES: 560,
    penaltyApplied: true,
    penaltyAppliedAt: "2026-08-21T09:01:00Z",
    notificationSent: true,
    notificationSentAt: "2026-08-21T09:10:00Z",
    createdAt: "2026-08-20T15:33:00Z",
  },
  {
    id: "AL-008",
    customerId: "CX-1014", customerName: "Brian Mutua",
    vehicleId: "ME92ZPSFB1J002028",
    batteryIds: ["ZBT-2026-0419"],
    swapStationId: "BS0009", swapStationName: "Roysambu — BS0009",
    detectedAt: "2026-08-15T12:10:00Z",
    swapEventId: "SWP-88155",
    violationType: "battery_mismatch",
    detectionReason: "Battery serial mismatch on second consecutive swap at same station within same day.",
    offenceCount: 2,
    isDoubleBill: false,
    status: "approved",
    reviewedBy: "u2",
    reviewedAt: "2026-08-15T16:30:00Z",
    reviewNote: "Second offence. Penalty applied. Customer warned — next offence triggers RFID disable.",
    penaltyAmountKES: 280,
    penaltyApplied: true,
    penaltyAppliedAt: "2026-08-15T16:31:00Z",
    notificationSent: true,
    notificationSentAt: "2026-08-15T16:35:00Z",
    createdAt: "2026-08-15T12:10:00Z",
  },
  {
    id: "AL-009",
    customerId: "CX-1014", customerName: "Brian Mutua",
    vehicleId: "ME92ZPSFB1J002028",
    batteryIds: ["ZBT-2026-0423"],
    swapStationId: "BS0029", swapStationName: "Ngong Road — BS0029",
    detectedAt: "2026-08-10T08:45:00Z",
    swapEventId: "SWP-88050",
    violationType: "battery_mismatch",
    detectionReason: "Battery registered to partner fleet found in customer vehicle without cross-fleet agreement.",
    offenceCount: 3,
    isDoubleBill: false,
    status: "approved",
    reviewedBy: "u1",
    reviewedAt: "2026-08-10T11:00:00Z",
    reviewNote: "Third offence — RFID auto-disabled per policy.",
    penaltyAmountKES: 280,
    penaltyApplied: true,
    penaltyAppliedAt: "2026-08-10T11:01:00Z",
    notificationSent: true,
    notificationSentAt: "2026-08-10T11:05:00Z",
    rfidDisabled: true,
    rfidDisabledAt: "2026-08-10T11:01:00Z",
    createdAt: "2026-08-10T08:45:00Z",
  },
  // ── Rejected alert (1) ──────────────────────────────────────────────────────
  {
    id: "AL-010",
    customerId: "CX-1012", customerName: "Samuel Odhiambo",
    vehicleId: "ME92ZPSEB1J002010",
    batteryIds: ["ZBT-2026-0407"],
    swapStationId: "BS0029", swapStationName: "Ngong Road — BS0029",
    detectedAt: "2026-08-19T13:00:00Z",
    swapEventId: "SWP-88260",
    violationType: "swap_validation_failure",
    detectionReason: "RFID scan timeout — station firmware glitch caused failed validation on first attempt.",
    offenceCount: 1,
    isDoubleBill: false,
    status: "rejected",
    reviewedBy: "u2",
    reviewedAt: "2026-08-19T15:00:00Z",
    reviewNote: "Station BS0029 firmware issue confirmed by field team. False positive — no customer fault.",
    createdAt: "2026-08-19T13:00:00Z",
  },
  // ── Investigating alert (1) ─────────────────────────────────────────────────
  {
    id: "AL-011",
    customerId: "CX-1005", customerName: "Zechariah Anita",
    vehicleId: "ME92ZPSFB1J001942",
    batteryIds: ["ZBT-2026-0402"],
    swapStationId: "BS0045", swapStationName: "Kasarani — BS0045",
    detectedAt: "2026-08-21T16:50:00Z",
    swapEventId: "SWP-88318",
    violationType: "unexpected_battery_movement",
    detectionReason: "Battery GPS shows movement path inconsistent with customer's registered route. Battery appeared at unlisted location for 40 minutes.",
    offenceCount: 2,
    isDoubleBill: false,
    status: "investigating",
    reviewedBy: "u2",
    reviewedAt: "2026-08-21T18:00:00Z",
    reviewNote: "Requested station CCTV for Aug 21 16:40–17:00. Awaiting field team report.",
    createdAt: "2026-08-21T16:50:00Z",
  },
  // ── Second pending for visual variety ───────────────────────────────────────
  {
    id: "AL-012",
    customerId: "CX-1003", customerName: "Erick Nganda",
    vehicleId: "ME92ZPSFB1J001934",
    batteryIds: ["ZBT-2026-0404"],
    swapStationId: "BS0047", swapStationName: "Embakasi — BS0047",
    detectedAt: "2026-08-25T06:15:00Z",
    swapEventId: "SWP-88431",
    violationType: "twin_station_abuse",
    detectionReason: "Repeat twin-station pattern — swapped at BS0047 then immediately at adjacent BS0048 within 3 minutes.",
    offenceCount: 2,
    isDoubleBill: true,
    status: "pending",
    createdAt: "2026-08-25T06:15:00Z",
  },
];

interface TamperingAlertsState {
  alerts: TamperingAlert[];
  approveAlert: (id: string, reviewerId: string, note: string, penaltyKES: number) => void;
  rejectAlert: (id: string, reviewerId: string, note: string) => void;
  markInvestigating: (id: string, reviewerId: string, note: string) => void;
  sendNotification: (id: string) => void;
  toggleRfid: (id: string, disabled: boolean) => void;
  reopenAlert: (id: string) => void;
}

export const useTamperingAlertsStore = create<TamperingAlertsState>()(
  persist(
    (set, get) => ({
      alerts: MOCK_ALERTS,

      approveAlert: (id, reviewerId, note, penaltyKES) => {
        const alert = get().alerts.find((a) => a.id === id);
        if (!alert) return;
        const now = new Date().toISOString();
        const autoDisableRfid = alert.offenceCount >= 3 && !alert.rfidDisabled;
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "approved" as AlertStatus,
                  reviewedBy: reviewerId,
                  reviewedAt: now,
                  reviewNote: note,
                  penaltyAmountKES: penaltyKES,
                  penaltyApplied: true,
                  penaltyAppliedAt: now,
                  rfidDisabled: autoDisableRfid ? true : a.rfidDisabled,
                  rfidDisabledAt: autoDisableRfid ? now : a.rfidDisabledAt,
                }
              : a
          ),
        }));
        useTransactionsStore.getState().addTransaction({
          id: `TXN-PEN-${id}-${Date.now()}`,
          customerId: alert.customerId,
          customerName: alert.customerName,
          type: "penalty",
          amountKES: penaltyKES,
          paymentMethod: "mpesa",
          status: "completed",
          stationId: alert.swapStationId,
          vehicleId: alert.vehicleId,
          occurredAt: now,
          reference: id,
          notes: `Tampering penalty: ${alert.violationType.replace(/_/g, " ")} (offence #${alert.offenceCount})`,
        });
      },

      rejectAlert: (id, reviewerId, note) => {
        const now = new Date().toISOString();
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "rejected" as AlertStatus, reviewedBy: reviewerId, reviewedAt: now, reviewNote: note }
              : a
          ),
        }));
      },

      markInvestigating: (id, reviewerId, note) => {
        const now = new Date().toISOString();
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "investigating" as AlertStatus, reviewedBy: reviewerId, reviewedAt: now, reviewNote: note }
              : a
          ),
        }));
      },

      sendNotification: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, notificationSent: true, notificationSentAt: now } : a
          ),
        }));
      },

      toggleRfid: (id, disabled) => {
        const now = new Date().toISOString();
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  rfidDisabled: disabled,
                  rfidDisabledAt: disabled ? now : a.rfidDisabledAt,
                  rfidReenabledAt: !disabled ? now : a.rfidReenabledAt,
                }
              : a
          ),
        }));
      },

      reopenAlert: (id) => {
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "pending" as AlertStatus, reviewedBy: undefined, reviewedAt: undefined, reviewNote: undefined }
              : a
          ),
        }));
      },
    }),
    { name: "zeno-tampering-alerts" }
  )
);
