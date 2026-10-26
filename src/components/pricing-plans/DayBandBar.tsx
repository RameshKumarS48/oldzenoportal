"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_SECONDS,
  eatSecondOfDay,
  fmtHHmmss,
  fmtRateWindow,
  parseHHmmss,
  windowBoundary,
} from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * One colour per window: Tailwind teal 800, 300, 600, 200, 700, 400. The order
 * alternates dark and light so neighbours (and the last against the first,
 * around midnight) stay easy to tell apart.
 */
export const WINDOW_COLORS = ["#115e59", "#5eead4", "#0d9488", "#99f6e4", "#0f766e", "#2dd4bf"];

const colorOf = (i: number) => WINDOW_COLORS[i % WINDOW_COLORS.length];

/** The small square that ties a row to its band. */
export function WindowSwatch({ color, className }: { color: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-3 h-3 shrink-0 rounded-sm", className)}
      style={{ backgroundColor: colorOf(color) }}
    />
  );
}

export interface BandItem {
  /** Stable across edits (a form row's key), so a moving boundary animates. */
  id: string;
  window: RateWindow;
  color: number;
}

/** Rough width of a boundary label ("16:00:00") at 10px, with breathing room. */
const LABEL_PX = 52;

/** A boundary as its label: a start, "16:00:00", or the day's inclusive end, "23:59:59". */
const boundaryLabel = (at: number) => fmtHHmmss(at >= DAY_SECONDS ? DAY_SECONDS - 1 : at);

const rate = (n: number) => (Number.isFinite(n) ? String(n) : "–");

/**
 * The day as a 24 h strip: one coloured band per window, no text inside.
 * A window that crosses midnight is two bands, one at each end. Under it,
 * the boundary times sit at their boundaries; where two would overlap, a real
 * boundary beats the day's ends, then the earlier one wins.
 *
 * Hovering or focusing a band shows "21:00:00 → 06:59:59 · 90 / 70" and reports its
 * window through `onHighlight`; `highlighted` (an id) outlines that window.
 * `pulse` (seconds past midnight) flashes a boundary that just moved, and
 * `now` marks the current EAT time.
 */
export function DayBandBar({
  items,
  now,
  highlighted,
  onHighlight,
  pulse,
  className,
}: {
  items: BandItem[];
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
  pulse?: number | null;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Labels depend on the bar's real width, which changes with the modal or page.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Both ends are inclusive, so a band runs to the second after its end.
  // Pieces are keyed by id and side, so a moving edge slides instead of jumping.
  const bands = items.flatMap((item) => {
    const s = parseHHmmss(item.window.start) / DAY_SECONDS;
    const e = windowBoundary(item.window) / DAY_SECONDS;
    const pieces: { side: string; a: number; b: number }[] =
      s < e ? [{ side: "main", a: s, b: e }] : [{ side: "late", a: s, b: 1 }, { side: "early", a: 0, b: e }];
    const live = pieces.filter((p) => p.b > p.a);
    const main = live.reduce((x, y) => (y.b - y.a > x.b - x.a ? y : x));
    return live.map((p) => ({ ...item, ...p, focusable: p === main }));
  });

  const labels = boundaryLabels(items.map((i) => parseHHmmss(i.window.start)), width);
  const marker = now ? eatSecondOfDay(now) / DAY_SECONDS : null;

  function show(item: BandItem, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setTip({ text: tipText(item.window), x: r.left + r.width / 2, y: r.top });
    onHighlight?.(item.id);
  }

  function hide() {
    setTip(null);
    onHighlight?.(null);
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div ref={barRef} className="relative h-6 rounded-md bg-slate-200 overflow-hidden">
        {bands.map((band) => {
          const on = highlighted === band.id;
          return (
            <div
              key={`${band.id}-${band.side}`}
              role={band.focusable ? "img" : undefined}
              tabIndex={band.focusable ? 0 : undefined}
              aria-label={band.focusable ? tipText(band.window) : undefined}
              aria-hidden={band.focusable ? undefined : true}
              onMouseEnter={(e) => show(band, e.currentTarget)}
              onMouseLeave={hide}
              onFocus={(e) => show(band, e.currentTarget)}
              onBlur={hide}
              className={cn(
                "absolute inset-y-0 border-r border-white transition-[left,width,opacity] duration-300 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white",
                highlighted && !on && "opacity-40",
                on && "ring-2 ring-inset ring-white"
              )}
              style={{ left: `${band.a * 100}%`, width: `${(band.b - band.a) * 100}%`, backgroundColor: colorOf(band.color) }}
            />
          );
        })}
        {pulse != null && (
          <div
            className="absolute -inset-y-px z-10 w-0.5 -translate-x-1/2 bg-slate-900 animate-pulse pointer-events-none transition-[left] duration-300 ease-out"
            style={{ left: `${(pulse / DAY_SECONDS) * 100}%` }}
            aria-hidden="true"
          />
        )}
        {marker !== null && (
          <div
            className="absolute -inset-y-px z-20 w-0.5 -translate-x-1/2 bg-zeno-red pointer-events-none"
            style={{ left: `${marker * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative h-4 text-[10px] text-slate-400 tabular-nums" aria-hidden="true">
        {labels.map((l) => (
          <span
            key={l.at}
            className={cn("absolute top-0 whitespace-nowrap", l.at === 0 ? "left-0" : l.at === DAY_SECONDS ? "right-0" : "-translate-x-1/2")}
            style={l.at === 0 || l.at === DAY_SECONDS ? undefined : { left: `${(l.at / DAY_SECONDS) * 100}%` }}
          >
            {boundaryLabel(l.at)}
          </span>
        ))}
      </div>

      {tip && (
        <span
          role="tooltip"
          className="fixed z-[70] pointer-events-none -translate-x-1/2 -translate-y-full -mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap tabular-nums"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </span>
      )}
    </div>
  );
}

function tipText(w: RateWindow): string {
  return `${fmtRateWindow(w)} · ${rate(w.slab1)} / ${rate(w.slab2)}`;
}

/**
 * The boundary labels that fit at `width` px. Candidates are every window
 * start plus the day's ends (00:00:00, 23:59:59); a start at midnight makes both
 * ends real boundaries. Real boundaries are placed first, then the ends,
 * earliest first within each, skipping any that would overlap one already placed.
 */
function boundaryLabels(starts: number[], width: number): { at: number }[] {
  if (width <= 0) return [];
  const real = new Set(starts.map((s) => s % DAY_SECONDS));
  if (real.has(0)) real.add(DAY_SECONDS);
  const candidates = [...new Set([0, DAY_SECONDS, ...real])]
    .map((at) => ({ at, real: real.has(at) }))
    .sort((x, y) => Number(y.real) - Number(x.real) || x.at - y.at);

  // Each label's span in px: the ends sit flush with the bar's edges, the rest are centred.
  const span = (at: number): [number, number] => {
    const x = (at / DAY_SECONDS) * width;
    if (at === 0) return [0, LABEL_PX];
    if (at === DAY_SECONDS) return [width - LABEL_PX, width];
    return [x - LABEL_PX / 2, x + LABEL_PX / 2];
  };
  const placed: { at: number; s: [number, number] }[] = [];
  for (const c of candidates) {
    const s = span(c.at);
    if (placed.every((p) => s[1] <= p.s[0] || s[0] >= p.s[1])) placed.push({ at: c.at, s });
  }
  return placed.map(({ at }) => ({ at })).sort((x, y) => x.at - y.at);
}
