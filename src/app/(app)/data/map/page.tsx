"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Flame } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useMapAssets, ASSET_META, type AssetKind } from "@/lib/map-data";
import { cn } from "@/lib/utils";

const FleetMap = dynamic(() => import("@/components/map/FleetMap").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

const KINDS: AssetKind[] = [
  "vehicle",
  "customer",
  "swap_station",
  "battery",
  "fast_charger",
  "home_charger",
];

type Mode = "pins" | "heatmap";

export default function MapPage() {
  const all = useMapAssets();
  const [active, setActive] = useState<Set<AssetKind>>(() => new Set(KINDS));
  const [mode, setMode] = useState<Mode>("pins");

  const counts = useMemo(() => {
    const c = {} as Record<AssetKind, number>;
    for (const a of all) c[a.kind] = (c[a.kind] ?? 0) + 1;
    return c;
  }, [all]);

  const filtered = useMemo(() => all.filter((a) => active.has(a.kind)), [all, active]);

  const toggle = (k: AssetKind) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const allOn = active.size === KINDS.length;

  return (
    <>
      <Topbar title="Fleet Map" />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setActive(allOn ? new Set() : new Set(KINDS))}
            className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-colors"
          >
            {allOn ? "Clear all" : "Select all"}
          </button>

          {KINDS.map((k) => {
            const on = active.has(k);
            const meta = ASSET_META[k];
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={cn(
                  "flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                  on
                    ? "bg-white border-slate-300 text-slate-700 shadow-sm"
                    : "bg-transparent border-slate-200 text-slate-400 hover:text-slate-500"
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full transition-colors"
                  style={{ backgroundColor: on ? meta.color : "#cbd5e1" }}
                />
                {meta.plural}
                <span className={cn("tabular-nums", on ? "text-slate-400" : "text-slate-300")}>
                  {counts[k] ?? 0}
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {(["pins", "heatmap"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  mode === m ? "bg-[#003B49] text-white" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {m === "pins" ? <MapPin className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
                {m === "pins" ? "Pins" : "Heatmap"}
              </button>
            ))}
          </div>
        </div>

        <div
          className="relative w-full rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white"
          style={{ height: "calc(100vh - 216px)", minHeight: 460 }}
        >
          <FleetMap assets={filtered} mode={mode} />

          <div className="absolute left-3 bottom-3 z-10 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm px-3 py-2 text-[11px] leading-relaxed text-slate-500 max-w-[210px] pointer-events-none">
            <p className="font-semibold text-slate-700 mb-0.5">
              {filtered.length.toLocaleString()} assets shown
            </p>
            <p>
              Scroll to zoom · drag to pan · click a cluster to expand · hover a pin for details.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
