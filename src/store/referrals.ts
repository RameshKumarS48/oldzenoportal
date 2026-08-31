import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReferralStatus = "pending" | "active" | "expired";
export type TriggerEvent = "first_swap" | "account_activation" | "first_payment";

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  dateUsed: string;
  status: ReferralStatus;
  pointsToReferee: number;
  pointsToReferrer: number;
  pendingPoints: number;
  triggerEvent: TriggerEvent;
  activationDate?: string;
}

const MOCK_REFERRALS: Referral[] = [
  // Active referrals (referee has received bike — referrer points activated)
  { id: "REF-001", referrerId: "CX-1004", refereeId: "CX-1012", referralCode: "ZNO-MB004", dateUsed: "2026-03-29", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap", activationDate: "2026-04-02" },
  { id: "REF-002", referrerId: "CX-1015", refereeId: "CX-1016", referralCode: "ZNO-CB015", dateUsed: "2025-11-01", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap", activationDate: "2025-11-05" },
  { id: "REF-003", referrerId: "CX-1007", refereeId: "CX-1020", referralCode: "ZNO-KG007", dateUsed: "2026-04-18", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "account_activation", activationDate: "2026-04-22" },
  { id: "REF-004", referrerId: "CX-1002", refereeId: "CX-1005", referralCode: "ZNO-OC002", dateUsed: "2026-07-16", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_payment", activationDate: "2026-07-20" },
  { id: "REF-005", referrerId: "CX-1013", refereeId: "CX-1014", referralCode: "ZNO-AK013", dateUsed: "2026-02-24", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap", activationDate: "2026-02-28" },
  { id: "REF-006", referrerId: "CX-1018", refereeId: "CX-1019", referralCode: "ZNO-ND018", dateUsed: "2026-05-10", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "account_activation", activationDate: "2026-05-14" },
  { id: "REF-007", referrerId: "CX-1021", refereeId: "CX-1022", referralCode: "ZNO-WR021", dateUsed: "2025-09-29", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap", activationDate: "2025-10-03" },
  { id: "REF-008", referrerId: "CX-1001", refereeId: "CX-1003", referralCode: "ZNO-MW001", dateUsed: "2026-07-16", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_payment", activationDate: "2026-07-20" },
  { id: "REF-009", referrerId: "CX-1010", refereeId: "CX-1011", referralCode: "ZNO-KM010", dateUsed: "2026-05-06", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap", activationDate: "2026-05-10" },
  { id: "REF-010", referrerId: "CX-1016", refereeId: "CX-1017", referralCode: "ZNO-KR016", dateUsed: "2025-09-14", status: "active",  pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "account_activation", activationDate: "2025-09-18" },
  // Pending referrals (referee signed up but bike not yet delivered)
  { id: "REF-011", referrerId: "CX-1006", refereeId: "CX-1008", referralCode: "ZNO-MW006", dateUsed: "2026-07-19", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "first_swap" },
  { id: "REF-012", referrerId: "CX-1023", refereeId: "CX-1024", referralCode: "ZNO-WT023", dateUsed: "2026-01-11", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "first_swap" },
  { id: "REF-013", referrerId: "CX-1009", refereeId: "CX-1025", referralCode: "ZNO-JN009", dateUsed: "2025-11-18", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "first_payment" },
  { id: "REF-014", referrerId: "CX-1003", refereeId: "CX-1013", referralCode: "ZNO-NG003", dateUsed: "2026-03-10", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "account_activation" },
  { id: "REF-015", referrerId: "CX-1011", refereeId: "CX-1026", referralCode: "ZNO-WJ011", dateUsed: "2025-08-06", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "first_swap" },
  { id: "REF-016", referrerId: "CX-1005", refereeId: "CX-1027", referralCode: "ZNO-AN005", dateUsed: "2025-06-27", status: "pending", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 1000, triggerEvent: "first_payment" },
  // Expired referrals
  { id: "REF-017", referrerId: "CX-1020", refereeId: "CX-1028", referralCode: "ZNO-NR020", dateUsed: "2025-06-11", status: "expired", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_swap" },
  { id: "REF-018", referrerId: "CX-1014", refereeId: "CX-1029", referralCode: "ZNO-MT014", dateUsed: "2025-05-16", status: "expired", pointsToReferee: 1000, pointsToReferrer: 1000, pendingPoints: 0, triggerEvent: "first_payment" },
  { id: "REF-019", referrerId: "CX-1017", refereeId: "CX-1030", referralCode: "ZNO-NJ017", dateUsed: "2025-04-06", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "account_activation" },
  { id: "REF-020", referrerId: "CX-1022", refereeId: "CX-1031", referralCode: "ZNO-MA022", dateUsed: "2025-03-18", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "first_swap" },
  { id: "REF-021", referrerId: "CX-1012", refereeId: "CX-1032", referralCode: "ZNO-OD012", dateUsed: "2025-02-04", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "first_payment" },
  { id: "REF-022", referrerId: "CX-1025", refereeId: "CX-1033", referralCode: "ZNO-NY025", dateUsed: "2025-01-10", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "first_swap" },
  { id: "REF-023", referrerId: "CX-1024", refereeId: "CX-1034", referralCode: "ZNO-KI024", dateUsed: "2025-01-01", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "account_activation" },
  { id: "REF-024", referrerId: "CX-1019", refereeId: "CX-1035", referralCode: "ZNO-WB019", dateUsed: "2025-02-16", status: "expired", pointsToReferee: 0,    pointsToReferrer: 0,    pendingPoints: 0, triggerEvent: "first_swap" },
];

interface ReferralsState {
  referrals: Referral[];
  addReferral: (r: Omit<Referral, "id">) => void;
  updateReferralStatus: (id: string, status: ReferralStatus, activationDate?: string) => void;
}

export const useReferralsStore = create<ReferralsState>()(
  persist(
    (set) => ({
      referrals: MOCK_REFERRALS,

      addReferral: (r) => {
        const id = "REF-" + String(Math.floor(Math.random() * 90000) + 10000);
        set((s) => ({ referrals: [...s.referrals, { ...r, id }] }));
      },

      updateReferralStatus: (id, status, activationDate) => {
        set((s) => ({
          referrals: s.referrals.map((r) =>
            r.id === id
              ? { ...r, status, pendingPoints: status === "active" ? 0 : r.pendingPoints, activationDate: activationDate ?? r.activationDate }
              : r
          ),
        }));
      },
    }),
    { name: "zeno-referrals" }
  )
);
