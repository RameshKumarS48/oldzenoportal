"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Open dialogs, newest last: only the top one answers Escape and Tab, so a confirm on top of a dialog works. */
const stack: symbol[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The shared Modal's look, plus what a keyboard needs: focus moves in when
 * it opens (to a [data-autofocus] field, else the first control after Close), Tab stays
 * inside, Escape closes, and focus goes back to whatever opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  badge,
  subtitle,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Beside the title, e.g. "Step 1 of 2". */
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned under the scrolling body, for the dialog's buttons. */
  footer?: React.ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const token = Symbol("dialog");
    stack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const el = panel.current!;
    const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelectorAll<HTMLElement>(FOCUSABLE)[1] ?? el;
    first.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        close.current();
      }
      if (e.key !== "Tab") return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && (document.activeElement === head || !el.contains(document.activeElement))) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (document.activeElement === tail || !el.contains(document.activeElement))) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("relative z-10 mx-4 flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl focus:outline-none", className)}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id={titleId} className="text-base font-semibold text-slate-800">{title}</h2>
              {badge && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{badge}</span>}
            </div>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** ConfirmModal's look on the v3 Dialog: the body says what will happen, not "are you sure". */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button
            onClick={onConfirm}
            className={cn("text-white", tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-zeno-teal hover:bg-zeno-teal-hover")}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", tone === "danger" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500")}>
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
    </Dialog>
  );
}
