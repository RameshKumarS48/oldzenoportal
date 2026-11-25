"use client";

import { AccessGuard } from "@/components/ui/AccessGuard";
import { useHydrated, useMe, type Me } from "./api";

/** Dashboards' guard: the role must reach the tab, and the saved dashboards must be loaded from the browser. */
export function DashboardsGate({ children }: { children: (me: Me) => React.ReactNode }) {
  return (
    <AccessGuard module="dashboards">
      <GateBody>{children}</GateBody>
    </AccessGuard>
  );
}

function GateBody({ children }: { children: (me: Me) => React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useMe();
  if (!hydrated) return <main className="flex-1 bg-zeno-bg" />;
  return <>{children(me)}</>;
}
