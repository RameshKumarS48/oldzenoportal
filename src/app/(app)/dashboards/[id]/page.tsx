"use client";

import { use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardsGate } from "@/components/dashboards/DashboardsGate";
import { DashboardView } from "@/components/dashboards/DashboardView";
import { useDashboards, type Me } from "@/components/dashboards/api";

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Topbar title="Dashboards" />
      <DashboardsGate>{(me) => <Body id={id} me={me} />}</DashboardsGate>
    </>
  );
}

function Body({ id, me }: { id: string; me: Me }) {
  // Only dashboards this person may open: a private one that isn't theirs is simply not found.
  const dashboard = useDashboards(me).find((d) => d.id === id);
  if (!dashboard) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zeno-bg text-center">
        <div>
          <p className="text-sm font-medium text-slate-600">Dashboard not found</p>
          <p className="mt-1 text-xs text-slate-500">It may have been deleted or made private.</p>
          <Link href="/dashboards" className="mt-3 inline-block text-xs font-medium text-zeno-teal hover:underline">Back to Dashboards</Link>
        </div>
      </main>
    );
  }
  return <DashboardView dashboard={dashboard} me={me} />;
}
