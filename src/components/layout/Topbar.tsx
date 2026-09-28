"use client";

import { LogOut, Settings, User, RefreshCw, Sun, Moon } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useActualsStore } from "@/store/actuals";
import { useThemeStore } from "@/store/theme";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import { ROLE_LABELS } from "@/lib/mock/users";
import type { UserRole } from "@/lib/mock/users";

interface TopbarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const sync = useActualsStore((s) => s.sync);
  const isLoading = useActualsStore((s) => s.isLoading);
  const lastSyncedAt = useActualsStore((s) => s.lastSyncedAt);
  const { theme, toggle } = useThemeStore();

  const handleSync = async () => {
    await sync();
    const { error, weeks } = useActualsStore.getState();
    if (error) {
      toast.error("Sync failed", `${error.replace(/^Error:\s*/, "")}. The figures below are the last ones that loaded.`);
    } else {
      toast.success("Data synced", `${weeks.length} weeks of actuals are up to date.`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const roleLabel = user?.role ? (ROLE_LABELS[user.role as UserRole] ?? user.role) : "";

  return (
    <header className="h-16 bg-[#003B49] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        {title && (
          <h1
            className="text-lg font-semibold text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
        )}
        {actions}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-white/50 mr-1">{format(new Date(), "d MMM yyyy")}</span>

        <button
          onClick={() => void handleSync()}
          disabled={isLoading}
          title={lastSyncedAt ? `Last synced ${format(new Date(lastSyncedAt), "HH:mm")}` : "Sync live data"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          <span>{isLoading ? "Syncing…" : "Sync"}</span>
        </button>

        <Link href="/settings" title="Settings">
          <button className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </Link>

        <button
          onClick={toggle}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-white/20">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <User className="w-4 h-4 text-white/70" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.name ?? "Guest"}</p>
            <p className="text-[11px] text-white/50">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
