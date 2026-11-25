"use client";

/**
 * Dome Dashboards, prototype store: dashboards kept in the browser like
 * Dome's other mock data. Every write applies the same rules a backend
 * would (who may change what, limits, validation, stale edits), so engineers
 * can see the intended behaviour.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DASHBOARD_SEED } from "@/lib/dashboards/seed";
import { REGISTRY_SEED } from "@/lib/dashboards/registry-seed";
import { addCardError, canEdit, canSee, cardErrors, cleanName, copyName, nameError, rangeError, type Actor } from "@/lib/dashboards/rules";
import { todayEat } from "@/lib/dashboards/time";
import type { Card, Dashboard, DashFilter, RangeValue } from "@/lib/dashboards/types";

/** Bump with the seed (or the stored shape) so browsers reload it. */
export const DASHBOARDS_SEED_REVISION = 1;

export type Outcome<T = Dashboard> = { ok: true; value: T } | { ok: false; error: string };

interface Undo { dashboardId: string; before: Dashboard; label: string }

interface State {
  dashboards: Dashboard[];
  /** The last change to a dashboard's content, kept until the next one. Not saved. */
  undo: Undo | null;
  create: (name: string, visibility: Dashboard["visibility"], actor: Actor) => Outcome;
  duplicate: (id: string, actor: Actor) => Outcome;
  rename: (id: string, name: string, actor: Actor) => Outcome;
  setVisibility: (id: string, visibility: Dashboard["visibility"], actor: Actor) => Outcome;
  remove: (id: string, actor: Actor) => Outcome<null>;
  setRange: (id: string, version: number, range: RangeValue, actor: Actor) => Outcome;
  setFilters: (id: string, version: number, filters: DashFilter[], actor: Actor) => Outcome;
  addCard: (id: string, version: number, card: Card, actor: Actor) => Outcome;
  updateCard: (id: string, version: number, card: Card, actor: Actor) => Outcome;
  removeCard: (id: string, version: number, cardId: string, actor: Actor) => Outcome;
  /** Swaps two cards' places. */
  moveCard: (id: string, version: number, cardId: string, otherId: string, actor: Actor) => Outcome;
  undoLast: (actor: Actor) => Outcome;
  reset: () => void;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const GONE = "This dashboard no longer exists.";
const NOT_YOURS = "Only the dashboard’s owner can change it.";

export const useDashboardsStore = create<State>()(
  persist(
    (set, get) => {
      /** One change to a dashboard's content: checks rights and staleness, bumps the version, remembers the undo. */
      const change = (id: string, version: number | null, actor: Actor, label: string | null, fn: (d: Dashboard) => Dashboard | string): Outcome => {
        const current = get().dashboards.find((d) => d.id === id);
        if (!current || !canSee(current, actor)) return fail(GONE);
        if (!canEdit(current, actor)) return fail(NOT_YOURS);
        if (version != null && current.version !== version) return fail(`Changed by ${current.updatedBy} since you opened it. Reload to see the latest.`);
        const next = fn(current);
        if (typeof next === "string") return fail(next);
        const saved: Dashboard = { ...next, version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: actor.name };
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? saved : d)), undo: label ? { dashboardId: id, before: current, label } : s.undo }));
        return { ok: true, value: saved };
      };

      return {
        dashboards: DASHBOARD_SEED,
        undo: null,

        create: (name, visibility, actor) => {
          const error = nameError(name, actor.id, get().dashboards);
          if (error) return fail(error);
          const now = new Date().toISOString();
          const d: Dashboard = { id: newId(), name: cleanName(name), visibility, ownerId: actor.id, ownerName: actor.name, range: { preset: "30d" }, filters: [], cards: [], createdAt: now, updatedAt: now, updatedBy: actor.name, version: 1 };
          set((s) => ({ dashboards: [...s.dashboards, d] }));
          return { ok: true, value: d };
        },

        duplicate: (id, actor) => {
          const source = get().dashboards.find((d) => d.id === id);
          if (!source || !canSee(source, actor)) return fail(GONE);
          const now = new Date().toISOString();
          const d: Dashboard = {
            ...source, id: newId(), name: copyName(source.name, actor.id, get().dashboards), visibility: "private", ownerId: actor.id, ownerName: actor.name,
            cards: source.cards.map((c) => ({ ...c, id: newId() })), createdAt: now, updatedAt: now, updatedBy: actor.name, version: 1,
          };
          set((s) => ({ dashboards: [...s.dashboards, d] }));
          return { ok: true, value: d };
        },

        rename: (id, name, actor) => change(id, null, actor, null, (d) => nameError(name, d.ownerId, get().dashboards, id) ?? { ...d, name: cleanName(name) }),
        setVisibility: (id, visibility, actor) => change(id, null, actor, null, (d) => ({ ...d, visibility })),

        remove: (id, actor) => {
          const current = get().dashboards.find((d) => d.id === id);
          if (!current || !canSee(current, actor)) return fail(GONE);
          if (!canEdit(current, actor)) return fail(NOT_YOURS);
          set((s) => ({ dashboards: s.dashboards.filter((d) => d.id !== id), undo: s.undo?.dashboardId === id ? null : s.undo }));
          return { ok: true, value: null };
        },

        setRange: (id, version, range, actor) => change(id, version, actor, null, (d) => rangeError(range, todayEat()) ?? { ...d, range }),
        setFilters: (id, version, filters, actor) =>
          change(id, version, actor, "Filters changed", (d) => (filters.some((f) => !f.values.length) ? "Choose at least one value for each filter." : { ...d, filters })),

        addCard: (id, version, card, actor) => change(id, version, actor, "Card added", (d) =>
          addCardError(d) ?? cardErrors(REGISTRY_SEED, card, todayEat())[0] ?? { ...d, cards: [...d.cards, { ...card, id: newId() }] }),
        updateCard: (id, version, card, actor) => change(id, version, actor, "Card changed", (d) =>
          !d.cards.some((c) => c.id === card.id) ? "This card was removed." : cardErrors(REGISTRY_SEED, card, todayEat())[0] ?? { ...d, cards: d.cards.map((c) => (c.id === card.id ? card : c)) }),
        removeCard: (id, version, cardId, actor) => change(id, version, actor, "Card removed", (d) =>
          d.cards.some((c) => c.id === cardId) ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d),
        moveCard: (id, version, cardId, otherId, actor) => change(id, version, actor, "Card moved", (d) => {
          const i = d.cards.findIndex((c) => c.id === cardId);
          const j = d.cards.findIndex((c) => c.id === otherId);
          if (i < 0 || j < 0 || i === j) return d;
          const cards = [...d.cards];
          [cards[i], cards[j]] = [cards[j], cards[i]];
          return { ...d, cards };
        }),

        undoLast: (actor) => {
          const u = get().undo;
          if (!u) return fail("Nothing to undo.");
          const out = change(u.dashboardId, null, actor, null, (d) => ({ ...d, cards: u.before.cards, filters: u.before.filters }));
          if (out.ok) set({ undo: null });
          return out;
        },

        reset: () => set({ dashboards: DASHBOARD_SEED, undo: null }),
      };
    },
    {
      name: "dome-dashboards",
      version: DASHBOARDS_SEED_REVISION,
      partialize: (s) => ({ dashboards: s.dashboards }),
      migrate: () => ({ dashboards: DASHBOARD_SEED }),
    },
  ),
);
