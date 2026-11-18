"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardView } from "@/components/dashboards-v3/page/DashboardView";

/**
 * An unsaved copy of a Zeno template, open in edit mode. Nothing is created
 * until Save; reloaded or opened from a pasted link, it goes back to the
 * template. Mock data only.
 */
export default function DashboardV3CopyPage() {
  const { templateId } = useParams<{ templateId: string }>();
  return (
    <>
      <Topbar title="Dashboards (v3)" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <DashboardView key={templateId} id={templateId} copy />
        </Suspense>
      </main>
    </>
  );
}
