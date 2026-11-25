"use client";

/** Create, rename, share, duplicate and delete: the same dialogs from the list and from a dashboard's own page. */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { inputCls, labelCls } from "@/components/pricing-plans/shared";
import { nameError, canEdit } from "@/lib/dashboards/rules";
import { useDashboardsStore } from "@/store/dome-dashboards";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/lib/dashboards/types";
import { dashboards, type Me } from "./api";
import type { MenuItem } from "./Menu";

const VISIBILITY: { value: Dashboard["visibility"]; label: string; hint: string }[] = [
  { value: "private", label: "Only me", hint: "Nobody else can open it." },
  { value: "public", label: "Everyone", hint: "Anyone with Dashboards can open and duplicate it. Only you can change it." },
];

export function VisibilityChoice({ value, onChange }: { value: Dashboard["visibility"]; onChange: (v: Dashboard["visibility"]) => void }) {
  return (
    <div role="radiogroup" aria-label="Who can see it" className="grid grid-cols-2 gap-2">
      {VISIBILITY.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-lg border px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/30", value === o.value ? "border-zeno-teal bg-zeno-teal/5" : "border-slate-200 hover:bg-slate-50")}>
          <span className="block text-sm font-medium text-slate-800">{o.label}</span>
          <span className="block text-[11px] leading-snug text-slate-500">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function NewDashboardDialog({ open, me, onClose }: { open: boolean; me: Me; onClose: () => void }) {
  const router = useRouter();
  const all = useDashboardsStore((s) => s.dashboards);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<Dashboard["visibility"]>("private");
  const [tried, setTried] = useState(false);
  // A ref, not state: two clicks in the same instant must not both get through.
  const busy = useRef(false);
  const error = nameError(name, me.id, all);

  const close = () => { setName(""); setVisibility("private"); setTried(false); busy.current = false; onClose(); };
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (error || busy.current) return;
    busy.current = true;
    const out = dashboards().create(name, visibility, me);
    if (!out.ok) { busy.current = false; toast.error("Couldn’t create the dashboard", out.error); return; }
    toast.success("Dashboard created", out.value.name);
    close();
    router.push(`/dashboards/${out.value.id}`);
  }

  return (
    <Modal open={open} onClose={close} title="New dashboard">
      <form noValidate onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="dash-name" className={labelCls}>Name</label>
          <input id="dash-name" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !!error} className={cn(inputCls, tried && error && "border-red-300")} />
          {tried && error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
        </div>
        <div>
          <p className={labelCls}>Who can see it</p>
          <VisibilityChoice value={visibility} onChange={setVisibility} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary">Create</Button>
        </div>
      </form>
    </Modal>
  );
}

type Pending = { kind: "rename" | "delete" | "share"; dashboard: Dashboard } | null;

/** The ⋯ actions for a dashboard, and the dialogs they open. `onDeleted` runs after a delete (the dashboard's own page leaves). */
export function useDashboardActions(me: Me, onDeleted?: () => void): { items: (d: Dashboard) => MenuItem[]; dialogs: React.ReactNode } {
  const router = useRouter();
  const all = useDashboardsStore((s) => s.dashboards);
  const [pending, setPending] = useState<Pending>(null);
  const [name, setName] = useState("");
  const d = pending?.dashboard;
  const renameError = d ? nameError(name, d.ownerId, all, d.id) : null;
  const close = () => setPending(null);

  const items = (dash: Dashboard): MenuItem[] => {
    const mine = canEdit(dash, me);
    return [
      ...(mine ? [{ label: "Rename", onSelect: () => { setName(dash.name); setPending({ kind: "rename", dashboard: dash }); } }] : []),
      ...(mine ? [{ label: dash.visibility === "public" ? "Make private" : "Share with everyone", onSelect: () => setPending({ kind: "share", dashboard: dash }) }] : []),
      ...(me.canCreate ? [{ label: "Duplicate", onSelect: () => {
        const out = dashboards().duplicate(dash.id, me);
        if (!out.ok) { toast.error("Couldn’t duplicate", out.error); return; }
        toast.success("Dashboard duplicated", `${out.value.name} is yours, and only you can see it.`);
        router.push(`/dashboards/${out.value.id}`);
      } }] : []),
      ...(mine ? [{ label: "Delete", danger: true, onSelect: () => setPending({ kind: "delete", dashboard: dash }) }] : []),
    ];
  };

  function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!d || renameError) return;
    const out = dashboards().rename(d.id, name, me);
    if (out.ok) toast.success("Dashboard renamed", out.value.name); else toast.error("Couldn’t rename", out.error);
    close();
  }
  function share() {
    if (!d) return;
    const next = d.visibility === "public" ? "private" : "public";
    const out = dashboards().setVisibility(d.id, next, me);
    if (out.ok) toast.success(next === "public" ? "Shared with everyone" : "Made private", d.name); else toast.error("Couldn’t change sharing", out.error);
    close();
  }
  function remove() {
    if (!d) return;
    const out = dashboards().remove(d.id, me);
    close();
    if (!out.ok) { toast.error("Couldn’t delete", out.error); return; }
    toast.success("Dashboard deleted", d.name);
    onDeleted?.();
  }

  const dialogs = (
    <>
      <Modal open={pending?.kind === "rename"} onClose={close} title="Rename dashboard">
        <form noValidate onSubmit={rename} className="space-y-4">
          <div>
            <label htmlFor="dash-rename" className={labelCls}>Name</label>
            <input id="dash-rename" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={cn(inputCls, renameError && "border-red-300")} />
            {renameError && <p className="mt-1 text-[11px] text-red-600">{renameError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!!renameError}>Rename</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={pending?.kind === "share"} tone="neutral" onClose={close} onConfirm={share}
        title={d?.visibility === "public" ? "Make this dashboard private?" : "Share this dashboard with everyone?"}
        confirmLabel={d?.visibility === "public" ? "Make private" : "Share with everyone"}>
        {d?.visibility === "public"
          ? <>Only {d.ownerId === me.id ? "you" : d.ownerName} will be able to open <strong>{d.name}</strong>. Anyone looking at it now loses it. Copies people made stay theirs.</>
          : <>Everyone with Dashboards will be able to open and duplicate <strong>{d?.name}</strong>. They can’t change it. Cards over data a person can’t access stay hidden from them.</>}
      </ConfirmModal>
      <ConfirmModal open={pending?.kind === "delete"} onClose={close} onConfirm={remove} title="Delete this dashboard?" confirmLabel="Delete">
        <strong>{d?.name}</strong> and its {d?.cards.length ?? 0} card{d?.cards.length === 1 ? "" : "s"} will be deleted{d?.visibility === "public" ? " for everyone" : ""}. This can’t be undone.
      </ConfirmModal>
    </>
  );
  return { items, dialogs };
}
