"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Titles, and group headings inside a popover, in ColumnFilterPanel's caption style. */
export const CAPTION = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** "close" covers Cancel and closing after Apply or the footer action. */
export type DismissReason = "close" | "escape" | "outside";

/**
 * The toolbar's popover shell, shared by Filters and Columns so both read and
 * behave the same: a title row, a middle that alone scrolls, and a fixed
 * footer with a text action on the left and Cancel / Apply on the right.
 *
 * It's fixed under its button, left-aligned to it and kept inside the viewport,
 * so it floats over the table without moving it; it's capped at 70vh. It stays
 * rendered in place inside <main> so globals.css's dark-mode overrides reach it.
 *
 * The owner mounts it only while open, so whatever draft lives inside starts
 * fresh each time and unmounting discards it. Cancel, Esc and an outside click
 * all go through `onDismiss`; there's no ✕. Native dropdown lists and date pickers draw
 * above the page, and using them isn't an outside click: the control they
 * belong to is inside the popover.
 */
export function ToolbarPopover({
  id,
  title,
  anchorRef,
  width,
  initialFocus,
  onDismiss,
  footerAction,
  applyLabel,
  applyDisabled,
  onApply,
  children,
}: {
  id: string;
  title: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** A width utility, e.g. "w-70". */
  width: string;
  /** Selector for the control that takes focus on open; the first control otherwise. */
  initialFocus?: string;
  onDismiss: (reason: DismissReason) => void;
  /** The footer's left-hand text action. It acts at once rather than on the draft; the owner decides whether it also closes. */
  footerAction: { label: string; icon?: React.ReactNode; onClick: () => void };
  applyLabel: string;
  applyDisabled: boolean;
  onApply: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useLayoutEffect(() => {
    dismiss.current = onDismiss;
  });

  // Under the button, left-aligned, inside the viewport, before the first paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const top = r.bottom + 6;
      el.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8))}px`;
      el.style.top = `${top}px`;
      el.style.maxHeight = `${Math.min(window.innerHeight * 0.7, window.innerHeight - top - 8)}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  // Focus moves into the popover when it opens.
  useEffect(() => {
    const body = bodyRef.current;
    const target = (initialFocus && body?.querySelector<HTMLElement>(initialFocus)) || body?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc and an outside click dismiss, like Cancel.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      dismiss.current("outside");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss.current("escape");
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef]);

  // Keep Tab inside the popover while it's open.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      onKeyDown={trapTab}
      className={cn("fixed z-50 flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg", width)}
      style={{ top: -9999, left: -9999 }}
    >
      <div className="px-4 pt-3 pb-2 shrink-0">
        <h2 id={`${id}-title`} className={CAPTION}>
          {title}
        </h2>
      </div>

      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
        {children}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 shrink-0">
        <button
          onClick={footerAction.onClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline dark:text-(--sidebar-text) rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          {footerAction.icon}
          {footerAction.label}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onDismiss("close")}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onApply} disabled={applyDisabled}>
            {applyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
