"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CATEGORIES, METRICS, suggestedMetrics, categoryName, kindLabel, type CategoryId, type Metric } from "@/lib/dashboards-v3/catalogue";
import { cn } from "@/lib/utils";
import { DefinitionTip, FocusTip } from "../ui/FocusTip";
import { useAnchoredPopover } from "../ui/useAnchoredPopover";

/**
 * The metric, as a dropdown: the chosen one's name (its definition behind
 * ⓘ), or "Choose a metric". The list opens in a popover with search,
 * three suggestions for the dashboard's category first, then every other
 * metric by category. Escape, a click outside or a choice close it, and
 * focus goes back to the field.
 */
export function MetricPicker({
  value, category, onChange, labelledBy,
}: {
  value: Metric | undefined; category: CategoryId; onChange: (m: Metric) => void;
  /** The heading that names the field. */
  labelledBy?: string;
}) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const { open, button, panel, show, close: hide, style } = useAnchoredPopover({ height: 380 });
  const close = () => { hide(); setQuery(""); };

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          ref={button}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={labelledBy ? `${labelledBy} ${labelledBy}-value` : undefined}
          onClick={() => (open ? close() : show())}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <span id={labelledBy ? `${labelledBy}-value` : undefined} className={cn("min-w-0 flex-1 truncate text-sm", value ? "font-medium text-slate-900" : "text-slate-500")}>
            {value ? value.name : "Choose a metric"}
          </span>
          {value && <span className="shrink-0 text-xs text-slate-500">{kindLabel(value)}</span>}
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {value && <FocusTip label={`What ${value.name} means`} content={<DefinitionTip metric={value} />} />}
      </div>
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a metric"
          style={style}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}
          className="z-50 rounded-lg bg-white shadow-lg"
        >
          <MetricList value={value} category={category} query={query} onQuery={setQuery} onPick={(m) => { onChange(m); close(); }} searchRef={search} once />
        </div>
      )}
    </div>
  );
}

/** Search, then suggestions for the category, then every metric by category; `once` leaves the suggested ones out of their categories. */
function MetricList({
  value, category, query, onQuery, onPick, searchRef, once = false,
}: {
  value: Metric | undefined; category: CategoryId; query: string; onQuery: (q: string) => void; onPick: (m: Metric) => void;
  searchRef: React.RefObject<HTMLInputElement | null>; once?: boolean;
}) {
  const id = useId();
  const q = query.trim().toLowerCase();
  const match = (m: Metric) => !q || m.name.toLowerCase().includes(q) || m.definition.toLowerCase().includes(q) || categoryName(m.category).toLowerCase().includes(q);
  const suggested = q ? [] : suggestedMetrics(category);
  const skip = new Set(once ? suggested.map((m) => m.id) : []);
  const groups = CATEGORIES.map((c) => ({ ...c, items: METRICS.filter((m) => m.category === c.id && match(m) && !skip.has(m.id)) })).filter((g) => g.items.length > 0);
  return (
    <div className="rounded-lg border border-slate-300 focus-within:border-zeno-teal">
      <div className="relative border-b border-slate-200">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search metrics"
          aria-label="Search metrics"
          className="w-full rounded-t-lg py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
        />
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {suggested.length > 0 && <Group title={`Suggested for ${categoryName(category).toLowerCase()}`} items={suggested} name={`${id}-suggested`} value={value} onPick={onPick} prefix="s" />}
        {groups.map((g) => <Group key={g.id} title={g.name} items={g.items} name={`${id}-metric`} value={value} onPick={onPick} prefix="g" />)}
        {groups.length === 0 && suggested.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500">No metrics match “{query.trim()}”.</p>}
      </div>
    </div>
  );
}

function Group({ title, items, name, value, onPick, prefix }: { title: string; items: Metric[]; name: string; value: Metric | undefined; onPick: (m: Metric) => void; prefix: string }) {
  return (
    <div role="group" aria-label={title}>
      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">{title}</p>
      {items.map((m) => {
        const on = value?.id === m.id;
        return (
          <label key={`${prefix}-${m.id}`} className={cn("flex cursor-pointer gap-2.5 px-3 py-1.5 hover:bg-slate-50 focus-within:bg-slate-50", on && "bg-slate-50")}>
            <input type="radio" name={name} value={m.id} checked={on} onChange={() => onPick(m)} className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#003B49]" />
            <span className="min-w-0">
              <span className="block text-sm text-slate-800">{m.name}</span>
              <span className="block text-xs text-slate-500">{m.definition}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
