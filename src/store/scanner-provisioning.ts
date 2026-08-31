import { create } from "zustand";
import { useAssetTrackingStore } from "./asset-tracking";

export type ScannerActionType =
  | "bring_up"
  | "tenant_assign"
  | "dispatch"
  | "customer_onboard"
  | "bike_assign"
  | "rfid_assign"
  | "handover"
  | "deactivate";

export const ACTION_LABELS: Record<ScannerActionType, string> = {
  bring_up: "Bring-Up",
  tenant_assign: "Tenant Assign",
  dispatch: "Dispatch",
  customer_onboard: "Customer Onboard",
  bike_assign: "Bike Assign",
  rfid_assign: "RFID Assign",
  handover: "Handover",
  deactivate: "Deactivate",
};

export const ACTION_TYPES = Object.keys(ACTION_LABELS) as ScannerActionType[];

export type BikeState = "new" | "active" | "used" | "test";

export type ScannerAction = {
  id: string;
  timestamp: string; // "01 Sep 2026 13:06"
  actionType: ScannerActionType;
  vin: string; // "" when customer-only
  customerName: string;
  customerPhone: string; // "" when bike-only
  rfidTag: string; // UID; set on rfid_assign, else ""
  storeCode: string;
  tenant: string;
  bikeState: BikeState; // resulting state
  performedBy: string;
  credentialType: "Zeno" | "Partner";
  otpVerified: boolean;
  source: "scanner_app" | "portal";
  linkedVin: string; // derived: VIN this row's customer is linked to (or own vin)
  notes: string;
};

