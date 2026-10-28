"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The filter bars' "Clear filters": the app's link style, teal (lightened in
 * dark mode like the portal's other teal links), so it doesn't read as
 * disabled, with an × before it. First drawn in Vehicle Tracking's FilterBar.
 */
export function ClearFiltersButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline dark:text-(--sidebar-text) rounded whitespace-nowrap " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
        className
      )}
    >
      <X className="w-3.5 h-3.5" />
      Clear filters
    </button>
  );
}
