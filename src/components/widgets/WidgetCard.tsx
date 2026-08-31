"use client";

import { Trash2, GripVertical, X } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { buildChartData, buildPieData } from "@/lib/chart-data";
import { useFiltersStore } from "@/store/filters";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/utils";
import type { Widget } from "@/lib/mock/dashboards";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/InfoTip";

interface WidgetCardProps {
  widget: Widget;
  onDelete?: () => void;
  editable?: boolean;
  removable?: boolean;
}

export function WidgetCard({ widget, onDelete, editable = false, removable = false }: WidgetCardProps) {
  const { partnerId, infraRegionId, dateFrom, dateTo } = useFiltersStore();
  const { rows, series } = buildChartData(widget, partnerId, infraRegionId, dateFrom, dateTo);
  const pieData = widget.chartType === "pie" ? buildPieData(widget, partnerId, infraRegionId, dateFrom, dateTo) : [];

  // For "stat" type: show the latest value of the first series
  const latestRow = rows.at(-1);
  const statSeries = series[0];
  const statRaw = latestRow && statSeries ? (latestRow[statSeries.key] as number | undefined) : undefined;
  const statFormatted = statRaw != null ? formatNumber(statRaw) : "—";

  // Target for stat: look for a "target" series
  const targetSeries = series.find((s) => s.key.endsWith("_target"));
  const targetRaw = latestRow && targetSeries ? (latestRow[targetSeries.key] as number | undefined) : undefined;
  const statPct = statRaw != null && targetRaw != null && targetRaw !== 0
    ? ((statRaw - targetRaw) / Math.abs(targetRaw)) * 100
    : null;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden group")}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {editable && <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />}
          <h3
            className="text-xs font-semibold text-slate-700 uppercase tracking-wide truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {widget.title}
          </h3>
          {widget.description && (
            <InfoTip content={widget.description} placement="bottom" />
          )}
        </div>
        {(editable && onDelete) && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {(!editable && removable && onDelete) && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
            title="Remove widget"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 px-2 pb-3 min-h-0">
        {widget.chartType === "line" && rows.length > 0 && (
          <LineChart data={rows} series={series} />
        )}
        {widget.chartType === "bar" && rows.length > 0 && (
          <BarChart data={rows} series={series} />
        )}
        {widget.chartType === "pie" && pieData.length > 0 && (
          <PieChart data={pieData} />
        )}
        {widget.chartType === "area" && rows.length > 0 && (
          <AreaChart data={rows} series={series} />
        )}
        {widget.chartType === "stacked-bar" && rows.length > 0 && (
          <BarChart data={rows} series={series} stacked />
        )}
        {widget.chartType === "stat" && (
          <div className="h-full flex flex-col items-center justify-center gap-1 px-4">
            <p
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {widget.snapshotValue != null ? String(widget.snapshotValue) : statFormatted}
            </p>
            {widget.snapshotValue == null && statPct != null && (
              <p className={cn("text-xs font-semibold", statPct >= 0 ? "text-[#FF3B06]" : "text-slate-400")}>
                {statPct > 0 ? "+" : ""}{statPct.toFixed(1)}% vs target
              </p>
            )}
            {widget.snapshotSource ? (
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{widget.snapshotSource}</p>
            ) : statSeries && (
              <p className="text-xs text-slate-400 mt-1 text-center">{statSeries.label || statSeries.key}</p>
            )}
          </div>
        )}
        {widget.chartType !== "stat" && rows.length === 0 && widget.chartType !== "pie" && (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No data for selected range
          </div>
        )}
        {widget.chartType === "pie" && pieData.length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No data for selected range
          </div>
        )}
      </div>
    </div>
  );
}
