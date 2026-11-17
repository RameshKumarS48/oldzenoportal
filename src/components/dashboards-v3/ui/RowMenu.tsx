"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

const ITEM_PX = 36;

/**
 * The ⋯ menu. Opens with a click, Enter, Space or ↓; ↑ ↓ Home End move
 * through it, Escape or Tab closes it, and focus goes back to the button.
 * It's fixed to the viewport so a table's scroll box never clips it, and
 * opens upwards near the bottom of the screen.
 */
export function RowMenu({ label, items, className }: { label: string; items: MenuItem[]; className?: string }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  function show(focus: number) {
    const r = button.current!.getBoundingClientRect();
    const height = items.length * ITEM_PX + 8;
    const right = window.innerWidth - r.right;
    setPos(r.bottom + 4 + height > window.innerHeight ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    setActive(focus);
  }

  function hide(returnFocus = true) {
    setPos(null);
    if (returnFocus) button.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    (menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]")[active])?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setPos(null);
    };
    const onMove = () => setPos(null);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const last = items.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a === last ? 0 : a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a === 0 ? last : a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "Escape") { e.preventDefault(); hide(); }
    else if (e.key === "Tab") hide(false);
  }

  return (
    <div className={cn("relative inline-flex", className)} onClick={(e) => e.stopPropagation()}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? hide() : show(0))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); show(0); }
          if (e.key === "ArrowUp") { e.preventDefault(); show(items.length - 1); }
        }}
        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right }}
          className="z-[60] w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger }, i) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              tabIndex={i === active ? 0 : -1}
              onMouseEnter={() => setActive(i)}
              onClick={() => { hide(); onSelect(); }}
              className={cn(
                "flex h-9 w-full items-center gap-2 px-3 text-left text-sm focus:bg-slate-50 focus:outline-none",
                danger ? "text-red-600" : "text-slate-700"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
