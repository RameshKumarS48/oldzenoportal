"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { AssetForm } from "@/components/zeno-charging/AssetForm";
import { emptyInput, nextSiteId, SITE_LEVEL_KEYS, type ChargingAsset } from "@/lib/charging/fields";
import { getDraft, type Me } from "@/components/zeno-charging/api";

/** Add a swap station or fast charger. `?site=Site-0042` starts at that site; `?draft=<id>` continues a saved draft. */
export default function NewChargingAssetPage() {
  return (
    <>
      <Topbar title="Add charging asset" />
      <ChargingGate>
        {({ assets, me }) => (
          <Suspense fallback={null}>
            <NewAsset assets={assets} me={me} />
          </Suspense>
        )}
      </ChargingGate>
    </>
  );
}

function NewAsset({ assets, me }: { assets: ChargingAsset[]; me: Me }) {
  const params = useSearchParams();
  const site = params.get("site");
  const draftParam = params.get("draft");
  const draft = draftParam ? getDraft(draftParam) : undefined;
  if (!me.can.write) {
    return <main className="flex flex-1 items-center justify-center bg-zeno-bg text-sm text-slate-500">You can view charging assets but not add them.</main>;
  }
  const initial = emptyInput();
  const from = site ? assets.find((a) => a.siteId === site) : undefined;
  if (from) {
    initial.siteId = from.siteId;
    for (const k of SITE_LEVEL_KEYS) (initial as unknown as Record<string, unknown>)[k] = from[k];
    initial.lat = from.lat;
    initial.lng = from.lng;
  } else {
    initial.siteId = nextSiteId(assets.map((a) => a.siteId));
  }
  if (draft) {
    // The new site ID may have been taken since the draft was saved: give it the next free one.
    const values = draft.siteMode === "new" ? { ...draft.values, siteId: nextSiteId(assets.map((a) => a.siteId)) } : draft.values;
    return <AssetForm key={draft.id} mode="create" assets={assets} me={me} initial={initial} draft={{ ...draft, values }} />;
  }
  if (draftParam) {
    return <main className="flex flex-1 items-center justify-center bg-zeno-bg text-sm text-slate-500">This draft no longer exists. It may have been finished or deleted.</main>;
  }
  return <AssetForm mode="create" assets={assets} me={me} initial={initial} />;
}
