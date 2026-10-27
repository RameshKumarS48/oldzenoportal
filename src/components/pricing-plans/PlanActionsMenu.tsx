"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanAction {
  label: string;
  onSelect: () => void;
  /** Red text, for Delete plan. */
  danger?: boolean;
}

/**
 * A ⋯ button and its menu. Clicks don't reach a clickable row behind it.
 * The menu is fixed-positioned, like HourSelect's list, so a scrolling table
 * can't clip it; it closes on a click outside, scroll, resize, Esc or Tab.
 * ↑ ↓ Home End move between items, Enter or Space picks.
 */
export function PlanActionsMenu({ actions, "aria-label": ariaLabel }: { actions: PlanAction[]; "aria-label": string }) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(0);

  function open() {
    if (!buttonRef.current) return;
    setRect(buttonRef.current.getBoundingClientRect());
    setActive(0);
  }

  function close(refocus = false) {
    setRect(null);
    if (refocus) buttonRef.current?.focus();
  }

  function pick(a: PlanAction) {
    close(true);
    a.onSelect();
  }

  // Focus follows the active item while the menu is open.
  useEffect(() => {
    if (!rect) return;
    menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]")[active]?.focus();
  }, [rect, active]);

  useEffect(() => {
    if (!rect) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onMove = () => close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [rect]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = actions.length - 1;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((i) => (i === last ? 0 : i + 1)); break;
      case "ArrowUp": e.preventDefault(); setActive((i) => (i === 0 ? last : i - 1)); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(last); break;
      case "Escape": e.preventDefault(); close(true); break;
      case "Tab": close(); break;
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={!!rect}
        aria-controls={rect ? `${id}-menu` : undefined}
        onClick={() => (rect ? close() : open())}
        onKeyDown={(e) => {
          if (!rect && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            open();
          }
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {rect && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          className="fixed z-[60] min-w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ top: rect.bottom + 4, right: window.innerWidth - rect.right }}
        >
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              tabIndex={i === active ? 0 : -1}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(a)}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm whitespace-nowrap focus:outline-none",
                a.danger ? "text-red-600" : "text-slate-700",
                i === active && "bg-slate-100"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
