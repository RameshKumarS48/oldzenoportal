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

// Per-entry sync state, mirroring the Field Scanner app (Empty / Synced / Not sent).
export type SyncStatus = "empty" | "synced" | "not_sent";

export const SYNC_LABELS: Record<SyncStatus, string> = {
  empty: "Empty",
  synced: "Synced",
  not_sent: "Not Sent",
};

export const SYNC_STATUSES = Object.keys(SYNC_LABELS) as SyncStatus[];

// RFID assignment is tracked as a status (not a free-text tag) in the flow:
// unassigned (blank), pending (awaiting confirmation, retryable), assigned (green).
export type RfidStatus = "unassigned" | "pending" | "assigned";

export const RFID_LABELS: Record<RfidStatus, string> = {
  unassigned: "–",
  pending: "Pending",
  assigned: "Assigned",
};

export const RFID_STATUSES = Object.keys(RFID_LABELS) as RfidStatus[];

export type ScannerAction = {
  id: string;
  timestamp: string; // "01 Sep 2026 13:06"
  actionType: ScannerActionType;
  vin: string; // "" when customer-only
  customerName: string;
  customerPhone: string; // "" when bike-only
  rfidTag: string; // UID; set on rfid_assign, else ""
  rfidStatus: RfidStatus; // unassigned / pending / assigned
  storeCode: string;
  tenant: string;
  bikeState: BikeState; // resulting state
  performedBy: string;
  credentialType: "Zeno" | "Partner";
  otpVerified: boolean;
  source: "scanner_app" | "portal";
  linkedVin: string; // derived: VIN this row's customer is linked to (or own vin)
  notes: string;
  // Field Scanner "tap to scan each field" components (bring-up 5-component scan + VCU dual UID).
  chassisId: string; // Chassis
  vcuImei: string; // VCU · IMEI
  vcuIccid: string; // VCU · ICCID
  evccId: string; // EVCC
  motorId: string; // Motor
  registrationNo: string; // Registration
  drivingLicense: string; // Customer Onboarding · Driving License
  signatureCaptured: boolean; // Signature
  syncStatus: SyncStatus; // Empty / Synced / Not sent
};

export type ScannerFilterState = {
  search: string;
  actionType: string;
  storeCode: string;
  tenant: string;
  credentialType: string;
  bikeState: string;
  source: string;
  syncStatus: string;
  dateFrom: string;
  dateTo: string;
};

// Default the date window to the last 7 days (inclusive of today).
function defaultFilters(): ScannerFilterState {
  return {
    search: "",
    actionType: "All",
    storeCode: "All",
    tenant: "All",
    credentialType: "All",
    bikeState: "All",
    source: "All",
    syncStatus: "All",
    // Unbounded by default. A rolling window would hide the seeded log, which
    // is dated earlier than "today", and land every visitor on an empty table.
    dateFrom: "",
    dateTo: "",
  };
}

