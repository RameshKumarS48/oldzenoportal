"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import { fmtClock, type SwapTxn } from "@/lib/mock/swap-audit";
import { VERDICT_META } from "./tokens";
import { DetailField, SessionDetail, StepBtn } from "./SessionDetail";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One session's evidence in a right-hand panel, so the table stays in view.
 * Styled after AddWidgetDrawer. Rendered in place rather than portalled: it has
 * to stay inside <main> to pick up globals.css's dark-mode overrides.
 */
export function SessionDrawer({
  txn, position, total, onPrev, onNext, onClose, alertNav,
}: {
  txn: SwapTxn | null;
  /** 1-based place of `txn` in the filtered list; 0 when it isn't in it. */
  position: number;
  total: number;
  /** Omitted at either end of the list, which disables that button. */
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  /** Set only when Swap Audit was opened from a Tampering Alert. */
  alertNav?: { id: string; violation: string; status: string; pending: boolean; href: string } | null;
}) {
  const open = txn !== null;

  // Keep the last session on screen while the panel slides out.
  const [shown, setShown] = useState(txn);
  if (txn && txn !== shown) setShown(txn);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus lands on the title (the customer) so screen readers announce it.
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
        {/* Who and the verdict, then where, when and which swap in the detail grid's label style. */}
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-4">
            {shown && (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h2
                  id="session-drawer-title"
                  ref={titleRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="font-medium text-slate-700 focus:outline-none"
                >
                  <CopyButton value={shown.cust.name} label="Customer name" onWhite />
                </h2>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", VERDICT_META[shown.verdict.status].badge)}>
                  {VERDICT_META[shown.verdict.status].label}
                </span>
              </div>
            )}
            <div className="flex items-center gap-4 shrink-0">
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

          {/* Same 4-column grid as Reference, so the columns line up below. */}
          {shown && (
            <div className="grid grid-cols-4 gap-4">
              <DetailField
                label="Station"
                value={
                  <>
                    <CopyButton value={shown.station.id} label="Station code" onWhite className="font-mono" />
                    <span className="block text-[10px] text-slate-400">{shown.station.name}</span>
                  </>
                }
              />
              {/* Times are station-local. Every station is in Nairobi, so that is EAT. */}
              <DetailField label="Time" value={`6 Oct, ${fmtClock(shown.startMinute)} EAT`} />
              <DetailField
                label="Swap Txn ID"
                value={
                  <CopyButton value={shown.id} label="Swap Txn ID" onWhite className="font-mono" />
                }
              />
              <DetailField
                label="Phone"
                value={
                  <CopyButton value={shown.cust.phone} label="Phone" onWhite className="font-mono" />
                }
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
          {shown && <SessionDetail key={shown.id} txn={shown} />}
        </div>

        {/* A row of its own under the body, not laid over it, so it hides nothing. */}
        {open && alertNav && (
          <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-200 bg-white">
            <span className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
              <span className="font-mono">{alertNav.id}</span>
              <span>{alertNav.violation}</span>
              {alertNav.status && <span>{alertNav.status}</span>}
            </span>
            <Link
              href={alertNav.href}
              aria-label={alertNav.pending ? `Return to alert ${alertNav.id} to decide` : `Back to alert ${alertNav.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-zeno-teal text-white hover:bg-zeno-teal-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {alertNav.pending ? "Return to alert to decide" : `Back to alert ${alertNav.id}`}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
