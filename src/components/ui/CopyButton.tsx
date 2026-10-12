"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

const CONFIRM_MS = 1500;

/**
 * An ID that can be copied. Wraps the value it copies so the icon belongs to
 * that value alone: it shows only while the value is hovered or the button has
 * keyboard focus, and it takes no space. It sits 6px after the value, drawn
 * over whatever follows on an opaque backing in the surface's colour, so the
 * value reads exactly like plain text until you point at it. The 6px gap is
 * part of the hover area, so the icon doesn't vanish on the way to it.
 *
 * While hidden it ignores the pointer, so it never catches clicks or hovers
 * meant for the text beneath it. It stays in the Tab order and appears when
 * focused.
 *
 * The look is the Swap Audit drawer's original copy: a slate Copy icon that
 * turns into a green tick, with a "Copied" bubble in InfoTip's tooltip style,
 * announced to screen readers. It stops both the click and the key press from
 * reaching its row, so copying never opens a drawer, row or trail.
 */
export function CopyButton({
  value, label, children, onWhite, className,
}: {
  value: string;
  /** What is copied, for the button's name: "Swap Txn ID" reads "Copy Swap Txn ID". */
  label: string;
  /** What is shown, when it differs from what is copied. Defaults to `value`. */
  children?: React.ReactNode;
  /** The value sits on white (the drawer header) rather than slate-50. */
  onWhite?: boolean;
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
    <span className={cn("group/copy relative inline-flex items-center whitespace-nowrap", className)}>
      {children ?? value}
      <span
        className={cn(
          "absolute left-full top-1/2 z-10 flex -translate-y-1/2 pl-1.5",
          copied
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover/copy:pointer-events-auto group-hover/copy:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
        )}
      >
        <button
          type="button"
          onClick={copy}
          onKeyDown={(e) => e.stopPropagation()}
          title={`Copy ${label}`}
          aria-label={`Copy ${label}`}
          className={cn(
            "flex rounded text-slate-400 hover:text-slate-600 transition-colors",
            onWhite ? "bg-white" : "bg-slate-50"
          )}
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
        {copied && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 font-sans text-xs font-normal normal-case tracking-normal text-white"
          >
            Copied
          </span>
        )}
        <span aria-live="polite" className="sr-only">{copied ? "Copied" : ""}</span>
      </span>
    </span>
  );
}
