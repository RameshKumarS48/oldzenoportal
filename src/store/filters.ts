"use client";

import { create } from "zustand";
import type { PartnerId } from "@/lib/mock/kpi-partner";
import type { InfraRegionId } from "@/lib/mock/kpi-infra";

interface FiltersState {
  partnerId: PartnerId;
  infraRegionId: InfraRegionId;
  dateFrom: string;
  dateTo: string;
  setPartner: (id: PartnerId) => void;
  setInfraRegion: (id: InfraRegionId) => void;
  setDateRange: (from: string, to: string) => void;
}

export const useFiltersStore = create<FiltersState>()((set) => ({
  partnerId: "overall",
  infraRegionId: "overall",
  dateFrom: "2026-06-01",
  dateTo: new Date().toISOString().split("T")[0],
  setPartner: (id) => set({ partnerId: id }),
  setInfraRegion: (id) => set({ infraRegionId: id }),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
}));
