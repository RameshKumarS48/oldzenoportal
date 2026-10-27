/**
 * Custom Pricing: time-of-day swap pricing, configured as plans.
 *
 * A plan's rates are a list of time windows that cover the whole day, each
 * with a slab 1 rate (a rider's first 3 kWh each day) and a slab 2 rate
 * (everything after). Rates are KES per kWh and every clock time is EAT
 * (UTC+3), Kenya's only zone. See `windows.ts` for the rules.
 *
 * Nothing here is edited in place. A rate change is a new `PlanVersion` and a
 * station move is a new `StationAssignment`, each with its own `effectiveFrom`,
 * so any past moment can be priced exactly as it was then.
 */

/** Rest-of-day hours or a custom window: the badge Swap Transactions shows. */
export type RateSlot = "standard" | "custom_window";

/**
 * One stretch of the day and its rates. "HH:mm:ss" EAT, both ends included;
 * an end before the start wraps past midnight (22:00:00–05:59:59).
 */
export interface RateWindow {
  start: string;
  end: string;
  /** KES/kWh for a rider's first 3 kWh each day. */
  slab1: number;
  /** KES/kWh for everything after. */
  slab2: number;
  /**
   * True for the hours no custom window claims, which take the plan's
   * rest-of-day rates. Unset only on data saved before it existed; see
   * `splitVersion` in windows.ts.
   */
  isBase?: boolean;
}

export interface PlanVersion {
  id: string;
  /** ISO datetime the version takes over from the previous one. */
  effectiveFrom: string;
  /** Cover every second of the day exactly once. What every pricing screen and billing read. */
  windows: RateWindow[];
  /**
   * The rest-of-day rates. Kept here as well as on the `isBase` windows, so
   * they survive when custom windows fill the whole day and no base window is left.
   */
  baseSlab1?: number;
  baseSlab2?: number;
  /** @deprecated Legacy: billing reads it only for versions without `windows`. */
  standardRate: number;
  /** @deprecated Legacy: "HH:mm", exclusive end, may wrap past midnight. */
  customWindowStart: string;
  /** @deprecated Legacy: "HH:mm", exclusive end, may wrap past midnight. */
  customWindowEnd: string;
  /** @deprecated Legacy: billing reads it only for versions without `windows`. */
  customRate: number;
  createdBy: string;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  /** The fallback for any station without an assignment. Exactly one plan has this. */
  isDefault: boolean;
  /** Append-only, any order. */
  versions: PlanVersion[];
  createdAt: string;
  /**
   * Deleted from the app: hidden from the plans table, its stations moved to
   * Default. Kept so swaps already priced on it still resolve.
   */
  archived?: boolean;
}

/**
 * One station's move onto a plan. The station's plan at time t is the latest
 * assignment with `effectiveFrom <= t`; `planId: null` sends it back to Default.
 */
/** Why a station changed plan, for its history. */
export type MoveReason = "assigned" | "removed" | "plan_created" | "plan_deleted";

export interface StationAssignment {
  id: string;
  /** Upper-case station code, e.g. "BS0021". */
  stationId: string;
  planId: string | null;
  effectiveFrom: string;
  assignedBy: string;
  assignedAt: string;
  /** Unset on data saved before it existed: read as "assigned", or "removed" when `planId` is null. */
  reason?: MoveReason;
}

export type PlanChangeKind =
  | "created"
  | "rates_changed"
  | "window_changed"
  | "stations_assigned"
  | "stations_unassigned"
  | "renamed"
  | "deleted";

export interface PlanChange {
  id: string;
  planId: string;
  at: string;
  by: string;
  kind: PlanChangeKind;
  summary: string;
  effectiveFrom?: string;
  /** What the person creating or editing the plan wrote about why. */
  note?: string;
}

/** The four moments of a swap at the station. */
export type SwapEvent = "rfid_tap" | "deposit" | "collection" | "completed";

export interface PricingBook {
  plans: PricingPlan[];
  assignments: StationAssignment[];
}
