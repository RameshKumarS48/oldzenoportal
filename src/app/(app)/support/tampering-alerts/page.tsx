"use client";

import { Suspense } from "react";
import { SupportGuard } from "@/components/ui/AdminGuard";
import { Topbar } from "@/components/layout/Topbar";
import { TamperingAlertsView } from "@/components/swap-transactions/TamperingAlertsView";

export default function TamperingAlertsPage() {
  return (
    <SupportGuard>
      <Topbar title="Tampering Alerts" />
      {/* As on Asset Tracking: the page doesn't scroll; the table card fills the rest and scrolls its own rows. */}
      <main className="flex flex-col flex-1 overflow-hidden bg-zeno-bg p-6">
        {/* Tampering Alerts reads Swap Audit's return parameters, which Next requires inside Suspense. */}
        <Suspense fallback={null}>
          <TamperingAlertsView />
        </Suspense>
      </main>
    </SupportGuard>
  );
}