// Seeded event log. Several VINs match existing MOCK_VEHICLES in asset-tracking
// to demonstrate cross-store linkage; two customer-only rows link to bikes later.
const RAW_ACTIONS: Omit<ScannerAction, "rfidStatus">[] = [
  {
    id: "a1", timestamp: "07 May 2026 09:12", actionType: "bring_up",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "James Kariuki", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "5-component scan completed",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a2", timestamp: "07 May 2026 09:40", actionType: "tenant_assign",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "James Kariuki", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a3", timestamp: "08 May 2026 14:05", actionType: "dispatch",
    vin: "ME92ZPSBB1J000760", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "Logistics Team", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "Dispatched to Greenwheels HQ",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a4", timestamp: "09 May 2026 10:22", actionType: "bike_assign",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "OTP verified",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "DL-14-2019-0034521", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a5", timestamp: "09 May 2026 10:35", actionType: "rfid_assign",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "04A2B7C9D1",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "One RFID per VIN",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "DL-14-2019-0034521", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a6", timestamp: "09 May 2026 10:48", actionType: "handover",
    vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069", rfidTag: "04A2B7C9D1",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000760", notes: "Customer signature captured",
    chassisId: "ME92ZPSBB1J000760", vcuImei: "356938035643809", vcuIccid: "8991101200003204510",
    evccId: "EVCC-KE-000760", motorId: "MTR-8891-000760", registrationNo: "KDA 760A",
    drivingLicense: "DL-14-2019-0034521", signatureCaptured: true, syncStatus: "synced",
  },
  {
    id: "a7", timestamp: "03 Jun 2026 11:15", actionType: "bike_assign",
    vin: "ME92ZPSDB1J001111", customerName: "Ian Waruiro Mukiri", customerPhone: "254-725528919", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/cash", bikeState: "active",
    performedBy: "Nikhil I", credentialType: "Zeno", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDB1J001111", notes: "",
    chassisId: "ME92ZPSDB1J001111", vcuImei: "356938035671122", vcuIccid: "8991101200003211137",
    evccId: "EVCC-KE-001111", motorId: "MTR-8891-001111", registrationNo: "KDB 111C",
    drivingLicense: "DL-14-2021-0098234", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a8", timestamp: "03 Jun 2026 11:28", actionType: "rfid_assign",
    vin: "ME92ZPSDB1J001111", customerName: "Ian Waruiro Mukiri", customerPhone: "254-725528919", rfidTag: "05C3E1F0A2",
    storeCode: "ke-nbo-zhq", tenant: "retail/cash", bikeState: "active",
    performedBy: "Nikhil I", credentialType: "Zeno", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDB1J001111", notes: "",
    chassisId: "ME92ZPSDB1J001111", vcuImei: "356938035671122", vcuIccid: "8991101200003211137",
    evccId: "EVCC-KE-001111", motorId: "MTR-8891-001111", registrationNo: "KDB 111C",
    drivingLicense: "DL-14-2021-0098234", signatureCaptured: false, syncStatus: "synced",
  },
  // Customer-only row: onboarded before a bike exists. Links to VIN below once assigned.
  {
    id: "a9", timestamp: "12 Aug 2026 08:50", actionType: "customer_onboard",
    vin: "", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "new",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "M-Pesa coin drop verified",
    chassisId: "", vcuImei: "", vcuIccid: "", evccId: "", motorId: "", registrationNo: "",
    drivingLicense: "DL-14-2020-0067890", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a10", timestamp: "14 Aug 2026 09:30", actionType: "bike_assign",
    vin: "ME92ZPSFB1J002180", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "active",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "Linked to pre-onboarded customer",
    chassisId: "ME92ZPSFB1J002180", vcuImei: "356938035688901", vcuIccid: "8991101200003228806",
    evccId: "EVCC-KE-002180", motorId: "MTR-8891-002180", registrationNo: "KDC 218D",
    drivingLicense: "DL-14-2020-0067890", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a11", timestamp: "14 Aug 2026 09:44", actionType: "rfid_assign",
    vin: "ME92ZPSFB1J002180", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157", rfidTag: "06D4F2A1B3",
    storeCode: "ke-nbo-zhq", tenant: "retail/watu", bikeState: "active",
    performedBy: "Watu Agent", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFB1J002180", notes: "",
    chassisId: "ME92ZPSFB1J002180", vcuImei: "356938035688901", vcuIccid: "8991101200003228806",
    evccId: "EVCC-KE-002180", motorId: "MTR-8891-002180", registrationNo: "KDC 218D",
    drivingLicense: "DL-14-2020-0067890", signatureCaptured: false, syncStatus: "not_sent",
  },
  // Bike-only bring-up with no customer yet.
  {
    id: "a12", timestamp: "30 Aug 2026 07:20", actionType: "bring_up",
    vin: "ME92ZPSFG1J002688", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSFG1J002688", notes: "Awaiting customer assignment",
    chassisId: "ME92ZPSFG1J002688", vcuImei: "356938035699012", vcuIccid: "8991101200003239915",
    evccId: "EVCC-KE-002688", motorId: "MTR-8891-002688", registrationNo: "",
    drivingLicense: "", signatureCaptured: false, syncStatus: "not_sent",
  },
  // Deactivation example.
  {
    id: "a13", timestamp: "29 Aug 2026 11:43", actionType: "deactivate",
    vin: "ME92ZPSAG1J001078", customerName: "Rose Achieng", customerPhone: "254-795345678", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "zeno-internal/demo_bikes", bikeState: "used",
    performedBy: "Ramesh Kumar", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSAG1J001078", notes: "Billing + RFID + account deactivated",
    chassisId: "ME92ZPSAG1J001078", vcuImei: "356938035610788", vcuIccid: "8991101200003130788",
    evccId: "EVCC-KE-001078", motorId: "MTR-8891-001078", registrationNo: "KDA 078Z",
    drivingLicense: "DL-14-2018-0011200", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a14", timestamp: "06 Jun 2026 08:05", actionType: "bring_up",
    vin: "ME92ZPSBB1J000817", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "5-component scan completed",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a15", timestamp: "06 Jun 2026 08:41", actionType: "tenant_assign",
    vin: "ME92ZPSBB1J000817", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a16", timestamp: "07 Jun 2026 13:20", actionType: "dispatch",
    vin: "ME92ZPSBB1J000817", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "new",
    performedBy: "Logistics Team", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "Dispatched to ke-nbo-grw-hq",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a17", timestamp: "08 Jun 2026 10:14", actionType: "bike_assign",
    vin: "ME92ZPSBB1J000817", customerName: "Meshack Kibet", customerPhone: "254-703298854", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "OTP verified",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "DL-14-2020-0045118", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a18", timestamp: "08 Jun 2026 10:29", actionType: "rfid_assign",
    vin: "ME92ZPSBB1J000817", customerName: "Meshack Kibet", customerPhone: "254-703298854", rfidTag: "1A7C90B4E2",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "DL-14-2020-0045118", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a19", timestamp: "08 Jun 2026 11:02", actionType: "handover",
    vin: "ME92ZPSBB1J000817", customerName: "Meshack Kibet", customerPhone: "254-703298854", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Grace Wambui", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBB1J000817", notes: "Handover signed by customer",
    chassisId: "ME92ZPSBB1J000817", vcuImei: "867963074737082", vcuIccid: "8991101200074737082",
    evccId: "EVCC-KE-000817", motorId: "MTR-8891-000817", registrationNo: "KMGY148Y",
    drivingLicense: "DL-14-2020-0045118", signatureCaptured: true, syncStatus: "synced",
  },
  {
    id: "a20", timestamp: "07 Jul 2026 08:05", actionType: "bring_up",
    vin: "ME92ZPSBC1J001033", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "5-component scan completed",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a21", timestamp: "07 Jul 2026 08:41", actionType: "tenant_assign",
    vin: "ME92ZPSBC1J001033", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "fleet/mkopa", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a22", timestamp: "08 Jul 2026 13:20", actionType: "dispatch",
    vin: "ME92ZPSBC1J001033", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-mkp", tenant: "fleet/mkopa", bikeState: "new",
    performedBy: "Logistics Team", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "Dispatched to ke-nbo-mkp",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a23", timestamp: "09 Jul 2026 10:14", actionType: "bike_assign",
    vin: "ME92ZPSBC1J001033", customerName: "Grace Wanjiku", customerPhone: "254-712334455", rfidTag: "",
    storeCode: "ke-nbo-mkp", tenant: "fleet/mkopa", bikeState: "active",
    performedBy: "Susan Wafula", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "OTP verified",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "DL-14-2019-0038907", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a24", timestamp: "09 Jul 2026 10:29", actionType: "rfid_assign",
    vin: "ME92ZPSBC1J001033", customerName: "Grace Wanjiku", customerPhone: "254-712334455", rfidTag: "0C51DE8A73",
    storeCode: "ke-nbo-mkp", tenant: "fleet/mkopa", bikeState: "active",
    performedBy: "Susan Wafula", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "DL-14-2019-0038907", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a25", timestamp: "09 Jul 2026 11:02", actionType: "handover",
    vin: "ME92ZPSBC1J001033", customerName: "Grace Wanjiku", customerPhone: "254-712334455", rfidTag: "",
    storeCode: "ke-nbo-mkp", tenant: "fleet/mkopa", bikeState: "active",
    performedBy: "Susan Wafula", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSBC1J001033", notes: "Handover signed by customer",
    chassisId: "ME92ZPSBC1J001033", vcuImei: "864123056782341", vcuIccid: "8991101200056782341",
    evccId: "EVCC-KE-001033", motorId: "MTR-8891-001033", registrationNo: "KMGP341K",
    drivingLicense: "DL-14-2019-0038907", signatureCaptured: true, syncStatus: "synced",
  },
  {
    id: "a26", timestamp: "08 Aug 2026 08:05", actionType: "bring_up",
    vin: "ME92ZPSFD1J002310", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "5-component scan completed",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a27", timestamp: "08 Aug 2026 08:41", actionType: "tenant_assign",
    vin: "ME92ZPSFD1J002310", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/safari_customer", bikeState: "new",
    performedBy: "George Joseph", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a28", timestamp: "09 Aug 2026 13:20", actionType: "dispatch",
    vin: "ME92ZPSFD1J002310", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-mbsa-wtu", tenant: "retail/safari_customer", bikeState: "new",
    performedBy: "Logistics Team", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "Dispatched to ke-nbo-mbsa-wtu",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a29", timestamp: "10 Aug 2026 10:14", actionType: "bike_assign",
    vin: "ME92ZPSFD1J002310", customerName: "John Odhiambo", customerPhone: "254-741234567", rfidTag: "",
    storeCode: "ke-nbo-mbsa-wtu", tenant: "retail/safari_customer", bikeState: "active",
    performedBy: "Tom Mburu", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "OTP verified",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "DL-14-2021-0052240", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a30", timestamp: "10 Aug 2026 10:29", actionType: "rfid_assign",
    vin: "ME92ZPSFD1J002310", customerName: "John Odhiambo", customerPhone: "254-741234567", rfidTag: "7B2F44A0C9",
    storeCode: "ke-nbo-mbsa-wtu", tenant: "retail/safari_customer", bikeState: "active",
    performedBy: "Tom Mburu", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "DL-14-2021-0052240", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a31", timestamp: "10 Aug 2026 11:02", actionType: "handover",
    vin: "ME92ZPSFD1J002310", customerName: "John Odhiambo", customerPhone: "254-741234567", rfidTag: "",
    storeCode: "ke-nbo-mbsa-wtu", tenant: "retail/safari_customer", bikeState: "active",
    performedBy: "Tom Mburu", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSFD1J002310", notes: "Handover signed by customer",
    chassisId: "ME92ZPSFD1J002310", vcuImei: "867345289012567", vcuIccid: "8991101200089012567",
    evccId: "EVCC-KE-002310", motorId: "MTR-8891-002310", registrationNo: "KMHB019P",
    drivingLicense: "DL-14-2021-0052240", signatureCaptured: true, syncStatus: "synced",
  },
  {
    id: "a32", timestamp: "19 Aug 2026 09:15", actionType: "bring_up",
    vin: "ME92ZPSCA1J001677", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "Mercy Kagwe", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSCA1J001677", notes: "Awaiting tenant assignment",
    chassisId: "ME92ZPSCA1J001677", vcuImei: "864567890123456", vcuIccid: "8991101200090123456",
    evccId: "EVCC-KE-001677", motorId: "MTR-8891-001677", registrationNo: "KMGT508W",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a33", timestamp: "19 Aug 2026 09:52", actionType: "tenant_assign",
    vin: "ME92ZPSCA1J001677", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/tireproz", bikeState: "new",
    performedBy: "Mercy Kagwe", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSCA1J001677", notes: "",
    chassisId: "ME92ZPSCA1J001677", vcuImei: "864567890123456", vcuIccid: "8991101200090123456",
    evccId: "EVCC-KE-001677", motorId: "MTR-8891-001677", registrationNo: "KMGT508W",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a34", timestamp: "02 Sep 2026 09:15", actionType: "bring_up",
    vin: "ME92ZPSAL1J000991", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "", bikeState: "new",
    performedBy: "Mercy Kagwe", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSAL1J000991", notes: "Awaiting tenant assignment",
    chassisId: "ME92ZPSAL1J000991", vcuImei: "867456789012345", vcuIccid: "8991101200089012345",
    evccId: "EVCC-KE-000991", motorId: "MTR-8891-000991", registrationNo: "KMGR810N",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a35", timestamp: "02 Sep 2026 09:52", actionType: "tenant_assign",
    vin: "ME92ZPSAL1J000991", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-zhq", tenant: "retail/4g", bikeState: "new",
    performedBy: "Mercy Kagwe", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSAL1J000991", notes: "",
    chassisId: "ME92ZPSAL1J000991", vcuImei: "867456789012345", vcuIccid: "8991101200089012345",
    evccId: "EVCC-KE-000991", motorId: "MTR-8891-000991", registrationNo: "KMGR810N",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a36", timestamp: "11 Sep 2026 15:40", actionType: "rfid_assign",
    vin: "ME92ZPSAC1J000743", customerName: "Michael Kariuki", customerPhone: "254-792345678", rfidTag: "D93E015CA7",
    storeCode: "ke-nbo-zhq", tenant: "retail/fortune", bikeState: "active",
    performedBy: "Daniel Chege", credentialType: "Zeno", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSAC1J000743", notes: "Tag written, awaiting sync confirmation",
    chassisId: "ME92ZPSAC1J000743", vcuImei: "861901234567890", vcuIccid: "8991101200034567890",
    evccId: "EVCC-KE-000743", motorId: "MTR-8891-000743", registrationNo: "KMGX944H",
    drivingLicense: "DL-14-2020-0049117", signatureCaptured: false, syncStatus: "not_sent",
  },
  {
    id: "a37", timestamp: "05 Sep 2026 11:20", actionType: "customer_onboard",
    vin: "", customerName: "Beatrice Wanjala", customerPhone: "254-707889121", rfidTag: "",
    storeCode: "ke-nyk-zhq", tenant: "", bikeState: "new",
    performedBy: "Esther Nyaga", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDA2J000073", notes: "Registered by phone ahead of stock arriving",
    chassisId: "", vcuImei: "", vcuIccid: "",
    evccId: "", motorId: "", registrationNo: "",
    drivingLicense: "DL-14-2022-0061044", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a38", timestamp: "07 Sep 2026 09:48", actionType: "bike_assign",
    vin: "ME92ZPSDA2J000073", customerName: "Beatrice Wanjala", customerPhone: "254-707889121", rfidTag: "",
    storeCode: "ke-nyk-zhq", tenant: "retail/zeno_captive", bikeState: "active",
    performedBy: "Esther Nyaga", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "ME92ZPSDA2J000073", notes: "Linked to the onboarding recorded on 05 Sep",
    chassisId: "ME92ZPSDA2J000073", vcuImei: "867963074744104", vcuIccid: "8991101200074744104",
    evccId: "EVCC-KE-000073", motorId: "MTR-8891-000073", registrationNo: "KMGR271V",
    drivingLicense: "DL-14-2022-0061044", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a39", timestamp: "12 Sep 2026 16:05", actionType: "customer_onboard",
    vin: "", customerName: "Charles Rotich", customerPhone: "254-733901255", rfidTag: "",
    storeCode: "ke-nrm-zgs", tenant: "", bikeState: "new",
    performedBy: "Kevin Otieno", credentialType: "Partner", otpVerified: true,
    source: "scanner_app", linkedVin: "", notes: "No stock at Naro Moru; awaiting allocation",
    chassisId: "", vcuImei: "", vcuIccid: "",
    evccId: "", motorId: "", registrationNo: "",
    drivingLicense: "", signatureCaptured: false, syncStatus: "not_sent",
  },
  {
    id: "a40", timestamp: "15 Sep 2026 10:12", actionType: "dispatch",
    vin: "ME92ZPSBD1J001502", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-nbo-grw-hq", tenant: "fleet/greenwheels", bikeState: "active",
    performedBy: "Ramesh Kumar", credentialType: "Zeno", otpVerified: false,
    source: "portal", linkedVin: "ME92ZPSBD1J001502", notes: "Store code corrected in the portal after a mis-scan",
    chassisId: "ME92ZPSBD1J001502", vcuImei: "867963074741334", vcuIccid: "8991101200074741334",
    evccId: "EVCC-KE-001502", motorId: "MTR-8891-001502", registrationNo: "KMGY422T",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a41", timestamp: "16 Sep 2026 14:36", actionType: "tenant_assign",
    vin: "ME92ZPSCC1J001245", customerName: "", customerPhone: "", rfidTag: "",
    storeCode: "ke-jgo-mkp", tenant: "retail/tugende", bikeState: "active",
    performedBy: "Priya Raghavan", credentialType: "Zeno", otpVerified: false,
    source: "portal", linkedVin: "ME92ZPSCC1J001245", notes: "Tenant corrected from retail/cash",
    chassisId: "ME92ZPSCC1J001245", vcuImei: "865234167890452", vcuIccid: "8991101200067890452",
    evccId: "EVCC-KE-001245", motorId: "MTR-8891-001245", registrationNo: "KMGT217R",
    drivingLicense: "", signatureCaptured: false, syncStatus: "synced",
  },
  {
    id: "a42", timestamp: "20 Sep 2026 08:30", actionType: "deactivate",
    vin: "ME92ZPSAA2J000089", customerName: "David Mwangi", customerPhone: "254-758901234", rfidTag: "",
    storeCode: "ke-nrm-zgs", tenant: "retail/4g", bikeState: "used",
    performedBy: "Ramesh Kumar", credentialType: "Zeno", otpVerified: false,
    source: "scanner_app", linkedVin: "ME92ZPSAA2J000089", notes: "Written off after accident; RFID and billing cleared",
    chassisId: "ME92ZPSAA2J000089", vcuImei: "863789012456789", vcuIccid: "8991101200012456789",
    evccId: "EVCC-KE-000089", motorId: "MTR-8891-000089", registrationNo: "KMGV088Q",
    drivingLicense: "DL-14-2017-0009822", signatureCaptured: false, syncStatus: "synced",
  },
];

