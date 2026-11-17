"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Info, SquareDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type CategoryId } from "@/lib/dashboards-v3/catalogue";
import type { Dashboard, Visibility } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { isOwn, useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";
import { NAME_MAX, VisibilityChoice } from "./DashboardDialogs";
import { Dialog } from "./ui/Dialog";
import { InlineConfirm } from "./ui/InlineConfirm";

export type StartKind = "template" | "blank" | "duplicate";

/** Where the modal opens: step 1 to choose, or straight to the details with a starting point already picked. */
export type NewDashboardStart =
  | { step: 1 }
  | { step: 2; kind: "blank" }
  | { step: 2; kind: "template" | "duplicate"; sourceId: string };

const DESCRIPTION_MAX = 160;

/** Template cards per row; ↑ and ↓ move by a row. */
const COLUMNS = 3;
/** Widget titles named under the grid before "+N more". */
const INCLUDES_SHOWN = 3;

const widgetCount = (n: number) => `${n} widget${n === 1 ? "" : "s"}`;

/**
 * New dashboard, in two steps: a starting point, then the details. Nothing
 * is saved until Create, which opens the new dashboard in edit mode.
 * Mount it with a `key` per opening so each one starts fresh.
 */
export function NewDashboardModal({ start, onClose }: { start: NewDashboardStart | null; onClose: () => void }) {
  const router = useRouter();
  const dashboards = useDashboardsV3((s) => s.dashboards);
  const create = useDashboardsV3((s) => s.create);

  const byName = (a: Dashboard, b: Dashboard) => a.name.localeCompare(b.name);
  const templates = dashboards.filter((d) => d.isTemplate).sort(byName);
  const own = dashboards.filter(isOwn).sort(byName);

  const [step, setStep] = useState<1 | 2>(start?.step ?? 1);
  const [kind, setKind] = useState<StartKind | null>(start?.step === 2 ? start.kind : null);
  /** Next was pressed with nothing chosen: the footer says so, rather than Next being disabled. */
  const [needChoice, setNeedChoice] = useState(false);
  const choose = (k: StartKind) => { setKind(k); setNeedChoice(false); };
  const [templateId, setTemplateId] = useState<string | null>(start?.step === 2 && start.kind === "template" ? start.sourceId : null);
  const [duplicateId, setDuplicateId] = useState<string | null>(start?.step === 2 && start.kind === "duplicate" ? start.sourceId : null);

  const source = kind === "template" ? templates.find((t) => t.id === templateId) : kind === "duplicate" ? own.find((d) => d.id === duplicateId) : undefined;
  const sourceReady = kind === "blank" || source !== undefined;

  const [name, setName] = useState(() => (source ? suggestedName(source) : ""));
  const [category, setCategory] = useState<CategoryId | "">(source?.category ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [tried, setTried] = useState(false);
  /** Fields typed in on step 2: kept when the starting point changes, and the reason to confirm before discarding. */
  const [edited, setEdited] = useState({ name: false, category: false, description: false, visibility: false });
  const touch = (field: keyof typeof edited) => setEdited((e) => (e[field] ? e : { ...e, [field]: true }));
  const typedAnything = Object.values(edited).some(Boolean);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  /** Closing after typing asks in the footer; asked again (Escape, the backdrop, ✕), it means keep editing. */
  const requestClose = () => (confirmDiscard ? keepEditing() : typedAnything ? setConfirmDiscard(true) : onClose());
  function keepEditing() {
    setConfirmDiscard(false);
    requestAnimationFrame(() => cancelButton.current?.focus());
  }

  // Each step starts with focus on its first field, so the keyboard never lands on the old step's buttons.
  const body = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) { opened.current = true; return; }
    const target =
      step === 1
        ? body.current?.querySelector<HTMLElement>("input[type=radio]:checked") ?? body.current?.querySelector<HTMLElement>("input, select")
        : body.current?.querySelector<HTMLElement>("[data-autofocus]");
    target?.focus();
  }, [step]);

  const nameError = !name.trim() ? "Enter a name" : null;
  const categoryError = !category ? "Choose a category" : null;
  const sameName = name.trim() && own.some((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  /** Moving on from step 1 fills the details from the chosen starting point, keeping anything typed. */
  function next() {
    if (!sourceReady) { setNeedChoice(true); return; }
    if (!edited.name) setName(source ? suggestedName(source) : "");
    if (!edited.category) setCategory(source?.category ?? "");
    if (!edited.description) setDescription(source?.description ?? "");
    setStep(2);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || categoryError || !category) {
      document.getElementById(nameError ? "new-dashboard-name" : "new-dashboard-category")?.focus();
      return;
    }
    const id = create({ name, category, description, visibility, fromId: source?.id });
    toast.success("Dashboard created", source ? `Started from “${source.name}”.` : "Add your first widget to get going.");
    onClose();
    // A blank dashboard opens ready to add widgets; a copy opens as it is, with Edit to change it.
    router.push(source ? `/dashboards-v3/${id}` : `/dashboards-v3/${id}?edit=1`);
  }

  return (
    <Dialog
      open={start !== null}
      onClose={step === 2 ? requestClose : onClose}
      title="New dashboard"
      badge={`Step ${step} of 2`}
      subtitle={step === 1 ? "Choose a starting point" : "Name it and choose who can see it"}
      className="max-w-3xl"
      footer={
        confirmDiscard ? (
          <InlineConfirm
            question="Discard this dashboard?"
            detail="What you’ve entered won’t be saved, and no dashboard will be created."
            onDiscard={() => { setConfirmDiscard(false); onClose(); }}
            onKeep={keepEditing}
          />
        ) : step === 1 ? (
          <>
            {needChoice && <p role="alert" className="mr-auto text-sm font-medium text-red-600">Choose a starting point</p>}
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="teal" onClick={next}>Next</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button ref={cancelButton} variant="ghost" onClick={requestClose}>Cancel</Button>
            <Button variant="teal" type="submit" form="new-dashboard-form">Create dashboard</Button>
          </>
        )
      }
    >
      <div ref={body}>
      {step === 1 ? (
        <StartingPoint
          own={own}
          templates={templates}
          kind={kind}
          templateId={templateId}
          duplicateId={duplicateId}
          onBlank={() => choose("blank")}
          onTemplate={(id) => { setTemplateId(id); choose("template"); }}
          onDuplicate={(id) => { setDuplicateId(id); choose("duplicate"); }}
        />
      ) : (
        <form id="new-dashboard-form" onSubmit={submit} noValidate className="space-y-5">
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
            Starting from
            <span className="font-medium text-slate-800">{source ? `“${source.name}”, ${widgetCount(source.widgets.length)}` : "a blank dashboard"}</span>
            <button type="button" onClick={() => setStep(1)} className="rounded font-medium text-zeno-teal underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
              Change
            </button>
          </p>

          <div>
            <Input
              id="new-dashboard-name"
              label="Name"
              value={name}
              maxLength={NAME_MAX}
              required
              aria-invalid={tried && !!nameError}
              aria-describedby={tried && nameError ? "new-dashboard-name-error" : sameName ? "new-dashboard-name-note" : undefined}
              data-autofocus
              onChange={(e) => { setName(e.target.value); touch("name"); }}
              className={tried && nameError ? "border-red-400" : undefined}
            />
            {tried && nameError && <p id="new-dashboard-name-error" className="mt-1 text-xs text-red-600">{nameError}</p>}
            {sameName && !nameError && (
              <p id="new-dashboard-name-note" className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                You already have a dashboard with this name. You can still use it.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-dashboard-category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              id="new-dashboard-category"
              value={category}
              required
              aria-invalid={tried && !!categoryError}
              aria-describedby={tried && categoryError ? "new-dashboard-category-error" : undefined}
              onChange={(e) => { setCategory(e.target.value as CategoryId); touch("category"); }}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20",
                tried && categoryError ? "border-red-400" : "border-slate-300"
              )}
            >
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {tried && categoryError && <p id="new-dashboard-category-error" className="mt-1 text-xs text-red-600">{categoryError}</p>}
          </div>

          <div>
            <label htmlFor="new-dashboard-description" className="mb-1 flex items-baseline justify-between text-sm font-medium text-slate-700">
              <span>Description <span className="font-normal text-slate-500">(optional)</span></span>
              <span className="text-xs font-normal tabular-nums text-slate-500">{description.length}/{DESCRIPTION_MAX}</span>
            </label>
            <textarea
              id="new-dashboard-description"
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={2}
              onChange={(e) => { setDescription(e.target.value); touch("description"); }}
              placeholder="What it's for, in a sentence"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
            />
          </div>

          <VisibilityChoice value={visibility} onChange={(v) => { setVisibility(v); touch("visibility"); }} />
        </form>
      )}
      </div>
    </Dialog>
  );
}

