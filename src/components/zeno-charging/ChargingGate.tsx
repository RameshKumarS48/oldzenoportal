"use client";

import { AccessGuard } from "@/components/ui/AccessGuard";
import { useCharging, useHydrated, type Me } from "./api";
import type { ChargingAsset } from "@/lib/charging/fields";

/** Zeno Charging's guard: the role must reach the tab, and the saved data must be loaded from the browser. */
export function ChargingGate({ children }: { children: (data: { assets: ChargingAsset[]; me: Me }) => React.ReactNode }) {
  return (
    <AccessGuard module="charging">
      <GateBody>{children}</GateBody>
    </AccessGuard>
  );
}

function GateBody({ children }: { children: (data: { assets: ChargingAsset[]; me: Me }) => React.ReactNode }) {
  const hydrated = useHydrated();
  const data = useCharging();
  if (!hydrated) return <main className="flex-1 bg-zeno-bg" />;
  return <>{children(data)}</>;
}
