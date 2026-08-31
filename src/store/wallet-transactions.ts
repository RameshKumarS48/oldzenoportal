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
    { name: "zeno-wallet-transactions" }
  )
);
