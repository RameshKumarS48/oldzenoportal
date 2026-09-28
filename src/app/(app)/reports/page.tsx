"use client";

import { useState } from "react";
import { FileText, Download, Clock, Mail, Plus, Trash2, FileBarChart, Share2, X, LayoutDashboard, BarChart2, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SCHEDULED_REPORTS, GENERATED_REPORTS } from "@/lib/mock/reports";
import type { ReportType, ReportFrequency } from "@/lib/mock/reports";
import { format } from "date-fns";
import { useFiltersStore } from "@/store/filters";
import { PARTNER_KPI_DATA, METRIC_DEFINITIONS, WEEKS } from "@/lib/mock/kpi-partner";
import { useDashboardsStore } from "@/store/dashboards";
import Link from "next/link";

const DASHBOARD_OPTIONS = [
  { value: "partner_metrics", label: "Partner Metrics" },
  { value: "referral_programme", label: "Referral Programme" },
  { value: "asset_health", label: "Asset Health" },
  { value: "revenue_trends", label: "Finance & Revenue" },
  { value: "infra_metrics", label: "Infrastructure" },
  { value: "preorder_funnel", label: "Growth Funnel" },
  { value: "master_billing", label: "Master Billing" },
];

const KPI_CATEGORY_OPTIONS = [
  { value: "partner", label: "Partner KPIs (31 metrics)" },
  { value: "infra", label: "Infrastructure KPIs (37 metrics)" },
  { value: "energy", label: "Energy KPIs (21 metrics)" },
  { value: "wallet", label: "Wallet & Finance KPIs (19 metrics)" },
  { value: "referral", label: "Referral KPIs (6 metrics)" },
  { value: "preorder", label: "Pre-order KPIs (21 metrics)" },
];

