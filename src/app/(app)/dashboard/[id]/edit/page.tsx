"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Eye } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { AddWidgetDrawer } from "@/components/widgets/AddWidgetDrawer";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { PartnerSelector } from "@/components/dashboard/PartnerSelector";
import { useDashboardsStore } from "@/store/dashboards";
import type { Widget } from "@/lib/mock/dashboards";

interface Props {
  params: Promise<{ id: string }>;
}

export default function DashboardEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { getDashboard, addWidget, removeWidget } = useDashboardsStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const dashboard = getDashboard(id);
  if (!dashboard) return notFound();
  if (dashboard.type === "preset") {
    router.replace(`/dashboard/${id}`);
    return null;
  }

  const handleAddWidget = (widget: Omit<Widget, "id" | "x" | "y">) => {
    const existingWidgets = dashboard.widgets;
    const maxY = existingWidgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    addWidget(id, { ...widget, x: 0, y: maxY });
  };

  return (
    <>
      <Topbar
        title={`Edit: ${dashboard.title}`}
        actions={
          <div className="flex items-center gap-2 ml-4">
            <Link href={`/dashboard/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Link href={`/dashboard/${id}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" /> Preview
              </Button>
            </Link>
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4" /> Add Widget
            </Button>
          </div>
        }
      />

      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-wrap gap-3">
        <PartnerSelector mode="partner" />
        <DateRangePicker />
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {dashboard.widgets.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
            <p className="text-sm text-slate-500 mb-4">Add your first widget to get started.</p>
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4" /> Add Widget
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 auto-rows-[220px]">
            {[...dashboard.widgets].sort((a, b) => a.y - b.y || a.x - b.x).map((widget) => (
              <div
                key={widget.id}
                style={{ gridColumn: `span ${Math.min(widget.w, 12)}`, gridRow: `span ${Math.ceil(widget.h / 3)}` }}
              >
                <WidgetCard
                  widget={widget}
                  editable
                  onDelete={() => removeWidget(id, widget.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <AddWidgetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={handleAddWidget}
      />
    </>
  );
}
