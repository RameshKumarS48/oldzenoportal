"use client";

import { useState } from "react";
import { Check, Link2, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Dashboard, Visibility } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";

export const NAME_MAX = 60;

/** Rename a dashboard. Mount with a `key` per dashboard so the field starts from its name. */
export function RenameDialog({ dashboard, onClose }: { dashboard: Dashboard | null; onClose: () => void }) {
  const rename = useDashboardsV3((s) => s.rename);
  const [name, setName] = useState(dashboard?.name ?? "");
  const error = name.trim() ? null : "Give the dashboard a name";

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dashboard || error) return;
    rename(dashboard.id, name);
    toast.success("Renamed", `Now called “${name.trim()}”.`);
    onClose();
  }

  return (
    <Modal open={dashboard !== null} onClose={onClose} title="Rename dashboard">
      <form onSubmit={save} className="space-y-5">
        <Input label="Name" value={name} maxLength={NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} error={error ?? undefined} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="teal" disabled={!!error}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

const VISIBILITY: { id: Visibility; label: string; hint: string; icon: typeof Lock }[] = [
  { id: "private", label: "Only you", hint: "Nobody else can find or open it.", icon: Lock },
  { id: "team", label: "Team", hint: "Everyone in your team can open it. Only you can edit it.", icon: Users },
];

/** Who can see a dashboard, as two radio cards. Used by Share and the new dashboard form. */
export function VisibilityChoice({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-slate-700">Visibility</legend>
      <div className="grid grid-cols-2 gap-2">
        {VISIBILITY.map(({ id, label, hint, icon: Icon }) => {
          const on = value === id;
          return (
            <label
              key={id}
              className={cn(
                "flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40",
                on ? "border-zeno-teal bg-slate-50" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <input type="radio" name="visibility" value={id} checked={on} onChange={() => onChange(id)} className="sr-only" />
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-zeno-teal" : "text-slate-400")} />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  {label}
                  {on && <Check className="h-3.5 w-3.5 text-zeno-teal" aria-hidden />}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Share: who can see it, and a link to copy. Sandbox only, nothing is sent. */
export function ShareDialog({ dashboard, onClose }: { dashboard: Dashboard | null; onClose: () => void }) {
  const update = useDashboardsV3((s) => s.update);
  const [visibility, setVisibility] = useState<Visibility>(dashboard?.visibility ?? "private");
  const url = typeof window !== "undefined" && dashboard ? `${window.location.origin}/dashboards-v3/${dashboard.id}` : "";

  function save() {
    if (!dashboard) return;
    update(dashboard.id, { visibility });
    toast.success(visibility === "team" ? "Shared with your team" : "Only you can see it now");
    onClose();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link", "Select the link and copy it yourself.");
    }
  }

  return (
    <Modal open={dashboard !== null} onClose={onClose} title={`Share “${dashboard?.name ?? ""}”`} className="max-w-lg">
      <div className="space-y-5">
        <VisibilityChoice value={visibility} onChange={setVisibility} />
        <div>
          <label htmlFor="share-link" className="mb-1 block text-sm font-medium text-slate-700">Link</label>
          <div className="flex gap-2">
            <input id="share-link" readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
            <Button type="button" variant="outline" onClick={copy}><Link2 className="h-4 w-4" /> Copy link</Button>
          </div>
          {visibility === "private" && <p className="mt-1.5 text-xs text-slate-500">Only you can open this link until you share it with your team.</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="teal" onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Deleting a whole dashboard always asks first. */
export function DeleteDialog({ dashboard, onClose, onDeleted }: { dashboard: Dashboard | null; onClose: () => void; onDeleted?: () => void }) {
  const remove = useDashboardsV3((s) => s.remove);
  return (
    <ConfirmModal
      open={dashboard !== null}
      title="Delete dashboard"
      confirmLabel="Delete dashboard"
      onClose={onClose}
      onConfirm={() => {
        if (!dashboard) return;
        remove(dashboard.id);
        toast.success("Dashboard deleted", `“${dashboard.name}” and its ${dashboard.widgets.length} widget${dashboard.widgets.length === 1 ? "" : "s"} are gone.`);
        onClose();
        onDeleted?.();
      }}
    >
      “{dashboard?.name}” and its {dashboard?.widgets.length ?? 0} widget{dashboard?.widgets.length === 1 ? "" : "s"} will be deleted
      {dashboard?.visibility === "team" ? " for you and your team" : ""}. This can’t be undone.
    </ConfirmModal>
  );
}
