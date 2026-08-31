"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ComparisonPeriod = "1w" | "4w" | "13w" | "26w" | "custom";

const PERIOD_LABELS: Record<ComparisonPeriod, string> = {
  "1w":  "prev week",
  "4w":  "last month",
  "13w": "3 months ago",
  "26w": "6 months ago",
  "custom": "custom date",
};

const PERIOD_WEEKS: Partial<Record<ComparisonPeriod, number>> = {
  "1w": 1, "4w": 4, "13w": 13, "26w": 26,
};

interface ComparisonState {
  period: ComparisonPeriod;
  customDate: string;
  setPeriod: (p: ComparisonPeriod) => void;
  setCustomDate: (d: string) => void;
  getLabel: () => string;
  getComparisonRow: <T extends { weekStart: string }>(allRows: T[], latestRow: T) => T | undefined;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      period: "1w",
      customDate: "",

      setPeriod: (period) => set({ period }),
      setCustomDate: (customDate) => set({ customDate }),

      getLabel: () => {
        const { period, customDate } = get();
        if (period === "custom" && customDate) return `vs ${customDate}`;
        return `vs ${PERIOD_LABELS[period]}`;
      },

      getComparisonRow: <T extends { weekStart: string }>(allRows: T[], latestRow: T): T | undefined => {
        if (allRows.length === 0) return undefined;
        const { period, customDate } = get();
        const latestIdx = allRows.findIndex((r) => r.weekStart === latestRow.weekStart);
        if (latestIdx < 0) return undefined;

        if (period === "custom" && customDate) {
          return [...allRows].reverse().find(
            (r) => r.weekStart <= customDate && r.weekStart < latestRow.weekStart
          );
        }

        const weeksBack = PERIOD_WEEKS[period] ?? 1;
        const compIdx = latestIdx - weeksBack;
        return compIdx >= 0 ? allRows[compIdx] : allRows[0];
      },
    }),
    {
      name: "zeno-comparison",
      partialize: (s) => ({ period: s.period, customDate: s.customDate }),
    }
  )
);
