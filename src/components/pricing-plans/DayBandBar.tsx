"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_SECONDS,
  eatSecondOfDay,
  fmtHHmm,
  fmtRateWindowHHmm,
  parseHHmmss,
  windowBoundary,
  sortWindows,
  type BaseRates,
} from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * One colour per custom window: Tailwind teal 800, 300, 600, 200, 700, 400.
 * The order alternates dark and light so neighbours (and the last against the
 * first, around midnight) stay easy to tell apart.
 */
export const WINDOW_COLORS = ["#115e59", "#5eead4", "#0d9488", "#99f6e4", "#0f766e", "#2dd4bf"];

/**
 * Default Rate hours are a solid Tailwind slate 400: neutral against the
 * teal slots, clearly darker than the slate 100 of hours with no rate yet,
 * and a filled dot, so its swatch never reads as an empty radio button.
 */
const BASE_FILL = "#94a3b8";

/** True when these are the Default plan's Default Rate: the only rates drawn grey. */
export const isDefaultRate = (w: Pick<RateWindow, "slab1" | "slab2">, defaultRate: BaseRates | null) =>
  !!defaultRate && w.slab1 === defaultRate.slab1 && w.slab2 === defaultRate.slab2;

/** A slot's colour by index, or slate for Default Rate hours. */
const colorOf = (color: number | "base") => (color === "base" ? BASE_FILL : WINDOW_COLORS[color % WINDOW_COLORS.length]);

/** The small dot that ties a row to its band; round, so it never reads as a checkbox. */
export function WindowSwatch({ color, className }: { color: number | "base"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-3 h-3 shrink-0 rounded-full", className)}
      style={{ backgroundColor: colorOf(color) }}
    />
  );
}

export interface BandItem {
  /** Stable across edits (a form row's key, or a saved window's start), so a moving boundary animates. */
  id: string;
  window: RateWindow;
  color: number | "base";
}

/**
 * A saved version's bands, in time order: grey where the rates are the
 * Default plan's Default Rate (`defaultRate`; null for a plan in another
 * currency), and every other stretch in its own colour.
 */
export function versionBands(windows: RateWindow[], defaultRate: BaseRates | null): BandItem[] {
  let next = 0;
  return sortWindows(windows).map((w) => ({ id: w.start, window: w, color: isDefaultRate(w, defaultRate) ? "base" : next++ }));
}

/** Rough width of a boundary label ("16:00") at 10px, with breathing room. */
const LABEL_PX = 32;
/** Rough half-width of the "Now · 14:05" label, to keep it inside the bar. */
const NOW_HALF_PX = 32;

/** A boundary as its label, hours and minutes only: a start, "16:00", or the day's inclusive end, "23:59". */
const boundaryLabel = (at: number) => fmtHHmm(at >= DAY_SECONDS ? DAY_SECONDS - 1 : at);

const rate = (n: number) => (Number.isFinite(n) ? String(n) : "–");

/**
 * The day as a 24 h strip: one band per window, no text inside; Default
 * Rate hours are slate and each slot has its colour.
 * A window that crosses midnight is two bands, one at each end. Under it,
 * the boundary times sit at their boundaries; where two would overlap, a real
 * boundary beats the day's ends, then the earlier one wins.
 *
 * Hovering or focusing a band shows its rates ("Slab 1 KES 110 · Slab 2 KES
 * 90 per kWh") and reports its id through `onHighlight`;
 * `highlighted` (an id) outlines it. `now` marks the current EAT time, with
 * "Now · 14:05" above the marker. Times on the bar are HH:mm; the day
 * always reads 00:00 to 23:59. `compact` is for a table cell: a thinner
 * bar and the marker without its label.
 */
