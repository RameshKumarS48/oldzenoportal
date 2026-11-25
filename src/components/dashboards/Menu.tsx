"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }

/** A ⋯ button with a short list of actions. Esc or a click outside closes it. */
export function Menu({ label, items, align = "right", children }: { label: string; items: MenuItem[]; align?: "left" | "right"; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  if (!items.length) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className={cn("inline-flex items-center gap-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/30", children ? "border border-slate-200 bg-white px-2 py-1.5" : "p-1.5")}>
        {children ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div role="menu" className={cn("absolute top-full z-30 mt-1 min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg", align === "right" ? "right-0" : "left-0")}>
          {items.map((item) => (
            <button key={item.label} type="button" role="menuitem" disabled={item.disabled}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); item.onSelect(); }}
              className={cn("block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40", item.danger ? "text-red-600" : "text-slate-700")}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
