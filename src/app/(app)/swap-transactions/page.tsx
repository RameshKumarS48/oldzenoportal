"use client";

import { useState } from "react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { ShieldAlert, ArrowLeftRight } from "lucide-react";
import { TamperingAlertsView } from "@/components/swap-transactions/TamperingAlertsView";
import { SwapRecordsTable } from "@/components/swap-transactions/SwapRecordsTable";

type View = "tampering" | "all";

export default function SwapTransactionsPage() {
  // Tampering Alerts is the default view of this tab.
  const [view, setView] = useState<View>("tampering");

  return (
    <AccessGuard module="swap_info">
      <Topbar title="Swap Transactions" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          {view === "tampering"
            ? <ShieldAlert className="w-5 h-5 text-[#FF3B06]" />
            : <ArrowLeftRight className="w-5 h-5 text-[#003B49]" />}
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          <label htmlFor="swap-view" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">View</label>
          <select
            id="swap-view"
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]"
          >
            <option value="tampering">Tampering Alerts</option>
            <option value="all">All Swap Transactions</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        {view === "tampering" ? <TamperingAlertsView /> : <SwapRecordsTable />}
      </div>
      </main>
    </AccessGuard>
  );
}
