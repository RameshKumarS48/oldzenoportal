"use client";

import { useFiltersStore } from "@/store/filters";
import { PARTNERS } from "@/lib/mock/kpi-partner";
import { INFRA_REGIONS } from "@/lib/mock/kpi-infra";
import type { PartnerId } from "@/lib/mock/kpi-partner";
import type { InfraRegionId } from "@/lib/mock/kpi-infra";
import { cn } from "@/lib/utils";

interface PartnerSelectorProps {
  mode: "partner" | "infra";
}

export function PartnerSelector({ mode }: PartnerSelectorProps) {
  const { partnerId, infraRegionId, setPartner, setInfraRegion } = useFiltersStore();

  if (mode === "infra") {
    return (
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {INFRA_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setInfraRegion(r.id as InfraRegionId)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              infraRegionId === r.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {r.label.replace("Infra — ", "")}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
      {PARTNERS.map((p) => (
        <button
          key={p.id}
          onClick={() => setPartner(p.id as PartnerId)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            partnerId === p.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {p.label === "Partner Overall" ? "All" : p.label}
        </button>
      ))}
    </div>
  );
}