export type ScannerFilterState = {
  search: string;
  actionType: string;
  storeCode: string;
  tenant: string;
  credentialType: string;
  bikeState: string;
  source: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: ScannerFilterState = {
  search: "",
  actionType: "All",
  storeCode: "All",
  tenant: "All",
  credentialType: "All",
  bikeState: "All",
  source: "All",
  dateFrom: "",
  dateTo: "",
};

// Seeded event log. Several VINs match existing MOCK_VEHICLES in asset-tracking
// to demonstrate cross-store linkage; two customer-only rows link to bikes later.
const MOCK_ACTIONS: ScannerAction[] = [
  {
    id: "a1", timestamp: "07 May 2026 09:12", actionType: "bring_up",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "James Kariuki", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "5-component scan completed",
  },
  {
    id: "a2", timestamp: "07 May 2026 09:40", actionType: "tenant_assign",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "James Kariuki", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "",
  },
  {
    id: "a3", timestamp: "08 May 2026 14:05", actionType: "dispatch",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "Logistics Team", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "Dispatched to Greenwheels HQ",
  },
  {
    id: "a4", timestamp: "09 May 2026 10:22", actionType: "bike_assign",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "OTP verified",
  },
  {
    id: "a5", timestamp: "09 May 2026 10:35", actionType: "rfid_assign",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "04A2B7C9D1",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "One RFID per VIN",
  },
  {
    id: "a6", timestamp: "09 May 2026 10:48", actionType: "handover",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "04A2B7C9D1",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "Customer signature captured",
  },
  {
    id: "a7", timestamp: "03 Jun 2026 11:15", actionType: "bike_assign",
    vin: "ME92ZPSDB1J001111", customerName: "Ian Waruiro Mukiri", customerPhone: "254-725528919", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/cash", bikeState: "active",
    performedBy: "Nikhil I", credentialType: "Zeno", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDB1J001111", notes: "",
  },
  {
    id: "a8", timestamp: "03 Jun 2026 11:28", actionType: "rfid_assign",
    vin: "ME92ZPSDB1J001111", customerName: "Ian Waruiro Mukiri", customerPhone: "254-725528919", rfidTag: "05C3E1F0A2",
    storeCode: "ke-nbo-zhq", tenant: "retail/cash", bikeState: "active",
    performedBy: "Nikhil I", credentialType: "Zeno", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDB1J001111", notes: "",
  },
  // Customer-only row: onboarded before a bike exists. Links to VIN below once assigned.
  {
    id: "a9", timestamp: "12 Aug 2026 08:50", actionType: "customer_onboard",
    vin: "", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "new",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "M-Pesa coin drop verified",
  },
  {
    id: "a10", timestamp: "14 Aug 2026 09:30", actionType: "bike_assign",
    vin: "ME92ZPSFB1J002180", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "active",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "Linked to pre-onboarded customer",
  },
  {
    id: "a11", timestamp: "14 Aug 2026 09:44", actionType: "rfid_assign",
    vin: "ME92ZPSFB1J002180", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "06D4F2A1B3",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "active",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "",
  },
  // Bike-only bring-up with no customer yet.
  {
    id: "a12", timestamp: "30 Aug 2026 07:20", actionType: "bring_up",
    vin: "ME92ZPSFG1J002688", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSFG1J002688", notes: "Awaiting customer assignment",
  },
  // Deactivation example.
  {
    id: "a13", timestamp: "29 Aug 2026 11:43", actionType: "deactivate",
    vin: "ME92ZPSAG1J001078", customerName: "Rose Achieng", customerPhone: "254-795345678", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "zeno-internal/demo_bikes", bikeState: "used",
    performedBy: "Ramesh Kumar", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSAG1J001078", notes: "Billing + RFID + account deactivated",
  },
];

type SortConfig = { column: keyof ScannerAction; direction: "asc" | "desc" } | null;

export type AddActionInput = Omit<ScannerAction, "id" | "linkedVin" | "source"> & {
  source?: ScannerAction["source"];
};

type ScannerProvisioningStore = {
  actions: ScannerAction[];
  filters: ScannerFilterState;
  sort: SortConfig;
  page: number;
  perPage: number;
  setFilter: <K extends keyof ScannerFilterState>(key: K, value: ScannerFilterState[K]) => void;
  setSort: (column: keyof ScannerAction) => void;
  setPage: (page: number) => void;
  setPerPage: (n: number) => void;
  resetFilters: () => void;
  addAction: (input: AddActionInput) => { ok: boolean; error?: string };
  updateAction: (id: string, patch: Partial<ScannerAction>) => { ok: boolean; error?: string };
  deleteAction: (id: string) => void;
  filteredActions: () => ScannerAction[];
  // Selectors used by the form modal for prefill.
  customerForVin: (vin: string) => { customerName: string; customerPhone: string } | null;
  bikeForPhone: (phone: string) => string | null;
  activeRfidForVin: (vin: string) => string | null;
};

// Convert "01 Sep 2026 13:06" → a sortable/comparable timestamp (ms). Falls back to 0.
function parseTs(ts: string): number {
  const d = new Date(ts);
  const n = d.getTime();
  return Number.isNaN(n) ? 0 : n;
}

export const useScannerProvisioningStore = create<ScannerProvisioningStore>((set, get) => ({
  actions: MOCK_ACTIONS,
  filters: { ...DEFAULT_FILTERS },
  sort: null,
  page: 1,
  perPage: 20,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1 })),
  setSort: (column) =>
    set((s) => ({
      sort:
        s.sort?.column === column
          ? { column, direction: s.sort.direction === "asc" ? "desc" : "asc" }
          : { column, direction: "asc" },
    })),
  setPage: (page) => set({ page }),
  setPerPage: (perPage) => set({ perPage, page: 1 }),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS }, page: 1 }),

  customerForVin: (vin) => {
    if (!vin) return null;
    const rows = get()
      .actions.filter((a) => a.vin === vin && a.customerPhone)
      .sort((a, b) => parseTs(b.timestamp) - parseTs(a.timestamp));
    if (rows.length === 0) return null;
    return { customerName: rows[0].customerName, customerPhone: rows[0].customerPhone };
  },

  bikeForPhone: (phone) => {
    if (!phone) return null;
    const rows = get()
      .actions.filter((a) => a.customerPhone === phone && a.vin)
      .sort((a, b) => parseTs(b.timestamp) - parseTs(a.timestamp));
    return rows.length ? rows[0].vin : null;
  },

  // The RFID currently mapped to a VIN — the latest rfid_assign not undone by a later deactivate.
  activeRfidForVin: (vin) => {
    if (!vin) return null;
    const rows = get()
      .actions.filter((a) => a.vin === vin && (a.actionType === "rfid_assign" || a.actionType === "deactivate"))
      .sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp));
    let tag: string | null = null;
    for (const r of rows) {
      if (r.actionType === "rfid_assign" && r.rfidTag) tag = r.rfidTag;
      if (r.actionType === "deactivate") tag = null;
    }
    return tag;
  },

  addAction: (input) => {
    const state = get();

    // One-RFID-per-VIN: block a second active RFID unless notes flag an override.
    if (input.actionType === "rfid_assign" && input.vin) {
      const existing = state.activeRfidForVin(input.vin);
      const override = /override/i.test(input.notes ?? "");
      if (existing && existing !== input.rfidTag && !override) {
        return {
          ok: false,
          error: `VIN ${input.vin} already has active RFID ${existing}. Deactivate first, or add "override" in notes for an admin reassignment.`,
        };
      }
    }

    const id = `sp-${parseTs(input.timestamp) || state.actions.length}-${state.actions.length + 1}`;
    // Derive linkedVin: own VIN, else the bike this phone is linked to.
    const linkedVin = input.vin || (input.customerPhone ? state.bikeForPhone(input.customerPhone) ?? "" : "");

    const action: ScannerAction = {
      ...input,
      id,
      linkedVin,
      source: input.source ?? "portal",
    };

    set((s) => {
      let actions = [action, ...s.actions];
      // Back-fill linkedVin onto earlier customer-only rows sharing this phone.
      if (input.vin && input.customerPhone) {
        actions = actions.map((a) =>
          a.id !== id && !a.vin && a.customerPhone === input.customerPhone
            ? { ...a, linkedVin: input.vin }
            : a
        );
      }
      return { actions };
    });

    applyWriteThrough(action);
    return { ok: true };
  },

  updateAction: (id, patch) => {
    const state = get();
    const prev = state.actions.find((a) => a.id === id);
    if (!prev) return { ok: false, error: "Entry not found." };
    const next: ScannerAction = { ...prev, ...patch };

    if (next.actionType === "rfid_assign" && next.vin) {
      const override = /override/i.test(next.notes ?? "");
      // Determine an active RFID from other rows (exclude this one).
      const others = state.actions.filter((a) => a.id !== id);
      const existing = computeActiveRfid(others, next.vin);
      if (existing && existing !== next.rfidTag && !override) {
        return {
          ok: false,
          error: `VIN ${next.vin} already has active RFID ${existing}. Deactivate first, or add "override" in notes.`,
        };
      }
    }

    next.linkedVin = next.vin || (next.customerPhone ? state.bikeForPhone(next.customerPhone) ?? "" : "");

    set((s) => ({ actions: s.actions.map((a) => (a.id === id ? next : a)) }));
    applyWriteThrough(next);
    return { ok: true };
  },

  deleteAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),

  filteredActions: () => {
    const { actions, filters, sort } = get();
    let result = actions.slice();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.vin.toLowerCase().includes(q) ||
          a.customerName.toLowerCase().includes(q) ||
          a.customerPhone.toLowerCase().includes(q) ||
          a.rfidTag.toLowerCase().includes(q) ||
          a.performedBy.toLowerCase().includes(q)
      );
    }
    if (filters.actionType !== "All") result = result.filter((a) => a.actionType === filters.actionType);
    if (filters.storeCode !== "All") result = result.filter((a) => a.storeCode === filters.storeCode);
    if (filters.tenant !== "All") {
      result = result.filter((a) => (filters.tenant === "None" ? !a.tenant : a.tenant === filters.tenant));
    }
    if (filters.credentialType !== "All") result = result.filter((a) => a.credentialType === filters.credentialType);
    if (filters.bikeState !== "All") result = result.filter((a) => a.bikeState === filters.bikeState);
    if (filters.source !== "All") result = result.filter((a) => a.source === filters.source);
    if (filters.dateFrom) {
      const from = parseTs(filters.dateFrom);
      result = result.filter((a) => parseTs(a.timestamp) >= from);
    }
    if (filters.dateTo) {
      const to = parseTs(filters.dateTo) + 86_399_999; // end of day
      result = result.filter((a) => parseTs(a.timestamp) <= to);
    }

    if (sort) {
      const { column, direction } = sort;
      result.sort((a, b) => {
        if (column === "timestamp") {
          const cmp = parseTs(a.timestamp) - parseTs(b.timestamp);
          return direction === "asc" ? cmp : -cmp;
        }
        const av = a[column];
        const bv = b[column];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return direction === "asc" ? cmp : -cmp;
      });
    } else {
      // Default: newest first.
      result.sort((a, b) => parseTs(b.timestamp) - parseTs(a.timestamp));
    }

    return result;
  },
}));

