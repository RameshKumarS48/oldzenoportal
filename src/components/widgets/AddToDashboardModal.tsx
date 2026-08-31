"use client";

import { useState } from "react";
import { X, LayoutDashboard, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDashboardsStore } from "@/store/dashboards";
import Link from "next/link";

export interface PageWidgetTemplate {
  title: string;
  description?: string;
  snapshotValue: number | string;
  snapshotLabel?: string;
  snapshotSource: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  widgets: PageWidgetTemplate[];
}

function fmtSnapshot(v: number | string): string {
  if (typeof v === "string") return v;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

export function AddToDashboardModal({ open, onClose, widgets }: Props) {
  const custom = useDashboardsStore((s) => s.custom);
  const addWidget = useDashboardsStore((s) => s.addWidget);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dashId, setDashId] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  const effectiveDashId = dashId || custom[0]?.id || "";

  const handleAdd = () => {
    if (!effectiveDashId) return;
    const tpl = widgets[selectedIdx];
    addWidget(effectiveDashId, {
      title: tpl.title,
      description: tpl.description,
      chartType: "stat",
      series: [],
      snapshotValue: tpl.snapshotValue,
      snapshotSource: tpl.snapshotSource,
      w: 4, h: 4, x: 0, y: 0,
    });
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-[#003B49]" />
            <h2 className="text-sm font-semibold text-slate-800">Add Widget to Dashboard</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Widget picker */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Choose Metric</p>
            <div className="space-y-1.5">
              {widgets.map((w, i) => {
                const active = selectedIdx === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left",
                      active ? "border-[#FF3B06] bg-[#FF3B06]/5" : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    {/* Value bubble */}
                    <div className={cn(
                      "w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                      active ? "bg-[#FF3B06]/10 text-[#FF3B06]" : "bg-slate-100 text-slate-600"
                    )} style={{ fontFamily: "var(--font-display)" }}>
                      {fmtSnapshot(w.snapshotValue)}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold truncate", active ? "text-[#FF3B06]" : "text-slate-700")}>
                        {w.title}
                      </p>
                      {w.snapshotLabel && (
                        <p className="text-[11px] text-slate-400 truncate">{w.snapshotLabel}</p>
                      )}
                    </div>
                    {active && <Check className="w-4 h-4 text-[#FF3B06] ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dashboard picker */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Dashboard</p>
            {custom.length === 0 ? (
              <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 mb-1.5">No custom dashboards yet.</p>
                <Link href="/dashboard" onClick={onClose} className="text-xs text-[#FF3B06] font-semibold hover:underline">
                  Create one in Dashboards →
                </Link>
              </div>
            ) : (
              <select
                value={effectiveDashId}
                onChange={(e) => setDashId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30 focus:border-[#FF3B06] text-slate-700"
              >
                {custom.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            onClick={handleAdd}
            disabled={!effectiveDashId || done}
          >
            {done
              ? <><Check className="w-3.5 h-3.5" /> Added!</>
              : <><Plus className="w-3.5 h-3.5" /> Add Widget</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