export function DayBandBar({
  items,
  now,
  highlighted,
  onHighlight,
  compact = false,
  currency = "KES",
  className,
}: {
  items: BandItem[];
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
  compact?: boolean;
  /** The plan's currency, for the rates in the tooltip. */
  currency?: string;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ text: string; color: BandItem["color"]; x: number; y: number } | null>(null);

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
    // A start the axis had no room to label goes in the tooltip, so the times are never lost.
    const unlabelled = !labels.some((l) => l.at === parseHHmmss(item.window.start));
    const text = unlabelled ? `${fmtRateWindowHHmm(item.window)} · ${tipText(item, currency)}` : tipText(item, currency);
    setTip({ text, color: item.color, x: r.left + r.width / 2, y: r.top });
    onHighlight?.(item.id);
  }

  function hide() {
    setTip(null);
    onHighlight?.(null);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {marker !== null && !compact && (
        <div className="relative h-4 text-[10px] font-semibold text-slate-700 tabular-nums">
          {width > 0 && (
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
              style={{ left: Math.min(Math.max(marker * width, NOW_HALF_PX), width - NOW_HALF_PX) }}
            >
              Now · {fmtHHmm(eatSecondOfDay(now!))}
            </span>
          )}
        </div>
      )}
      {/* The bar's own colour shows through where an hour has no rate yet. */}
      <div ref={barRef} className={cn("relative rounded-md bg-slate-100 overflow-hidden", compact ? "h-4" : "h-6")}>
        {bands.map((band) => {
          const on = highlighted === band.id;
          const base = band.color === "base";
          return (
            <div
              key={base ? `${band.id}-${band.window.start}-${band.side}` : `${band.id}-${band.side}`}
              role={band.focusable ? "img" : undefined}
              tabIndex={band.focusable ? 0 : undefined}
              aria-label={band.focusable ? ariaText(band, currency) : undefined}
              aria-hidden={band.focusable ? undefined : true}
              onMouseEnter={(e) => show(band, e.currentTarget)}
              onMouseLeave={hide}
              onFocus={(e) => show(band, e.currentTarget)}
              onBlur={hide}
              className={cn(
                "absolute inset-y-0 transition-[left,width,opacity] duration-300 ease-out focus:outline-none",
                "border-r border-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white",
                highlighted && !on && "opacity-40",
                on && "ring-2 ring-inset ring-white"
              )}
              style={{
                left: `${band.a * 100}%`,
                width: `${(band.b - band.a) * 100}%`,
                backgroundColor: colorOf(band.color),
              }}
            />
          );
        })}
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
          className="fixed z-[70] pointer-events-none -translate-x-1/2 -translate-y-full -mt-2 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap tabular-nums"
          style={{ left: tip.x, top: tip.y }}
        >
          <WindowSwatch color={tip.color} />
          {tip.text}
        </span>
      )}
    </div>
  );
}

/** The tooltip: the band's rates, which the bar can't show; its times are already on the axis. */
function tipText({ window: w }: BandItem, currency: string): string {
  if (!Number.isFinite(w.slab1) && !Number.isFinite(w.slab2)) return "No rates yet";
  return `Slab 1 ${currency} ${rate(w.slab1)} · Slab 2 ${currency} ${rate(w.slab2)} per kWh`;
}

/** For screen readers, which can't see the axis: the times as well as the rates. */
function ariaText(item: BandItem, currency: string): string {
  return `${fmtRateWindowHHmm(item.window)}: ${tipText(item, currency)}`;
}

/**
 * The boundary labels that fit at `width` px. The day's ends, 00:00 and
 * 23:59, are always shown; then every window start, earliest first, skipping
 * any that would overlap a label already placed.
 */
function boundaryLabels(starts: number[], width: number): { at: number }[] {
  if (width <= 0) return [];
  const real = [...new Set(starts.map((s) => s % DAY_SECONDS))].filter((s) => s !== 0).sort((a, b) => a - b);

  // Each label's span in px: the ends sit flush with the bar's edges, the rest are centred.
  const span = (at: number): [number, number] => {
    const x = (at / DAY_SECONDS) * width;
    if (at === 0) return [0, LABEL_PX];
    if (at === DAY_SECONDS) return [width - LABEL_PX, width];
    return [x - LABEL_PX / 2, x + LABEL_PX / 2];
  };
  const placed: { at: number; s: [number, number] }[] = [0, DAY_SECONDS].map((at) => ({ at, s: span(at) }));
  for (const at of real) {
    const s = span(at);
    if (placed.every((p) => s[1] <= p.s[0] || s[0] >= p.s[1])) placed.push({ at, s });
  }
  return placed.map(({ at }) => ({ at })).sort((x, y) => x.at - y.at);
}
