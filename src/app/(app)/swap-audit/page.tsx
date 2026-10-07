"use client";

import { ScanSearch } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { SwapAuditTable } from "@/components/swap-audit/SwapAuditTable";

export default function SwapAuditPage() {
  return (
    <AccessGuard module="swap_info">
      <Topbar title="Swap Audit" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Page controls */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ScanSearch className="w-5 h-5 text-[#FF3B06]" />
            <p className="text-xs text-slate-400 max-w-2xl">
              Every swap session on 6 Oct 2026, scored against the compliant sequence: collect depleted
              &rarr; dispense charged, twice. Open a row for the slots, the evidence and the event log.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-zeno-bg p-6">
          <SwapAuditTable />
        </div>
      </main>
    </AccessGuard>
  );
}