function suggestedName(source: Dashboard): string {
  return `${source.name} (copy)`;
}

const SELECT =
  "w-full appearance-none rounded-lg border bg-white py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

/**
 * Step 1, sized to fit 1366×768 without scrolling: blank or duplicate in one
 * row, then the templates in a grid sorted by name. No category headings
 * yet; a row of category filter chips will go above the grid once the
 * categories are final.
 */
function StartingPoint({
  own, templates, kind, templateId, duplicateId, onBlank, onTemplate, onDuplicate,
}: {
  own: Dashboard[]; templates: Dashboard[]; kind: StartKind | null; templateId: string | null; duplicateId: string | null;
  onBlank: () => void; onTemplate: (id: string) => void; onDuplicate: (id: string) => void;
}) {
  const blank = kind === "blank";
  const duplicating = kind === "duplicate" && duplicateId !== null;
  const none = own.length === 0;
  const selected = kind === "template" ? templates.find((t) => t.id === templateId) : undefined;

  /** ← → move one card, ↑ ↓ a row; the card moved to is chosen, as radios do. */
  function onGridKey(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const to = Math.min(templates.length - 1, Math.max(0, index + step));
    onTemplate(templates[to].id);
    e.currentTarget.closest("[data-grid]")?.querySelectorAll<HTMLInputElement>("input[type=radio]")[to]?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40",
            blank ? "border-zeno-teal bg-slate-50" : "border-slate-300 hover:border-slate-400"
          )}
        >
          <input type="radio" name="start-blank" checked={blank} onChange={onBlank} className="sr-only" />
          <SquareDashed className={cn("h-4 w-4 shrink-0", blank ? "text-zeno-teal" : "text-slate-500")} aria-hidden />
          <span className="flex-1 text-sm font-medium text-slate-800">Blank dashboard</span>
          {blank && <Check className="h-4 w-4 text-zeno-teal" aria-hidden />}
        </label>

        <div>
          <div className="relative">
            <Copy className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", duplicating ? "text-zeno-teal" : "text-slate-500")} aria-hidden />
            <select
              aria-label="Duplicate one of yours"
              aria-describedby={none ? "duplicate-none" : undefined}
              title={none ? "You don’t have any dashboards of your own yet" : undefined}
              disabled={none}
              value={duplicating ? duplicateId! : ""}
              onChange={(e) => onDuplicate(e.target.value)}
              className={cn(SELECT, duplicating ? "border-zeno-teal bg-slate-50 font-medium text-slate-800" : "border-slate-300 text-slate-700")}
            >
              <option value="" disabled>Duplicate one of yours…</option>
              {own.map((d) => <option key={d.id} value={d.id}>{d.name}{d.widgets.length === 0 ? " (no widgets yet)" : ""}</option>)}
            </select>
          </div>
          {none && <p id="duplicate-none" className="mt-1 text-xs text-slate-500">You don’t have any dashboards of your own yet.</p>}
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Or start from a template</legend>
        <div data-grid className="grid auto-rows-fr grid-cols-3 gap-2">
          {templates.map((t, i) => {
            const on = selected?.id === t.id;
            return (
              <label
                key={t.id}
                className={cn(
                  "flex h-full cursor-pointer flex-col rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40",
                  on ? "border-zeno-teal bg-slate-50" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name="start-template"
                  value={t.id}
                  checked={on}
                  onChange={() => onTemplate(t.id)}
                  onKeyDown={(e) => onGridKey(e, i)}
                  className="sr-only"
                />
                {/* The widget count shares the name's line, so a row of cards stays short enough to fit 768px without scrolling. */}
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{t.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{widgetCount(t.widgets.length)}</span>
                  {on && <Check className="h-4 w-4 shrink-0 self-center text-zeno-teal" aria-hidden />}
                </span>
                <span className="mt-0.5 line-clamp-2 min-h-8 text-xs text-slate-600">{t.description}</span>
              </label>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-2 min-h-4 truncate text-xs text-slate-600">
          {selected && (
            <>
              <span className="font-medium text-slate-700">Includes:</span>{" "}
              {selected.widgets.slice(0, INCLUDES_SHOWN).map((w) => w.title).join(", ")}
              {selected.widgets.length > INCLUDES_SHOWN && `, +${selected.widgets.length - INCLUDES_SHOWN} more`}
            </>
          )}
        </p>
      </fieldset>
    </div>
  );
}
