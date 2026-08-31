"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WeeklySalesActuals {
  weekStart: string;
  isoWeek: number;
  overall: number;
  byPartner: Record<string, number>;
  byCity: Record<string, number>;
  byPartnerCity: Record<string, Record<string, number>>;
}

interface ActualsState {
  weeks: WeeklySalesActuals[];
  lastSyncedAt: string | null;
  isLoading: boolean;
  error: string | null;
  sync: () => Promise<void>;
  getBikesSold: (weekStart: string, partnerId?: string) => number | null;
  getCitySplit: (weekStart: string, partnerId?: string) => Record<string, number> | null;
}

export const useActualsStore = create<ActualsState>()(
  persist(
    (set, get) => ({
      weeks: [],
      lastSyncedAt: null,
      isLoading: false,
      error: null,

      sync: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/sheets");
          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          const data = await res.json() as { weeks: WeeklySalesActuals[] };
          set({ weeks: data.weeks, lastSyncedAt: new Date().toISOString(), isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: String(err) });
        }
      },

      getBikesSold: (weekStart, partnerId) => {
        const week = get().weeks.find((w) => w.weekStart === weekStart);
        if (!week) return null;
        if (!partnerId || partnerId === "overall") return week.overall;
        return week.byPartner[partnerId] ?? 0;
      },

      getCitySplit: (weekStart, partnerId) => {
        const week = get().weeks.find((w) => w.weekStart === weekStart);
        if (!week) return null;
        const overall = Object.keys(week.byCity).length > 0 ? week.byCity : null;
        if (!partnerId || partnerId === "overall") return overall;
        return week.byPartnerCity[partnerId] ?? overall;
      },
    }),
    {
      name: "zeno-actuals",
      partialize: (s) => ({ weeks: s.weeks, lastSyncedAt: s.lastSyncedAt }),
    }
  )
);

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export function shouldAutoSync(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - new Date(lastSyncedAt).getTime() > FIFTEEN_MIN_MS;
}
