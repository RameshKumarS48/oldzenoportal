"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Grid3X3, ScanLine, ArrowLeftRight, Wallet, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { can } = usePermissions();
  const logout = useAuthStore((s) => s.logout);

  const onAssets = pathname.startsWith("/asset-tracking");
  const onScanner = pathname.startsWith("/scanner-provisioning");
  const onSwaps = pathname.startsWith("/swap-transactions");
  const onWallet = pathname.startsWith("/wallet-transactions");
  const onUsers = pathname.startsWith("/users");

  const showAssets = can("vehicles", "view");
  const showScanner = can("provisioning", "view");
  const showSwaps = can("swap_stations", "view");
  const showWallet = can("transactions", "view");
  const showUsers = can("users", "view");

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 bg-zeno-teal text-white transition-all duration-200",
        collapsed ? "w-[60px]" : "w-56"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center h-14 px-3 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zeno-red shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
            <path d="M6 3L18 12L6 21" />
          </svg>
        </div>
        {!collapsed && (
          <span
            className="ml-3 font-bold text-white text-base tracking-tight flex-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ZENO
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0",
            collapsed ? "ml-auto mr-auto" : "ml-1"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
        {showAssets && (
          <Link
            href="/asset-tracking"
            className={cn(
              "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              onAssets
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.07]",
              collapsed && "justify-center"
            )}
            style={{ fontFamily: "var(--font-display)" }}
            title={collapsed ? "Asset Tracking" : undefined}
          >
            {onAssets && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
            )}
            <Grid3X3 className="w-4 h-4 shrink-0" />
            {!collapsed && "Asset Tracking"}
          </Link>
        )}

        {showScanner && (
          <Link
            href="/scanner-provisioning"
            className={cn(
              "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              onScanner
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.07]",
              collapsed && "justify-center"
            )}
            style={{ fontFamily: "var(--font-display)" }}
            title={collapsed ? "Scanner Provisioning Flow" : undefined}
          >
            {onScanner && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
            )}
            <ScanLine className="w-4 h-4 shrink-0" />
            {!collapsed && "Scanner Provisioning Flow"}
          </Link>
        )}

        {showSwaps && (
          <Link
            href="/swap-transactions"
            className={cn(
              "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              onSwaps
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.07]",
              collapsed && "justify-center"
            )}
            style={{ fontFamily: "var(--font-display)" }}
            title={collapsed ? "Swap Transactions" : undefined}
          >
            {onSwaps && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
            )}
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            {!collapsed && "Swap Transactions"}
          </Link>
        )}

        {showWallet && (
          <Link
            href="/wallet-transactions"
            className={cn(
              "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              onWallet
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.07]",
              collapsed && "justify-center"
            )}
            style={{ fontFamily: "var(--font-display)" }}
            title={collapsed ? "Wallet Transactions" : undefined}
          >
            {onWallet && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
            )}
            <Wallet className="w-4 h-4 shrink-0" />
            {!collapsed && "Wallet Transactions"}
          </Link>
        )}

        {showUsers && (
          <Link
            href="/users"
            className={cn(
              "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              onUsers
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.07]",
              collapsed && "justify-center"
            )}
            style={{ fontFamily: "var(--font-display)" }}
            title={collapsed ? "User Management" : undefined}
          >
            {onUsers && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
            )}
            <Users className="w-4 h-4 shrink-0" />
            {!collapsed && "User Management"}
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 pt-2 border-t border-white/10 shrink-0">
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.07] transition-colors",
            collapsed && "justify-center"
          )}
          style={{ fontFamily: "var(--font-display)" }}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
