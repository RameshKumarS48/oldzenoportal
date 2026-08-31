"use client";
import { cn } from "@/lib/utils";

export type TimeRange = "today" | "yesterday" | "7d" | "30d";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d",        label: "Last 7 days" },
  { value: "30d",       label: "Last 30 days" },
];

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeRangePicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 border border-white/20 rounded-lg p-0.5 bg-white/[0.06]">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-white text-[#003B49]"
              : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
