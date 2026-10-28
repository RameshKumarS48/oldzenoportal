"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Vehicle Tracking's filter chip (asset-tracking/FilterBar.tsx), whose own copy
// also opens its filter; every other filter bar uses this one.
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * An active filter as a "Field: value" chip, with × to remove it. The label
 * isn't a button: the filter's own control is in the bar beside it.
 */
export function FilterChip({ label, value, removeLabel, onRemove }: {
  label: string;
  value: string;
  /** The × button's name, saying what removing does. */
  removeLabel: string;
  onRemove: () => void;
}) {
  const text = `${label}: ${value}`;
  return (
    <span className={cn("inline-flex max-w-full shrink-0 items-center rounded-full text-xs font-medium", TINT)}>
      <span title={text} className="inline-flex min-w-0 items-center gap-1 pl-3 pr-1.5 py-1">
        <span className="shrink-0">{label}:</span>
        <span className="truncate max-w-40">{value}</span>
      </span>
      <button type="button" onClick={onRemove} aria-label={removeLabel} className={cn("mr-1 p-0.5 rounded-full hover:bg-zeno-teal/15", RING)}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/** The row of active-filter chips under a filter bar; it wraps onto more lines as needed. */
export function FilterChips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>;
}
