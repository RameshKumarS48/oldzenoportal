import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Transactions
//
// Two related datasets power this tab:
//   1. `ledger`    — every credit/debit posted against a customer's wallet
//                    balance (recharges, swap/charge debits, bonuses, refunds).
//   2. `recharges` — raw M-Pesa STK-push wallet top-up requests (mirrors the
//                    RechargeWallet daraja callback payload). These can be
//                    re-initiated from the portal.
//
// All data is local mock state — read-only against the backend for now.
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerDirection = "credit" | "debit";

/**
 * Where a wallet movement came from.
 *  credits: recharge, promo_points, referral_bonus, referree_bonus, exit_refund
 *  debits:  swap, fast_charge, home_charge
 */
export type LedgerCategory =
  | "recharge"
  | "promo_points"
  | "referral_bonus"
  | "referree_bonus"
  | "exit_refund"
  | "swap"
  | "fast_charge"
  | "home_charge";

export type LedgerStatus = "completed" | "pending" | "failed" | "reversed";

export interface WalletLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  direction: LedgerDirection;
  category: LedgerCategory;
  amountKES: number;
  /** Wallet balance immediately after this entry posted. */
  balanceAfterKES: number;
  status: LedgerStatus;
  occurredAt: string;
  /** M-Pesa receipt, swap txn id, or bonus reference. */
  reference?: string;
  /** Links a `recharge` ledger entry to its RechargeRequest.id. */
  rechargeId?: string;
  notes?: string;
}

/**
 * Raw M-Pesa STK-push wallet recharge request (RechargeWallet).
 * Field names mirror the daraja callback payload columns.
 */
export interface RechargeRequest {
  id: string; // MPesa_ID / CheckoutRequestID
  checkoutRequestId: string;
  merchantRequestId: string;
  timestamp: string; // when the callback was recorded
  customerId: string;
  customerName: string;
  phone: string;
  userId: string;
  userKey: string;
  amountKES: number;
  orderId: string;
  paymentType: "RechargeWallet";
  resultCode: number;
  resultDescription: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string; // daraja YYYYMMDDHHmmss
  balance?: number;
  referralUser?: string;
  transactionKey: string;
  statusCount: number;
  initialResponseCode: string;
  initialResponseDescription: string;
  customerMessage: string;
}

// ── Derivations ──────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  LedgerCategory,
  { label: string; badge: string; direction: LedgerDirection }
> = {
  recharge:       { label: "Wallet Recharge",   badge: "bg-emerald-50 text-emerald-700", direction: "credit" },
  promo_points:   { label: "Promo Points",      badge: "bg-violet-50 text-violet-700",   direction: "credit" },
  referral_bonus: { label: "Referral Bonus",    badge: "bg-sky-50 text-sky-700",         direction: "credit" },
  referree_bonus: { label: "Referree Bonus",    badge: "bg-cyan-50 text-cyan-700",       direction: "credit" },
  exit_refund:    { label: "Exit Refund",       badge: "bg-amber-50 text-amber-700",     direction: "credit" },
  swap:           { label: "Battery Swap",      badge: "bg-slate-100 text-slate-600",    direction: "debit" },
  fast_charge:    { label: "Fast Charge",       badge: "bg-slate-100 text-slate-600",    direction: "debit" },
  home_charge:    { label: "Home Charge",       badge: "bg-slate-100 text-slate-600",    direction: "debit" },
};

export const LEDGER_STATUS_META: Record<LedgerStatus, { label: string; badge: string }> = {
  completed: { label: "Completed", badge: "bg-emerald-50 text-emerald-700" },
  pending:   { label: "Pending",   badge: "bg-amber-50 text-amber-700" },
  failed:    { label: "Failed",    badge: "bg-red-50 text-red-700" },
  reversed:  { label: "Reversed",  badge: "bg-slate-100 text-slate-500" },
};

export type RechargeStatus = "success" | "pending" | "failed";

/** M-Pesa ResultCode 0 = success; a pending statusCount with no result = pending. */
export function rechargeStatus(r: RechargeRequest): RechargeStatus {
  if (r.resultCode === 0 && r.mpesaReceiptNumber) return "success";
  if (r.resultCode === 0 && !r.mpesaReceiptNumber) return "pending";
  return "failed";
}

