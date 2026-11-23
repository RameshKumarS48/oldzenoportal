"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Globe, Smartphone } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { Callout } from "@/components/ui/callout";
import { exportGbpCsv } from "@/components/zeno-charging/export";
import { addressLine, locationJsonLd, publicLocations } from "@/lib/charging/public";
import type { ChargingAsset } from "@/lib/charging/fields";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

/**
 * What the rider app, zeno.earth and Google would receive from Zeno Charging,
 * computed live from the data here. For engineers: the feed's filter rule,
 * shape and fields are exactly these.
 */
export default function ChargingPreviewPage() {
  return (
    <>
      <Topbar title="App & website preview" />
      <ChargingGate>{({ assets }) => <Preview assets={assets} />}</ChargingGate>
    </>
  );
}

const TABS = [
  { id: "list", label: "Locations" },
  { id: "json", label: "App & website feed (JSON)" },
  { id: "jsonld", label: "Google (schema.org)" },
] as const;

function Preview({ assets }: { assets: ChargingAsset[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("list");
  const locations = publicLocations(assets);
  const feed = { updatedAt: new Date().toISOString().slice(0, 19) + "Z", count: locations.length, locations };
  const swaps = locations.filter((l) => l.type === "Swap Station").length;
  const hidden = assets.length - locations.length;

  function downloadJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(feed, null, 2)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: "charging-locations.json" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
        <div>
          <Link href="/zeno-charging" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3 w-3" /> Zeno Charging Network</Link>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{locations.length}</span> locations published ({swaps} swap stations, {locations.length - swaps} fast chargers).{" "}
            <span className="text-slate-500">{hidden} not published: decommissioned, restricted or internal, archived, or without coordinates.</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={downloadJson} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> Feed JSON</button>
          <button type="button" onClick={() => { const n = exportGbpCsv(assets); toast.success("Google Business Profile CSV downloaded", `${n} locations.`); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#003B49] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00505f]"><Download className="h-3.5 w-3.5" /> Google CSV</button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto bg-zeno-bg p-5">
        <Callout variant="info" title="For engineers">
          The rider app’s station list and zeno.earth’s locations page read this feed (proposed <code>GET /v1/charging/locations</code>).
          Published = Commissioned + Public + not archived + has coordinates. Never include lease, rent, payment, meter or partner fields.
          Changes in Zeno Charging should appear within 5 minutes. Google gets the same locations as schema.org data and through the Business Profile bulk upload.
        </Callout>

        <div role="tablist" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)} className={cn("rounded-md px-3 py-1.5 font-medium", tab === t.id ? "bg-[#003B49] text-white" : "text-slate-600 hover:bg-slate-50")}>{t.label}</button>
          ))}
        </div>

        {tab === "list" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800"><Smartphone className="h-4 w-4 text-slate-400" /> Rider app: Find a Zeno station</h2>
              <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-auto text-sm">
                {locations.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">{l.landmark}</span>
                      <span className="block truncate text-xs text-slate-500">{addressLine(l)}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", l.type === "Swap Station" ? "bg-orange-50 text-orange-700" : "bg-sky-50 text-sky-700")}>{l.type}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800"><Globe className="h-4 w-4 text-slate-400" /> zeno.earth: locations by town</h2>
              <div className="max-h-[60vh] overflow-auto px-5 py-3 text-sm">
                {[...new Set(locations.map((l) => l.town))].map((town) => {
                  const here = locations.filter((l) => l.town === town);
                  return (
                    <div key={town} className="mb-3">
                      <h3 className="text-xs font-semibold text-slate-700">{town} <span className="font-normal text-slate-400">· {here.length}</span></h3>
                      <p className="text-xs text-slate-500">{here.map((l) => l.landmark).join(" · ")}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
        {tab === "json" && <Code value={JSON.stringify({ ...feed, locations: feed.locations.slice(0, 3) }, null, 2)} note={`First 3 of ${locations.length} locations. Download the full feed above.`} />}
        {tab === "jsonld" && <Code value={JSON.stringify(locations.slice(0, 2).map((l) => locationJsonLd(l, "https://zeno.earth")), null, 2)} note="What the website puts in each location’s page for Google. First 2 shown." />}
      </div>
    </main>
  );
}

function Code({ value, note }: { value: string; note: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-5 py-2.5 text-xs text-slate-500">{note}</p>
      <pre className="max-h-[60vh] overflow-auto px-5 py-3 text-xs leading-relaxed text-slate-700">{value}</pre>
    </section>
  );
}
