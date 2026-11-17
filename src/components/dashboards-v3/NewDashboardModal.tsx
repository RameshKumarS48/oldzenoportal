"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Info, LayoutTemplate, SquareDashed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type CategoryId } from "@/lib/dashboards-v3/catalogue";
import type { Dashboard, Visibility } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { isOwn, useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";
import { NAME_MAX, VisibilityChoice } from "./DashboardDialogs";
import { CategoryChip } from "./ui/CategoryChip";
import { ConfirmDialog, Dialog } from "./ui/Dialog";

export type StartKind = "template" | "blank" | "duplicate";

/** Where the modal opens: step 1 to choose, or straight to the details with a starting point already picked. */
export type NewDashboardStart =
  | { step: 1 }
  | { step: 2; kind: "blank" }
  | { step: 2; kind: "template" | "duplicate"; sourceId: string };

const DESCRIPTION_MAX = 160;

const KINDS: { id: StartKind; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "template", label: "Zeno template", hint: "Ready-made widgets you can change", icon: LayoutTemplate },
  { id: "blank", label: "Blank", hint: "An empty page; add widgets yourself", icon: SquareDashed },
  { id: "duplicate", label: "Duplicate one of yours", hint: "Copy a dashboard you already have", icon: Copy },
];

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

  const templates = dashboards.filter((d) => d.isTemplate);
  const own = dashboards.filter(isOwn);

  const [step, setStep] = useState<1 | 2>(start?.step ?? 1);
  const [kind, setKind] = useState<StartKind>(start?.step === 2 ? start.kind : "template");
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
  const requestClose = () => (typedAnything ? setConfirmDiscard(true) : onClose());

  // Each step starts with focus on its first field, so the keyboard never lands on the old step's buttons.
  const body = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) { opened.current = true; return; }
    const target = step === 1 ? body.current?.querySelector<HTMLElement>("input[type=radio]:checked") : body.current?.querySelector<HTMLElement>("[data-autofocus]");
    target?.focus();
  }, [step]);

  const nameError = !name.trim() ? "Enter a name" : null;
  const categoryError = !category ? "Choose a category" : null;
  const sameName = name.trim() && own.some((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  /** Moving on from step 1 fills the details from the chosen starting point, keeping anything typed. */
  function next() {
    if (!sourceReady) return;
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
        step === 1 ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="teal" onClick={next} disabled={!sourceReady}>Next</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="ghost" onClick={requestClose}>Cancel</Button>
            <Button variant="teal" type="submit" form="new-dashboard-form">Create dashboard</Button>
          </>
        )
      }
    >
      <div ref={body}>
      {step === 1 ? (
        <div className="space-y-5">
          <fieldset>
            <legend className="sr-only">Starting point</legend>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map(({ id, label, hint, icon: Icon }) => {
                const disabled = id === "duplicate" && own.length === 0;
                const on = kind === id;
                return (
                  <label
                    key={id}
                    title={disabled ? "You don't have any dashboards of your own to copy yet" : undefined}
                    className={cn(
                      "flex gap-2.5 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40",
                      disabled ? "cursor-not-allowed border-slate-200 opacity-50" : "cursor-pointer",
                      on ? "border-zeno-teal bg-slate-50" : !disabled && "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="start-kind"
                      value={id}
                      checked={on}
                      disabled={disabled}
                      onChange={() => setKind(id)}
                      className="sr-only"
                      {...(on ? { "data-autofocus": true } : {})}
                    />
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-zeno-teal" : "text-slate-400")} />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {kind === "template" && <TemplateGallery templates={templates} selected={templateId} onSelect={setTemplateId} />}
          {kind === "blank" && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
              You’ll start with an empty dashboard and a few suggested widgets for its category.
            </p>
          )}
          {kind === "duplicate" && <DuplicateList dashboards={own} selected={duplicateId} onSelect={setDuplicateId} />}
        </div>
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

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this dashboard?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
      >
        What you’ve entered won’t be saved, and no dashboard will be created.
      </ConfirmDialog>
    </Dialog>
  );
}

function suggestedName(source: Dashboard): string {
  return `${source.name} (copy)`;
}

/** Templates as cards, grouped by category, each with its widget count. A radio group, so arrow keys move through it. */
function TemplateGallery({ templates, selected, onSelect }: { templates: Dashboard[]; selected: string | null; onSelect: (id: string) => void }) {
  const groups = CATEGORIES.map((c) => ({ ...c, items: templates.filter((t) => t.category === c.id) })).filter((g) => g.items.length > 0);
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 text-sm font-medium text-slate-700">Zeno templates</legend>
      {groups.map((g) => (
        <div key={g.id}>
          <CategoryChip category={g.id} className="mb-2" />
          <div className="grid grid-cols-2 gap-2">
            {g.items.map((t) => (
              <OptionCard key={t.id} name="template" id={t.id} selected={selected === t.id} onSelect={onSelect} title={t.name} detail={t.description} meta={widgetCount(t.widgets.length)} />
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function DuplicateList({ dashboards, selected, onSelect }: { dashboards: Dashboard[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Your dashboards</legend>
      <div className="grid grid-cols-2 gap-2">
        {dashboards.map((d) => (
          <OptionCard
            key={d.id}
            name="duplicate"
            id={d.id}
            selected={selected === d.id}
            onSelect={onSelect}
            title={d.name}
            detail={d.description}
            meta={d.widgets.length === 0 ? "No widgets yet" : widgetCount(d.widgets.length)}
            chip={<CategoryChip category={d.category} />}
          />
        ))}
      </div>
    </fieldset>
  );
}

function OptionCard({
  name, id, selected, onSelect, title, detail, meta, chip,
}: {
  name: string; id: string; selected: boolean; onSelect: (id: string) => void;
  title: string; detail?: string; meta: string; chip?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40",
        selected ? "border-zeno-teal bg-slate-50" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <input type="radio" name={name} value={id} checked={selected} onChange={() => onSelect(id)} className="sr-only" />
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {selected && <Check className="h-4 w-4 shrink-0 text-zeno-teal" aria-hidden />}
      </span>
      {detail && <span className="mt-0.5 line-clamp-2 text-xs text-slate-500">{detail}</span>}
      <span className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        {chip}
        {meta}
      </span>
    </label>
  );
}
