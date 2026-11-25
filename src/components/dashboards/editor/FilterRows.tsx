"use client";

/** "Only where": the card's filters, each a field and the values (or number range) to keep. */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { filterOptions, filterText, resolveField } from "@/lib/dashboards/registry";
import { LIMITS } from "@/lib/dashboards/rules";
import { searchValues } from "@/lib/dashboards/search";
import type { CardFilter, FieldRef } from "@/lib/dashboards/types";
import { cn } from "@/lib/utils";
import { useRegistry } from "../api";

const refKey = (r: FieldRef) => `${r.via ?? ""}|${r.field}`;
export const SMALL = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
export const ADD = "inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50";

export function FilterRows({ recordId, filters, onChange }: { recordId: string; filters: CardFilter[]; onChange: (filters: CardFilter[]) => void }) {
  const registry = useRegistry();
  const [open, setOpen] = useState<number | null>(null);
  const options = filterOptions(registry, recordId);
  const used = new Set(filters.map((f) => refKey(f.field)));
  const free = options.filter((o) => !used.has(refKey(o.ref)));
  const set = (i: number, f: CardFilter) => onChange(filters.map((x, j) => (j === i ? f : x)));

  return (
    <div className="space-y-1.5">
      {filters.map((f, i) => {
        const r = resolveField(registry, recordId, f.field);
        return (
          <div key={refKey(f.field)} className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 hover:text-zeno-teal">
                {(r?.field.type === "number" ? f.min == null && f.max == null : !f.values?.length) ? <span className="text-slate-400">{r?.label ?? "Filter"}: choose…</span> : filterText(registry, recordId, f)}
              </button>
              <button type="button" aria-label={`Remove the ${r?.label ?? ""} filter`} onClick={() => { onChange(filters.filter((_, j) => j !== i)); setOpen(null); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
            </div>
            {open === i && r && (
              <div className="border-t border-slate-100 p-2">
                {r.field.type === "number" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["min", "max"] as const).map((k) => (
                      <label key={k} className="text-[11px] text-slate-500">{k === "min" ? "At least" : "At most"}{r.field.unit ? ` (${r.field.unit})` : ""}
                        <input type="number" inputMode="decimal" value={f[k] ?? ""} onChange={(e) => set(i, { ...f, [k]: e.target.value === "" ? undefined : Number(e.target.value) })} className={cn(SMALL, "mt-0.5 tabular-nums")} />
                      </label>
                    ))}
                  </div>
                ) : <Values values={r.field.values ?? []} picked={f.values ?? []} label={r.label} onChange={(values) => set(i, { ...f, values })} />}
              </div>
            )}
          </div>
        );
      })}
      {filters.length < LIMITS.filters && free.length > 0 && (
        <label className={cn(ADD, "relative cursor-pointer")}>
          <Plus className="h-3.5 w-3.5" /> Only where
          <select aria-label="Add a filter" value="" className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => { const o = free.find((x) => refKey(x.ref) === e.target.value); if (o) { onChange([...filters, { field: o.ref, values: o.field.type === "number" ? undefined : [] }]); setOpen(filters.length); } }}>
            <option value="" disabled>Choose a field</option>
            {free.map((o) => <option key={refKey(o.ref)} value={refKey(o.ref)}>{o.label}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function Values({ values, picked, label, onChange }: { values: string[]; picked: string[]; label: string; onChange: (values: string[]) => void }) {
  const [query, setQuery] = useState("");
  // The backend answers this by typeahead; a field never sends its whole list of values.
  const shown = searchValues(values, query, 30);
  return (
    <div>
      {values.length > 8 && <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label}`} className={cn(SMALL, "mb-1.5")} />}
      <div className="max-h-40 overflow-auto">
        {shown.map((v) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50">
            <input type="checkbox" checked={picked.includes(v)} onChange={() => onChange(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v])} className="accent-[#003B49]" /> {v}
          </label>
        ))}
        {!shown.length && <p className="px-1.5 py-1 text-xs text-slate-400">Nothing matches.</p>}
      </div>
    </div>
  );
}
