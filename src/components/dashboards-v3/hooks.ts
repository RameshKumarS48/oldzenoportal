"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False on the server and during hydration, true after. The v3 store lives in
 * localStorage, so anything that reads it waits for this to avoid rendering
 * the seed on the server and the saved copy on the client.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noMinute = () => 0;

/** The current minute, for "3 hours ago"; 0 on the server. */
export function useNowMinute(): number {
  return useSyncExternalStore(subscribeMinute, currentMinute, noMinute);
}
