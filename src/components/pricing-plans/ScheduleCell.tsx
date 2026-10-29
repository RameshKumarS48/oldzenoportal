"use client";

import { useState } from "react";
import { DayBandBar, type BandColor, type BandItem } from "./DayBandBar";

/**
 * The plans table's Daily schedule: the day bar with each rate labelled above
 * it. Hovering a label or a band picks out every band at that rate and dims
 * the rest.
 */
export function ScheduleCell({ bands, currency }: { bands: BandItem[]; currency: string }) {
  const [active, setActive] = useState<BandColor | null>(null);
  return (
    <DayBandBar
      items={bands}
      currency={currency}
      compact
      rateLabels
      highlightedColor={active}
      onHighlightColor={setActive}
    />
  );
}