// Compute the active RFID for a VIN from an arbitrary action list (used in update validation).
function computeActiveRfid(actions: ScannerAction[], vin: string): string | null {
  const rows = actions
    .filter((a) => a.vin === vin && (a.actionType === "rfid_assign" || a.actionType === "deactivate"))
    .sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp));
  let tag: string | null = null;
  for (const r of rows) {
    if (r.actionType === "rfid_assign" && r.rfidTag) tag = r.rfidTag;
    if (r.actionType === "deactivate") tag = null;
  }
  return tag;
}

// Write-through: reflect a scanner action onto the linked Asset Tracking vehicle by VIN.
function applyWriteThrough(a: ScannerAction) {
  if (!a.vin) return; // customer-only rows have nothing to write through yet
  const at = useAssetTrackingStore.getState();
  switch (a.actionType) {
    case "bring_up":
      at.upsertBike({ vin: a.vin, tenant: a.tenant || undefined, storeCode: a.storeCode || undefined });
      break;
    case "tenant_assign":
      if (a.tenant) at.setTenant(a.vin, a.tenant);
      break;
    case "dispatch":
      if (a.storeCode) at.setStoreCode(a.vin, a.storeCode);
      break;
    case "bike_assign":
      at.assignCustomer(a.vin, a.customerName, a.customerPhone, dateFromTs(a.timestamp));
      break;
    case "rfid_assign":
      if (a.rfidTag) at.setRfid(a.vin, a.rfidTag);
      break;
    case "deactivate":
      at.deactivate(a.vin);
      break;
    // customer_onboard, handover: no vehicle state change.
  }
}

// "09 May 2026 10:22" → "09 May 2026" for dateOfSale.
function dateFromTs(ts: string): string {
  const parts = ts.trim().split(" ");
  return parts.length >= 3 ? `${parts[0]} ${parts[1]} ${parts[2]}` : ts;
}
