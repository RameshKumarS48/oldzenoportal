"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccessGuard } from "@/components/ui/AccessGuard";
import { Topbar } from "@/components/layout/Topbar";
import { BatteryTable } from "@/components/battery-tracking/BatteryTable";
import { BatteryFilterBar } from "@/components/battery-tracking/BatteryFilterBar";
import { useBatteries } from "@/components/battery-tracking/use-batteries";
import { assetTypeLabel, lastSeenActive, regionLabel, matches, nextSort, sortRows, NO_FILTERS, type BatteryFilters, type Sort } from "@/components/battery-tracking/filters";
import { listQuery, readListState, type ListState } from "@/components/battery-tracking/list-query";
import { usePerPage } from "@/components/battery-tracking/per-page";
import { exactAsset, matchesSearch } from "@/components/battery-tracking/search";
import { searchChip } from "@/components/battery-tracking/FilterChip";
import { FilterChip, FilterChips } from "@/components/ui/FilterChip";
import { rangeLabel } from "@/components/swap-transactions/DateRangeFilter";
import { useAuthStore } from "@/store/auth";

// The current minute, so "Updated 5 min ago" moves on while the page is open.
// Null in the server render, which has no "now" that matches the viewer's.
function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noMinute = () => null;

const LAST_SEEN_LABELS: Record<string, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

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
  const [filters, setFilters] = useState<BatteryFilters>({
    lastSeen: initial.lastSeen,
    range: initial.range,
    asset: initial.asset,
    region: initial.region,
  });
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [perPageInUrl, setPerPageInUrl] = useState(initial.perPage);
  const userId = useAuthStore((s) => s.user?.id);
  const [savedPerPage, setSavedPerPage] = usePerPage(userId);
  const perPage = perPageInUrl ?? savedPerPage;
  const now = useSyncExternalStore(subscribeMinute, currentMinute, noMinute);

  const data = useBatteries();
  const rows = data
    ? sortRows(data.rows.filter((b) => matchesSearch(b, search) && matches(b, filters, data.loadedAt)), sort)
    : [];
  const named = exactAsset(search);
  // A page past the end (an old link, or fewer rows after a filter) shows the last page.
  const shownPage = data ? Math.min(page, Math.max(1, Math.ceil(rows.length / perPage))) : page;

  const state = { search, lastSeen: filters.lastSeen, range: filters.range, asset: filters.asset, region: filters.region, sort, page: shownPage, perPage: perPageInUrl };
  const query = listQuery(state);

  function applyState(s: ListState) {
    setSearch(s.search);
    setFilters({ lastSeen: s.lastSeen, range: s.range, asset: s.asset, region: s.region });
    setSort(s.sort);
    setPage(s.page);
    setPerPageInUrl(s.perPage);
  }

  // Queries this page wrote that the URL hasn't caught up with yet. Any other
  // change to the URL (the sidebar's Battery Tracking link, say) came from
  // outside, so the table takes its state from the URL again.
  const written = useRef<string[]>([]);
  useEffect(() => {
    if (window.location.pathname + window.location.search !== pathname + query) {
      written.current.push(query);
      window.history.replaceState(window.history.state, "", pathname + query);
    }
  }, [pathname, query]);
  const urlQuery = params.toString() ? `?${params.toString()}` : "";
  useEffect(() => {
    const i = written.current.indexOf(urlQuery);
    if (i !== -1) {
      written.current.splice(0, i + 1);
      return;
    }
    written.current = [];
    // The URL is outside React, so following it is an effect's job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlQuery === window.location.search && urlQuery !== query) applyState(readListState(new URLSearchParams(urlQuery)));
    // Only a change to the URL resets the table, not a change to its state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

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

      {/* Content. bg-zeno-bg, as on Swap Transactions, so dark mode darkens the page canvas too. */}
      <div className="flex flex-col flex-1 overflow-hidden bg-zeno-bg p-5 gap-4">
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
          onClear={() => {
            setSearch("");
            setFilters(NO_FILTERS);
            setPage(1);
          }}
          shown={data ? rows.length : null}
          total={data ? data.rows.length : null}
          year={new Date(data?.loadedAt ?? 0).getUTCFullYear()}
        />

        {/* The active chips: a search naming one vehicle or station exactly (× clears the search),
            Last seen, Asset type, and Region with how many batteries are in it. */}
        {data && (named || lastSeenActive(filters) || filters.asset || filters.region) && (
          <FilterChips>
            {named && (
              <FilterChip
                {...searchChip(named)}
                onRemove={() => {
                  setSearch("");
                  setPage(1);
                }}
              />
            )}
            {lastSeenActive(filters) && (
              <FilterChip
                label="Last seen"
                value={filters.lastSeen === "custom" && filters.range ? rangeLabel(filters.range) : LAST_SEEN_LABELS[filters.lastSeen]}
                removeLabel="Remove Last seen filter"
                onRemove={() => {
                  setFilters({ ...filters, lastSeen: "", range: null });
                  setPage(1);
                }}
              />
            )}
            {filters.asset && (
              <FilterChip
                label="Asset"
                value={assetTypeLabel(filters.asset)}
                removeLabel="Remove Asset filter"
                onRemove={() => {
                  setFilters({ ...filters, asset: "" });
                  setPage(1);
                }}
              />
            )}
            {filters.region && (
              <FilterChip
                label="Region"
                value={`${regionLabel(filters.region)} · ${data.rows.filter((b) => matches(b, { ...NO_FILTERS, region: filters.region }, data.loadedAt)).length.toLocaleString()}`}
                removeLabel="Remove Region filter"
                onRemove={() => {
                  setFilters({ ...filters, region: "" });
                  setPage(1);
                }}
              />
            )}
          </FilterChips>
        )}

        <BatteryTable
          rows={rows}
          loading={!data}
          sort={sort}
          onSort={(column) => setSort((s) => nextSort(s, column))}
          filteredColumn={lastSeenActive(filters) ? "lastSeen" : null}
          page={shownPage}
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
