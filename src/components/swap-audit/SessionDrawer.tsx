"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwapTxn } from "@/lib/mock/swap-audit";
import { SessionDetail, StepBtn } from "./SessionDetail";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One session's evidence in a right-hand panel, so the table stays in view.
 * Styled after AddWidgetDrawer. Rendered in place rather than portalled: it has
 * to stay inside <main> to pick up globals.css's dark-mode overrides.
 */
export function SessionDrawer({
  txn, position, total, onPrev, onNext, onClose,
}: {
  txn: SwapTxn | null;
  /** 1-based place of `txn` in the filtered list; 0 when it isn't in it. */
  position: number;
  total: number;
  /** Omitted at either end of the list, which disables that button. */
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const open = txn !== null;

  // Keep the last session on screen while the panel slides out.
  const [shown, setShown] = useState(txn);
  if (txn && txn !== shown) setShown(txn);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus lands on the title so screen readers announce which session opened.
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // Esc closes; up and down step through the list, except where the arrows
  // already mean something (a field or dropdown) or a modifier is held.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if ((e.target as HTMLElement).closest("input, select, textarea, [contenteditable='true']")) return;
      e.preventDefault();
      (e.key === "ArrowUp" ? onPrev : onNext)?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  // Reaching either end disables the button that got you there; hand focus to
  // the other one rather than letting it fall out of the drawer.
  const navRef = useRef<HTMLDivElement>(null);
  const refocusRef = useRef<"prev" | "next" | null>(null);
  const step = (dir: "prev" | "next") => {
    const atEnd = dir === "prev" ? position - 1 <= 1 : position + 1 >= total;
    if (atEnd) refocusRef.current = dir === "prev" ? "next" : "prev";
    (dir === "prev" ? onPrev : onNext)?.();
  };
  useEffect(() => {
    const target = refocusRef.current;
    refocusRef.current = null;
    if (target) navRef.current?.querySelector<HTMLElement>(`[data-nav="${target}"] button`)?.focus();
  }, [position]);

  // A wheel over the backdrop must not scroll the table behind it. React's
  // onWheel is passive, so this needs a real listener to preventDefault.
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, []);

  // Keep Tab inside the panel while it's open.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === titleRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      inert={!open}
      className={cn(
        "fixed inset-0 z-50 flex justify-end transition-opacity",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-drawer-title"
        onKeyDown={trapTab}
        className={cn(
          "relative bg-white w-full lg:w-2/3 h-full shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2
            id="session-drawer-title"
            ref={titleRef}
            tabIndex={-1}
            aria-live="polite"
            className="font-semibold text-slate-800 focus:outline-none"
          >
            Swap session · {shown?.id}
          </h2>
          <div className="flex items-center gap-4">
            <div ref={navRef} className="flex items-center gap-2">
              <span data-nav="prev">
                <StepBtn onClick={() => step("prev")} disabled={!onPrev}>
                  <ChevronUp className="w-3 h-3" /> Previous
                </StepBtn>
              </span>
              <span data-nav="next">
                <StepBtn onClick={() => step("next")} disabled={!onNext}>
                  Next <ChevronDown className="w-3 h-3" />
                </StepBtn>
              </span>
              {position > 0 && (
                <span className="text-[11px] text-slate-400 tabular-nums">{position} of {total}</span>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
          {shown && <SessionDetail key={shown.id} txn={shown} />}
        </div>
      </div>
    </div>
  );
}
