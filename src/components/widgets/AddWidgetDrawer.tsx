"use client";

import { useState } from "react";
import { X, Plus, Trash2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoTip } from "@/components/ui/InfoTip";
import { METRIC_DEFINITIONS } from "@/lib/mock/kpi-partner";
import { INFRA_METRIC_DEFINITIONS } from "@/lib/mock/kpi-infra";
import { useMetricsStore } from "@/store/metrics";
import type { Widget, WidgetSeries, ChartType, SeriesType } from "@/lib/mock/dashboards";

const INFRA_KEYS = new Set<string>(INFRA_METRIC_DEFINITIONS.map((m) => m.key));

const CHART_TYPES: { value: ChartType; label: string; description: string }[] = [
  { value: "line",        label: "Line Chart",    description: "Trends over time" },
  { value: "area",        label: "Area Chart",    description: "Volume trends with fill" },
  { value: "bar",         label: "Bar Chart",     description: "Compare values by week" },
  { value: "stacked-bar", label: "Stacked Bar",   description: "Composition across series" },
  { value: "pie",         label: "Pie Chart",     description: "Proportional breakdown" },
  { value: "stat",        label: "Stat",          description: "Single number highlight" },
];

const SERIES_TYPES: { value: SeriesType; label: string }[] = [
  { value: "actual", label: "Actual" },
  { value: "target", label: "Target" },
  { value: "variance", label: "Variance" },
];

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#f97316", "#06b6d4", "#ec4899", "#84cc16"];

interface AddWidgetDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (widget: Omit<Widget, "id" | "x" | "y">) => void;
}

function defaultSeries(index: number): WidgetSeries {
  return {
    metricKey: METRIC_DEFINITIONS[0].key,
    seriesType: "actual",
    color: COLORS[index % COLORS.length],
    label: "",
  };
}

interface MetricPickerProps {
  value: string;
  onChange: (key: string) => void;
}

function MetricPicker({ value, onChange }: MetricPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDef, setCustomDef] = useState("");
  const [customGroup, setCustomGroup] = useState("Custom");
  const { getAllMetrics, addCustom, getDefinition } = useMetricsStore();

  const allMetrics = getAllMetrics();
  const selected = allMetrics.find((m) => m.key === value) ?? allMetrics[0];
  const definition = getDefinition(value);

  const groups = Array.from(new Set(allMetrics.map((m) => m.group)));

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const key = `custom_${customName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    addCustom({ key, label: customName.trim(), unit: "#s", group: customGroup || "Custom", definition: customDef.trim() });
    onChange(key);
    setCustomName("");
    setCustomDef("");
    setCustomGroup("Custom");
    setShowCustomForm(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:border-slate-400 transition-colors"
        >
          <span className="text-slate-700 truncate">
            <span className="text-slate-400 text-xs">{selected?.group}: </span>
            {selected?.label ?? "Select metric"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
        </button>
        {definition && (
          <InfoTip content={definition} placement="left" className="shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 sticky top-0">
                {group}
              </p>
              {allMetrics
                .filter((m) => m.group === group)
                .map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => { onChange(m.key); setOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left"
                  >
                    <span className={cn("flex-1 truncate", m.key === value && "text-[#FF3B06] font-medium")}>
                      {m.label}
                      {(m as { isCustom?: boolean }).isCustom && (
                        <span className="ml-1.5 text-xs text-blue-500 font-normal">custom</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {m.definition && <InfoTip content={m.definition} placement="left" />}
                      {m.key === value && <Check className="w-3.5 h-3.5 text-green-600" />}
                    </div>
                  </button>
                ))}
            </div>
          ))}

          {/* Add custom parameter */}
          <div className="border-t border-slate-100">
            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add custom parameter…
              </button>
            ) : (
              <div className="p-3 space-y-2 bg-blue-50/60">
                <p className="text-xs font-semibold text-blue-700">New custom parameter</p>
                <input
                  autoFocus
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Parameter name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <input
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Definition (optional)"
                  value={customDef}
                  onChange={(e) => setCustomDef(e.target.value)}
                />
                <input
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Group (e.g. Custom)"
                  value={customGroup}
                  onChange={(e) => setCustomGroup(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="flex-1 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customName.trim()}
                    className="flex-1 py-1.5 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddWidgetDrawer({ open, onClose, onAdd }: AddWidgetDrawerProps) {
  const [title, setTitle] = useState("New Widget");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [series, setSeries] = useState<WidgetSeries[]>([defaultSeries(0)]);

  const handleAdd = () => {
    const isInfra = series.some((s) => INFRA_KEYS.has(s.metricKey));
    onAdd({ title, chartType, series, dataSource: isInfra ? "infra" : "partner", w: 6, h: 4 });
    setTitle("New Widget");
    setChartType("line");
    setSeries([defaultSeries(0)]);
    onClose();
  };

  const updateSeries = (i: number, patch: Partial<WidgetSeries>) => {
    setSeries((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const addSeries = () => setSeries((prev) => [...prev, defaultSeries(prev.length)]);
  const removeSeries = (i: number) => setSeries((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end transition-opacity", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Add Widget</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Input label="Widget Title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setChartType(ct.value)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                    chartType === ct.value
                      ? "border-[#FF3B06] bg-[#FF3B06]/5 text-[#FF3B06]"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  )}
                >
                  <div className="font-medium">{ct.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{ct.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Data Series</label>
              <button
                onClick={addSeries}
                className="text-xs text-[#FF3B06] hover:text-[#e03500] flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> Add series
              </button>
            </div>
            <div className="space-y-3">
              {series.map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Series {i + 1}</span>
                    {series.length > 1 && (
                      <button onClick={() => removeSeries(i)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <MetricPicker
                    value={s.metricKey}
                    onChange={(key) => updateSeries(i, { metricKey: key })}
                  />
                  <Select
                    options={SERIES_TYPES}
                    value={s.seriesType}
                    onChange={(e) => updateSeries(i, { seriesType: e.target.value as SeriesType })}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Color</label>
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => updateSeries(i, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={s.label ?? ""}
                      onChange={(e) => updateSeries(i, { label: e.target.value })}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleAdd}>Add Widget</Button>
        </div>
      </div>
    </div>
  );
}