// Derive the seeded RFID status: a tag that has synced is assigned; one that
// hasn't synced yet is still pending (and therefore retryable); no tag = unassigned.
function seedRfidStatus(a: Omit<ScannerAction, "rfidStatus">): RfidStatus {
  if (!a.rfidTag) return "unassigned";
  return a.syncStatus === "not_sent" ? "pending" : "assigned";
}

const MOCK_ACTIONS: ScannerAction[] = RAW_ACTIONS.map((a) => ({ ...a, rfidStatus: seedRfidStatus(a) }));

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
  retryRfid: (id: string) => void; // move a pending RFID assignment to assigned
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
  filters: defaultFilters(),
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
  resetFilters: () => set({ filters: defaultFilters(), page: 1 }),

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

  // The RFID currently mapped to a VIN, the latest rfid_assign not undone by a later deactivate.
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

    // Bike assignment requires a customer name, phone, and OTP verification (per the
    // Onboarding Partner App spec: VIN + phone + OTP-confirmed handover).
    if (input.actionType === "bike_assign") {
      const missing = bikeAssignError(input);
      if (missing) return { ok: false, error: missing };
    }

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

    if (next.actionType === "bike_assign") {
      const missing = bikeAssignError(next);
      if (missing) return { ok: false, error: missing };
    }

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

  retryRfid: (id) => {
    const row = get().actions.find((a) => a.id === id);
    if (!row || row.rfidStatus !== "pending") return;
    set((s) => ({
      actions: s.actions.map((a) =>
        a.id === id ? { ...a, rfidStatus: "assigned", syncStatus: "synced" } : a
      ),
    }));
    // Reflect the now-confirmed RFID onto the linked vehicle.
    if (row.vin && row.rfidTag) useAssetTrackingStore.getState().setRfid(row.vin, row.rfidTag);
  },

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
          a.performedBy.toLowerCase().includes(q) ||
          a.chassisId.toLowerCase().includes(q) ||
          a.vcuImei.toLowerCase().includes(q) ||
          a.vcuIccid.toLowerCase().includes(q) ||
          a.evccId.toLowerCase().includes(q) ||
          a.motorId.toLowerCase().includes(q) ||
          a.registrationNo.toLowerCase().includes(q) ||
          a.drivingLicense.toLowerCase().includes(q)
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
    if (filters.syncStatus !== "All") result = result.filter((a) => a.syncStatus === filters.syncStatus);
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

// Bike assignment must carry a customer name, phone, and verified OTP. Returns an
// error message when any is missing, or null when the assignment is valid.
function bikeAssignError(a: { customerName: string; customerPhone: string; otpVerified: boolean }): string | null {
  if (!a.customerName.trim()) return "Customer name is required for bike assignment.";
  if (!a.customerPhone.trim()) return "Customer phone is required for bike assignment.";
  if (!a.otpVerified) return "OTP verification is required for bike assignment.";
  return null;
}

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
