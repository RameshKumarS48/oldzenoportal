"use client";

import { useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { BatteryTable } from "@/components/battery-tracking/BatteryTable";
import { BatteryFilterBar } from "@/components/battery-tracking/BatteryFilterBar";
import { useBatteries } from "@/components/battery-tracking/use-batteries";
import { matches, nextSort, NO_FILTERS, sortRows, type BatteryFilters, type Sort } from "@/components/battery-tracking/filters";
import { usePerPage } from "@/components/battery-tracking/per-page";
import { useAuthStore } from "@/store/auth";

// The current minute, so "Updated 5 min ago" moves on while the page is open.
// Null in the server render, which has no "now" that matches the viewer's.
function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noMinute = () => null;

function updatedLabel(syncedAt: number, now: number): string {
  const min = Math.floor((now - syncedAt) / 60_000);
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  return `Updated ${Math.floor(min / 60)} h ago`;
}

export default function BatteryTrackingPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<BatteryFilters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const userId = useAuthStore((s) => s.user?.id);
  const [perPage, setPerPage] = usePerPage(userId);
  // Null until the first Sync: the mock data's own age, as the dev portal shows it.
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const now = useSyncExternalStore(subscribeMinute, currentMinute, noMinute);

  // Filters, search and sort reset on reload; only rows per page is saved.
  const data = useBatteries();
  const query = search.trim();
  const rows = data
    ? sortRows(data.rows.filter((b) => (!query || b.imei.includes(query)) && matches(b, filters, data.loadedAt)), sort)
    : [];

  return (
    <AccessGuard module="vehicle">
      <Topbar title="Battery Tracking" />
      <main className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <p className="text-xs text-slate-400 max-w-md">
          When and where each battery last reported, and its state of charge
        </p>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {syncedAt === null || now === null ? "Updated 2 min ago" : updatedLabel(syncedAt, Math.max(now, syncedAt))}
          </span>
          <Button variant="outline" size="sm" onClick={() => setSyncedAt(Date.now())}>
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
        <BatteryFilterBar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={filters}
          onFilters={(f) => {
            setFilters(f);
            setPage(1);
          }}
          shown={data ? rows.length : null}
          total={data ? data.rows.length : null}
        />

        <BatteryTable
          rows={rows}
          loading={!data}
          sort={sort}
          onSort={(column) => setSort((s) => nextSort(s, column))}
          page={page}
          perPage={perPage}
          onPage={setPage}
          onPerPage={setPerPage}
        />
      </div>
      </main>
    </AccessGuard>
  );
}