type ReportSource = "dashboard" | "kpi_metrics" | "custom";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { partnerId, dateFrom, dateTo } = useFiltersStore();
  const { notifications, dismissNotification } = useDashboardsStore();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedules, setSchedules] = useState(SCHEDULED_REPORTS);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    reportSource: "dashboard" as ReportSource,
    reportSourceId: "partner_metrics",
    reportCustomDesc: "",
    frequency: "weekly" as ReportFrequency,
    recipients: "",
    active: true,
  });

  const handleExportCSV = () => {
    const data = PARTNER_KPI_DATA[partnerId].filter(
      (r) => r.weekStart >= dateFrom && r.weekStart <= dateTo
    );

    const headers = ["Week", ...METRIC_DEFINITIONS.flatMap((m) => [`${m.label} (Actual)`, `${m.label} (Target)`, `${m.label} (Variance)`])];
    const rows = data.map((row) => {
      const weekLabel = WEEKS.find((w) => w.weekStart === row.weekStart)?.label ?? row.weekStart;
      const values = METRIC_DEFINITIONS.flatMap((m) => {
        const v = row[m.key as keyof typeof row] as { actual: number; target: number; variance: number } | undefined;
        return [v?.actual ?? "", v?.target ?? "", v?.variance ?? ""];
      });
      return [weekLabel, ...values];
    });

    const content = [headers, ...rows].map((r) => r.join(",")).join("\n");
    downloadCSV(`zeno-kpi-${partnerId}-${dateFrom}-to-${dateTo}.csv`, content);
  };

  const handleAddSchedule = () => {
    const derivedType: string =
      newSchedule.reportSource === "dashboard"
        ? (DASHBOARD_OPTIONS.find((o) => o.value === newSchedule.reportSourceId)?.label ?? "dashboard").toLowerCase().replace(/\s+/g, "_")
        : newSchedule.reportSource === "kpi_metrics"
        ? `kpi_${newSchedule.reportSourceId}`
        : "custom_report";

    setSchedules((prev) => [
      ...prev,
      {
        id: `sr-${Date.now()}`,
        name: newSchedule.name,
        reportType: derivedType as ReportType,
        frequency: newSchedule.frequency,
        recipients: newSchedule.recipients.split(",").map((e) => e.trim()).filter(Boolean),
        active: newSchedule.active,
        nextScheduled: "2026-08-10",
      },
    ]);
    setScheduleOpen(false);
    setNewSchedule({ name: "", reportSource: "dashboard", reportSourceId: "partner_metrics", reportCustomDesc: "", frequency: "weekly", recipients: "", active: true });
  };

  const toggleSchedule = (id: string) => {
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <>
      <Topbar
        title="Reports"
        actions={
          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost-dark" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setScheduleOpen(true)}>
              <Plus className="w-4 h-4" /> Schedule Report
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Scheduled Reports */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Scheduled Reports
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {schedules.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No scheduled reports configured.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    {["Name", "Type", "Frequency", "Recipients", "Status", "Next Run", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{s.name}</td>
                      <td className="px-5 py-3.5 text-slate-600 capitalize">{s.reportType.replace("_", " ")}</td>
                      <td className="px-5 py-3.5 capitalize text-slate-600">{s.frequency}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600 text-xs">{s.recipients.length} recipient{s.recipients.length !== 1 ? "s" : ""}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleSchedule(s.id)}>
                          <Badge variant={s.active ? "success" : "warning"}>{s.active ? "Active" : "Paused"}</Badge>
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{format(new Date(s.nextScheduled), "d MMM yyyy")}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => deleteSchedule(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Shared Dashboard Notifications */}
        {notifications.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" /> Shared Dashboards
            </h2>
            <div className="space-y-2">
              {notifications.map((n) => {
                const targetLabel =
                  n.sharedWith === "all-users" ? "all users" :
                  n.sharedWith === "all-admins" ? "all admins" :
                  Array.isArray(n.sharedWith) ? `${n.sharedWith.length} specific recipient${n.sharedWith.length !== 1 ? "s" : ""}` :
                  "unknown";
                return (
                  <div key={n.id} className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Share2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          <span className="text-blue-600">{n.fromUserName}</span> shared{" "}
                          <Link href={`/dashboard/${n.dashboardId}`} className="underline underline-offset-2 hover:text-blue-600">
                            {n.dashboardTitle}
                          </Link>{" "}
                          with {targetLabel}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(new Date(n.sharedAt), "d MMM yyyy, HH:mm")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Report History */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileBarChart className="w-3.5 h-3.5" /> Report History
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  {["Name", "Period", "Partner", "Format", "Size", "Generated", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {GENERATED_REPORTS.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {format(new Date(r.periodStart), "d MMM")}: {format(new Date(r.periodEnd), "d MMM yyyy")}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{r.partner}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={r.format === "pdf" ? "info" : "default"}>{r.format.toUpperCase()}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{r.sizeKb} KB</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {format(new Date(r.generatedAt), "d MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => alert(`[Mock] Downloading ${r.name}`)}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Schedule Modal */}
      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule Report">
        <div className="space-y-4">
          <Input
            label="Report Name"
            placeholder="e.g. Weekly Partner Summary"
            value={newSchedule.name}
            onChange={(e) => setNewSchedule((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          {/* Report Type: 3-way source selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Report Type</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { value: "dashboard" as ReportSource, icon: LayoutDashboard, label: "Dashboard", desc: "Existing dashboards" },
                { value: "kpi_metrics" as ReportSource, icon: BarChart2, label: "KPI Metrics", desc: "Metric categories" },
                { value: "custom" as ReportSource, icon: Sliders, label: "Custom", desc: "Build your own" },
              ]).map(({ value, icon: Icon, label, desc }) => {
                const active = newSchedule.reportSource === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const defaultId = value === "dashboard" ? "partner_metrics" : value === "kpi_metrics" ? "partner" : "";
                      setNewSchedule((f) => ({ ...f, reportSource: value, reportSourceId: defaultId, reportCustomDesc: "" }));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center cursor-pointer",
                      active
                        ? "border-[#FF3B06] bg-[#FF3B06]/5"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", active ? "text-[#FF3B06]" : "text-slate-400")} />
                    <span className={cn("text-xs font-semibold", active ? "text-[#FF3B06]" : "text-slate-600")}>{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Secondary selector */}
            {newSchedule.reportSource === "dashboard" && (
              <Select
                label="Select Dashboard"
                value={newSchedule.reportSourceId}
                onChange={(e) => setNewSchedule((f) => ({ ...f, reportSourceId: e.target.value }))}
                options={DASHBOARD_OPTIONS}
              />
            )}
            {newSchedule.reportSource === "kpi_metrics" && (
              <Select
                label="Metric Category"
                value={newSchedule.reportSourceId}
                onChange={(e) => setNewSchedule((f) => ({ ...f, reportSourceId: e.target.value }))}
                options={KPI_CATEGORY_OPTIONS}
              />
            )}
            {newSchedule.reportSource === "custom" && (
              <div className="space-y-2">
                <Select
                  label="Base Report"
                  value={newSchedule.reportSourceId}
                  onChange={(e) => setNewSchedule((f) => ({ ...f, reportSourceId: e.target.value }))}
                  options={[
                    { value: "", label: "Select a base report…" },
                    ...DASHBOARD_OPTIONS,
                    ...KPI_CATEGORY_OPTIONS,
                  ]}
                />
                <Input
                  label="Custom Configuration"
                  placeholder="Describe the metrics or filters to include…"
                  value={newSchedule.reportCustomDesc}
                  onChange={(e) => setNewSchedule((f) => ({ ...f, reportCustomDesc: e.target.value }))}
                />
              </div>
            )}
          </div>
          <Select
            label="Frequency"
            value={newSchedule.frequency}
            onChange={(e) => setNewSchedule((f) => ({ ...f, frequency: e.target.value as ReportFrequency }))}
            options={FREQUENCY_OPTIONS}
          />
          <Input
            label="Recipients (comma-separated emails)"
            placeholder="willie@zeno.earth, omar@zeno.earth"
            value={newSchedule.recipients}
            onChange={(e) => setNewSchedule((f) => ({ ...f, recipients: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddSchedule} disabled={!newSchedule.name}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
