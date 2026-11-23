"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArchiveRestore, ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ChargingGate } from "@/components/zeno-charging/ChargingGate";
import { StatusBadge } from "@/components/zeno-charging/StatusBadge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Callout } from "@/components/ui/callout";
import { archiveAsset, restoreAsset, useHistory, type AuditEntry, type Me } from "@/components/zeno-charging/api";
import { FIELDS, FIELD_BY_KEY, SECTIONS, isPublic, mapsUrl, type ChargingAsset, type FieldKey } from "@/lib/charging/fields";
import { toast } from "@/store/toast";

export default function ChargingAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Topbar title="Zeno Charging Network" />
      <ChargingGate>
        {({ assets, me }) => {
          const asset = assets.find((a) => a.id === id);
          return asset
            ? <AssetDetail asset={asset} assets={assets} me={me} />
            : <main className="flex flex-1 items-center justify-center bg-zeno-bg text-sm text-slate-500">This asset doesn’t exist. <Link href="/zeno-charging" className="ml-1 underline">Back to the list</Link></main>;
        }}
      </ChargingGate>
    </>
  );
}

const BTN = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/40";

function AssetDetail({ asset, assets, me }: { asset: ChargingAsset; assets: ChargingAsset[]; me: Me }) {
  const [archiving, setArchiving] = useState(false);
  const [reason, setReason] = useState("");
  const history = useHistory(asset.id);
  const siblings = assets.filter((a) => a.siteId === asset.siteId && a.id !== asset.id);

  function doArchive() {
    const res = archiveAsset(asset.id, reason.trim());
    setArchiving(false);
    setReason("");
    if (res.ok) toast.success("Asset archived", "It no longer appears in the app or on the website.");
    else toast.error("Couldn’t archive", res.error);
  }
  function doRestore() {
    const res = restoreAsset(asset.id);
    if (res.ok) toast.success("Asset restored", isPublic(res.asset) ? "It appears in the app and on the website again." : undefined);
    else toast.error("Couldn’t restore", res.error);
  }

  const value = (k: FieldKey) => {
    const v = asset[k];
    if (v == null || v === "") return <span className="text-slate-300">–</span>;
    if (k === "leaseLink") return <a href={String(v)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-zeno-teal hover:underline">Open lease <ExternalLink className="h-3 w-3" /></a>;
    if (k === "monthlyRent") return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(v);
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
        <div className="min-w-0">
          <Link href="/zeno-charging" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3 w-3" /> Zeno Charging Network</Link>
          <h1 className="truncate text-base font-semibold text-slate-800">{asset.assetName}</h1>
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{asset.assetId ?? "No Asset ID"}</span> · {asset.assetType} · <span className="font-mono">{asset.siteId}</span>
            <StatusBadge asset={asset} />
            {isPublic(asset) ? <span className="text-emerald-700">In the app & website</span> : <span className="text-slate-400">Not in the app</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {me.can.write && !asset.archivedAt && (
            <>
              <Link href={`/zeno-charging/${asset.id}/edit`} className={`${BTN} bg-zeno-red text-white shadow-sm hover:bg-zeno-red-hover`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
              <button type="button" onClick={() => setArchiving(true)} className={`${BTN} border border-red-200 bg-white text-red-700 hover:bg-red-50`}><Trash2 className="h-3.5 w-3.5" /> Archive</button>
            </>
          )}
          {asset.archivedAt && me.can.restore && (
            <button type="button" onClick={doRestore} className={`${BTN} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><ArchiveRestore className="h-3.5 w-3.5" /> Restore</button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto bg-zeno-bg p-5">
        {asset.archivedAt && <Callout variant="neutral" title={`Archived ${asset.archivedAt.slice(0, 10)} by ${asset.updatedBy}`}>Kept with its history; hidden from the app, website and Google. {me.can.restore ? "" : "A Super Admin can restore it."}</Callout>}
        {asset.needsAttention && (
          <Callout variant="warning" title="Needs attention">{asset.needsAttention}{me.can.write && !asset.archivedAt ? <> · <Link href={`/zeno-charging/${asset.id}/edit`} className="underline">Fix it</Link></> : null}</Callout>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            {SECTIONS.map((s) => (
              <section key={s.id} className="rounded-xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800">{s.title}</h2>
                <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
                  {FIELDS.filter((f) => f.section === s.id).map((f) => (
                    <div key={f.key} className="min-w-0">
                      <dt className="text-[11px] font-medium text-slate-500">{f.label}</dt>
                      <dd className="break-words text-slate-800">{value(f.key)}</dd>
                    </div>
                  ))}
                  {s.id === "site" && mapsUrl(asset.lat, asset.lng) && (
                    <div><dt className="text-[11px] font-medium text-slate-500">Map</dt><dd><a href={mapsUrl(asset.lat, asset.lng)!} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-zeno-teal hover:underline">Google Maps <ExternalLink className="h-3 w-3" /></a></dd></div>
                  )}
                </dl>
              </section>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5">
                <h2 className="text-sm font-semibold text-slate-800">Also at {asset.siteId}</h2>
                {me.can.write && <Link href={`/zeno-charging/new?site=${encodeURIComponent(asset.siteId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline"><Plus className="h-3 w-3" /> Add here</Link>}
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {siblings.length === 0 && <li className="px-5 py-3 text-xs text-slate-400">No other assets at this site.</li>}
                {siblings.map((a) => (
                  <li key={a.id}><Link href={`/zeno-charging/${a.id}`} className="block px-5 py-2 hover:bg-slate-50"><span className="text-slate-800">{a.assetType}</span> <span className="font-mono text-xs text-slate-500">{a.assetId ?? "No ID"}</span>{a.archivedAt && <span className="text-xs text-slate-400"> · archived</span>}</Link></li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800">History</h2>
              <ol className="space-y-3 px-5 py-3 text-xs">
                {history.map((h) => <HistoryItem key={h.id} entry={h} />)}
              </ol>
            </section>
          </aside>
        </div>
      </div>

      <ConfirmModal open={archiving} title={`Archive ${asset.assetId ?? asset.assetName}?`} confirmLabel="Archive" onClose={() => setArchiving(false)} onConfirm={doArchive}>
        <p>It disappears from the rider app, zeno.earth and Google, and from this list unless you show archived assets. Its record and history are kept, and a Super Admin can restore it.</p>
        <label className="mt-3 block text-[11px] font-medium text-slate-500" htmlFor="archive-reason">Reason (optional)</label>
        <input id="archive-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Site closed, entered twice…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </ConfirmModal>
    </main>
  );
}

const ACTION_LABEL: Record<string, string> = { import: "Imported from the sheet", create: "Added", update: "Edited", archive: "Archived", restore: "Restored" };

function HistoryItem({ entry }: { entry: AuditEntry }) {
  const changes = entry.changes && typeof entry.changes === "object" ? (entry.changes as Record<string, unknown>) : null;
  const fieldChanges = changes ? Object.entries(changes).filter(([k]) => k in FIELD_BY_KEY) as [FieldKey, [unknown, unknown]][] : [];
  const fmt = (v: unknown) => (v == null || v === "" ? "empty" : String(v));
  return (
    <li>
      <p className="text-slate-700"><span className="font-semibold">{ACTION_LABEL[entry.action] ?? entry.action}</span>{entry.action !== "import" && <> by {entry.actor}</>}</p>
      <p className="text-slate-400">{entry.at.slice(0, 16).replace("T", " ")} UTC</p>
      {fieldChanges.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-slate-500">
          {fieldChanges.map(([k, [a, b]]) => <li key={k}>{FIELD_BY_KEY[k].label}: <span className="line-through">{fmt(a)}</span> → {fmt(b)}</li>)}
        </ul>
      )}
      {typeof changes?.reason === "string" && <p className="mt-1 text-slate-500">Reason: {changes.reason}</p>}
      {typeof changes?.note === "string" && <p className="mt-1 flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />{changes.note}</p>}
    </li>
  );
}
