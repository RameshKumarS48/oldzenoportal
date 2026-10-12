"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

const CONFIRM_MS = 1500;

/**
 * Copies one ID-like value. The look is the Swap Audit drawer's original
 * Swap Txn ID copy: a slate Copy icon that turns into a green tick, with a
 * "Copied" bubble in InfoTip's tooltip style, announced to screen readers.
 *
 * It sits inside clickable rows, so it stops both the click and the key press
 * from reaching the row: copying never opens a drawer, trail or row.
 *
 * `reveal` hides it until its row (marked `group`) is hovered or holds focus;
 * it keeps its space either way, so nothing shifts when it appears.
 */
export function CopyButton({
  value, label, reveal, className,
}: {
  value: string;
  /** What is copied, for the button's name: "Swap Txn ID" reads "Copy Swap Txn ID". */
  label: string;
  reveal?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
    } catch {
      toast.error(`Couldn't copy the ${label}`, `Your browser blocked clipboard access. Select the ${label} and copy it manually.`);
    }
  };

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0",
        reveal && !copied && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100",
        className
      )}
    >
      <button
        type="button"
        onClick={copy}
        onKeyDown={(e) => e.stopPropagation()}
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
        className="rounded text-slate-400 hover:text-slate-600 transition-colors"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
      {copied && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 font-sans text-xs font-normal normal-case tracking-normal text-white"
        >
          Copied
        </span>
      )}
      <span aria-live="polite" className="sr-only">{copied ? "Copied" : ""}</span>
    </span>
  );
}
