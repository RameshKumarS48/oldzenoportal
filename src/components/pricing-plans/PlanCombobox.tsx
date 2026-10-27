"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PricingPlan } from "@/lib/pricing/types";

/**
 * Pick a plan by typing part of its name. The input is the combobox: typing
 * filters the list under it, ↑ ↓ move, Enter picks, Esc closes (and puts
 * back the picked plan's name). Like HourSelect, the list is fixed-positioned
 * so a modal can't clip it, and it closes on a click outside or a scroll.
 */
export function PlanCombobox({
  plans,
  value,
  onChange,
  id,
  placeholder = "Search plans…",
}: {
  plans: PricingPlan[];
  value: string;
  onChange: (planId: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const picked = plans.find((p) => p.id === value);
  const [query, setQuery] = useState(picked?.name ?? "");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(0);
  const open = rect !== null;

  // While the text is the picked plan's name, show every plan, so reopening isn't a list of one.
  const q = query.trim().toLowerCase();
  const matches = !q || q === picked?.name.toLowerCase() ? plans : plans.filter((p) => p.name.toLowerCase().includes(q));

  function openList() {
    if (!inputRef.current) return;
    setRect(inputRef.current.getBoundingClientRect());
    setActive(Math.max(0, matches.findIndex((p) => p.id === value)));
  }

  function close() {
    setRect(null);
    setQuery(picked?.name ?? "");
  }

  function pick(p: PricingPlan) {
    setRect(null);
    setQuery(p.name);
    if (p.id !== value) onChange(p.id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); break;
      case "ArrowUp": e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); break;
      case "Enter": e.preventDefault(); if (matches[active]) pick(matches[active]); break;
      case "Escape": e.preventDefault(); e.stopPropagation(); close(); break;
      case "Tab": close(); break;
    }
  }

  // Keep the active plan in view while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    const onMove = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // close reads the latest picked name; re-subscribing on every render isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={openList}
          onClick={() => !open && openList()}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="fixed z-[60] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: rect.left, top: rect.bottom + 4, width: rect.width }}
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No plan matches “{query.trim()}”</li>}
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={p.id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(p)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm text-slate-700",
                i === active && "bg-slate-100",
                p.id === value && "font-semibold"
              )}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
