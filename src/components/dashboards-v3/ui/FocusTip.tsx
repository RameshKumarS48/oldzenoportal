"use client";

import { useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * InfoTip's look, reachable by keyboard too: the ⓘ is a button that shows
 * the tip on hover or focus, and Escape hides it. The text is also the
 * button's description, so screen readers read it without opening anything.
 */
export function FocusTip({ content, label, className }: { content: string; label: string; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.bottom });
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onKeyDown={(e) => { if (e.key === "Escape" && pos) { e.preventDefault(); setPos(null); } }}
        className={cn("inline-flex rounded text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40", className)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        style={pos ? { position: "fixed", left: pos.x, top: pos.y + 8, transform: "translateX(-50%)", width: 256 } : undefined}
        className={cn(
          "pointer-events-none z-[70] whitespace-normal rounded-lg bg-slate-800 px-3 py-2.5 text-xs leading-relaxed text-white shadow-xl",
          !pos && "sr-only"
        )}
      >
        {content}
      </span>
    </>
  );
}
