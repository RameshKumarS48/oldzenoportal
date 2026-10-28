"use client";

import { useCallback, useSyncExternalStore } from "react";

export const PER_PAGE_OPTIONS = [20, 50, 100];
const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0];

/** A saved rows-per-page, if it's still one of the options. Anything else is the default. */
function parse(raw: string | null): number {
  const n = Number(raw);
  return PER_PAGE_OPTIONS.includes(n) ? n : DEFAULT_PER_PAGE;
}

// Writes land here too, so the choice still holds for this visit when
// localStorage is unavailable (private windows, blocked site data).
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Battery Tracking's rows per page, remembered per signed-in user in this
 * browser's localStorage, as Vehicle Tracking remembers its columns. The server
 * render and any storage failure fall back to 20.
 */
export function usePerPage(userId: string | undefined): [number, (n: number) => void] {
  const key = `zeno:battery-tracking:per-page:${userId ?? "anonymous"}`;
  const perPage = parse(useSyncExternalStore(subscribe, () => read(key), () => null));

  const setPerPage = useCallback(
    (n: number) => {
      const value = String(n);
      memory.set(key, value);
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Kept in memory for this visit only.
      }
      listeners.forEach((l) => l());
    },
    [key]
  );

  return [perPage, setPerPage];
}
