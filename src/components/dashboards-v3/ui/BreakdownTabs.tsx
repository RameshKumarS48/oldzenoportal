"use client";

import { useEffect, useRef, useState } from "react";
import { PROPERTIES, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { cn } from "@/lib/utils";

const TAB = "whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

/**
 * The breakdowns a widget's viewers can switch between, under its title:
 * small tabs (the tabs pattern: ← → move and select, Home and End, the
 * chosen one aria-selected), or, when they don't fit the widget's width, a
 * compact "By: Region ▾" select. Switching is for this viewer only.
 *
 * A hidden copy of the tabs is measured against the space there is, so the
 * choice between tabs and the select follows the widget's width as it changes.
 */
export function BreakdownTabs({
  idBase, options, value, onChange, panelId,
}: {
  idBase: string;
  options: PropertyId[];
  value: PropertyId;
  onChange: (p: PropertyId) => void;
  /** The widget body the tabs control. */
  panelId: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const measure = () => {
      if (!box.current || !probe.current) return;
      const room = box.current.clientWidth;
      // No layout yet (a hidden tab, a test page): keep the tabs.
      setFits(room === 0 || probe.current.scrollWidth <= room);
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !box.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [options]);

  function onKey(e: React.KeyboardEvent) {
    const at = options.indexOf(value);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: options.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = options[(to + options.length) % options.length];
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${idBase}-tab-${next}`)?.focus());
  }

  return (
    <div ref={box} className="relative min-w-0 basis-full">
      <div ref={probe} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-1 whitespace-nowrap">
        {options.map((p) => <span key={p} className={TAB}>{PROPERTIES[p].name}</span>)}
      </div>
      {fits ? (
        <div ref={list} role="tablist" aria-label="Break down by" onKeyDown={onKey} className="flex gap-1">
          {options.map((p) => {
            const on = p === value;
            return (
              <button
                key={p}
                id={`${idBase}-tab-${p}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={panelId}
                tabIndex={on ? 0 : -1}
                onClick={() => onChange(p)}
                className={cn(TAB, on ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
              >
                {PROPERTIES[p].name}
              </button>
            );
          })}
        </div>
      ) : (
        <label className="inline-flex items-center gap-1 text-xs text-slate-600">
          By:
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as PropertyId)}
            aria-controls={panelId}
            className="rounded-md border border-slate-200 bg-white py-0.5 pl-1.5 pr-6 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
          >
            {options.map((p) => <option key={p} value={p}>{PROPERTIES[p].name}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
