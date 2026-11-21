import type { CategoryId, ChartType, PropertyId } from "./catalogue";

/** "6m" is no longer offered but still reads, for dashboards saved with it. */
export type RangePreset = "today" | "7d" | "30d" | "90d" | "6m" | "12m" | "mtd" | "lastMonth" | "qtd" | "custom";

/** A date range: a preset counted back from today, or custom dates (yyyy-MM-dd, both inclusive). */
export interface DateRange {
  preset: RangePreset;
  from?: string;
  to?: string;
}

export type WidgetSize = "quarter" | "half" | "full";
export type Grouping = "day" | "week" | "month";
export type WidgetSort = "desc" | "asc" | "name";

export interface PropertyFilter {
  property: PropertyId;
  values: string[];
}

export interface Widget {
  id: string;
  type: ChartType;
  title: string;
  metricId?: string;
  /** Unset follows the dashboard's date range. */
  range?: DateRange;
  /** Up to three (WIDGET_FILTERS_MAX), on different properties, all of which must match; applied on top of the dashboard's. */
  filters?: PropertyFilter[];
  /** One property only. */
  splitBy?: PropertyId;
  /** Breakdowns viewers can switch between with tabs (bar, top list, table), the current one first; switching isn't saved. */
  switchable?: PropertyId[];
  compare: boolean;
  /** Unset picks day, or week for ranges over 90 days. */
  grouping?: Grouping;
  goal?: number;
  showValues: boolean;
  /** Each part as a % of its total: stacked bars, and bars broken down, of figures that add up. */
  percent?: boolean;
  sort: WidgetSort;
  size: WidgetSize;
  /** The text of a text/heading widget. */
  text?: string;
  /** Sandbox only: shows the widget's error state until Retry. */
  mockError?: boolean;
}

export interface DashboardFilters {
  range: DateRange;
  /** null for all countries. */
  country: string | null;
  /** Regions in the chosen country; empty for all. */
  regions: string[];
}

export type Visibility = "private" | "team";

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: CategoryId;
  visibility: Visibility;
  /** null for the signed-in user's own; the sharing team's role label ("Ops team") for one shared with them; "Zeno" for templates. */
  owner: string | null;
  isTemplate: boolean;
  filters: DashboardFilters;
  widgets: Widget[];
  createdAt: string;
  /** When it was last saved with a change; unset means never since it was created. */
  updatedAt?: string;
  lastViewedAt: string | null;
  /** Zeno templates only: what it's for and who looks after it. */
  template?: TemplateInfo;
  /** A copy made from a template remembers it; later changes to the template don't reach the copy. */
  basedOnTemplateId?: string;
}

export interface TemplateInfo {
  /** One line on the job it's for: "For finance's month-end review". Also its description. */
  purpose: string;
  /** The team that owns it. */
  ownerTeam: string;
  /** yyyy-MM-dd. */
  lastReviewed: string;
  version: number;
}
