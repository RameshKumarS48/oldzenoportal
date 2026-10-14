"use client";

import { useSyncExternalStore } from "react";
import { batteriesAt, type BatteryRecord } from "@/lib/mock/battery-tracking";

type Loaded = { rows: BatteryRecord[]; loadedAt: number };

// Built once, the first time a browser asks, so every render (and the
// presets' "now") sees the same rows until the page reloads.
let loaded: Loaded | null = null;
const subscribe = () => () => {};
function snapshot(): Loaded {
  if (!loaded) {
    const loadedAt = Date.now();
    loaded = { rows: batteriesAt(loadedAt), loadedAt };
  }
  return loaded;
}
const serverSnapshot = () => null;

/**
 * The mock batteries, dated from when the page loaded. Null in the server
 * render, which has no "now" that matches the viewer's, so the table fills in
 * just after the page arrives.
 */
export function useBatteries(): Loaded | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
