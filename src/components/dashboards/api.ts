"use client";

/**
 * Dome Dashboards' data and rights for the pages. In this prototype the
 * dashboards live in the browser store, the registry is the sample one and
 * queries are answered by the sample generator; the functions are shaped
 * like the API engineers will build (registry, search, run a query, and the
 * dashboard writes), so swapping them for server calls changes nothing above.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAccess } from "@/lib/access";
import { useAuthStore } from "@/store/auth";
import { useDashboardsStore } from "@/store/dome-dashboards";
import { REGISTRY_SEED } from "@/lib/dashboards/registry-seed";
import { cardRecords, getRecord } from "@/lib/dashboards/registry";
import { runQuery, type QueryContext, type Result } from "@/lib/dashboards/query";
import { canSee, type Actor } from "@/lib/dashboards/rules";
import type { Card, Dashboard, Registry } from "@/lib/dashboards/types";

export interface Me extends Actor {
  /** Read-only roles open shared dashboards but don't make their own. */
  canCreate: boolean;
  /** Whether this person may see a kind of record anywhere in Dome. */
  canViewRecord: (recordId: string) => boolean;
  canViewCard: (card: Card) => boolean;
}

const noop = () => () => {};
/** The store lives in localStorage: wait for the browser before reading it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export const useRegistry = (): Registry => REGISTRY_SEED;

export function useMe(): Me {
  const user = useAuthStore((s) => s.user);
  const { canView, canWrite } = useAccess();
  const registry = useRegistry();
  return useMemo(() => {
    const canViewRecord = (recordId: string) => { const r = getRecord(registry, recordId); return !!r && canView(r.module); };
    return {
      id: user?.id ?? "", name: user?.name ?? "Someone", superAdmin: user?.role === "zeno_super_admin",
      canCreate: canWrite("dashboards"), canViewRecord,
      canViewCard: (card: Card) => cardRecords(card).every((id) => !getRecord(registry, id) || canViewRecord(id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.role, registry]);
}

/** The dashboards this person may open. */
export function useDashboards(me: Actor): Dashboard[] {
  const all = useDashboardsStore((s) => s.dashboards);
  return useMemo(() => all.filter((d) => canSee(d, me)), [all, me]);
}

export type QueryState = { status: "loading" } | { status: "done"; result: Result };

/** Runs a card's query. Answers arrive a moment later, as they will from the server; `retry` asks again. */
export function useQuery(card: Card, ctx: QueryContext, enabled = true): QueryState & { retry: () => void } {
  const registry = useRegistry();
  const [attempt, setAttempt] = useState(0);
  const { id: _id, title: _title, ...spec } = card;
  void _id; void _title;
  const key = `${JSON.stringify(spec)}|${JSON.stringify(ctx)}|${attempt}`;
  const [state, setState] = useState<{ key: string; result: Result } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      let result: Result;
      try { result = runQuery(registry, JSON.parse(JSON.stringify(card)) as Card, ctx); } catch { result = { type: "error", code: "failed" }; }
      setState({ key, result });
    }, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  const retry = () => setAttempt((n) => n + 1);
  return state && state.key === key ? { status: "done", result: state.result, retry } : { status: "loading", retry };
}

export const dashboards = () => useDashboardsStore.getState();
export const useUndo = () => useDashboardsStore((s) => s.undo);
