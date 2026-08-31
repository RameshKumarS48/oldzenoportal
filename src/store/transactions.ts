import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransactionType = "swap" | "fast_charge" | "payment" | "referral_bonus" | "penalty";
export type PaymentMethod = "mpesa" | "cash" | "wallet" | "bank_transfer";
export type TransactionStatus = "completed" | "pending" | "failed" | "reversed";

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  amountKES: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  stationId?: string;
  vehicleId?: string;
  batteryId?: string;
  occurredAt: string;
  reference?: string;
  notes?: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  // Swaps (35)
  { id: "TXN-10001", customerId: "CX-1005", customerName: "Zechariah Anita",   type: "swap",          amountKES: 280, paymentMethod: "mpesa",        status: "completed", stationId: "BS0005",  vehicleId: "ME92ZPSFB1J001942", batteryId: "ZBT-2026-0395", occurredAt: "2026-07-29T13:45:00Z", reference: "QJX8841231" },
  { id: "TXN-10002", customerId: "CX-1006", customerName: "Moses Mwangi",      type: "swap",          amountKES: 250, paymentMethod: "mpesa",        status: "completed", stationId: "BS0002",  vehicleId: "ME92ZPSFB1J001938", batteryId: "ZBT-2026-0398", occurredAt: "2026-07-29T12:30:00Z", reference: "QJX8841232" },
  { id: "TXN-10003", customerId: "CX-1003", customerName: "Erick Nganda",      type: "swap",          amountKES: 300, paymentMethod: "wallet",       status: "completed", stationId: "BS0025",  vehicleId: "ME92ZPSFB1J001934", batteryId: "ZBT-2026-0401", occurredAt: "2026-07-29T11:15:00Z" },
  { id: "TXN-10004", customerId: "CX-1015", customerName: "Faith Chebet",      type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0009",  vehicleId: "ME92ZPSEB1J002033", batteryId: "ZBT-2026-0402", occurredAt: "2026-07-29T10:00:00Z", reference: "QJX8841233" },
  { id: "TXN-10005", customerId: "CX-1018", customerName: "Peter Nderitu",     type: "swap",          amountKES: 270, paymentMethod: "mpesa",        status: "completed", stationId: "BS0005",  vehicleId: "ME92ZPSFB1J002051", batteryId: "ZBT-2026-0404", occurredAt: "2026-07-29T08:45:00Z", reference: "QJX8841234" },
  { id: "TXN-10006", customerId: "CX-1012", customerName: "Samuel Odhiambo",   type: "swap",          amountKES: 290, paymentMethod: "cash",         status: "completed", stationId: "BS0029",  vehicleId: "ME92ZPSEB1J002010", batteryId: "ZBT-2026-0407", occurredAt: "2026-07-28T16:20:00Z" },
  { id: "TXN-10007", customerId: "CX-1020", customerName: "John Njoroge",      type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0045",  vehicleId: "ME92ZPSFB1J002063", batteryId: "ZBT-2026-0409", occurredAt: "2026-07-28T14:45:00Z", reference: "QJX8841235" },
  { id: "TXN-10008", customerId: "CX-1002", customerName: "Fredrick Ochieng",  type: "swap",          amountKES: 240, paymentMethod: "wallet",       status: "completed", stationId: "BS0006",  vehicleId: "ME92ZPSFB1J001905", batteryId: "ZBT-2026-0411", occurredAt: "2026-07-28T13:00:00Z" },
  { id: "TXN-10009", customerId: "CX-1013", customerName: "Grace Akinyi",      type: "swap",          amountKES: 310, paymentMethod: "mpesa",        status: "completed", stationId: "BS0025",  vehicleId: "ME92ZPSFB1J002021", batteryId: "ZBT-2026-0413", occurredAt: "2026-07-28T11:30:00Z", reference: "QJX8841236" },
  { id: "TXN-10010", customerId: "CX-1022", customerName: "David Maina",       type: "swap",          amountKES: 275, paymentMethod: "mpesa",        status: "completed", stationId: "BS0005",  vehicleId: "ME92ZPSFB1J002074", batteryId: "ZBT-2026-0415", occurredAt: "2026-07-28T09:15:00Z", reference: "QJX8841237" },
  { id: "TXN-10011", customerId: "CX-1007", customerName: "Vincent King'oo",   type: "swap",          amountKES: 250, paymentMethod: "cash",         status: "completed", stationId: "BS0009",  vehicleId: "ME92ZPSEB1J001423", batteryId: "ZBT-2026-0417", occurredAt: "2026-07-27T17:00:00Z" },
  { id: "TXN-10012", customerId: "CX-1004", customerName: "Augustine Mbevi",   type: "swap",          amountKES: 285, paymentMethod: "mpesa",        status: "completed", stationId: "BS0002",  vehicleId: "ME92ZPSEB1J001616", batteryId: "ZBT-2026-0419", occurredAt: "2026-07-27T15:30:00Z", reference: "QJX8841238" },
  { id: "TXN-10013", customerId: "CX-1021", customerName: "Rose Wanjiru",      type: "swap",          amountKES: 265, paymentMethod: "wallet",       status: "completed", stationId: "BS0047",  vehicleId: "ME92ZPSEB1J002069", batteryId: "ZBT-2026-0421", occurredAt: "2026-07-27T13:00:00Z" },
  { id: "TXN-10014", customerId: "CX-1016", customerName: "Joseph Kariuki",    type: "swap",          amountKES: 295, paymentMethod: "mpesa",        status: "completed", stationId: "BS0029",  vehicleId: "ME92ZPSFB1J002039", batteryId: "ZBT-2026-0423", occurredAt: "2026-07-27T10:45:00Z", reference: "QJX8841239" },
  { id: "TXN-10015", customerId: "CX-1011", customerName: "Diana Wanjiku",     type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0006",  vehicleId: "ME92ZPSFB1J002003", batteryId: "ZBT-2026-0425", occurredAt: "2026-07-26T16:00:00Z", reference: "QJX8841240" },
  { id: "TXN-10016", customerId: "CX-1019", customerName: "Mary Wambui",       type: "swap",          amountKES: 270, paymentMethod: "cash",         status: "completed", stationId: "BS0045",  vehicleId: "ME92ZPSEB1J002058", batteryId: "ZBT-2026-0427", occurredAt: "2026-07-26T14:20:00Z" },
  { id: "TXN-10017", customerId: "CX-1014", customerName: "Brian Mutua",       type: "swap",          amountKES: 280, paymentMethod: "mpesa",        status: "completed", stationId: "BS0025",  vehicleId: "ME92ZPSFB1J002028", batteryId: "ZBT-2026-0429", occurredAt: "2026-07-26T12:00:00Z", reference: "QJX8841241" },
  { id: "TXN-10018", customerId: "CX-1001", customerName: "Nickson Mwiti",     type: "swap",          amountKES: 250, paymentMethod: "mpesa",        status: "completed", stationId: "BS0009",  vehicleId: "ME92ZPSFB1J001988", batteryId: "ZBT-2026-0431", occurredAt: "2026-07-25T15:45:00Z", reference: "QJX8841242" },
  { id: "TXN-10019", customerId: "CX-1023", customerName: "Lucy Waithera",     type: "swap",          amountKES: 300, paymentMethod: "wallet",       status: "completed", stationId: "BS0006",  vehicleId: "ME92ZPSFB1J002080", batteryId: "ZBT-2026-0433", occurredAt: "2026-07-25T13:30:00Z" },
  { id: "TXN-10020", customerId: "CX-1010", customerName: "Patrick Kamau",     type: "swap",          amountKES: 265, paymentMethod: "mpesa",        status: "completed", stationId: "BS0002",  vehicleId: "ME92ZPSFB1J001998", batteryId: "ZBT-2026-0435", occurredAt: "2026-07-25T11:00:00Z", reference: "QJX8841243" },
  { id: "TXN-10021", customerId: "CX-1017", customerName: "Anne Njeri",        type: "swap",          amountKES: 285, paymentMethod: "mpesa",        status: "completed", stationId: "BS0009",  vehicleId: "ME92ZPSEB1J002045", batteryId: "ZBT-2026-0393", occurredAt: "2026-07-24T17:00:00Z", reference: "QJX8841244" },
  { id: "TXN-10022", customerId: "CX-1025", customerName: "Agnes Nyambura",    type: "swap",          amountKES: 275, paymentMethod: "cash",         status: "completed", stationId: "BS0045",  vehicleId: "ME92ZPSFB1J002091", batteryId: "ZBT-2026-0395", occurredAt: "2026-07-24T14:30:00Z" },
  { id: "TXN-10023", customerId: "CX-1008", customerName: "James Ng'ang'a",    type: "swap",          amountKES: 230, paymentMethod: "mpesa",        status: "completed", stationId: "BS0002",  vehicleId: "ME92ZPSEB1J001547", batteryId: "ZBT-2026-0398", occurredAt: "2026-07-23T16:00:00Z", reference: "QJX8841245" },
  { id: "TXN-10024", customerId: "CX-1024", customerName: "Michael Kimani",    type: "swap",          amountKES: 320, paymentMethod: "mpesa",        status: "completed", stationId: "BS0006",  vehicleId: "ME92ZPSEB1J002086", batteryId: "ZBT-2026-0401", occurredAt: "2026-07-22T15:00:00Z", reference: "QJX8841246" },
  { id: "TXN-10025", customerId: "CX-1009", customerName: "Muvunyi Jean",      type: "swap",          amountKES: 240, paymentMethod: "wallet",       status: "completed", stationId: "BS0009",  vehicleId: "ME92ZPSEB1J001526", batteryId: "ZBT-2026-0402", occurredAt: "2026-07-22T13:30:00Z" },
  { id: "TXN-10026", customerId: "CX-1030", customerName: "George Onyango",    type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0025",  vehicleId: "ME92ZPSFB1J002101", batteryId: "ZBT-2026-0404", occurredAt: "2026-07-21T14:00:00Z", reference: "QJX8841247" },
  { id: "TXN-10027", customerId: "CX-1031", customerName: "Mercy Wangari",     type: "swap",          amountKES: 270, paymentMethod: "cash",         status: "completed", stationId: "BS0047",  vehicleId: "ME92ZPSEB1J002107", batteryId: "ZBT-2026-0407", occurredAt: "2026-07-20T12:00:00Z" },
  { id: "TXN-10028", customerId: "CX-1032", customerName: "Isaac Kiprotich",   type: "swap",          amountKES: 290, paymentMethod: "mpesa",        status: "pending",   stationId: "BS0006",  vehicleId: "ME92ZPSFB1J002113", batteryId: "ZBT-2026-0409", occurredAt: "2026-07-19T10:30:00Z", reference: "QJX8841248" },
  { id: "TXN-10029", customerId: "CX-1033", customerName: "Beatrice Ndunge",   type: "swap",          amountKES: 250, paymentMethod: "mpesa",        status: "pending",   stationId: "BS0045",  vehicleId: "ME92ZPSEB1J002119", batteryId: "ZBT-2026-0411", occurredAt: "2026-07-18T09:00:00Z", reference: "QJX8841249" },
  { id: "TXN-10030", customerId: "CX-1013", customerName: "Grace Akinyi",      type: "swap",          amountKES: 310, paymentMethod: "wallet",       status: "completed", stationId: "BS0025",  vehicleId: "ME92ZPSFB1J002021", batteryId: "ZBT-2026-0413", occurredAt: "2026-07-17T15:00:00Z" },
  { id: "TXN-10031", customerId: "CX-1014", customerName: "Brian Mutua",       type: "swap",          amountKES: 285, paymentMethod: "mpesa",        status: "failed",    stationId: "BS0009",  vehicleId: "ME92ZPSFB1J002028",                             occurredAt: "2026-07-16T11:00:00Z", reference: "QJX8841250", notes: "M-Pesa timeout" },
  { id: "TXN-10032", customerId: "CX-1015", customerName: "Faith Chebet",      type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0002",  vehicleId: "ME92ZPSEB1J002033", batteryId: "ZBT-2026-0419", occurredAt: "2026-07-15T14:00:00Z", reference: "QJX8841251" },
  { id: "TXN-10033", customerId: "CX-1022", customerName: "David Maina",       type: "swap",          amountKES: 340, paymentMethod: "mpesa",        status: "completed", stationId: "BS0047",  vehicleId: "ME92ZPSFB1J002074", batteryId: "ZBT-2026-0421", occurredAt: "2026-07-12T10:00:00Z", reference: "QJX8841252" },
  { id: "TXN-10034", customerId: "CX-1016", customerName: "Joseph Kariuki",    type: "swap",          amountKES: 275, paymentMethod: "wallet",       status: "reversed",  stationId: "BS0005",  vehicleId: "ME92ZPSFB1J002039",                             occurredAt: "2026-07-10T16:00:00Z", notes: "Double charge reversed" },
  { id: "TXN-10035", customerId: "CX-1021", customerName: "Rose Wanjiru",      type: "swap",          amountKES: 260, paymentMethod: "mpesa",        status: "completed", stationId: "BS0045",  vehicleId: "ME92ZPSEB1J002069", batteryId: "ZBT-2026-0425", occurredAt: "2026-07-08T13:00:00Z", reference: "QJX8841253" },
  // Fast charges (8)
  { id: "TXN-10036", customerId: "CX-1001", customerName: "Nickson Mwiti",     type: "fast_charge",   amountKES: 150, paymentMethod: "mpesa",        status: "completed",                       vehicleId: "ME92ZPSFB1J001988",                             occurredAt: "2026-07-28T08:00:00Z", reference: "QJX8841254" },
  { id: "TXN-10037", customerId: "CX-1014", customerName: "Brian Mutua",       type: "fast_charge",   amountKES: 180, paymentMethod: "cash",         status: "completed",                       vehicleId: "ME92ZPSFB1J002028",                             occurredAt: "2026-07-27T07:30:00Z" },
  { id: "TXN-10038", customerId: "CX-1018", customerName: "Peter Nderitu",     type: "fast_charge",   amountKES: 200, paymentMethod: "mpesa",        status: "completed",                       vehicleId: "ME92ZPSFB1J002051",                             occurredAt: "2026-07-26T09:00:00Z", reference: "QJX8841255" },
  { id: "TXN-10039", customerId: "CX-1023", customerName: "Lucy Waithera",     type: "fast_charge",   amountKES: 160, paymentMethod: "wallet",       status: "completed",                       vehicleId: "ME92ZPSFB1J002080",                             occurredAt: "2026-07-25T08:45:00Z" },
  { id: "TXN-10040", customerId: "CX-1020", customerName: "John Njoroge",      type: "fast_charge",   amountKES: 175, paymentMethod: "mpesa",        status: "pending",                         vehicleId: "ME92ZPSFB1J002063",                             occurredAt: "2026-07-24T07:15:00Z", reference: "QJX8841256" },
  { id: "TXN-10041", customerId: "CX-1011", customerName: "Diana Wanjiku",     type: "fast_charge",   amountKES: 130, paymentMethod: "mpesa",        status: "completed",                       vehicleId: "ME92ZPSFB1J002003",                             occurredAt: "2026-07-22T08:00:00Z", reference: "QJX8841257" },
  { id: "TXN-10042", customerId: "CX-1017", customerName: "Anne Njeri",        type: "fast_charge",   amountKES: 190, paymentMethod: "cash",         status: "failed",                          vehicleId: "ME92ZPSEB1J002045",                             occurredAt: "2026-07-20T07:30:00Z", notes: "Card reader error" },
  { id: "TXN-10043", customerId: "CX-1024", customerName: "Michael Kimani",    type: "fast_charge",   amountKES: 170, paymentMethod: "mpesa",        status: "completed",                       vehicleId: "ME92ZPSEB1J002086",                             occurredAt: "2026-07-15T08:30:00Z", reference: "QJX8841258" },
  // Payments (10)
  { id: "TXN-10044", customerId: "CX-1030", customerName: "George Onyango",    type: "payment",       amountKES: 2500, paymentMethod: "mpesa",       status: "completed",                                                                                   occurredAt: "2026-07-29T09:00:00Z", reference: "QJX8841259", notes: "Monthly instalment" },
  { id: "TXN-10045", customerId: "CX-1031", customerName: "Mercy Wangari",     type: "payment",       amountKES: 1500, paymentMethod: "bank_transfer",status: "completed",                                                                                   occurredAt: "2026-07-28T10:00:00Z", reference: "TRF00234511", notes: "Partial settlement" },
  { id: "TXN-10046", customerId: "CX-1032", customerName: "Isaac Kiprotich",   type: "payment",       amountKES: 3600, paymentMethod: "mpesa",       status: "completed",                                                                                   occurredAt: "2026-07-27T14:00:00Z", reference: "QJX8841260", notes: "Monthly instalment" },
  { id: "TXN-10047", customerId: "CX-1033", customerName: "Beatrice Ndunge",   type: "payment",       amountKES: 2800, paymentMethod: "mpesa",       status: "pending",                                                                                     occurredAt: "2026-07-26T11:00:00Z", reference: "QJX8841261" },
  { id: "TXN-10048", customerId: "CX-1002", customerName: "Fredrick Ochieng",  type: "payment",       amountKES: 5000, paymentMethod: "bank_transfer",status: "completed",                                                                                   occurredAt: "2026-07-25T10:00:00Z", reference: "TRF00234512", notes: "Quarterly payment" },
  { id: "TXN-10049", customerId: "CX-1013", customerName: "Grace Akinyi",      type: "payment",       amountKES: 4500, paymentMethod: "mpesa",       status: "completed",                                                                                   occurredAt: "2026-07-20T09:30:00Z", reference: "QJX8841262", notes: "Monthly instalment" },
  { id: "TXN-10050", customerId: "CX-1015", customerName: "Faith Chebet",      type: "payment",       amountKES: 4000, paymentMethod: "bank_transfer",status: "completed",                                                                                   occurredAt: "2026-07-15T11:00:00Z", reference: "TRF00234513" },
  { id: "TXN-10051", customerId: "CX-1022", customerName: "David Maina",       type: "payment",       amountKES: 3200, paymentMethod: "mpesa",       status: "failed",                                                                                      occurredAt: "2026-07-10T10:00:00Z", reference: "QJX8841263", notes: "Insufficient funds" },
  { id: "TXN-10052", customerId: "CX-1016", customerName: "Joseph Kariuki",    type: "payment",       amountKES: 2000, paymentMethod: "mpesa",       status: "completed",                                                                                   occurredAt: "2026-07-05T14:00:00Z", reference: "QJX8841264" },
  { id: "TXN-10053", customerId: "CX-1021", customerName: "Rose Wanjiru",      type: "payment",       amountKES: 1800, paymentMethod: "cash",        status: "reversed",                                                                                    occurredAt: "2026-07-03T09:00:00Z", notes: "Overpayment reversed" },
  // Referral bonuses (5)
  { id: "TXN-10054", customerId: "CX-1015", customerName: "Faith Chebet",      type: "referral_bonus",amountKES: 500, paymentMethod: "wallet",       status: "completed",                                                                                   occurredAt: "2026-07-28T12:00:00Z", notes: "Referral: Joseph Kariuki (CX-1016)" },
  { id: "TXN-10055", customerId: "CX-1004", customerName: "Augustine Mbevi",   type: "referral_bonus",amountKES: 500, paymentMethod: "wallet",       status: "completed",                                                                                   occurredAt: "2026-07-25T12:00:00Z", notes: "Referral: Samuel Odhiambo (CX-1012)" },
  { id: "TXN-10056", customerId: "CX-1007", customerName: "Vincent King'oo",   type: "referral_bonus",amountKES: 300, paymentMethod: "wallet",       status: "completed",                                                                                   occurredAt: "2026-07-18T12:00:00Z" },
  { id: "TXN-10057", customerId: "CX-1020", customerName: "John Njoroge",      type: "referral_bonus",amountKES: 400, paymentMethod: "wallet",       status: "completed",                                                                                   occurredAt: "2026-07-12T12:00:00Z" },
  { id: "TXN-10058", customerId: "CX-1011", customerName: "Diana Wanjiku",     type: "referral_bonus",amountKES: 200, paymentMethod: "wallet",       status: "pending",                                                                                     occurredAt: "2026-07-08T12:00:00Z" },
  // Penalties (2)
  { id: "TXN-10059", customerId: "CX-1030", customerName: "George Onyango",    type: "penalty",       amountKES: 800, paymentMethod: "mpesa",        status: "completed",                                                                                   occurredAt: "2026-07-15T10:00:00Z", reference: "QJX8841265", notes: "Late return penalty" },
  { id: "TXN-10060", customerId: "CX-1033", customerName: "Beatrice Ndunge",   type: "penalty",       amountKES: 500, paymentMethod: "cash",         status: "completed",                                                                                   occurredAt: "2026-07-05T10:00:00Z", notes: "Battery damage fee" },
];

interface TransactionsState {
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set) => ({
      transactions: MOCK_TRANSACTIONS,
      addTransaction: (t) => set((s) => ({ transactions: [t, ...s.transactions] })),
    }),
    { name: "zeno-transactions" }
  )
);
