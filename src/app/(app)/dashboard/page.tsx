"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus, LayoutDashboard, Lock, Share2, Users, ShieldCheck, User,
  ChevronRight, X, Trash2, AlertTriangle, Bike, Banknote, Zap, BarChart3, ArrowRight, Gift, TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useDashboardsStore } from "@/store/dashboards";
import { useAuthStore } from "@/store/auth";
import { useUsersStore } from "@/store/users";
import { format } from "date-fns";
import type { Dashboard, ShareTarget } from "@/lib/mock/dashboards";
import { cn } from "@/lib/utils";

type CreateStep = "info" | "publish";
type PublishMode = "private" | "shared";
type ShareTargetType = "all-users" | "all-admins" | "specific";
interface DeleteTarget { id: string; title: string; }

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "all-metrics": { label: "All Metrics",    color: "#6366f1", icon: BarChart3 },
  "asset":       { label: "Asset",          color: "#FF3B06", icon: Bike },
  "finance":     { label: "Finance",        color: "#003B49", icon: Banknote },
  "infra":       { label: "Infrastructure", color: "#10b981", icon: Zap },
  "referral":    { label: "Referral",       color: "#ec4899", icon: Gift },
  "growth":      { label: "Growth",         color: "#8b5cf6", icon: TrendingUp },
};

const CATEGORY_ORDER = ["all-metrics", "referral", "growth", "asset", "finance", "infra"];

