import { cn, formatNumber, formatPercent, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";

export interface WeekPoint {
  weekLabel: string;
  value: number;
}

function formatCompact(value: number, unit?: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  previousValue?: number;
  comparisonLabel?: string;
  className?: string;
  definition?: string;
  isLive?: boolean;
  history?: WeekPoint[];
}

export function KpiCard({ label, value, unit, previousValue, comparisonLabel = "vs prev week", className, definition, isLive, history }: KpiCardProps) {
  const pctChange =
    previousValue != null && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null;

  const formattedValue =
    unit === "%" ? formatPercent(value) :
    unit === "KES" ? formatCurrency(value) :
    unit === "KES/kWh" ? formatNumber(value, 2) :
    unit === "kWh" ? formatNumber(value) :
    formatNumber(value);

  const isUp = pctChange != null && pctChange > 0;
  const isDown = pctChange != null && pctChange < 0;

  const borderColor =
    previousValue == null ? "#e2e8f0" :
    isUp ? "#FF3B06" : isDown ? "#003B49" : "#e2e8f0";

  const showRail = history && history.length > 1;

  return (
    <div
      className={cn("relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col", className)}
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {isLive && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white border border-green-200 rounded-full pl-1.5 pr-2 py-0.5 shadow-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-[8px] font-bold text-green-700 uppercase tracking-widest leading-none">live</span>
        </div>
      )}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <p
              className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {label}
            </p>
            {definition && <InfoTip content={definition} placement="top" />}
          </div>
        </div>
        <p
          className="text-xl font-bold text-slate-900 leading-none mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formattedValue}
          {unit && unit !== "%" && unit !== "KES" && unit !== "KES/kWh" && (
            <span className="text-xs font-medium text-slate-400 ml-1">{unit}</span>
          )}
        </p>
        {pctChange != null ? (
          <div className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold rounded-sm px-1.5 py-0.5",
            isUp   ? "bg-[#FF3B06]/10 text-[#FF3B06]" :
            isDown ? "bg-[#003B49]/10 text-[#003B49]" :
                     "bg-slate-100 text-slate-400"
          )}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : isDown ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            <span>{pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}% {comparisonLabel}</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-300 italic">No prior data</div>
        )}
      </div>

      {showRail && (
        <div className="px-2 pb-2 pt-0 mt-auto">
          <div className="border-t border-slate-100 pt-2 flex items-stretch gap-0.5">
            {history!.map((h, i) => {
              const isCurrent = i === history!.length - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative flex-1 flex flex-col items-center justify-center rounded py-1 gap-0.5",
                    isCurrent ? "bg-[#FF3B06]/[0.06]" : "hover:bg-slate-50"
                  )}
                >
                  {isCurrent && (
                    <span className="absolute inset-x-1 top-0 h-[2px] bg-[#FF3B06] rounded-full" />
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-bold leading-none tabular-nums",
                      isCurrent ? "text-[#FF3B06]" : "text-slate-600"
                    )}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatCompact(h.value, unit)}
                  </span>
                  <span className={cn(
                    "text-[8px] leading-none",
                    isCurrent ? "text-[#FF3B06]/60" : "text-slate-400"
                  )}>
                    {h.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
