"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { AssetForm } from "@/components/zeno-charging/AssetForm";
import { emptyInput, nextSiteId, SITE_LEVEL_KEYS, type ChargingAsset } from "@/lib/charging/fields";
import type { Me } from "@/components/zeno-charging/api";

/** Add a swap station or fast charger. `?site=Site-0042` starts at that site. */
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
  const site = useSearchParams().get("site");
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
  return <AssetForm mode="create" assets={assets} me={me} initial={initial} />;
}
