"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { METRIC_DEFINITIONS } from "@/lib/mock/kpi-partner";
import { INFRA_METRIC_DEFINITIONS } from "@/lib/mock/kpi-infra";
import { REFERRAL_METRIC_DEFINITIONS } from "@/lib/mock/kpi-referral";
import { WALLET_METRIC_DEFINITIONS } from "@/lib/mock/kpi-wallet";
import { ENERGY_METRIC_DEFINITIONS } from "@/lib/mock/kpi-energy";
import { PREORDER_METRIC_DEFINITIONS } from "@/lib/mock/kpi-preorder";

const ALL_BUILTIN_DEFINITIONS = [
  ...METRIC_DEFINITIONS,
  ...INFRA_METRIC_DEFINITIONS,
  ...REFERRAL_METRIC_DEFINITIONS,
  ...WALLET_METRIC_DEFINITIONS,
  ...ENERGY_METRIC_DEFINITIONS,
  ...PREORDER_METRIC_DEFINITIONS,
];

export interface CustomMetric {
  key: string;
  label: string;
  unit: string;
  group: string;
  definition: string;
  isCustom: true;
}

export interface MetricEntry {
  key: string;
  label: string;
  unit: string;
  group: string;
  definition: string;
  isCustom?: boolean;
}

interface MetricsState {
  overrides: Record<string, string>;
  custom: CustomMetric[];
  setOverride: (key: string, definition: string) => void;
  addCustom: (metric: Omit<CustomMetric, "isCustom">) => void;
  updateCustom: (key: string, patch: Partial<Omit<CustomMetric, "isCustom" | "key">>) => void;
  removeCustom: (key: string) => void;
  getDefinition: (key: string) => string;
  getAllMetrics: () => MetricEntry[];
}

export const useMetricsStore = create<MetricsState>()(
  persist(
    (set, get) => ({
      overrides: {},
      custom: [],

      setOverride: (key, definition) =>
        set((s) => ({ overrides: { ...s.overrides, [key]: definition } })),

      addCustom: (metric) =>
        set((s) => ({
          custom: [...s.custom, { ...metric, isCustom: true as const }],
        })),

      updateCustom: (key, patch) =>
        set((s) => ({
          custom: s.custom.map((m) => (m.key === key ? { ...m, ...patch } : m)),
        })),

      removeCustom: (key) =>
        set((s) => ({ custom: s.custom.filter((m) => m.key !== key) })),

      getDefinition: (key) => {
        const { overrides, custom } = get();
        if (overrides[key]) return overrides[key];
        const customMetric = custom.find((m) => m.key === key);
        if (customMetric) return customMetric.definition;
        const builtin = ALL_BUILTIN_DEFINITIONS.find((m) => m.key === key);
        return builtin?.definition ?? "";
      },

      getAllMetrics: () => {
        const { overrides, custom } = get();
        const builtins: MetricEntry[] = ALL_BUILTIN_DEFINITIONS.map((m) => ({
          key: m.key,
          label: m.label,
          unit: m.unit,
          group: m.group,
          definition: overrides[m.key] ?? m.definition,
        }));
        return [...builtins, ...custom];
      },
    }),
    { name: "zeno-metrics" }
  )
);
