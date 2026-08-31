import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PromoFrequency = "once_per_lifetime" | "monthly" | "per_activation";

export interface PromoRules {
  freshRetailPromo: number;
  freshRetailReferralBonus: number;
  referrerBonus: number;
  partnerPromo: number;
  partnerReferralBonus: number;
  promoFrequency: PromoFrequency;
}

export const DEFAULT_PROMO_RULES: PromoRules = {
  freshRetailPromo: 5000,
  freshRetailReferralBonus: 1000,
  referrerBonus: 1000,
  partnerPromo: 0,
  partnerReferralBonus: 1000,
  promoFrequency: "once_per_lifetime",
};

interface PromoRulesState {
  rules: PromoRules;
  updateRules: (patch: Partial<PromoRules>) => void;
  resetToDefaults: () => void;
}

export const usePromoRulesStore = create<PromoRulesState>()(
  persist(
    (set) => ({
      rules: DEFAULT_PROMO_RULES,
      updateRules: (patch) => set((s) => ({ rules: { ...s.rules, ...patch } })),
      resetToDefaults: () => set({ rules: DEFAULT_PROMO_RULES }),
    }),
    { name: "zeno-promo-rules" }
  )
);
