export type ReportType = "weekly_summary" | "monthly_review" | "quarterly_rollup";
export type ReportFrequency = "weekly" | "monthly" | "quarterly";
export type ReportFormat = "pdf" | "csv";

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  active: boolean;
  nextScheduled: string;
  lastSent?: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  reportType: ReportType;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  format: ReportFormat;
  sizeKb: number;
  partner: string;
}

export const SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: "sr1",
    name: "Weekly Partner Overview",
    reportType: "weekly_summary",
    frequency: "weekly",
    recipients: ["willie@zeno.earth", "omar@zeno.earth"],
    active: true,
    nextScheduled: "2026-07-20",
    lastSent: "2026-07-13",
  },
  {
    id: "sr2",
    name: "Monthly KPI Review",
    reportType: "monthly_review",
    frequency: "monthly",
    recipients: ["admin@zeno.earth", "vijay@zeno.earth"],
    active: true,
    nextScheduled: "2026-08-01",
    lastSent: "2026-07-01",
  },
  {
    id: "sr3",
    name: "Quarterly Fleet & Loan Book",
    reportType: "quarterly_rollup",
    frequency: "quarterly",
    recipients: ["admin@zeno.earth"],
    active: false,
    nextScheduled: "2026-10-01",
    lastSent: "2026-07-01",
  },
];

export const GENERATED_REPORTS: GeneratedReport[] = [
  { id: "gr1", name: "Weekly Summary, Jul 7, 2026", reportType: "weekly_summary", generatedAt: "2026-07-13T08:00:00Z", periodStart: "2026-07-07", periodEnd: "2026-07-13", format: "pdf", sizeKb: 248, partner: "Partner Overall" },
  { id: "gr2", name: "Weekly Summary, Jul 7, 2026 (CSV)", reportType: "weekly_summary", generatedAt: "2026-07-13T08:00:00Z", periodStart: "2026-07-07", periodEnd: "2026-07-13", format: "csv", sizeKb: 42, partner: "Partner Overall" },
  { id: "gr3", name: "Monthly Review, June 2026", reportType: "monthly_review", generatedAt: "2026-07-01T08:00:00Z", periodStart: "2026-06-01", periodEnd: "2026-06-30", format: "pdf", sizeKb: 1024, partner: "Partner Overall" },
  { id: "gr4", name: "Monthly Review, June 2026 (CSV)", reportType: "monthly_review", generatedAt: "2026-07-01T08:00:00Z", periodStart: "2026-06-01", periodEnd: "2026-06-30", format: "csv", sizeKb: 156, partner: "Partner Overall" },
  { id: "gr5", name: "Q2 2026 Quarterly Rollup", reportType: "quarterly_rollup", generatedAt: "2026-07-01T09:00:00Z", periodStart: "2026-04-01", periodEnd: "2026-06-30", format: "pdf", sizeKb: 2840, partner: "All Partners" },
  { id: "gr6", name: "Weekly Summary, Jun 30, 2026", reportType: "weekly_summary", generatedAt: "2026-07-06T08:00:00Z", periodStart: "2026-06-30", periodEnd: "2026-07-06", format: "pdf", sizeKb: 232, partner: "Partner Overall" },
  { id: "gr7", name: "Weekly Summary (GW), Jul 7, 2026", reportType: "weekly_summary", generatedAt: "2026-07-13T08:30:00Z", periodStart: "2026-07-07", periodEnd: "2026-07-13", format: "pdf", sizeKb: 198, partner: "Greenwheels" },
];
