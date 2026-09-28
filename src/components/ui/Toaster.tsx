"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToastStore } from "@/store/toast";
import type { Toast, ToastTone } from "@/store/toast";

const DISMISS_AFTER: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 8000, // Errors stay long enough to be read and acted on.
};

const ICON: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-white text-emerald-700",
  error:   "border-red-200 bg-white text-red-700",
  info:    "border-slate-200 bg-white text-[#003B49]",
};

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICON[toast.tone];

  useEffect(() => {
    const id = setTimeout(() => dismiss(toast.id), DISMISS_AFTER[toast.tone]);
    return () => clearTimeout(id);
  }, [toast.id, toast.tone, dismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-[340px] items-start gap-3 rounded-lg border px-3.5 py-3 shadow-lg shadow-slate-900/5 ${TONE[toast.tone]}`}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug">{toast.title}</p>
        {toast.detail && (
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{toast.detail}</p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 rounded p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Bottom-right stack, newest last. Announced to screen readers as it changes. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2"
    >
      {toasts.map((t) => <ToastRow key={t.id} toast={t} />)}
    </div>
  );
}
