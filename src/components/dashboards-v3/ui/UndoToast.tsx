"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface UndoAction {
  /** Bumped for every new toast, so a second removal restarts the timer. */
  key: number;
  title: string;
  undo: () => void;
}

const DISMISS_AFTER = 8000;

/**
 * The v3-only toast with an Undo button, in the shared Toaster's place and
 * style (the shared one has no actions and stays untouched). It waits while
 * hovered or focused, so there's time to reach Undo by keyboard.
 */
export function UndoToast({ action, onDismiss }: { action: UndoAction | null; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!action || paused) return;
    const id = setTimeout(onDismiss, DISMISS_AFTER);
    return () => clearTimeout(id);
  }, [action, paused, onDismiss]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[100] -translate-x-1/2">
      {action && (
        <div
          key={action.key}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex items-center gap-3 rounded-lg border border-slate-200 bg-white py-2.5 pl-3.5 pr-2 text-[#003B49] shadow-lg shadow-slate-900/5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-[13px] font-semibold">{action.title}</p>
          <span aria-hidden className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => { action.undo(); onDismiss(); }}
            className="rounded px-1.5 py-0.5 text-[13px] font-semibold text-zeno-teal underline underline-offset-2 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded p-1 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
