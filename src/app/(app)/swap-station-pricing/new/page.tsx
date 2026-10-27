"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { useAccess } from "@/lib/access";
import { PlanForm } from "@/components/pricing-plans/PlanForm";

/** A new pricing plan, on its own page: rates, then stations. */
export default function NewPricingPlanPage() {
  const router = useRouter();
  const canWrite = useAccess().canWrite("pricing");

  return (
    <AccessGuard module="pricing">
      <Topbar title="Swap Station Pricing" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {canWrite ? (
          <PlanForm
            plan={null}
            onDone={(planId) => router.push(planId ? `/swap-station-pricing/${planId}` : "/swap-station-pricing")}
            onCancel={() => router.push("/swap-station-pricing")}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <EmptyState title="You can't create plans" description="Ask an admin for edit access to Swap Station Pricing." />
            <Link href="/swap-station-pricing" className="text-sm text-zeno-teal font-medium hover:underline">Back to Swap Station Pricing</Link>
          </div>
        )}
      </main>
    </AccessGuard>
  );
}
