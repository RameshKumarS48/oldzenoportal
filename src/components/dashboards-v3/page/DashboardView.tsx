"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startOfDay } from "date-fns";
import { ArrowLeft, Copy, CopyPlus, Globe, Home, Info, Lock, Pencil, Plus, Share2, Star, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartType, Metric } from "@/lib/dashboards-v3/catalogue";
import { MAX_WIDGETS } from "@/lib/dashboards-v3/rules";
import type { Dashboard, DashboardFilters as Filters, Widget } from "@/lib/dashboards-v3/types";
import {
  addWidget, atLimit, duplicateWidget, makeWidget, moveBlocked, moveWidget, patchWidget, removeWidget, restoreWidget,
} from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { isOwn, useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";
import { DeleteDialog, NAME_MAX, RenameDialog, ShareDialog } from "../DashboardDialogs";
import { NewDashboardModal, type NewDashboardStart } from "../NewDashboardModal";
import { useHydrated, useNowMinute } from "../hooks";
import { CategoryChip } from "../ui/CategoryChip";
import { ConfirmDialog } from "../ui/Dialog";
import { RowMenu } from "../ui/RowMenu";
import { UndoToast, type UndoAction } from "../ui/UndoToast";
import { DashboardFilters, DEFAULT_FILTERS, sameFilters } from "./DashboardFilters";
import { SuggestedWidgets } from "./SuggestedWidgets";
import { WidgetCard } from "./WidgetCard";

interface Draft {
  name: string;
  filters: Filters;
  widgets: Widget[];
}

const draftOf = (d: Dashboard): Draft => ({ name: d.name, filters: d.filters, widgets: d.widgets });
const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One dashboard. View mode never changes what's saved: filters there are for
 * this visit, and on your own dashboards "Save as dashboard default" keeps
 * them. Edit mode works on a draft that only Save keeps. Templates and
 * dashboards shared with you have no edit mode.
 */
export function DashboardView({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const now = useNowMinute();

  const dashboard = useDashboardsV3((s) => s.dashboards.find((d) => d.id === id));
  const favorites = useDashboardsV3((s) => s.favorites);
  const defaultId = useDashboardsV3((s) => s.defaultId);
  const { markViewed, update, toggleFavorite, setDefault, duplicate } = useDashboardsV3.getState();

  const own = dashboard ? isOwn(dashboard) : false;
  const editing = own && params.get("edit") === "1";

  const [draft, setDraft] = useState<Draft | null>(null);
  // Entering edit mode starts a draft from the saved dashboard; leaving it drops the draft.
  if (editing && dashboard && draft === null) setDraft(draftOf(dashboard));
  if (!editing && draft !== null) setDraft(null);

  /** View mode's filter changes, for this visit only. */
  const [viewFilters, setViewFilters] = useState<Filters | null>(null);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newStart, setNewStart] = useState<NewDashboardStart | null>(null);
  const leaving = useRef(false);
  const undoSeq = useRef(0);

  useEffect(() => {
    if (hydrated && dashboard) markViewed(dashboard.id);
    // Once per visit, not on every change to the dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, id]);

  // Deleted, no longer shared, or reset: back to the list rather than a broken page.
  const missing = hydrated && !dashboard;
  useEffect(() => {
    if (!missing || leaving.current) return;
    toast.info("That dashboard is no longer available", "It may have been deleted or is no longer shared with you.");
    router.replace("/dashboards-v3?list=1");
  }, [missing, router]);

  const today = useMemo(() => startOfDay(now ? new Date(now) : new Date()), [now]);
  const dismissUndo = useCallback(() => setUndo(null), []);

  if (!hydrated || !dashboard) return null;

  const current: Draft = draft ?? { name: dashboard.name, filters: viewFilters ?? dashboard.filters, widgets: dashboard.widgets };
  const unsavedFilters = !draft && own && viewFilters !== null && !sameFilters(viewFilters, dashboard.filters);
  const dirty = draft !== null && !sameDraft(draft, draftOf(dashboard));
  const widgets = current.widgets;
  const full = atLimit(widgets);

  /** Widgets only change in edit mode, on the draft. */
  function changeWidgets(fn: (w: Widget[]) => Widget[]) {
    setDraft((d) => (d ? { ...d, widgets: fn(d.widgets) } : d));
  }

  function changeFilters(filters: Filters) {
    if (draft) setDraft({ ...draft, filters });
    else setViewFilters(filters);
  }

  function saveFiltersAsDefault() {
    if (!viewFilters) return;
    update(id, { filters: viewFilters });
    setViewFilters(null);
    toast.success("Saved as dashboard default", "These filters now apply whenever this dashboard opens.");
  }

  const editUrl = `/dashboards-v3/${id}?edit=1`;
  const viewUrl = `/dashboards-v3/${id}`;
  // Editing starts from the saved filters; this visit's view filters are dropped.
  const enterEdit = () => { setViewFilters(null); router.replace(editUrl); };

  function save() {
    if (!draft) return;
    const name = draft.name.trim() || dashboard!.name;
    update(id, { name, filters: draft.filters, widgets: draft.widgets });
    toast.success("Dashboard saved");
    router.replace(viewUrl);
  }

  /** Leaving edit mode with changes asks first. */
  function guard(then: () => void) {
    if (dirty) setConfirmLeave(() => then);
    else then();
  }

  function remove(w: Widget) {
    if (!draft) return;
    const { removed, index } = removeWidget(draft.widgets, w.id);
    if (!removed) return;
    changeWidgets((ws) => removeWidget(ws, w.id).widgets);
    setUndo({
      key: ++undoSeq.current,
      title: "Widget removed",
      undo: () => changeWidgets((ws) => restoreWidget(ws, removed, index)),
    });
  }

  function duplicateOne(w: Widget) {
    if (full) {
      toast.error("This dashboard is full", `It has ${MAX_WIDGETS} widgets, the most it can hold. Remove one to add another.`);
      return;
    }
    changeWidgets((ws) => duplicateWidget(ws, w.id));
  }

  function addWidgetFlow() {
    if (full) return;
    if (!editing) enterEdit();
    toast.info("Coming in checkpoint 4", "The add widget flow isn't built yet. Try a suggested widget.");
  }

  function addSuggestion(metric: Metric, type: ChartType) {
    changeWidgets((ws) => addWidget(ws, makeWidget(metric, type)));
  }

  const fav = favorites.includes(id);
  const isDefault = defaultId === id;

  const headerMenu = own
    ? [
        { label: "Rename", icon: Pencil, onSelect: () => setRenaming(true) },
        { label: "Duplicate", icon: Copy, onSelect: () => setNewStart({ step: 2, kind: "duplicate", sourceId: id }) },
        { label: isDefault ? "Remove as default" : "Set as default", icon: Home, onSelect: () => setDefault(isDefault ? null : id) },
        { label: "Delete", icon: Trash2, onSelect: () => setDeleting(true), danger: true },
      ]
    : [
        ...(!dashboard.isTemplate
          ? [{
              label: "Duplicate", icon: Copy, onSelect: () => {
                const copy = duplicate(id);
                if (copy) { toast.success("Duplicated", `“${dashboard.name} (copy)” is in Your dashboards.`); router.push(`/dashboards-v3/${copy}`); }
              },
            }]
          : []),
        { label: isDefault ? "Remove as default" : "Set as default", icon: Home, onSelect: () => setDefault(isDefault ? null : id) },
      ];

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-6 py-3">
        <Link
          href="/dashboards-v3?list=1"
          onClick={(e) => { if (dirty) { e.preventDefault(); guard(() => router.push("/dashboards-v3?list=1")); } }}
          className="flex items-center gap-2 rounded text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboards
        </Link>
        <span aria-hidden className="h-5 w-px bg-slate-200" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
          {draft ? (
            <input
              aria-label="Dashboard name"
              value={draft.name}
              maxLength={NAME_MAX}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={cn(
                "min-w-[240px] rounded-lg border px-2.5 py-1 text-base font-semibold text-slate-800 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20",
                draft.name.trim() ? "border-slate-300" : "border-red-400"
              )}
            />
          ) : (
            <h2 className="truncate text-base font-semibold text-slate-800">{dashboard.name}</h2>
          )}
          <CategoryChip category={dashboard.category} />
          {dashboard.isTemplate && <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-white">Template</span>}
          {editing && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">Editing</span>}
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            {dashboard.isTemplate ? <Globe className="h-3.5 w-3.5 text-slate-400" /> : dashboard.visibility === "team" ? <Users className="h-3.5 w-3.5 text-slate-400" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
            {dashboard.isTemplate ? "Everyone" : dashboard.visibility === "team" ? (dashboard.owner ? `Shared by ${dashboard.owner}` : "Team") : "Only you"}
          </span>
          {!editing && (
            <button
              type="button"
              aria-pressed={fav}
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              title={fav ? "Remove from favorites" : "Add to favorites"}
              onClick={() => toggleFavorite(id)}
              className="rounded p-1 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
            >
              <Star className={cn("h-4 w-4", fav ? "fill-amber-600 text-amber-600" : "text-slate-400")} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={addWidgetFlow} disabled={full} title={full ? `This dashboard has ${MAX_WIDGETS} widgets, the most it can hold` : undefined}>
                <Plus className="h-4 w-4" /> Add widget
              </Button>
              <Button variant="ghost" size="sm" onClick={() => guard(() => router.replace(viewUrl))}>Cancel</Button>
              <Button variant="teal" size="sm" onClick={save} disabled={!draft?.name.trim()}>Save</Button>
            </>
          ) : own ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}><Share2 className="h-4 w-4" /> Share</Button>
              <Button variant="teal" size="sm" onClick={enterEdit}><Pencil className="h-4 w-4" /> Edit</Button>
              <RowMenu label="More dashboard actions" items={headerMenu} />
            </>
          ) : dashboard.isTemplate ? (
            <>
              <Button variant="teal" size="sm" onClick={() => setNewStart({ step: 2, kind: "template", sourceId: id })}><CopyPlus className="h-4 w-4" /> Duplicate to customise</Button>
              <RowMenu label="More dashboard actions" items={headerMenu} />
            </>
          ) : (
            <RowMenu label="More dashboard actions" items={headerMenu} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zeno-bg p-5">
        <div className="mb-4">
          <DashboardFilters
            value={current.filters}
            onChange={changeFilters}
            note={!own ? "Filter changes here aren’t saved, because this dashboard isn’t yours." : undefined}
            extra={
              unsavedFilters ? (
                <button
                  type="button"
                  onClick={saveFiltersAsDefault}
                  className="rounded px-1 text-xs font-medium text-zeno-teal underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                >
                  Save as dashboard default
                </button>
              ) : undefined
            }
          />
        </div>

        {editing && full && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <Info className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            This dashboard has {MAX_WIDGETS} widgets, the most it can hold. Remove one to add another.
          </p>
        )}

        {widgets.length === 0 ? (
          <SuggestedWidgets category={dashboard.category} mode={editing ? "add" : own ? "edit" : "none"} onEdit={enterEdit} onAddWidget={addWidgetFlow} onAddSuggestion={addSuggestion} />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {widgets.map((w) => (
              <WidgetCard
                key={w.id}
                widget={w}
                filters={current.filters}
                today={today}
                editing={editing}
                canChange={own}
                failed={!!w.mockError && !retried.has(w.id)}
                moveUpBlocked={moveBlocked(widgets, w.id, -1)}
                moveDownBlocked={moveBlocked(widgets, w.id, 1)}
                onRetry={() => setRetried((r) => new Set(r).add(w.id))}
                onResetFilters={() => changeFilters(DEFAULT_FILTERS)}
                onRename={(title) => changeWidgets((ws) => patchWidget(ws, w.id, { title }))}
                onMove={(dir) => changeWidgets((ws) => moveWidget(ws, w.id, dir))}
                onResize={(size) => changeWidgets((ws) => patchWidget(ws, w.id, { size }))}
                onEdit={() => { if (!editing) enterEdit(); toast.info("Coming in checkpoint 4", "The widget editor isn't built yet."); }}
                onDuplicate={() => duplicateOne(w)}
                onRemove={() => remove(w)}
              />
            ))}
          </div>
        )}
      </div>

      <UndoToast action={undo} onDismiss={dismissUndo} />
      <ConfirmDialog
        open={confirmLeave !== null}
        title="Discard changes?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onClose={() => setConfirmLeave(null)}
        onConfirm={() => { const then = confirmLeave; setConfirmLeave(null); then?.(); }}
      >
        Your changes to this dashboard since you started editing won’t be saved.
      </ConfirmDialog>
      <RenameDialog key={`rename-${renaming}`} dashboard={renaming ? dashboard : null} onClose={() => setRenaming(false)} />
      <ShareDialog key={`share-${sharing}`} dashboard={sharing ? dashboard : null} onClose={() => setSharing(false)} />
      <DeleteDialog
        dashboard={deleting ? dashboard : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => { leaving.current = true; router.replace("/dashboards-v3?list=1"); }}
      />
      <NewDashboardModal key={JSON.stringify(newStart)} start={newStart} onClose={() => setNewStart(null)} />
    </>
  );
}
