"use client";

import { use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { AssetForm } from "@/components/zeno-charging/AssetForm";

export default function EditChargingAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Topbar title="Edit charging asset" />
      <ChargingGate>
        {({ assets, me }) => {
          const asset = assets.find((a) => a.id === id);
          if (!asset) return <Message>This asset doesn’t exist. <Link href="/zeno-charging" className="underline">Back to Zeno Charging</Link></Message>;
          if (!me.can.write) return <Message>You can view charging assets but not edit them.</Message>;
          if (asset.archivedAt) return <Message>This asset is archived. {me.can.restore ? "Restore it to edit it." : "A Super Admin can restore it."} <Link href={`/zeno-charging/${id}`} className="underline">Open it</Link></Message>;
          return <AssetForm key={`${asset.id}:${asset.version}`} mode="edit" assets={assets} me={me} asset={asset} initial={asset} />;
        }}
      </ChargingGate>
    </>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 items-center justify-center bg-zeno-bg p-6 text-sm text-slate-500">{children}</main>;
}
