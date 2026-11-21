"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardView } from "@/components/dashboards-v3/page/DashboardView";

/** One Dashboards (v3) dashboard, in view or edit mode. Mock data only. */
export default function DashboardV3Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Topbar title="Dashboards (v3)" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <DashboardView key={id} id={id} />
        </Suspense>
      </main>
    </>
  );
}
