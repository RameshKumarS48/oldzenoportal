"use client";

import { useState } from "react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Wallet, Smartphone } from "lucide-react";
import { WalletLedgerTable } from "@/components/wallet-transactions/WalletLedgerTable";
import { RechargeRequestsTable } from "@/components/wallet-transactions/RechargeRequestsTable";

type View = "ledger" | "recharges";

export default function WalletTransactionsPage() {
  // The full debit/credit ledger is the default view of this tab.
  const [view, setView] = useState<View>("ledger");

  return (
    <AccessGuard module="wallet_info">
      <Topbar title="Wallet Transactions" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          {view === "ledger"
            ? <Wallet className="w-5 h-5 text-[#003B49]" />
            : <Smartphone className="w-5 h-5 text-[#00A651]" />}
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          <label htmlFor="wallet-view" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">View</label>
          <select
            id="wallet-view"
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]"
          >
            <option value="ledger">Wallet Ledger (Debit / Credit)</option>
            <option value="recharges">M-Pesa Recharge Requests</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        {view === "ledger" ? <WalletLedgerTable /> : <RechargeRequestsTable />}
      </div>
      </main>
    </AccessGuard>
  );
}
