"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryChip } from "@/components/dashboards-v3/ui/CategoryChip";
import { useHydrated } from "@/components/dashboards-v3/hooks";
import { useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";

/** A Dashboards (v3) dashboard. Placeholder until checkpoint 3. */
export default function DashboardV3Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const dashboard = useDashboardsV3((s) => s.dashboards.find((d) => d.id === id));
  const markViewed = useDashboardsV3((s) => s.markViewed);

  useEffect(() => {
    if (hydrated && dashboard) markViewed(dashboard.id);
    // Once per visit, not on every change to the dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, id]);

  // Deleted, no longer shared, or reset: back to the list rather than a broken page.
  const missing = hydrated && !dashboard;
  useEffect(() => {
    if (!missing) return;
    toast.info("That dashboard is no longer available", "It may have been deleted or is no longer shared with you.");
    router.replace("/dashboards-v3?list=1");
  }, [missing, router]);

  return (
    <>
      <Topbar title="Dashboards (v3)" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <Link
            href="/dashboards-v3?list=1"
            className="flex items-center gap-2 rounded text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboards
          </Link>
          {hydrated && dashboard && (
            <>
              <h2 className="text-base font-semibold text-slate-800">{dashboard.name}</h2>
              <CategoryChip category={dashboard.category} />
            </>
          )}
        </div>
        <div className="grid flex-1 place-items-center bg-zeno-bg p-5">
          {hydrated && dashboard && (
            <EmptyState title="The dashboard page comes in checkpoint 3" description={`${dashboard.widgets.length} widgets are saved with it.`} />
          )}
        </div>
      </main>
    </>
  );
}
