"use client";

import { useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDTH = 280;
/** Room the tip needs above its icon before it opens below instead. */
const ROOM_ABOVE = 180;

/**
 * InfoTip's look, reachable by keyboard too: the ⓘ is a button that shows
 * the tip on hover or focus, and Escape hides it. The tip is also the
 * button's description, so screen readers read it without opening anything.
 * It opens above the icon, off the chart below it, unless there's no room.
 */
export function FocusTip({ content, label, className }: { content: React.ReactNode; label: string; className?: string }) {
  const [pos, setPos] = useState<{ x: number; top?: number; bottom?: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(r.left + r.width / 2, WIDTH / 2 + 8), window.innerWidth - WIDTH / 2 - 8);
    setPos(r.top > ROOM_ABOVE ? { x, bottom: window.innerHeight - r.top + 8 } : { x, top: r.bottom + 8 });
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
        style={pos ? { position: "fixed", left: pos.x, top: pos.top, bottom: pos.bottom, transform: "translateX(-50%)", width: WIDTH } : undefined}
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

/** A metric's definition in its three parts, for the ⓘ tip. */
export function DefinitionTip({ definition, counted, goodTrend }: { definition: string; counted: string; goodTrend: string }) {
  return (
    <span className="block space-y-1.5">
      <span className="block">{definition}</span>
      <span className="block"><span className="font-semibold">How it’s counted: </span>{counted}</span>
      <span className="block"><span className="font-semibold">Good trend: </span>{goodTrend}</span>
    </span>
  );
}
