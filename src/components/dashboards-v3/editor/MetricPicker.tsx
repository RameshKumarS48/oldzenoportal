"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, METRICS, suggestedMetrics, categoryName, kindLabel, type CategoryId, type Metric } from "@/lib/dashboards-v3/catalogue";
import { UNIT_LABEL } from "@/lib/dashboards-v3/format";
import { cn } from "@/lib/utils";
import { CategoryChip } from "../ui/CategoryChip";
import { DefinitionTip, FocusTip } from "../ui/FocusTip";
import { useAnchoredPopover } from "../ui/useAnchoredPopover";
import { EYEBROW } from "./controls";

/**
 * Choosing a metric. Once one is chosen it shows as a card with Change;
 * the list searches names and definitions, puts three suggestions for the
 * dashboard's category first, then groups the rest by category. Arrow keys
 * move through it like any radio group.
 */
export function MetricPicker({
  value, category, onChange, hideLabel = false, compact = false,
}: {
  value: Metric | undefined; category: CategoryId; onChange: (m: Metric) => void; hideLabel?: boolean;
  /** Explore: the chosen metric as just its name, its definition behind ⓘ, and Change. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!value);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  if (value && compact) return <CompactMetric value={value} category={category} onChange={onChange} hideLabel={hideLabel} />;

  if (!open && value) {
    return (
      <div>
        <p className={hideLabel ? "sr-only" : "mb-1 text-sm font-medium text-slate-700"}>Metric</p>
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{value.name}</p>
            <p className="text-xs font-medium text-slate-600">{kindLabel(value)}</p>
            <p className="mt-0.5 text-xs text-slate-600">{value.definition}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <CategoryChip category={value.category} />
              {value.unit === "count" ? "Count" : `In ${UNIT_LABEL[value.unit]}`}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="rounded text-sm font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
            Change
          </button>
        </div>
      </div>
    );
  }

  const pick = (m: Metric) => { onChange(m); setOpen(false); setQuery(""); };

  return (
    <fieldset>
      <legend className={hideLabel ? "sr-only" : "mb-1 text-sm font-medium text-slate-700"}>Metric</legend>
      <MetricList value={value} category={category} query={query} onQuery={setQuery} onPick={pick} searchRef={search} />
      {value && (
        <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="mt-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
          Keep {value.name}
        </button>
      )}
    </fieldset>
  );
}

/**
 * Explore's metric: its name, its definition behind ⓘ, and Change, which
 * opens the list in a popover (search, suggestions first, each metric once).
 * Escape, a click outside or a choice close it, and focus goes back to Change.
 */
function CompactMetric({ value, category, onChange, hideLabel }: { value: Metric; category: CategoryId; onChange: (m: Metric) => void; hideLabel: boolean }) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const change = useRef<HTMLButtonElement>(null);
  const { open, button: card, panel, show, close: hide, style } = useAnchoredPopover<HTMLDivElement>({ height: 380 });
  const close = () => { hide(false); setQuery(""); change.current?.focus(); };

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  return (
    <div>
      <p className={hideLabel ? "sr-only" : EYEBROW}>Metric</p>
      {/* A field, like a select: the metric in strong text, Change as its button. */}
      <div ref={card} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-1.5 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{value.name}</span>
        <FocusTip label={`What ${value.name} means`} content={<DefinitionTip metric={value} />} />
        <button
          ref={change}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? close() : show())}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          Change
        </button>
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
