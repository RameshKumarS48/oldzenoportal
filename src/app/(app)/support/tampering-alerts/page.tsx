"use client";

import { SupportGuard } from "@/components/ui/AdminGuard";
import { Topbar } from "@/components/layout/Topbar";
import { TamperingAlertsView } from "@/components/swap-transactions/TamperingAlertsView";

export default function TamperingAlertsPage() {
  return (
    <SupportGuard>
      <Topbar title="Tampering Alerts" />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        <TamperingAlertsView />
      </main>
    </SupportGuard>
  );
}
