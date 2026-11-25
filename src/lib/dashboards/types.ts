/**
 * Dome Dashboards: the shapes shared by the registry, the cards and the queries.
 *
 * A card never holds data. It holds a query spec (what to measure, how to
 * split it, what to keep, over what time); the numbers come from `runQuery`.
 */
import type { AccessModule } from "@/lib/access";

// ── Registry: what the backend says it stores ────────────────────────────────

export type FieldType = "number" | "category" | "date" | "id" | "place";

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  unit?: string;
  /** Sample values (category, place). The real backend serves these by typeahead. */
  values?: string[];
  /** Sample data only: a typical value of a number field. */
  mean?: number;
  /** Sample data only: unique ids per record, for id fields. */
  uniqueRatio?: number;
}

/** A record points at another record: a swap has a station, a vehicle, a customer. */
export interface Link { to: string; name: string }

export interface RecordType {
  id: string;
  /** Plural, as people say it: "Swaps". */
  name: string;
  singular: string;
  /** Events happen at a time; things exist (vehicles, batteries, sites). */
  kind: "event" | "thing";
  /** The Dome module that guards this data. */
  module: AccessModule;
  /** The Dome page that lists these records, if there is one. */
  page?: string;
  defaultTimeField: string;
  fields: Field[];
  links: Link[];
  /** Sample data only: events per day, or things in total. */
  volume: number;
}

/** A measure that needs a formula, defined once by the data owner. */
export interface NamedMetric {
  id: string;
  name: string;
  record: string;
  unit: string;
  definition: string;
  calc: { type: "rate"; base: number; spread: number } | { type: "sum"; field: string };
}

export interface Registry { records: RecordType[]; metrics: NamedMetric[] }

// ── Cards ────────────────────────────────────────────────────────────────────

export type MeasureFn = "count" | "sum" | "avg" | "median" | "min" | "max" | "unique" | "metric";

export interface Measure { record: string; fn: MeasureFn; field?: string; metricId?: string }

/** A field of the card's record, or of a record it links to (`via` is the link's record id). */
export interface FieldRef { via?: string; field: string }

/** Keep only some records: a category is any of `values`, or a number is within min–max. */
export interface CardFilter { field: FieldRef; values?: string[]; min?: number; max?: number }

export type PresetId =
  | "today" | "yesterday" | "7d" | "30d" | "90d"
  | "this_week" | "this_month" | "this_quarter" | "this_year"
  | "last_month" | "last_quarter" | "custom";

export interface RangeValue { preset: PresetId; from?: string; to?: string }
/** Calendar days, YYYY-MM-DD, both included. */
export interface DayRange { from: string; to: string }
export type Grain = "hour" | "day" | "week" | "month";

export interface CardTime {
  /** Which date of the record counts; the record's default when absent. */
  field?: string;
  /** The card's own range; the dashboard's when absent. */
  range?: RangeValue;
  /** Picked from the range when absent. */
  grain?: Grain;
  compare?: "previous" | "year";
}

export type CardKind = "chart" | "funnel" | "flow" | "retention" | "records" | "note";

export type ViewId =
  | "number" | "target" | "gauge"
  | "line" | "area" | "columns" | "cumulative" | "overlay" | "calendar" | "hourweek"
  | "lines" | "stacked_area" | "stacked_columns" | "stacked_100"
  | "bars" | "columns_cat" | "donut" | "treemap" | "table" | "toplist" | "tiles" | "map" | "waterfall"
  | "stacked_bars" | "grouped_bars" | "heatgrid" | "pivot"
  | "combo" | "lines2" | "ratio_line" | "scatter" | "pair_bars" | "ratio" | "pair"
  | "histogram" | "box" | "percentiles";

export interface FunnelStep { record: string; where?: { field: string; value: string } }

export interface Card {
  id: string;
  kind: CardKind;
  /** The card's own heading; one is written from the query when absent. */
  title?: string;
  /** One or two. Funnel cards use `steps` instead. */
  measures: Measure[];
  overTime: boolean;
  splits: FieldRef[];
  filters: CardFilter[];
  time: CardTime;
  /** The default for the query's shape when absent or no longer valid. */
  view?: ViewId;
  target?: number;
  steps?: FunnelStep[];
  /** Flow: from one field's value to another's. */
  from?: FieldRef;
  to?: FieldRef;
  /** Retention: the event that counts as coming back. */
  returnRecord?: string;
  /** Note. */
  text?: string;
}

/** A filter on the whole dashboard, by a field many records share (Region, Country…). */
export interface DashFilter { fieldId: string; name: string; values: string[] }

export interface Dashboard {
  id: string;
  name: string;
  visibility: "private" | "public";
  ownerId: string;
  ownerName: string;
  range: RangeValue;
  filters: DashFilter[];
  cards: Card[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  /** Goes up with every change, so a stale edit is refused. */
  version: number;
}