export const RECHARGE_STATUS_META: Record<RechargeStatus, { label: string; badge: string }> = {
  success: { label: "Success", badge: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending", badge: "bg-amber-50 text-amber-700" },
  failed:  { label: "Failed",  badge: "bg-red-50 text-red-700" },
};

/** Signed amount for a ledger entry (debits are negative). */
export function signedAmount(e: WalletLedgerEntry): number {
  return e.direction === "credit" ? e.amountKES : -e.amountKES;
}

// ── Bike identifiers ─────────────────────────────────────────────────────────
// VIN mirrors the customer's registered vehicle; IMEI is the telematics unit
// fitted to that bike. Keyed by customerId so every wallet row can resolve its
// bike without duplicating the field on every record.

export interface VehicleRef {
  vin: string;
  imei: string;
}

const VEHICLE_BY_CUSTOMER: Record<string, VehicleRef> = {
  "CX-1001": { vin: "ME92ZPSFB1J001988", imei: "356938035001988" },
  "CX-1002": { vin: "ME92ZPSFB1J001905", imei: "356938035001905" },
  "CX-1003": { vin: "ME92ZPSFB1J001934", imei: "356938035001934" },
  "CX-1004": { vin: "ME92ZPSEB1J001616", imei: "356938035001616" },
  "CX-1005": { vin: "ME92ZPSFB1J001942", imei: "356938035001942" },
  "CX-1006": { vin: "ME92ZPSFB1J001938", imei: "356938035001938" },
  "CX-1007": { vin: "ME92ZPSEB1J001423", imei: "356938035001423" },
  "CX-1008": { vin: "ME92ZPSEB1J001547", imei: "356938035001547" },
  "CX-1009": { vin: "ME92ZPSEB1J001526", imei: "356938035001526" },
  "CX-1010": { vin: "ME92ZPSFB1J001998", imei: "356938035001998" },
  "CX-1011": { vin: "ME92ZPSFB1J002003", imei: "356938035002003" },
  "CX-1012": { vin: "ME92ZPSEB1J002010", imei: "356938035002010" },
  "CX-1013": { vin: "ME92ZPSFB1J002021", imei: "356938035002021" },
  "CX-1014": { vin: "ME92ZPSFB1J002028", imei: "356938035002028" },
  "CX-1015": { vin: "ME92ZPSEB1J002033", imei: "356938035002033" },
  "CX-1016": { vin: "ME92ZPSFB1J002039", imei: "356938035002039" },
  "CX-1017": { vin: "ME92ZPSEB1J002045", imei: "356938035002045" },
  "CX-1018": { vin: "ME92ZPSFB1J002051", imei: "356938035002051" },
  "CX-1019": { vin: "ME92ZPSEB1J002058", imei: "356938035002058" },
  "CX-1020": { vin: "ME92ZPSFB1J002063", imei: "356938035002063" },
  "CX-1021": { vin: "ME92ZPSEB1J002069", imei: "356938035002069" },
  "CX-1022": { vin: "ME92ZPSFB1J002074", imei: "356938035002074" },
  "CX-1023": { vin: "ME92ZPSFB1J002080", imei: "356938035002080" },
  "CX-1024": { vin: "ME92ZPSEB1J002086", imei: "356938035002086" },
  "CX-1025": { vin: "ME92ZPSFB1J002091", imei: "356938035002091" },
  "CX-1026": { vin: "ME92ZPSEB1J001489", imei: "356938035001489" },
  "CX-1028": { vin: "ME92ZPSEB1J001502", imei: "356938035001502" },
  "CX-1029": { vin: "ME92ZPSEB1J001510", imei: "356938035001510" },
  "CX-1030": { vin: "ME92ZPSFB1J002101", imei: "356938035002101" },
  "CX-1031": { vin: "ME92ZPSEB1J002107", imei: "356938035002107" },
};

/** Resolve the bike (VIN + IMEI) registered to a customer, if known. */
export function vehicleFor(customerId: string): VehicleRef | undefined {
  return VEHICLE_BY_CUSTOMER[customerId];
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RECHARGES: RechargeRequest[] = [
  { id: "ws_CO_22052026230503815701600937", checkoutRequestId: "ws_CO_22052026230503815701600937", merchantRequestId: "04f7-4931-a820-fd70ae234146202140", timestamp: "2026-08-29T08:20:57Z", customerId: "CX-1001", customerName: "Nickson Mwiti",   phone: "254-716195164", userId: "7292586569", userKey: "254-758991089", amountKES: 249, orderId: "7292586569-8276", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEMM855R26", transactionDate: "20260822230517", balance: 249, transactionKey: "7292586569-254-758991089-260522200501-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_11022026123032255723906029", checkoutRequestId: "ws_CO_11022026123032255723906029", merchantRequestId: "f368-4fec-976c-10b2a3c6dc971453493", timestamp: "2026-08-28T14:10:12Z", customerId: "CX-1002", customerName: "Fredrick Ochieng", phone: "254-722135002", userId: "a77c8a2c7c", userKey: "254-723906029", amountKES: 65,  orderId: "A77C8A2C7C-A769", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UBB8X6CZAI", transactionDate: "20260211123042", balance: 65,  transactionKey: "a77c8a2c7c-254-723906029-260211093033-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_07052026112340360796380984", checkoutRequestId: "ws_CO_07052026112340360796380984", merchantRequestId: "7b5f-46c2-a7a3-10b2d17a86fb5568666", timestamp: "2026-08-28T09:44:03Z", customerId: "CX-1003", customerName: "Erick Nganda",     phone: "254-792913491", userId: "e42741e1f6", userKey: "254-796380984", amountKES: 213, orderId: "E42741E1F6-D54E", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UE79W3KBX0", transactionDate: "20260507112350", balance: 213, transactionKey: "e42741e1f6-254-796380984-260507082338-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_12032026164624750140445300", checkoutRequestId: "ws_CO_12032026164624750140445300", merchantRequestId: "c66d-4d67-8b9c-39cf0935bc0840776", timestamp: "2026-08-27T16:46:24Z", customerId: "CX-1004", customerName: "Augustine Mbevi",  phone: "254-795645403", userId: "64aad9fa0d", userKey: "254-797232052", amountKES: 110, orderId: "64AAD9FA0D-21C4", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UCCN9912UI", transactionDate: "20260312164633", balance: 110, transactionKey: "64aad9fa0d-254-797232052-260312134625-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_18052026105113061112786621", checkoutRequestId: "ws_CO_18052026105113061112786621", merchantRequestId: "4133-461e-9ec3-65102bed8de5545309", timestamp: "2026-08-27T10:51:13Z", customerId: "CX-1005", customerName: "Zechariah Anita",  phone: "254-118831352", userId: "fe10116ae1", userKey: "254-112786621", amountKES: 300, orderId: "FE10116AE1-9797", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEI7Z4LDEL", transactionDate: "20260518105122", balance: 300, transactionKey: "fe10116ae1-254-112786621-260518075112-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_20052026165604746725868605", checkoutRequestId: "ws_CO_20052026165604746725868605", merchantRequestId: "e893-4286-b8aa-0818eb412ac2954388", timestamp: "2026-08-26T16:56:04Z", customerId: "CX-1006", customerName: "Moses Mwangi",     phone: "254-748679190", userId: "1cb2116986", userKey: "254-768913857", amountKES: 214, orderId: "1CB2116986-B1A9", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEKOP4QTBE", transactionDate: "20260520165615", balance: 214, transactionKey: "1cb2116986-254-768913857-260520135603-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  // Failed — customer cancelled the STK prompt
  { id: "ws_CO_25082026091502334722135002", checkoutRequestId: "ws_CO_25082026091502334722135002", merchantRequestId: "aa21-4c8d-91be-77201fe4bd3390021", timestamp: "2026-08-25T09:15:02Z", customerId: "CX-1013", customerName: "Grace Akinyi",     phone: "254-701234567", userId: "2934567891", userKey: "254-701234567", amountKES: 300, orderId: "2934567891-C21D", paymentType: "RechargeWallet", resultCode: 1032, resultDescription: "Request cancelled by user.", transactionKey: "2934567891-254-701234567-260825061450-RechargeWallet", statusCount: 2, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  // Failed — insufficient balance on payer
  { id: "ws_CO_24082026174233910722345678", checkoutRequestId: "ws_CO_24082026174233910722345678", merchantRequestId: "bb92-4a1f-8c7d-11209aeef2c1445120", timestamp: "2026-08-24T17:42:33Z", customerId: "CX-1014", customerName: "Brian Mutua",      phone: "254-722345678", userId: "3267890123", userKey: "254-722345678", amountKES: 250, orderId: "3267890123-9F04", paymentType: "RechargeWallet", resultCode: 1, resultDescription: "The balance is insufficient for the transaction.", transactionKey: "3267890123-254-722345678-260824143921-RechargeWallet", statusCount: 3, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  // Pending — accepted but no callback yet
  { id: "ws_CO_31082026081145002711901234", checkoutRequestId: "ws_CO_31082026081145002711901234", merchantRequestId: "cc41-4b2e-9d3a-55401bcda0f7778230", timestamp: "2026-08-31T08:11:45Z", customerId: "CX-1018", customerName: "Peter Nderitu",    phone: "254-711901234", userId: "3001234567", userKey: "254-711901234", amountKES: 200, orderId: "3001234567-7B12", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "Awaiting M-Pesa confirmation.", transactionKey: "3001234567-254-711901234-260831051130-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_29082026143012884743678901", checkoutRequestId: "ws_CO_29082026143012884743678901", merchantRequestId: "dd18-4f7c-8a2b-66301aefc0d2889341", timestamp: "2026-08-23T14:30:12Z", customerId: "CX-1015", customerName: "Faith Chebet",     phone: "254-743678901", userId: "3378901234", userKey: "254-743678901", amountKES: 500, orderId: "3378901234-4E88", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEQ4M2PLT8", transactionDate: "20260823143025", balance: 500, transactionKey: "3378901234-254-743678901-260823113000-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_22082026101533771798793747", checkoutRequestId: "ws_CO_22082026101533771798793747", merchantRequestId: "ee71-4d9a-8b1c-77401defc0e3990452", timestamp: "2026-08-22T10:15:33Z", customerId: "CX-1007", customerName: "Vincent King'oo",  phone: "254-798793747", userId: "3401928374", userKey: "254-798793747", amountKES: 180, orderId: "3401928374-1A22", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEV2N7QRS4", transactionDate: "20260822101545", balance: 180, transactionKey: "3401928374-254-798793747-260822071520-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_21082026193044556714542787", checkoutRequestId: "ws_CO_21082026193044556714542787", merchantRequestId: "ff62-4e8b-9c2d-88501eafc0f4001563", timestamp: "2026-08-21T19:30:44Z", customerId: "CX-1008", customerName: "James Ng'ang'a",   phone: "254-714542787", userId: "2763491823", userKey: "254-714542787", amountKES: 120, orderId: "2763491823-8C33", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEW9P4TUV6", transactionDate: "20260821193056", balance: 120, transactionKey: "2763491823-254-714542787-260821163030-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_21082026074512889759566854", checkoutRequestId: "ws_CO_21082026074512889759566854", merchantRequestId: "aa53-4f7c-8d3e-99601fbfc105112674", timestamp: "2026-08-21T07:45:12Z", customerId: "CX-1009", customerName: "Muvunyi Jean",     phone: "254-759566854", userId: "3601284712", userKey: "254-759566854", amountKES: 300, orderId: "3601284712-4D44", paymentType: "RechargeWallet", resultCode: 1037, resultDescription: "DS timeout. User cannot be reached.", transactionKey: "3601284712-254-759566854-260821044500-RechargeWallet", statusCount: 2, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_20082026160223447712345678", checkoutRequestId: "ws_CO_20082026160223447712345678", merchantRequestId: "bb44-4a8d-9e4f-00701acfc216223785", timestamp: "2026-08-20T16:02:23Z", customerId: "CX-1010", customerName: "Patrick Kamau",    phone: "254-712345678", userId: "3012345678", userKey: "254-712345678", amountKES: 250, orderId: "3012345678-5E55", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEX3Q8WXY7", transactionDate: "20260820160235", balance: 250, transactionKey: "3012345678-254-712345678-260820130210-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_20082026112901663733456789", checkoutRequestId: "ws_CO_20082026112901663733456789", merchantRequestId: "cc35-4b9e-8f5a-11801bdfc327334896", timestamp: "2026-08-20T11:29:01Z", customerId: "CX-1011", customerName: "Diana Wanjiku",    phone: "254-733456789", userId: "2893456712", userKey: "254-733456789", amountKES: 400, orderId: "2893456712-6F66", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEY4R9ZAB8", transactionDate: "20260820112913", balance: 400, transactionKey: "2893456712-254-733456789-260820082850-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_19082026085534221754567890", checkoutRequestId: "ws_CO_19082026085534221754567890", merchantRequestId: "dd26-4c0f-9a6b-22901cefc438445907", timestamp: "2026-08-19T08:55:34Z", customerId: "CX-1012", customerName: "Samuel Odhiambo",  phone: "254-754567890", userId: "3124567812", userKey: "254-754567890", amountKES: 150, orderId: "3124567812-7A77", paymentType: "RechargeWallet", resultCode: 1, resultDescription: "The balance is insufficient for the transaction.", transactionKey: "3124567812-254-754567890-260819055510-RechargeWallet", statusCount: 4, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_18082026141207998764789012", checkoutRequestId: "ws_CO_18082026141207998764789012", merchantRequestId: "ee17-4d1a-8b7c-33001dffc549556018", timestamp: "2026-08-18T14:12:07Z", customerId: "CX-1016", customerName: "Joseph Kariuki",   phone: "254-764789012", userId: "2789012312", userKey: "254-764789012", amountKES: 350, orderId: "2789012312-8B88", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UEZ5S0BCD9", transactionDate: "20260818141219", balance: 350, transactionKey: "2789012312-254-764789012-260818111150-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_17082026175048112785890123", checkoutRequestId: "ws_CO_17082026175048112785890123", merchantRequestId: "ff08-4e2b-9c8d-44101eafc650667129", timestamp: "2026-08-17T17:50:48Z", customerId: "CX-1017", customerName: "Anne Njeri",       phone: "254-785890123", userId: "3590123412", userKey: "254-785890123", amountKES: 275, orderId: "3590123412-9C99", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFA6T1CDE0", transactionDate: "20260817175100", balance: 275, transactionKey: "3590123412-254-785890123-260817145030-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_16082026093315447732012345", checkoutRequestId: "ws_CO_16082026093315447732012345", merchantRequestId: "aa99-4f3c-8d9e-55201fbfc761778230", timestamp: "2026-08-16T09:33:15Z", customerId: "CX-1019", customerName: "Mary Wambui",      phone: "254-732012345", userId: "2812345612", userKey: "254-732012345", amountKES: 190, orderId: "2812345612-0D00", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFB7U2DEF1", transactionDate: "20260816093327", balance: 190, transactionKey: "2812345612-254-732012345-260816063300-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_15082026201142663753123456", checkoutRequestId: "ws_CO_15082026201142663753123456", merchantRequestId: "bb80-4a4d-9e0f-66301acfc872889341", timestamp: "2026-08-15T20:11:42Z", customerId: "CX-1020", customerName: "John Njoroge",     phone: "254-753123456", userId: "3123456712", userKey: "254-753123456", amountKES: 220, orderId: "3123456712-1E11", paymentType: "RechargeWallet", resultCode: 1032, resultDescription: "Request cancelled by user.", transactionKey: "3123456712-254-753123456-260815171120-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_14082026122658889774234567", checkoutRequestId: "ws_CO_14082026122658889774234567", merchantRequestId: "cc71-4b5e-8f1a-77401bdfc983990452", timestamp: "2026-08-14T12:26:58Z", customerId: "CX-1021", customerName: "Rose Wanjiru",     phone: "254-774234567", userId: "3434567812", userKey: "254-774234567", amountKES: 330, orderId: "3434567812-2F22", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFC8V3EFG2", transactionDate: "20260814122710", balance: 330, transactionKey: "3434567812-254-774234567-260814092640-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_13082026164421112795345678", checkoutRequestId: "ws_CO_13082026164421112795345678", merchantRequestId: "dd62-4c6f-9a2b-88501cefc094001563", timestamp: "2026-08-13T16:44:21Z", customerId: "CX-1022", customerName: "David Maina",      phone: "254-795345678", userId: "2945678912", userKey: "254-795345678", amountKES: 260, orderId: "2945678912-3A33", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFD9W4FGH3", transactionDate: "20260813164433", balance: 260, transactionKey: "2945678912-254-795345678-260813134400-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_12082026101803447716456789", checkoutRequestId: "ws_CO_12082026101803447716456789", merchantRequestId: "ee53-4d7a-8b3c-99601dffc105112674", timestamp: "2026-08-12T10:18:03Z", customerId: "CX-1023", customerName: "Lucy Waithera",    phone: "254-716456789", userId: "3256789012", userKey: "254-716456789", amountKES: 400, orderId: "3256789012-4B44", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFE0X5GHI4", transactionDate: "20260812101815", balance: 400, transactionKey: "3256789012-254-716456789-260812071740-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_11082026133935663737567890", checkoutRequestId: "ws_CO_11082026133935663737567890", merchantRequestId: "ff44-4e8b-9c4d-00701eafc216223785", timestamp: "2026-08-11T13:39:35Z", customerId: "CX-1024", customerName: "Michael Kimani",   phone: "254-737567890", userId: "2767890112", userKey: "254-737567890", amountKES: 175, orderId: "2767890112-5C55", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFF1Y6HIJ5", transactionDate: "20260811133947", balance: 175, transactionKey: "2767890112-254-737567890-260811103910-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_10082026081547889758678901", checkoutRequestId: "ws_CO_10082026081547889758678901", merchantRequestId: "aa35-4f9c-8d5e-11801fbfc327334896", timestamp: "2026-08-10T08:15:47Z", customerId: "CX-1025", customerName: "Agnes Nyambura",   phone: "254-758678901", userId: "3378901212", userKey: "254-758678901", amountKES: 210, orderId: "3378901212-6D66", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFG2Z7IJK6", transactionDate: "20260810081559", balance: 210, transactionKey: "3378901212-254-758678901-260810051520-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_09082026152210112711901234", checkoutRequestId: "ws_CO_09082026152210112711901234", merchantRequestId: "bb26-4a0d-9e6f-22901acfc438445907", timestamp: "2026-08-09T15:22:10Z", customerId: "CX-1018", customerName: "Peter Nderitu",    phone: "254-711901234", userId: "3001234512", userKey: "254-711901234", amountKES: 300, orderId: "3001234512-7E77", paymentType: "RechargeWallet", resultCode: 0, resultDescription: "The service request is processed successfully.", mpesaReceiptNumber: "UFH3A8JKL7", transactionDate: "20260809152222", balance: 300, transactionKey: "3001234512-254-711901234-260809122150-RechargeWallet", statusCount: 1, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
  { id: "ws_CO_08082026094433663763123456", checkoutRequestId: "ws_CO_08082026094433663763123456", merchantRequestId: "cc17-4b1e-8f7a-33001bdfc549556018", timestamp: "2026-08-08T09:44:33Z", customerId: "CX-1030", customerName: "George Onyango",   phone: "254-763123456", userId: "3423456712", userKey: "254-763123456", amountKES: 500, orderId: "3423456712-8F88", paymentType: "RechargeWallet", resultCode: 1037, resultDescription: "DS timeout. User cannot be reached.", transactionKey: "3423456712-254-763123456-260808064410-RechargeWallet", statusCount: 3, initialResponseCode: "0", initialResponseDescription: "Success. Request accepted for processing", customerMessage: "Success. Request accepted for processing" },
];

const MOCK_LEDGER: WalletLedgerEntry[] = [
  // Recharges (credits) — linked to the M-Pesa requests above
  { id: "WL-20001", customerId: "CX-1001", customerName: "Nickson Mwiti",   phone: "254-716195164", direction: "credit", category: "recharge",       amountKES: 249, balanceAfterKES: 249,  status: "completed", occurredAt: "2026-08-29T08:20:57Z", reference: "UEMM855R26", rechargeId: "ws_CO_22052026230503815701600937" },
  { id: "WL-20002", customerId: "CX-1002", customerName: "Fredrick Ochieng", phone: "254-722135002", direction: "credit", category: "recharge",       amountKES: 65,  balanceAfterKES: 65,   status: "completed", occurredAt: "2026-08-28T14:10:12Z", reference: "UBB8X6CZAI", rechargeId: "ws_CO_11022026123032255723906029" },
  { id: "WL-20003", customerId: "CX-1003", customerName: "Erick Nganda",     phone: "254-792913491", direction: "credit", category: "recharge",       amountKES: 213, balanceAfterKES: 213,  status: "completed", occurredAt: "2026-08-28T09:44:03Z", reference: "UE79W3KBX0", rechargeId: "ws_CO_07052026112340360796380984" },
  { id: "WL-20004", customerId: "CX-1005", customerName: "Zechariah Anita",  phone: "254-118831352", direction: "credit", category: "recharge",       amountKES: 300, balanceAfterKES: 300,  status: "completed", occurredAt: "2026-08-27T10:51:13Z", reference: "UEI7Z4LDEL", rechargeId: "ws_CO_18052026105113061112786621" },
  { id: "WL-20005", customerId: "CX-1015", customerName: "Faith Chebet",     phone: "254-743678901", direction: "credit", category: "recharge",       amountKES: 500, balanceAfterKES: 500,  status: "completed", occurredAt: "2026-08-23T14:30:12Z", reference: "UEQ4M2PLT8", rechargeId: "ws_CO_29082026143012884743678901" },
  { id: "WL-20006", customerId: "CX-1013", customerName: "Grace Akinyi",     phone: "254-701234567", direction: "credit", category: "recharge",       amountKES: 300, balanceAfterKES: 0,    status: "failed",    occurredAt: "2026-08-25T09:15:02Z", notes: "M-Pesa request cancelled by user", rechargeId: "ws_CO_25082026091502334722135002" },

  // Swap debits
  { id: "WL-20010", customerId: "CX-1001", customerName: "Nickson Mwiti",   phone: "254-716195164", direction: "debit",  category: "swap",           amountKES: 250, balanceAfterKES: 199,  status: "completed", occurredAt: "2026-08-29T13:45:00Z", reference: "TXN-10018" },
  { id: "WL-20011", customerId: "CX-1005", customerName: "Zechariah Anita",  phone: "254-118831352", direction: "debit",  category: "swap",           amountKES: 280, balanceAfterKES: 20,   status: "completed", occurredAt: "2026-08-27T13:45:00Z", reference: "TXN-10001" },
  { id: "WL-20012", customerId: "CX-1003", customerName: "Erick Nganda",     phone: "254-792913491", direction: "debit",  category: "swap",           amountKES: 300, balanceAfterKES: -87,  status: "completed", occurredAt: "2026-08-28T11:15:00Z", reference: "TXN-10003", notes: "Overdraft — wallet went negative" },
  { id: "WL-20013", customerId: "CX-1015", customerName: "Faith Chebet",     phone: "254-743678901", direction: "debit",  category: "swap",           amountKES: 260, balanceAfterKES: 240,  status: "completed", occurredAt: "2026-08-23T15:20:00Z", reference: "TXN-10032" },

  // Fast charge debits
  { id: "WL-20020", customerId: "CX-1001", customerName: "Nickson Mwiti",   phone: "254-716195164", direction: "debit",  category: "fast_charge",    amountKES: 150, balanceAfterKES: 49,   status: "completed", occurredAt: "2026-08-28T08:00:00Z", reference: "TXN-10036" },
  { id: "WL-20021", customerId: "CX-1023", customerName: "Lucy Waithera",   phone: "254-716456789", direction: "debit",  category: "fast_charge",    amountKES: 160, balanceAfterKES: 340,  status: "completed", occurredAt: "2026-08-25T08:45:00Z", reference: "TXN-10039" },

  // Home charge debits
  { id: "WL-20030", customerId: "CX-1006", customerName: "Moses Mwangi",     phone: "254-748679190", direction: "debit",  category: "home_charge",    amountKES: 90,  balanceAfterKES: 124,  status: "completed", occurredAt: "2026-08-26T21:10:00Z", notes: "Overnight home charge session" },
  { id: "WL-20031", customerId: "CX-1004", customerName: "Augustine Mbevi",  phone: "254-795645403", direction: "debit",  category: "home_charge",    amountKES: 75,  balanceAfterKES: 35,   status: "completed", occurredAt: "2026-08-27T22:30:00Z", notes: "Overnight home charge session" },

  // Promo points (credits)
  { id: "WL-20040", customerId: "CX-1008", customerName: "James Ng'ang'a",   phone: "254-714542787", direction: "credit", category: "promo_points",   amountKES: 200, balanceAfterKES: 200,  status: "completed", occurredAt: "2026-08-20T10:00:00Z", notes: "Launch promo allocation" },
  { id: "WL-20041", customerId: "CX-1019", customerName: "Mary Wambui",      phone: "254-732012345", direction: "credit", category: "promo_points",   amountKES: 150, balanceAfterKES: 150,  status: "completed", occurredAt: "2026-08-19T10:00:00Z", notes: "Launch promo allocation" },

  // Referral bonus (referrer earns) + Referree bonus (invited customer earns)
  { id: "WL-20050", customerId: "CX-1004", customerName: "Augustine Mbevi",  phone: "254-795645403", direction: "credit", category: "referral_bonus", amountKES: 500, balanceAfterKES: 535,  status: "completed", occurredAt: "2026-08-18T12:00:00Z", notes: "Referred Samuel Odhiambo (CX-1012)" },
  { id: "WL-20051", customerId: "CX-1012", customerName: "Samuel Odhiambo",  phone: "254-754567890", direction: "credit", category: "referree_bonus", amountKES: 250, balanceAfterKES: 250,  status: "completed", occurredAt: "2026-08-18T12:00:00Z", notes: "Signed up via ZNO-MB004" },
  { id: "WL-20052", customerId: "CX-1015", customerName: "Faith Chebet",     phone: "254-743678901", direction: "credit", category: "referral_bonus", amountKES: 500, balanceAfterKES: 740,  status: "completed", occurredAt: "2026-08-15T12:00:00Z", notes: "Referred Joseph Kariuki (CX-1016)" },
  { id: "WL-20053", customerId: "CX-1016", customerName: "Joseph Kariuki",   phone: "254-764789012", direction: "credit", category: "referree_bonus", amountKES: 250, balanceAfterKES: 250,  status: "pending",   occurredAt: "2026-08-15T12:00:00Z", notes: "Signed up via ZNO-CB015 — awaiting first swap" },

  // Exit refund — customer leaving Zeno, remaining balance returned
  { id: "WL-20060", customerId: "CX-1026", customerName: "Paul Omondi",      phone: "254-779789012", direction: "credit", category: "exit_refund",    amountKES: 180, balanceAfterKES: 0,    status: "completed", occurredAt: "2026-08-10T09:00:00Z", notes: "Wallet balance refunded on account closure (customer left Zeno)" },
  { id: "WL-20061", customerId: "CX-1028", customerName: "Charles Njuguna",  phone: "254-721901234", direction: "credit", category: "exit_refund",    amountKES: 95,  balanceAfterKES: 0,    status: "reversed",  occurredAt: "2026-08-08T09:00:00Z", notes: "Exit refund reversed — outstanding balance found" },

  // Additional recharges (credits)
  { id: "WL-20070", customerId: "CX-1007", customerName: "Vincent King'oo",  phone: "254-798793747", direction: "credit", category: "recharge",       amountKES: 180, balanceAfterKES: 180,  status: "completed", occurredAt: "2026-08-22T10:15:33Z", reference: "UEV2N7QRS4", rechargeId: "ws_CO_22082026101533771798793747" },
  { id: "WL-20071", customerId: "CX-1010", customerName: "Patrick Kamau",    phone: "254-712345678", direction: "credit", category: "recharge",       amountKES: 250, balanceAfterKES: 250,  status: "completed", occurredAt: "2026-08-20T16:02:23Z", reference: "UEX3Q8WXY7", rechargeId: "ws_CO_20082026160223447712345678" },
  { id: "WL-20072", customerId: "CX-1011", customerName: "Diana Wanjiku",    phone: "254-733456789", direction: "credit", category: "recharge",       amountKES: 400, balanceAfterKES: 530,  status: "completed", occurredAt: "2026-08-20T11:29:01Z", reference: "UEY4R9ZAB8", rechargeId: "ws_CO_20082026112901663733456789" },
  { id: "WL-20073", customerId: "CX-1021", customerName: "Rose Wanjiru",     phone: "254-774234567", direction: "credit", category: "recharge",       amountKES: 330, balanceAfterKES: 330,  status: "completed", occurredAt: "2026-08-14T12:26:58Z", reference: "UFC8V3EFG2", rechargeId: "ws_CO_14082026122658889774234567" },
  { id: "WL-20074", customerId: "CX-1022", customerName: "David Maina",      phone: "254-795345678", direction: "credit", category: "recharge",       amountKES: 260, balanceAfterKES: 260,  status: "completed", occurredAt: "2026-08-13T16:44:21Z", reference: "UFD9W4FGH3", rechargeId: "ws_CO_13082026164421112795345678" },

  // Additional swap debits
  { id: "WL-20080", customerId: "CX-1006", customerName: "Moses Mwangi",     phone: "254-748679190", direction: "debit",  category: "swap",           amountKES: 250, balanceAfterKES: -36,  status: "completed", occurredAt: "2026-08-29T12:30:00Z", reference: "TXN-10002", notes: "Overdraft — wallet went negative" },
  { id: "WL-20081", customerId: "CX-1013", customerName: "Grace Akinyi",     phone: "254-701234567", direction: "debit",  category: "swap",           amountKES: 310, balanceAfterKES: 90,   status: "completed", occurredAt: "2026-08-28T11:30:00Z", reference: "TXN-10009" },
  { id: "WL-20082", customerId: "CX-1022", customerName: "David Maina",      phone: "254-795345678", direction: "debit",  category: "swap",           amountKES: 275, balanceAfterKES: -15,  status: "completed", occurredAt: "2026-08-28T09:15:00Z", reference: "TXN-10010", notes: "Overdraft — wallet went negative" },
  { id: "WL-20083", customerId: "CX-1016", customerName: "Joseph Kariuki",   phone: "254-764789012", direction: "debit",  category: "swap",           amountKES: 295, balanceAfterKES: 55,   status: "completed", occurredAt: "2026-08-27T10:45:00Z", reference: "TXN-10014" },
  { id: "WL-20084", customerId: "CX-1020", customerName: "John Njoroge",     phone: "254-753123456", direction: "debit",  category: "swap",           amountKES: 260, balanceAfterKES: -40,  status: "pending",   occurredAt: "2026-08-28T14:45:00Z", reference: "TXN-10007" },

  // Additional fast / home charge debits
  { id: "WL-20090", customerId: "CX-1018", customerName: "Peter Nderitu",    phone: "254-711901234", direction: "debit",  category: "fast_charge",    amountKES: 200, balanceAfterKES: 100,  status: "completed", occurredAt: "2026-08-26T09:00:00Z", reference: "TXN-10038" },
  { id: "WL-20091", customerId: "CX-1011", customerName: "Diana Wanjiku",    phone: "254-733456789", direction: "debit",  category: "fast_charge",    amountKES: 130, balanceAfterKES: 400,  status: "completed", occurredAt: "2026-08-22T08:00:00Z", reference: "TXN-10041" },
  { id: "WL-20092", customerId: "CX-1024", customerName: "Michael Kimani",   phone: "254-737567890", direction: "debit",  category: "home_charge",    amountKES: 85,  balanceAfterKES: 90,   status: "completed", occurredAt: "2026-08-25T23:05:00Z", notes: "Overnight home charge session" },
  { id: "WL-20093", customerId: "CX-1023", customerName: "Lucy Waithera",    phone: "254-716456789", direction: "debit",  category: "home_charge",    amountKES: 70,  balanceAfterKES: 270,  status: "completed", occurredAt: "2026-08-24T22:15:00Z", notes: "Overnight home charge session" },

  // Additional promo / referral activity
  { id: "WL-20100", customerId: "CX-1009", customerName: "Muvunyi Jean",     phone: "254-759566854", direction: "credit", category: "promo_points",   amountKES: 100, balanceAfterKES: 100,  status: "completed", occurredAt: "2026-08-17T10:00:00Z", notes: "Launch promo allocation" },
  { id: "WL-20101", customerId: "CX-1007", customerName: "Vincent King'oo",  phone: "254-798793747", direction: "credit", category: "referral_bonus", amountKES: 500, balanceAfterKES: 680,  status: "completed", occurredAt: "2026-08-12T12:00:00Z", notes: "Referred John Njoroge (CX-1020)" },
  { id: "WL-20102", customerId: "CX-1020", customerName: "John Njoroge",     phone: "254-753123456", direction: "credit", category: "referree_bonus", amountKES: 250, balanceAfterKES: 210,  status: "completed", occurredAt: "2026-08-12T12:00:00Z", notes: "Signed up via ZNO-KG007" },
  { id: "WL-20103", customerId: "CX-1029", customerName: "Esther Mumbi",     phone: "254-742012345", direction: "credit", category: "exit_refund",    amountKES: 140, balanceAfterKES: 0,    status: "completed", occurredAt: "2026-08-05T09:00:00Z", notes: "Wallet balance refunded on account closure (customer left Zeno)" },
];

interface WalletTransactionsState {
  ledger: WalletLedgerEntry[];
  recharges: RechargeRequest[];
  /** Re-trigger an STK push for a recharge request (mock: mark pending + bump statusCount). */
  reinitiateRecharge: (id: string) => void;
}

export const useWalletTransactionsStore = create<WalletTransactionsState>()(
  persist(
    (set) => ({
      ledger: MOCK_LEDGER,
      recharges: MOCK_RECHARGES,
      reinitiateRecharge: (id) =>
        set((s) => ({
          recharges: s.recharges.map((r) =>
            r.id === id
              ? {
                  ...r,
                  resultCode: 0,
                  resultDescription: "Awaiting M-Pesa confirmation.",
                  mpesaReceiptNumber: undefined,
                  statusCount: r.statusCount + 1,
                  customerMessage: "Re-initiated from portal. Request accepted for processing",
                }
              : r
          ),
        })),
    }),
    {
      name: "zeno-wallet-transactions",
      // Bump when the mock seed changes so persisted stores re-seed instead of
      // rehydrating stale rows.
      version: 2,
      migrate: () => ({ ledger: MOCK_LEDGER, recharges: MOCK_RECHARGES }),
    }
  )
);
