"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HourOption {
  value: number;
  label: string;
  /** Set when the hour can't be picked; shown as a tooltip on hover. */
  disabledReason?: string;
}

const TRIGGER =
  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 tabular-nums transition-colors duration-700 " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

/**
 * An hour picker that can grey out hours and say why. A native <select>
 * can't show a tooltip on an option, so this is a button plus a listbox.
 *
 * Keyboard: Tab reaches the button; Enter, Space, ↓ or ↑ opens it; ↑ ↓ Home
 * End move between enabled hours only; Enter or Space picks; Esc or Tab
 * closes. The list is fixed-positioned so a scrolling modal can't clip it.
 */
export function HourSelect({
  value,
  options,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  options: HourOption[];
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Extra trigger classes, e.g. a brief highlight; colours fade over 700 ms. */
  className?: string;
  "aria-label": string;
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const refocus = useRef(false);

  const enabled = options.filter((o) => !o.disabledReason);
  const current = options.find((o) => o.value === value);

  function openList() {
    if (disabled || !buttonRef.current) return;
    setRect(buttonRef.current.getBoundingClientRect());
    setActive(enabled.some((o) => o.value === value) ? value : enabled[0]?.value ?? value);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setTip(null);
  }

  function pick(v: number) {
    close();
    refocus.current = true;
    if (v !== value) onChange(v);
  }

  // A pick can re-sort the rows, which moves this button in the DOM and can
  // drop its focus, so focus it again once the move has rendered.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    buttonRef.current?.focus();
  });

  /** Step to the next enabled hour, `dir` = 1 down or -1 up. */
  function move(dir: 1 | -1) {
    const i = enabled.findIndex((o) => o.value === active);
    const next = enabled[Math.min(Math.max(i + dir, 0), enabled.length - 1)];
    if (next) setActive(next.value);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); move(1); break;
      case "ArrowUp": e.preventDefault(); move(-1); break;
      case "Home": e.preventDefault(); if (enabled[0]) setActive(enabled[0].value); break;
      case "End": e.preventDefault(); if (enabled.length) setActive(enabled[enabled.length - 1].value); break;
      case "Enter":
      case " ": e.preventDefault(); pick(active); break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": close(); break;
    }
  }

  // Keep the active hour in view while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-value="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // A click outside, or the page scrolling or resizing under it, closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) close();
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
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(TRIGGER, className)}
      >
        <span>{current?.label ?? "–"}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-400", disabled && "opacity-0")} />
      </button>

      {open && rect && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[60] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: rect.left, top: rect.bottom + 4, width: rect.width }}
        >
          {options.map((o) => {
            const off = !!o.disabledReason;
            return (
              <li
                key={o.value}
                id={`${id}-${o.value}`}
                data-value={o.value}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={off || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => !off && pick(o.value)}
                onMouseEnter={(e) => {
                  if (!off) return setActive(o.value);
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ text: o.disabledReason!, x: r.right + 8, y: r.top + r.height / 2 });
                }}
                onMouseLeave={() => setTip(null)}
                className={cn(
                  "px-3 py-1.5 text-sm tabular-nums",
                  off ? "text-slate-300 cursor-not-allowed" : "text-slate-700 cursor-pointer",
                  !off && o.value === active && "bg-slate-100",
                  o.value === value && "font-semibold"
                )}
              >
                {o.label}
                {off && <span className="sr-only">, {o.disabledReason}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {tip && (
        <span
          role="tooltip"
          className="fixed z-[70] pointer-events-none -translate-y-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </span>
      )}
    </>
  );
}
