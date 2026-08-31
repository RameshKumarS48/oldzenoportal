import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PartnerType = "credit" | "distributor" | "captive" | "corporate";
export type PartnerStatus = "active" | "inactive" | "pending";

export interface Partner {
  id: string;
  name: string;
  partnerType: PartnerType;
  primaryEmail: string;
  emailDomain: string;
  status: PartnerStatus;
  assignedVehicles: string[];
  assignedCustomers: string[];
  partnerUsers: string[];
  createdAt: string;
}

const MOCK_PARTNERS: Partner[] = [
  {
    id: "gw",
    name: "Greenwheels",
    partnerType: "corporate",
    primaryEmail: "ops@greenwheels.ke",
    emailDomain: "greenwheels.ke",
    status: "active",
    assignedVehicles: ["ME92ZPSFB1J002051","ME92ZPSEB1J002058","ME92ZPSFB1J002063","ME92ZPSEB1J002069","ME92ZPSFB1J002074"],
    assignedCustomers: ["CX-1018","CX-1019","CX-1020","CX-1021","CX-1022","CX-1027","CX-1031","CX-1035"],
    partnerUsers: ["u9"],
    createdAt: "2025-06-01",
  },
  {
    id: "mkopa",
    name: "M-KOPA",
    partnerType: "credit",
    primaryEmail: "fleet@m-kopa.com",
    emailDomain: "m-kopa.com",
    status: "active",
    assignedVehicles: ["ME92ZPSFB1J002021","ME92ZPSFB1J002028","ME92ZPSEB1J002033","ME92ZPSFB1J002039","ME92ZPSEB1J002045"],
    assignedCustomers: ["CX-1013","CX-1014","CX-1015","CX-1016","CX-1017","CX-1026","CX-1030","CX-1034"],
    partnerUsers: [],
    createdAt: "2025-05-15",
  },
  {
    id: "watu",
    name: "Watu Credit",
    partnerType: "credit",
    primaryEmail: "ops@watu.co.ke",
    emailDomain: "watu.co.ke",
    status: "active",
    assignedVehicles: ["ME92ZPSFB1J001988","ME92ZPSFB1J001905","ME92ZPSFB1J001934","ME92ZPSEB1J001616","ME92ZPSFB1J001942","ME92ZPSFB1J001938","ME92ZPSEB1J001423","ME92ZPSEB1J001547","ME92ZPSEB1J001526","ME92ZPSFB1J001998","ME92ZPSFB1J002003","ME92ZPSEB1J002010"],
    assignedCustomers: ["CX-1001","CX-1002","CX-1003","CX-1004","CX-1005","CX-1006","CX-1007","CX-1008","CX-1009","CX-1010","CX-1011","CX-1012","CX-1029"],
    partnerUsers: ["u8"],
    createdAt: "2025-04-01",
  },
  {
    id: "4g",
    name: "4G Capital",
    partnerType: "credit",
    primaryEmail: "fleet@4gcapital.com",
    emailDomain: "4gcapital.com",
    status: "active",
    assignedVehicles: ["ME92ZPSFB1J002091"],
    assignedCustomers: ["CX-1025","CX-1028","CX-1033"],
    partnerUsers: [],
    createdAt: "2025-07-01",
  },
  {
    id: "captive",
    name: "Captive Fleet",
    partnerType: "captive",
    primaryEmail: "fleet@zeno.earth",
    emailDomain: "zeno.earth",
    status: "active",
    assignedVehicles: ["ME92ZPSFB1J002080","ME92ZPSEB1J002086","ME92ZPSFB1J002113"],
    assignedCustomers: ["CX-1023","CX-1024","CX-1032"],
    partnerUsers: [],
    createdAt: "2025-03-01",
  },
  {
    id: "fortune",
    name: "Fortune Auto",
    partnerType: "distributor",
    primaryEmail: "fleet@fortuneauto.ke",
    emailDomain: "fortuneauto.ke",
    status: "pending",
    assignedVehicles: [],
    assignedCustomers: [],
    partnerUsers: [],
    createdAt: "2026-07-10",
  },
];

interface PartnersState {
  partners: Partner[];
  addPartner: (data: Omit<Partner, "id" | "createdAt" | "assignedCustomers" | "partnerUsers">) => void;
  updatePartner: (id: string, patch: Partial<Partner>) => void;
  deactivatePartner: (id: string) => void;
}

export const usePartnersStore = create<PartnersState>()(
  persist(
    (set) => ({
      partners: MOCK_PARTNERS,

      addPartner: (data) => {
        const id = data.name.toLowerCase().replace(/\s+/g, "_") + "_" + Math.random().toString(36).slice(2, 6);
        set((s) => ({
          partners: [...s.partners, {
            ...data,
            id,
            assignedCustomers: [],
            partnerUsers: [],
            createdAt: new Date().toISOString().slice(0, 10),
          }],
        }));
      },

      updatePartner: (id, patch) => {
        set((s) => ({
          partners: s.partners.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      deactivatePartner: (id) => {
        set((s) => ({
          partners: s.partners.map((p) => (p.id === id ? { ...p, status: "inactive" } : p)),
        }));
      },
    }),
    { name: "zeno-partners" }
  )
);
