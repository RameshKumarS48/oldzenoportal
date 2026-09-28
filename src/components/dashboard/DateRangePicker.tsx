"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useFiltersStore } from "@/store/filters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PRESETS = [
  { label: "Last Week",    from: "2026-09-22", to: "2026-09-28" },
  { label: "Last 4 Weeks", from: "2026-09-01", to: "2026-09-28" },
  { label: "Last Quarter", from: "2026-07-01", to: "2026-09-28" },
  { label: "Full Range",   from: "2026-06-01", to: "2026-09-28" },
];

export function DateRangePicker() {
  const { dateFrom, dateTo, setDateRange } = useFiltersStore();
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  const label = `${format(new Date(dateFrom), "d MMM")}: ${format(new Date(dateTo), "d MMM yyyy")}`;

  const applyCustom = () => {
    setDateRange(localFrom, localTo);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setLocalFrom(dateFrom); setLocalTo(dateTo); setOpen((v) => !v); }}
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        <span style={{ fontFamily: "var(--font-display)" }}>{label}</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-68 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-3 min-w-[260px]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Quick presets</p>
          <div className="space-y-0.5 mb-3">
            {PRESETS.map((p) => {
              const active = dateFrom === p.from && dateTo === p.to;
              return (
                <button
                  key={p.label}
                  onClick={() => { setDateRange(p.from, p.to); setLocalFrom(p.from); setLocalTo(p.to); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                    active
                      ? "bg-[#FF3B06]/10 text-[#FF3B06] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div>
              <label className="text-xs text-slate-500 font-medium">From</label>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30 focus:border-[#FF3B06]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">To</label>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30 focus:border-[#FF3B06]"
              />
            </div>
            <button
              onClick={applyCustom}
              className="w-full py-2 bg-[#FF3B06] hover:bg-[#e03500] text-white text-sm rounded-lg font-semibold transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
