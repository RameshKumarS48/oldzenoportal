"use client";

import { Topbar } from "@/components/layout/Topbar";
import { DashboardsGate } from "@/components/dashboards/DashboardsGate";
import { DashboardList } from "@/components/dashboards/DashboardList";

export default function DashboardsPage() {
  return (
    <>
      <Topbar title="Dashboards" />
      <DashboardsGate>{(me) => <DashboardList me={me} />}</DashboardsGate>
    </>
  );
}
