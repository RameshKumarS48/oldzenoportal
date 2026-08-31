"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit2, ArrowLeft, Plus, Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { AddWidgetDrawer } from "@/components/widgets/AddWidgetDrawer";
import { PartnerSelector } from "@/components/dashboard/PartnerSelector";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { PartnerMetricsGrid } from "@/components/dashboard/PartnerMetricsGrid";
import { InfraMetricsGrid } from "@/components/dashboard/InfraMetricsGrid";
import { useDashboardsStore } from "@/store/dashboards";
import { useFiltersStore } from "@/store/filters";
import { PARTNER_KPI_DATA } from "@/lib/mock/kpi-partner";
import { INFRA_KPI_DATA } from "@/lib/mock/kpi-infra";
import { useMetricsStore } from "@/store/metrics";
import type { Widget } from "@/lib/mock/dashboards";

interface Props {
  params: Promise<{ id: string }>;
}

export default function DashboardViewPage({ params }: Props) {
  const { id } = use(params);
  const getDashboard = useDashboardsStore((s) => s.getDashboard);
  const addWidgetToPreset = useDashboardsStore((s) => s.addWidgetToPreset);
  const removeWidgetFromPreset = useDashboardsStore((s) => s.removeWidgetFromPreset);
  const presetOverrides = useDashboardsStore((s) => s.presetOverrides);
  const { partnerId, infraRegionId, dateFrom, dateTo } = useFiltersStore();
  const getDefinition = useMetricsStore((s) => s.getDefinition);
  const dashboard = getDashboard(id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!dashboard) return notFound();

  const isPartnerPreset = dashboard.presetGroup === "partner";
  const isInfraPreset = dashboard.presetGroup === "infra";
  const isPreset = dashboard.type === "preset";

  const allPartnerData = PARTNER_KPI_DATA[partnerId];
  const filteredData = allPartnerData.filter(
    (r) => r.weekStart >= dateFrom && r.weekStart <= dateTo
  );
  const latestRow = filteredData[filteredData.length - 1];

  const allInfraData = INFRA_KPI_DATA[infraRegionId];
  const infraWeeklyData = allInfraData.filter(
    (r) => r.weekStart >= dateFrom && r.weekStart <= dateTo
  );
  const latestInfraRow = infraWeeklyData[infraWeeklyData.length - 1];

  const pinnedWidgets: Widget[] = isPreset ? (presetOverrides[id] ?? []) : [];
  const sortedWidgets = [...dashboard.widgets].sort((a, b) => a.y - b.y || a.x - b.x);

  const handleAddPresetWidget = (widget: Omit<Widget, "id" | "x" | "y">) => {
    addWidgetToPreset(id, widget as Omit<Widget, "id">);
  };

  return (
    <>
      <Topbar
        title={dashboard.title}
        actions={
          <div className="flex items-center gap-3 ml-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            {dashboard.type === "preset" && <Badge variant="success">Preset</Badge>}
            {dashboard.type === "custom" && (
              <Link href={`/dashboard/${id}/edit`}>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isPartnerPreset && <PartnerSelector mode="partner" />}
          {isInfraPreset && <PartnerSelector mode="infra" />}
          {!isPartnerPreset && !isInfraPreset && <div />}
        </div>
        <div className="flex items-center gap-3">
          {dashboard.presetView === "metrics-grid" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search metrics…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 h-8 text-sm rounded-md border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30 focus:border-[#FF3B06] w-48 transition-all"
                style={{ fontFamily: "var(--font-display)" }}
              />
            </div>
          )}
          <DateRangePicker />
          {isPreset && (
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Widget
            </Button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {dashboard.presetView === "metrics-grid" && dashboard.presetGroup === "partner" && latestRow && (
          <PartnerMetricsGrid row={latestRow} allRows={allPartnerData} getDefinition={getDefinition} search={search} partnerId={partnerId} />
        )}
        {dashboard.presetView === "metrics-grid" && dashboard.presetGroup === "infra" && latestInfraRow && (
          <InfraMetricsGrid row={latestInfraRow} allRows={allInfraData} getDefinition={getDefinition} search={search} />
        )}

        {/* Chart widgets — custom dashboards AND chart-based preset dashboards */}
        {dashboard.presetView !== "metrics-grid" && sortedWidgets.length > 0 && (
          <div className="grid grid-cols-12 gap-4 auto-rows-[220px]">
            {sortedWidgets.map((widget) => (
              <div
                key={widget.id}
                className="col-span-12"
                style={{ gridColumn: `span ${Math.min(widget.w, 12)}`, gridRow: `span ${Math.ceil(widget.h / 3)}` }}
              >
                <WidgetCard widget={widget} editable={false} />
              </div>
            ))}
          </div>
        )}

        {/* Pinned charts (user-added widgets on any preset dashboard) */}
        {isPreset && pinnedWidgets.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-0.5 h-4 bg-[#003B49] rounded-full" />
              <h3
                className="text-[11px] font-bold text-slate-600 uppercase tracking-widest"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pinned Charts
              </h3>
            </div>
            <div className="grid grid-cols-12 gap-4 auto-rows-[220px]">
              {pinnedWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="col-span-12 sm:col-span-6"
                >
                  <WidgetCard
                    widget={widget}
                    editable={false}
                    removable
                    onDelete={() => removeWidgetFromPreset(id, widget.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {dashboard.presetView !== "metrics-grid" && !isPreset && dashboard.widgets.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No widgets yet.</p>
            {dashboard.type === "custom" && (
              <Link href={`/dashboard/${id}/edit`}>
                <Button variant="outline" size="sm" className="mt-3">Edit Dashboard</Button>
              </Link>
            )}
          </div>
        )}
      </main>

      <AddWidgetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={handleAddPresetWidget}
      />
    </>
  );
}
