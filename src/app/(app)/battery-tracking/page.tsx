"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { BatteryTable } from "@/components/battery-tracking/BatteryTable";
import { BatteryFilterBar } from "@/components/battery-tracking/BatteryFilterBar";
import { useBatteries } from "@/components/battery-tracking/use-batteries";
import { matches, nextSort, sortRows, type BatteryFilters, type Sort } from "@/components/battery-tracking/filters";
import { listQuery, readListState } from "@/components/battery-tracking/list-query";
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

function updatedLabel(loadedAt: number, now: number): string {
  const min = Math.floor((now - loadedAt) / 60_000);
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  return `Updated ${Math.floor(min / 60)} h ago`;
}

export default function BatteryTrackingPage() {
  return (
    <AccessGuard module="vehicle">
      <Topbar title="Battery Tracking" />
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* The table's state lives in the URL, and reading it needs a Suspense boundary for the build. */}
        <Suspense fallback={null}>
          <BatteryTracking />
        </Suspense>
      </main>
    </AccessGuard>
  );
}

function BatteryTracking() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Search, filter, sort, page and rows per page start from the URL (a Back
  // link or browser back), and each change is written back to it, replacing
  // the entry rather than adding history. Rows per page is also saved per user,
  // which applies when the URL doesn't name one.
  const [initial] = useState(() => readListState(new URLSearchParams(params.toString())));
  const [search, setSearch] = useState(initial.search);
  const [filters, setFilters] = useState<BatteryFilters>({ lastSeen: initial.lastSeen });
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [perPageInUrl, setPerPageInUrl] = useState(initial.perPage);
  const userId = useAuthStore((s) => s.user?.id);
  const [savedPerPage, setSavedPerPage] = usePerPage(userId);
  const perPage = perPageInUrl ?? savedPerPage;
  const now = useSyncExternalStore(subscribeMinute, currentMinute, noMinute);

  const state = { search, lastSeen: filters.lastSeen, sort, page, perPage: perPageInUrl };
  const query = listQuery(state);
  useEffect(() => {
    if (window.location.pathname + window.location.search !== pathname + query) {
      window.history.replaceState(window.history.state, "", pathname + query);
    }
  }, [pathname, query]);

  const data = useBatteries();
  const term = search.trim().toLowerCase();
  const rows = data
    ? sortRows(
        data.rows.filter(
          (b) => (!term || b.imei.includes(term) || b.serialNo.toLowerCase().includes(term)) && matches(b, filters, data.loadedAt)
        ),
        sort
      )
    : [];

  return (
    <>
      {/* Page controls */}
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <p className="text-xs text-slate-400 max-w-md">
          When and where each battery last reported, and its state of charge
        </p>

        {/* The rows are as of page load; the Topbar's Sync is the page's only sync. */}
        <span className="text-xs text-slate-500">
          {data && now !== null ? updatedLabel(data.loadedAt, Math.max(now, data.loadedAt)) : null}
        </span>
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
          onPerPage={(n) => {
            setSavedPerPage(n);
            setPerPageInUrl(n);
          }}
          onOpen={(serialNo) => router.push(`/battery-tracking/${encodeURIComponent(serialNo)}${query}`)}
        />
      </div>
    </>
  );
}
