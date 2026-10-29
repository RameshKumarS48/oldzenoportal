/**
 * Placing the plans table's rate labels above a day bar: each label wants to
 * start at its segment's start, inset LABEL_INSET, in line with the time
 * label under the bar, but labels may run into each other. They're pushed
 * right, in order, and kept inside the bar; none is ever dropped. Pure, so
 * it can be checked without a browser.
 */

/** How far a label sits in from its segment's left edge, above and below the bar, in px. */
export const LABEL_INSET = 4;

export interface LabelSpot {
  key: string;
  /** Where the label wants its left edge: its segment's start plus LABEL_INSET, in px from the bar's left edge. */
  anchor: number;
  /** The label's measured width, in px. */
  width: number;
}

export interface PlacedLabel {
  key: string;
  /** The label's left edge, in px from the bar's left edge. */
  left: number;
  /** Where it wanted to be, for the tick when the label has moved off it. */
  anchor: number;
  /** True when the label sits far enough off its anchor to need a tick down to its segment. */
  tick: boolean;
}

/** Space between neighbouring labels, in px. */
export const LABEL_GAP = 4;
/** How far a label may sit off its anchor before it gets a tick, in px. */
export const TICK_AFTER = 3;

/**
 * Left to right by segment start: each label keeps its anchor where it can,
 * and moves right past the one before it where it would overlap; then a pass
 * from the right pulls any overflow back inside the bar. Only when the labels
 * can't all fit side by side do they overlap, still in order, the first at
 * the bar's left edge.
 */
export function placeLabels(spots: LabelSpot[], barWidth: number, gap = LABEL_GAP): PlacedLabel[] {
  const sorted = [...spots].sort((a, b) => a.anchor - b.anchor);
  const lefts = sorted.map((s) => s.anchor);

  // Left to right: no label starts before the bar or inside the previous label.
  for (let i = 0; i < sorted.length; i++) {
    const floor = i === 0 ? 0 : lefts[i - 1] + sorted[i - 1].width + gap;
    lefts[i] = Math.max(lefts[i], floor);
  }
  // Right to left: no label ends past the bar or inside the next label.
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ceiling = i === sorted.length - 1 ? barWidth : lefts[i + 1] - gap;
    lefts[i] = Math.min(lefts[i], ceiling - sorted[i].width);
  }
  // Too many to fit: keep the start inside the bar; the rest may overlap.
  for (let i = 0; i < sorted.length; i++) lefts[i] = Math.max(lefts[i], 0);

  return sorted.map((s, i) => ({
    key: s.key,
    left: lefts[i],
    anchor: s.anchor,
    tick: Math.abs(lefts[i] - s.anchor) > TICK_AFTER,
  }));
}
