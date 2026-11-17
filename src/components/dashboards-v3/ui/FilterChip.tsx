import { X } from "lucide-react";

/** An active filter, removable on its own. The label says what it filters, so it reads without colour. */
export function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-2.5 pr-1 text-xs text-slate-700">
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}: ${value}`}
        className="rounded-full p-0.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Clears every active filter at once, beside the chips. */
export function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-1 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
    >
      Clear filters
    </button>
  );
}
