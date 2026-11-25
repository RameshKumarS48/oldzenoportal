"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/lib/dashboards/types";
import { useDashboards, type Me } from "./api";
import { NewDashboardDialog, useDashboardActions } from "./DashboardDialogs";
import { Menu } from "./Menu";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

/** Dashboards home: what's been shared, and your own. */
export function DashboardList({ me }: { me: Me }) {
  const all = useDashboards(me);
  const mine = useMemo(() => all.filter((d) => d.ownerId === me.id), [all, me.id]);
  // Shared with everyone; a Super Admin also sees other people's private dashboards here.
  const shared = useMemo(() => all.filter((d) => d.visibility === "public" || d.ownerId !== me.id), [all, me.id]);
  const [tab, setTab] = useState<"shared" | "mine">(() => (mine.length ? "mine" : "shared"));
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const { items, dialogs } = useDashboardActions(me);

  const q = query.trim().toLowerCase();
  const rows = (tab === "mine" ? mine : shared)
    .filter((d) => !q || d.name.toLowerCase().includes(q) || d.ownerName.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-zeno-bg">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div role="tablist" aria-label="Dashboards" className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
          {([["shared", "Shared", shared.length], ["mine", "Mine", mine.length]] as const).map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn("rounded-md px-3 py-1.5 font-medium", tab === id ? "bg-[#003B49] text-white" : "text-slate-600 hover:bg-slate-50")}>
              {label} <span className={cn("tabular-nums", tab === id ? "text-white/70" : "text-slate-400")}>{n}</span>
            </button>
          ))}
        </div>
        <div className="relative w-64 max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dashboards" aria-label="Search dashboards"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20" />
        </div>
        {me.canCreate && <Button variant="primary" size="sm" className="ml-auto" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New dashboard</Button>}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {rows.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Owner</th><th className="px-4 py-2.5 font-medium">Last updated</th><th className="w-10" />
                </tr>
              </thead>
              <tbody>{rows.map((d) => <Row key={d.id} d={d} me={me} showSharing={tab === "mine" || d.visibility === "private"} menu={items(d)} />)}</tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">
                {q ? "No dashboard matches your search." : tab === "mine" ? "You haven’t made a dashboard yet." : "Nobody has shared a dashboard yet."}
              </p>
              {!q && tab === "mine" && me.canCreate && <Button variant="primary" size="sm" className="mt-3" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New dashboard</Button>}
            </div>
          </div>
        )}
      </div>

      <NewDashboardDialog open={creating} me={me} onClose={() => setCreating(false)} />
      {dialogs}
    </main>
  );
}

function Row({ d, me, showSharing, menu }: { d: Dashboard; me: Me; showSharing: boolean; menu: ReturnType<ReturnType<typeof useDashboardActions>["items"]> }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <Link href={`/dashboards/${d.id}`} className="text-sm font-medium text-slate-800 hover:text-zeno-teal hover:underline">{d.name}</Link>
        {showSharing && <span className="ml-2 rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{d.visibility === "public" ? "Shared" : "Private"}</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{d.ownerId === me.id ? "You" : d.ownerName}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-500">{day(d.updatedAt)}</td>
      <td className="px-2 py-3 text-right"><Menu label={`Actions for ${d.name}`} items={menu} /></td>
    </tr>
  );
}
