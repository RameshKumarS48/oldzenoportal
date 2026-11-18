"use client";

import { Suspense } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { ExploreView } from "@/components/dashboards-v3/explore/ExploreView";

/** Explore: one widget's question on a full page, its state in the URL. Mock data only. */
export default function DashboardV3ExplorePage() {
  return (
    <>
      <Topbar title="Dashboards (v3)" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <ExploreView />
        </Suspense>
      </main>
    </>
  );
}
