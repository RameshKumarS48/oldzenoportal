/**
 * Custom Pricing: time-of-day swap pricing, configured as plans.
 *
 * A plan charges a Standard rate all day, except inside one Custom rate window
 * (e.g. 22:00–06:00) where its Custom rate applies. Rates are KES per kWh and
 * every clock time is EAT (UTC+3), Kenya's only zone.
 *
 * Nothing here is edited in place. A rate change is a new `PlanVersion` and a
 * station move is a new `StationAssignment`, each with its own `effectiveFrom`,
 * so any past moment can be priced exactly as it was then.
 */

export type RateSlot = "standard" | "custom_window";

export interface PlanVersion {
  id: string;
  /** ISO datetime the version takes over from the previous one. */
  effectiveFrom: string;
  standardRate: number;
  /** "HH:mm", EAT. A window may wrap past midnight (22:00 → 06:00). */
  customWindowStart: string;
  customWindowEnd: string;
  customRate: number;
  /** Riders must hear about the change at least this many hours before it applies. */
  notifyLeadHours: number;
  notificationText: string;
  createdBy: string;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  /** The fallback for any station without an assignment. Exactly one plan has this. */
  isDefault: boolean;
  /** Append-only, any order. */
  versions: PlanVersion[];
  createdAt: string;
}

/**
 * One station's move onto a plan. The station's plan at time t is the latest
 * assignment with `effectiveFrom <= t`; `planId: null` sends it back to Default.
 */
export interface StationAssignment {
  id: string;
  /** Upper-case station code, e.g. "BS0021". */
  stationId: string;
  planId: string | null;
  effectiveFrom: string;
  assignedBy: string;
  assignedAt: string;
}

export type PlanChangeKind =
  | "created"
  | "rates_changed"
  | "window_changed"
  | "stations_assigned"
  | "stations_unassigned"
  | "renamed";

export interface PlanChange {
  id: string;
  planId: string;
  at: string;
  by: string;
  kind: PlanChangeKind;
  summary: string;
  effectiveFrom?: string;
}

/** The four moments of a swap at the station. */
export type SwapEvent = "rfid_tap" | "deposit" | "collection" | "completed";

export interface PricingBook {
  plans: PricingPlan[];
  assignments: StationAssignment[];
}
