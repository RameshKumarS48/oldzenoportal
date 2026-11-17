"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronRight, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuChoice {
  label: string;
  checked: boolean;
  onSelect: () => void;
}

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  /** Why it can't be used right now: the item stays visible, greyed, with this reason under it. */
  blocked?: string | null;
  /** Opens a submenu of choices instead of acting, e.g. Size ▸. */
  choices?: MenuChoice[];
}

const ITEM_PX = 36;

/**
 * The ⋯ menu. Opens with a click, Enter, Space or ↓; ↑ ↓ Home End move
 * through it, → or Enter opens a submenu and ← closes it, Escape or Tab
 * closes the menu, and focus goes back to the button. It's fixed to the
 * viewport so a scroll box never clips it, and opens upwards near the
 * bottom of the screen. Blocked items stay focusable and say why.
 */
export function RowMenu({ label, items, className }: { label: string; items: MenuItem[]; className?: string }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [active, setActive] = useState(0);
  const [sub, setSub] = useState<{ index: number; top: number; right: number; active: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const subMenu = useRef<HTMLDivElement>(null);
  const open = pos !== null;
  const menuId = useId();

  function show(focus: number) {
    const r = button.current!.getBoundingClientRect();
    const height = items.reduce((h, it) => h + (it.blocked ? ITEM_PX + 14 : ITEM_PX), 8);
    const right = window.innerWidth - r.right;
    setPos(r.bottom + 4 + height > window.innerHeight ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    setActive(focus);
    setSub(null);
  }

  function hide(returnFocus = true) {
    setPos(null);
    setSub(null);
    if (returnFocus) button.current?.focus();
  }

  function openSub(index: number) {
    const el = menu.current?.querySelectorAll<HTMLElement>("[data-item]")[index];
    const r = el?.getBoundingClientRect();
    const choices = items[index].choices ?? [];
    if (!r) return;
    const checked = Math.max(0, choices.findIndex((c) => c.checked));
    const top = Math.min(r.top - 4, window.innerHeight - (choices.length * ITEM_PX + 12));
    setSub({ index, top, right: window.innerWidth - r.left + 4, active: checked });
  }

  useEffect(() => {
    if (!open) return;
    if (sub) (subMenu.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]")[sub.active])?.focus();
    else (menu.current?.querySelectorAll<HTMLElement>("[data-item]")[active])?.focus();
  }, [open, active, sub]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !subMenu.current?.contains(t) && !button.current?.contains(t)) { setPos(null); setSub(null); }
    };
    const onMove = () => { setPos(null); setSub(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  function activate(i: number) {
    const item = items[i];
    if (item.blocked) return;
    if (item.choices) { openSub(i); return; }
    hide();
    item.onSelect?.();
  }

  function onMenuKey(e: React.KeyboardEvent) {
    if (sub) return;
    const last = items.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a === last ? 0 : a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a === 0 ? last : a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "ArrowRight" && items[active].choices && !items[active].blocked) { e.preventDefault(); openSub(active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); hide(); }
    else if (e.key === "Tab") hide(false);
  }

  function onSubKey(e: React.KeyboardEvent) {
    if (!sub) return;
    const last = (items[sub.index].choices?.length ?? 1) - 1;
    const move = (a: number) => setSub({ ...sub, active: a });
    e.stopPropagation();
    if (e.key === "ArrowDown") { e.preventDefault(); move(sub.active === last ? 0 : sub.active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(sub.active === 0 ? last : sub.active - 1); }
    else if (e.key === "ArrowLeft" || e.key === "Escape") { e.preventDefault(); setActive(sub.index); setSub(null); }
    else if (e.key === "Tab") hide(false);
  }

  const subItems = sub ? items[sub.index].choices ?? [] : [];

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
          className="z-[60] w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item, i) => {
            const { label: itemLabel, icon: Icon, danger, blocked, choices } = item;
            return (
              <button
                key={itemLabel}
                data-item
                type="button"
                role="menuitem"
                aria-disabled={!!blocked}
                aria-haspopup={choices ? "menu" : undefined}
                aria-expanded={choices ? sub?.index === i : undefined}
                aria-describedby={blocked ? `${menuId}-${i}-why` : undefined}
                tabIndex={i === active ? 0 : -1}
                onMouseEnter={() => { setActive(i); if (choices && !blocked) openSub(i); else if (sub) setSub(null); }}
                onClick={() => activate(i)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm focus:bg-slate-50 focus:outline-none",
                  blocked ? "cursor-not-allowed text-slate-400" : danger ? "text-red-600" : "text-slate-700"
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block">{itemLabel}</span>
                  {blocked && <span id={`${menuId}-${i}-why`} className="block text-xs text-slate-500">{blocked}</span>}
                </span>
                {choices && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
      {open && sub && (
        <div
          ref={subMenu}
          role="menu"
          aria-label={items[sub.index].label}
          onKeyDown={onSubKey}
          style={{ position: "fixed", top: sub.top, right: sub.right }}
          className="z-[61] w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {subItems.map((c, j) => (
            <button
              key={c.label}
              type="button"
              role="menuitemradio"
              aria-checked={c.checked}
              tabIndex={j === sub.active ? 0 : -1}
              onMouseEnter={() => setSub({ ...sub, active: j })}
              onClick={() => { hide(); c.onSelect(); }}
              className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm text-slate-700 focus:bg-slate-50 focus:outline-none"
            >
              <Check className={cn("h-4 w-4 shrink-0", c.checked ? "text-zeno-teal" : "invisible")} aria-hidden />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