function PresetCard({ d }: { d: Dashboard }) {
  const meta = CATEGORY_META[d.category ?? "all-metrics"] ?? CATEGORY_META["all-metrics"];
  return (
    <Link href={`/dashboard/${d.id}`}>
      <div
        className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
        style={{ borderLeft: `3px solid ${meta.color}` }}
      >
        <div className="p-4 flex-1">
          <div className="flex items-start justify-between mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${meta.color}18` }}
            >
              <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
            </div>
            <ArrowRight
              className="w-4 h-4 text-slate-300 group-hover:text-[#FF3B06] group-hover:translate-x-0.5 transition-all mt-1"
            />
          </div>
          <h3
            className="font-semibold text-slate-800 mb-1 text-sm leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {d.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{d.description}</p>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2">
          {d.widgets.length > 0 ? (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {d.widgets.length} widgets
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Metrics grid
            </span>
          )}
          <Lock className="w-3 h-3 text-slate-300 ml-auto" />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardListPage() {
  const { presets, custom, received, createDashboard, deleteDashboard } = useDashboardsStore();
  const user = useAuthStore((s) => s.user);
  const users = useUsersStore((s) => s.users);

  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<CreateStep>("info");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("private");
  const [shareTargetType, setShareTargetType] = useState<ShareTargetType>("all-users");
  const [specificUserIds, setSpecificUserIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const otherUsers = users.filter((u) => u.id !== user?.id && u.status === "active");
  const sharedByOthers = received.filter((d) => d.ownerId !== user?.id);

  const handleDeleteConfirm = () => {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;
    deleteDashboard(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const resetCreate = () => {
    setShowCreate(false);
    setStep("info");
    setNewTitle("");
    setNewDesc("");
    setPublishMode("private");
    setShareTargetType("all-users");
    setSpecificUserIds([]);
  };

  const handleCreate = () => {
    if (!newTitle.trim() || !user) return;
    let sharedWith: ShareTarget | undefined;
    if (publishMode === "shared") {
      if (shareTargetType === "all-users") sharedWith = "all-users";
      else if (shareTargetType === "all-admins") sharedWith = "all-admins";
      else sharedWith = specificUserIds;
    }
    const dash = createDashboard(
      newTitle.trim(), newDesc.trim(), user.id, user.name,
      publishMode === "shared" ? { visibility: "shared", sharedWith } : { visibility: "private" }
    );
    resetCreate();
    window.location.href = `/dashboard/${dash.id}/edit`;
  };

  const toggleUser = (uid: string) => {
    setSpecificUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Group presets by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    items: presets.filter((d) => (d.category ?? "all-metrics") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Topbar
        title="Dashboards"
        actions={
          <Button size="sm" onClick={() => { setShowCreate(true); setStep("info"); }} className="ml-4">
            <Plus className="w-4 h-4" /> New Dashboard
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 bg-zeno-bg space-y-8">

        {/* Preset groups */}
        {grouped.map(({ cat, meta, items }) => (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: meta.color }}
              />
              <h2
                className="text-xs font-bold text-slate-500 uppercase tracking-widest"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {meta.label}
              </h2>
              <span className="text-xs text-slate-400">({items.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((d) => <PresetCard key={d.id} d={d} />)}
            </div>
          </section>
        ))}

        {/* Custom Dashboards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-xs font-bold text-slate-500 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Dashboards
            </h2>
          </div>
          {custom.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <LayoutDashboard className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">No custom dashboards yet.</p>
              <Button size="sm" onClick={() => { setShowCreate(true); setStep("info"); }}>
                <Plus className="w-4 h-4" /> Create Dashboard
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {custom.map((d) => (
                <div key={d.id} className="relative group/card">
                  <Link href={`/dashboard/${d.id}`}>
                    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer" style={{ borderLeft: "3px solid #6366f1" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                        </div>
                        {d.visibility === "shared" && <Share2 className="w-3.5 h-3.5 text-blue-400 mt-0.5" />}
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1 text-sm" style={{ fontFamily: "var(--font-display)" }}>{d.title}</h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{d.description || "No description"}</p>
                      <p className="text-[10px] text-slate-400">{d.widgets.length} widgets · {format(new Date(d.updatedAt), "d MMM")}</p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteTarget({ id: d.id, title: d.title }); setDeleteConfirm(""); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover/card:opacity-100 transition-all shadow-sm z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared with Me */}
        {sharedByOthers.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Shared with Me
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sharedByOthers.map((d) => (
                <Link key={d.id} href={`/dashboard/${d.id}`}>
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" style={{ borderLeft: "3px solid #3b82f6" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Share2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <Badge variant="default">Shared</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1 text-sm" style={{ fontFamily: "var(--font-display)" }}>{d.title}</h3>
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">{d.description || "No description"}</p>
                    {d.ownerName && <p className="text-[10px] text-slate-400">by {d.ownerName}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirm(""); }} title="Delete Dashboard">
        {deleteTarget && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">This action cannot be undone</p>
                <p className="text-sm text-red-600">Dashboard <strong>"{deleteTarget.title}"</strong> and all its widgets will be permanently deleted.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Type <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono font-bold">DELETE</kbd> to confirm
              </label>
              <input
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleDeleteConfirm(); }}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}>Cancel</Button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirm !== "DELETE"}
                className="flex-1 py-2 px-4 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Delete Dashboard
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={resetCreate} title={step === "info" ? "Create Dashboard" : "Publish Options"}>
        {step === "info" ? (
          <div className="space-y-4">
            <Input label="Dashboard name" placeholder="e.g. Fleet Operations" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30"
                rows={3} placeholder="What does this dashboard track?"
                value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetCreate}>Cancel</Button>
              <Button className="flex-1 flex items-center justify-center gap-1" onClick={() => setStep("publish")} disabled={!newTitle.trim()}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">Who can see <strong className="text-slate-700">{newTitle}</strong>?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { mode: "private" as PublishMode, icon: Lock, label: "Just for me", desc: "Private dashboard", activeColor: "border-[#FF3B06] bg-[#FF3B06]/5" },
                { mode: "shared" as PublishMode, icon: Share2, label: "Share with others", desc: "Notify recipients", activeColor: "border-blue-500 bg-blue-50" },
              ].map(({ mode, icon: Icon, label, desc, activeColor }) => (
                <button key={mode} type="button" onClick={() => setPublishMode(mode)}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                    publishMode === mode ? activeColor : "border-slate-200 hover:border-slate-300"
                  )}>
                  <Icon className={cn("w-5 h-5", publishMode === mode ? (mode === "private" ? "text-[#FF3B06]" : "text-blue-600") : "text-slate-400")} />
                  <div>
                    <p className={cn("text-sm font-semibold", publishMode === mode ? (mode === "private" ? "text-[#FF3B06]" : "text-blue-700") : "text-slate-600")}>{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {publishMode === "shared" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Share with</p>
                {[
                  { value: "all-users" as ShareTargetType, icon: Users, label: "All users", desc: "Every active team member" },
                  { value: "all-admins" as ShareTargetType, icon: ShieldCheck, label: "All admins", desc: "Admin role only" },
                  { value: "specific" as ShareTargetType, icon: User, label: "Specific people", desc: "Choose recipients" },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button key={value} type="button" onClick={() => setShareTargetType(value)}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left",
                      shareTargetType === value ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}>
                    <Icon className={cn("w-4 h-4 shrink-0", shareTargetType === value ? "text-blue-600" : "text-slate-400")} />
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", shareTargetType === value ? "text-blue-700" : "text-slate-700")}>{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    {shareTargetType === value && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                  </button>
                ))}
                {shareTargetType === "specific" && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                    {otherUsers.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">No other active users.</p>
                    ) : otherUsers.map((u) => (
                      <label key={u.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors", specificUserIds.includes(u.id) ? "bg-blue-50" : "hover:bg-slate-50")}>
                        <input type="checkbox" checked={specificUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="w-4 h-4 rounded accent-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                        <span className={cn("ml-auto text-xs px-1.5 py-0.5 rounded", u.role.includes("admin") ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500")}>{u.role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("info")}>Back</Button>
              <Button className="flex-1" onClick={handleCreate}
                disabled={publishMode === "shared" && shareTargetType === "specific" && specificUserIds.length === 0}>
                {publishMode === "private" ? "Create" : "Publish & Share"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
