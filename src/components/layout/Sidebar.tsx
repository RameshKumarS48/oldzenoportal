"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Grid3X3, ScanLine, ArrowLeftRight, ScanSearch, Wallet, Users, LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess } from "@/lib/access";
import type { AccessModule } from "@/lib/access";
import { useAuthStore } from "@/store/auth";

/**
 * Dome's tabs, in order, each gated by the module that governs it. Swap Audit
 * is the session-level view behind Swap Transactions, so it shares `swap_info`
 * rather than introducing a sixth module.
 */
const NAV: { href: string; label: string; icon: LucideIcon; module: AccessModule }[] = [
  { href: "/asset-tracking",       label: "Asset Tracking",            icon: Grid3X3,        module: "vehicle" },
  { href: "/scanner-provisioning", label: "Scanner Provisioning Flow", icon: ScanLine,       module: "scanner" },
  { href: "/swap-transactions",    label: "Swap Transactions",         icon: ArrowLeftRight, module: "swap_info" },
  { href: "/swap-audit",           label: "Swap Audit",                icon: ScanSearch,     module: "swap_info" },
  { href: "/wallet-transactions",  label: "Wallet Transactions",       icon: Wallet,         module: "wallet_info" },
  { href: "/users",                label: "User Management",           icon: Users,          module: "user_management" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { canView } = useAccess();
  const logout = useAuthStore((s) => s.logout);

  const visible = NAV.filter((item) => canView(item.module));

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0",
            collapsed ? "ml-auto mr-auto" : "ml-1"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:text-white hover:bg-white/[0.07]",
                collapsed && "justify-center"
              )}
              style={{ fontFamily: "var(--font-display)" }}
              title={collapsed ? label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-zeno-red rounded-r-full" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 pt-2 border-t border-white/10 shrink-0">
        <button
          onClick={handleLogout}
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
