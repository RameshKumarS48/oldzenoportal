"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ExternalLink, FileClock, MapPin, Pencil } from "lucide-react";
import {
  FIELDS, SECTIONS, SITE_LEVEL_KEYS, mapsUrl, nextSiteId, norm, normaliseSiteId,
  type ChargingAsset, type ChargingAssetInput, type FieldDef, type FieldKey, type SectionId,
} from "@/lib/charging/fields";
import { assetIdFormatError, cleanInput, coordsFromText, validateAsset, type FieldErrors, type Warning } from "@/lib/charging/validate";
import { inputCls, labelCls } from "@/components/pricing-plans/shared";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Callout } from "@/components/ui/callout";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import { createAsset, deleteDraft, saveDraft, updateAsset, type ChargingDraft, type Me } from "./api";

type Values = Record<FieldKey, string>;
type StepId = SectionId | "review";

const STEPS: { id: StepId; title: string; hint: string }[] = [
  ...SECTIONS.map((s) => ({ id: s.id as StepId, title: s.title, hint: s.hint as string })),
  { id: "review", title: "Review", hint: "Check everything, then save." },
];

/** The form's order: as the sheet, except latitude and longitude sit side by side. */
const SITE_FORM_ORDER: FieldKey[] = ["siteName", "landmark", "area", "road", "town", "country", "zone", "lat", "lng", "legacyName"];
const sectionFields = (section: SectionId): FieldDef[] =>
  section === "site" ? SITE_FORM_ORDER.map((k) => FIELDS.find((f) => f.key === k)!) : FIELDS.filter((f) => f.section === section);
/** Keys checked when leaving a step (the site step also checks the Site ID). */
const stepKeys = (step: SectionId): FieldKey[] => [...(step === "site" ? (["siteId"] as FieldKey[]) : []), ...sectionFields(step).map((f) => f.key)];

const toValues = (input: ChargingAssetInput): Values =>
  Object.fromEntries(FIELDS.map((f) => [f.key, input[f.key] == null ? "" : String(input[f.key])])) as Values;

/** "‹Site name› - Fast Charger", then " 2", " 3"… when that name is taken. */
function suggestName(siteName: string, assetType: string, assets: ChargingAsset[], selfId?: string): string {
  if (!siteName.trim() || !assetType) return "";
  const taken = new Set(assets.filter((a) => a.id !== selfId).map((a) => norm(a.assetName)));
  const base = `${siteName.trim()} - ${assetType}`;
  if (!taken.has(norm(base))) return base;
  for (let n = 2; ; n++) if (!taken.has(norm(`${base} ${n}`))) return `${base} ${n}`;
}

interface Props {
  mode: "create" | "edit";
  assets: ChargingAsset[];
  me: Me;
  asset?: ChargingAsset;
  initial: ChargingAssetInput;
  /** A saved draft to continue (new assets only). */
  draft?: ChargingDraft;
}

/**
 * The charging asset form, one section per step: Site & location, Asset,
 * Site partner & lease, Rent & payment, Electricity, then Review. Next checks
 * the step you're on; the steps above can be clicked to move freely. The
 * rules are the same ones the save applies.
 */
export function AssetForm({ mode, assets, me, asset, initial, draft }: Props) {
  const router = useRouter();
  // What the form starts from: the draft as saved, or the asset / an empty form.
  const [start] = useState<Values>(() => (draft ? { ...toValues(initial), ...draft.values } as Values : toValues(initial)));
  const [draftId, setDraftId] = useState<string | undefined>(draft?.id);
  const [step, setStep] = useState(draft ? Math.min(draft.step, STEPS.length - 1) : 0);
  const [values, setValues] = useState<Values>(start);
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(() => new Set(Array.from({ length: (draft?.step ?? 0) + 1 }, (_, i) => i)));
  const [siteMode, setSiteMode] = useState<"existing" | "new">(draft?.siteMode ?? (mode === "edit" || assets.some((a) => a.siteId === initial.siteId) ? "existing" : "new"));
  const [nameEdited, setNameEdited] = useState(mode === "edit");
  const [allowIdFormat, setAllowIdFormat] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [pendingWarnings, setPendingWarnings] = useState<Warning[] | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [mapsPaste, setMapsPaste] = useState("");
  const saved = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const sites = useMemo(() => {
    const m = new Map<string, ChargingAsset>();
    for (const a of assets) if (!a.archivedAt || !m.has(a.siteId)) m.set(a.siteId, a);
    return [...m.values()].sort((a, b) => a.siteId.localeCompare(b.siteId));
  }, [assets]);
  const newSiteId = useMemo(() => nextSiteId(assets.map((a) => a.siteId)), [assets]);
  /** The ID typed for a new site, kept while "At an existing site" is tried. */
  const [typedNewId, setTypedNewId] = useState(() => (siteMode === "new" ? start.siteId || newSiteId : newSiteId));
  const newSite = mode === "create" && siteMode === "new";

  const input = useMemo(() => cleanInput(values), [values]);
  const { errors: liveErrors, warnings } = useMemo(
    () => validateAsset(input, { others: assets, selfId: asset?.id, allowIdFormat, newSite }),
    [input, assets, asset?.id, allowIdFormat, newSite],
  );
  const errors: FieldErrors = { ...liveErrors, ...serverErrors };
  const shown = (k: FieldKey) => (touched.has(k) ? errors[k] : undefined);
  const dirty = JSON.stringify(values) !== JSON.stringify(start);
  const idLocked = mode === "edit" && !!asset?.assetId && !me.can.overrideId;
  const idFormatProblem = values.assetId && values.assetType ? assetIdFormatError(values.assetType, input.assetId ?? "") : null;
  const current = STEPS[step];
  const stepErrorCount = (i: number) => (STEPS[i].id === "review" ? 0 : stepKeys(STEPS[i].id as SectionId).filter((k) => errors[k]).length);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty && !saved.current) e.preventDefault(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  function change(k: FieldKey, v: string) {
    setServerErrors((e) => { const { [k]: _, ...rest } = e; void _; return rest; });
    setValues((prev) => {
      const next = { ...prev, [k]: v };
      if (!nameEdited && (k === "siteName" || k === "assetType")) next.assetName = suggestName(next.siteName, next.assetType, assets, asset?.id);
      return next;
    });
  }
  const touch = (k: FieldKey) => setTouched((t) => new Set(t).add(k));

  function goTo(i: number) {
    // Leaving a step shows its problems (on the stepper too); it never blocks moving.
    if (current.id !== "review") setTouched((t) => new Set([...t, ...stepKeys(current.id as SectionId)]));
    setStep(i);
    setVisited((v) => new Set(v).add(i));
    bodyRef.current?.scrollTo({ top: 0 });
  }

  function next() {
    if (current.id === "review") return;
    const keys = stepKeys(current.id as SectionId);
    setTouched((t) => new Set([...t, ...keys]));
    const firstBad = keys.find((k) => errors[k]);
    if (firstBad) {
      document.getElementById(`field-${firstBad}`)?.focus();
      return;
    }
    goTo(step + 1);
  }

  function pickSite(siteId: string) {
    const site = sites.find((s) => s.siteId === siteId);
    if (!site) { setValues((v) => ({ ...v, siteId: "" })); return; }
    setValues((prev) => {
      const nextValues: Values = { ...prev, siteId };
      for (const k of SITE_LEVEL_KEYS) nextValues[k] = site[k] == null ? "" : String(site[k]);
      nextValues.lat = site.lat == null ? "" : String(site.lat);
      nextValues.lng = site.lng == null ? "" : String(site.lng);
      if (!nameEdited) nextValues.assetName = suggestName(nextValues.siteName, nextValues.assetType, assets, asset?.id);
      return nextValues;
    });
  }

  function chooseSiteMode(m: "existing" | "new") {
    if (m === siteMode) return;
    if (m === "existing") setTypedNewId(values.siteId);
    setSiteMode(m);
    setValues((v) => ({ ...v, siteId: m === "new" ? typedNewId : "" }));
  }

  /** Typing a new site's ID. */
  function typeNewSiteId(v: string) {
    change("siteId", v);
    setTypedNewId(v);
  }

  /** "Yes, I'm sure": the asset joins the site that already has this ID. */
  function joinExistingSite(siteId: string) {
    setTypedNewId(newSiteId);
    setSiteMode("existing");
    pickSite(siteId);
  }

  function applyMapsPaste(text: string) {
    setMapsPaste(text);
    const c = coordsFromText(text);
    if (c) {
      setValues((v) => ({ ...v, lat: String(c.lat), lng: String(c.lng) }));
      setTouched((t) => new Set(t).add("lat").add("lng"));
    }
  }

  function save(confirmWarnings = false) {
    setServerError(null);
    setTouched(new Set(FIELDS.map((f) => f.key)));
    if (Object.keys(liveErrors).length) return; // the Review step lists them, with links to their step
    if (warnings.length && !confirmWarnings) { setPendingWarnings(warnings); return; }
    setPendingWarnings(null);
    const res = mode === "create" ? createAsset(input, { confirmWarnings, allowIdFormat, newSite }) : updateAsset(asset!.id, input, asset!.version, { confirmWarnings, allowIdFormat });
    if (res.ok) {
      saved.current = true;
      if (draftId) deleteDraft(draftId); // finished: the draft has done its job
      toast.success(mode === "create" ? "Charging asset added" : "Changes saved", res.asset.assetName);
      router.push(`/zeno-charging/${res.asset.id}`);
      return;
    }
    if (res.validation?.warnings.length && !Object.keys(res.validation.errors).length) { setPendingWarnings(res.validation.warnings); return; }
    setServerErrors(res.validation?.errors ?? {});
    setServerError(res.error);
  }

  /** Keeps everything typed so far, unchecked, and the step you're on; finish it later from the list. */
  function saveAsDraft() {
    const id = saveDraft({ id: draftId, values, step, siteMode });
    setDraftId(id);
    saved.current = true;
    toast.success("Draft saved", "Continue it any time from Drafts on Zeno Charging Network.");
    router.push("/zeno-charging");
  }

  const stepOf = (k: FieldKey) => STEPS.findIndex((s) => s.id !== "review" && stepKeys(s.id as SectionId).includes(k));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zeno-bg">
      {/* Steps: click any to move; a number turns into a tick once the step is complete. */}
      <nav aria-label="Form steps" className="border-b border-slate-200 bg-white px-5 py-3 shrink-0">
        <ol className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const bad = stepErrorCount(i) > 0 && visited.has(i) && i !== step;
            const done = visited.has(i) && i !== step && !bad && s.id !== "review";
            return (
              <li key={s.id} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden className="h-px w-4 shrink-0 bg-slate-200 sm:w-6" />}
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                    i === step ? "bg-[#003B49] text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <span className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[11px] tabular-nums",
                    i === step ? "bg-white/20" : bad ? "bg-red-100 text-red-700" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                  )}>
                    {bad ? "!" : done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden md:inline">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form noValidate onSubmit={(e) => { e.preventDefault(); if (current.id === "review") save(); else next(); }} className="flex flex-1 flex-col overflow-hidden">
        <div ref={bodyRef} className="flex-1 overflow-auto p-5">
          <div className="mx-auto max-w-3xl space-y-4">
            {mode === "edit" && asset?.needsAttention && step === 0 && (
              <Callout variant="warning" title="This record needs attention">From the sheet import: {asset.needsAttention}. Fix these to save.</Callout>
            )}
            {serverError && <Callout variant="danger" role="alert" title="Not saved">{serverError}</Callout>}

            <section className="rounded-xl border border-slate-200 bg-white">
              <header className="border-b border-slate-100 px-5 py-3">
                <p className="text-[11px] font-medium text-slate-400">Step {step + 1} of {STEPS.length}</p>
                <h2 className="text-base font-semibold text-slate-800">{current.title}</h2>
                <p className="text-xs text-slate-500">{current.hint}</p>
              </header>

              {current.id === "review" ? (
                <Review
                  values={input}
                  errors={errors}
                  warnings={warnings}
                  onEdit={(i) => goTo(i)}
                  stepOf={stepOf}
                />
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {current.id === "site" && (
                    <SitePicker
                      mode={mode} siteMode={siteMode} onSiteMode={chooseSiteMode} siteId={values.siteId} sites={sites} assets={assets} newSiteId={newSiteId}
                      onPick={pickSite} onType={typeNewSiteId} onBlurId={() => { change("siteId", normaliseSiteId(values.siteId)); setTypedNewId(normaliseSiteId(values.siteId)); touch("siteId"); }}
                      onJoin={joinExistingSite} error={shown("siteId")}
                    />
                  )}
                  {sectionFields(current.id as SectionId).map((f) => (
                    <Field
                      key={f.key}
                      def={f}
                      value={values[f.key]}
                      error={shown(f.key)}
                      disabled={f.key === "assetId" && idLocked}
                      hint={f.key === "assetId" && idLocked ? "Only a Super Admin can change an Asset ID." : undefined}
                      onChange={(v) => { if (f.key === "assetName") setNameEdited(true); change(f.key, v); }}
                      onBlur={() => touch(f.key)}
                    />
                  ))}
                  {current.id === "site" && (
                    <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
                      <div className="min-w-64 flex-1">
                        <label htmlFor="maps-paste" className={labelCls}>Or paste a Google Maps link to fill in the coordinates</label>
                        <input id="maps-paste" value={mapsPaste} onChange={(e) => applyMapsPaste(e.target.value)} placeholder="https://www.google.com/maps?q=-1.2641,36.8053" className={inputCls} />
                      </div>
                      {mapsUrl(input.lat, input.lng) && !errors.lat && !errors.lng && (
                        <a href={mapsUrl(input.lat, input.lng)!} target="_blank" rel="noopener" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline">
                          <MapPin className="h-3.5 w-3.5" /> Check the pin <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                  {current.id === "asset" && idFormatProblem && me.can.overrideId && (
                    <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2">
                      <input type="checkbox" checked={allowIdFormat} onChange={(e) => setAllowIdFormat(e.target.checked)} className="mt-0.5" />
                      Keep this Asset ID although it isn’t in the usual format (Super Admin). The override is recorded in the history.
                    </label>
                  )}
                  {current.id === "asset" && warnings.length > 0 && (
                    <Callout variant="warning" className="sm:col-span-2" title="Possible duplicate">
                      {warnings.map((w, i) => <p key={i}>{w.message}</p>)}
                    </Callout>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-3 shrink-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button type="button" onClick={() => (dirty ? setLeaving(true) : router.back())} className="text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
            <div className="flex gap-2">
              {mode === "create" && (
                <button type="button" onClick={saveAsDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <FileClock className="h-4 w-4" /> Save as draft
                </button>
              )}
              {step > 0 && (
                <button type="button" onClick={() => goTo(step - 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              {current.id === "review" ? (
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-zeno-red px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zeno-red-hover">
                  <Check className="h-4 w-4" /> {mode === "create" ? "Add charging asset" : "Save changes"}
                </button>
              ) : (
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-zeno-red px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zeno-red-hover">
                  Next: {STEPS[step + 1].title} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </form>

      <ConfirmModal open={!!pendingWarnings} title="Possible duplicate" tone="neutral" confirmLabel="Save anyway" onClose={() => setPendingWarnings(null)} onConfirm={() => save(true)}>
        <ul className="list-disc space-y-1 pl-4">{pendingWarnings?.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
        <p className="mt-2">Save only if this really is a different asset.</p>
      </ConfirmModal>
      <ConfirmModal open={leaving} title="Discard your changes?" confirmLabel="Discard" onClose={() => setLeaving(false)} onConfirm={() => { saved.current = true; router.back(); }}>
        {draftId ? "Changes since you last saved this draft won’t be kept. The draft stays as it was." : "What you’ve entered on this form won’t be saved. Use Save as draft to finish it later."}
      </ConfirmModal>
    </div>
  );
}

/** Everything entered, by section, with each section's problems and a link back to it. */
function Review({ values, errors, warnings, onEdit, stepOf }: {
  values: ChargingAssetInput;
  errors: FieldErrors;
  warnings: Warning[];
  onEdit: (step: number) => void;
  stepOf: (k: FieldKey) => number;
}) {
  const problems = FIELDS.filter((f) => errors[f.key]);
  return (
    <div className="space-y-4 p-5">
      {problems.length > 0 ? (
        <Callout variant="danger" role="alert" title={`${problems.length} ${problems.length === 1 ? "field needs" : "fields need"} fixing before you can save`}>
          <ul className="space-y-0.5">
            {problems.map((f) => (
              <li key={f.key}>
                <button type="button" className="underline" onClick={() => onEdit(stepOf(f.key))}>{f.label}</button>: {errors[f.key]}
              </li>
            ))}
          </ul>
        </Callout>
      ) : (
        <Callout variant="success" title="Ready to save">Every required field is filled in and passes the checks.</Callout>
      )}
      {warnings.length > 0 && (
        <Callout variant="warning" title="You’ll be asked to confirm">{warnings.map((w, i) => <p key={i}>{w.message}</p>)}</Callout>
      )}
      {SECTIONS.map((s, i) => (
        <div key={s.id} className="rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <h3 className="text-xs font-semibold text-slate-700">{i + 1}. {s.title}</h3>
            <button type="button" onClick={() => onEdit(i)} className="inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline"><Pencil className="h-3 w-3" /> Edit</button>
          </div>
          <dl className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-2">
            {[...(s.id === "site" ? [FIELDS.find((f) => f.key === "siteId")!] : []), ...sectionFields(s.id)].map((f) => {
              const v = values[f.key];
              return (
                <div key={f.key} className="min-w-0">
                  <dt className="text-[11px] text-slate-500">{f.label}</dt>
                  <dd className={cn("break-words", errors[f.key] ? "text-red-600" : "text-slate-800")}>
                    {v == null || v === "" || (typeof v === "number" && Number.isNaN(v)) ? <span className={errors[f.key] ? "" : "text-slate-300"}>{errors[f.key] ? "Missing" : "–"}</span> : String(v)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

function SitePicker({ mode, siteMode, onSiteMode, siteId, sites, assets, newSiteId, onPick, onType, onBlurId, onJoin, error }: {
  mode: "create" | "edit";
  siteMode: "existing" | "new";
  onSiteMode: (m: "existing" | "new") => void;
  siteId: string;
  sites: ChargingAsset[];
  assets: ChargingAsset[];
  newSiteId: string;
  onPick: (siteId: string) => void;
  onType: (v: string) => void;
  onBlurId: () => void;
  onJoin: (siteId: string) => void;
  error?: string;
}) {
  // A new site's ID that another site already has: shown as soon as it's typed in full.
  const typed = normaliseSiteId(siteId);
  const taken = siteMode === "new" && typed ? sites.find((s) => norm(s.siteId) === norm(typed)) : undefined;
  const takenAssets = taken ? assets.filter((a) => a.siteId === taken.siteId) : [];
  const takenArchived = takenAssets.length > 0 && takenAssets.every((a) => a.archivedAt);
  if (mode === "edit") {
    return (
      <div className="sm:col-span-2">
        <p className={labelCls}>Site ID</p>
        <p className="font-mono text-sm text-slate-700">{siteId}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">An asset stays at its site. To move it, archive it and add it at the other site.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 sm:col-span-2">
      <div role="radiogroup" aria-label="Site" className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
        {(["existing", "new"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={siteMode === m} onClick={() => onSiteMode(m)}
            className={cn("rounded-md px-3 py-1.5 font-medium", siteMode === m ? "bg-[#003B49] text-white" : "text-slate-600 hover:bg-slate-50")}>
            {m === "existing" ? "At an existing site" : "At a new site"}
          </button>
        ))}
      </div>
      {siteMode === "existing" ? (
        <div>
          <label htmlFor="field-siteId" className={labelCls}>Site *</label>
          <select id="field-siteId" value={siteId} onChange={(e) => onPick(e.target.value)} className={cn(inputCls, error && "border-red-300")}>
            <option value="">Choose a site…</option>
            {sites.map((s) => <option key={s.siteId} value={s.siteId}>{s.siteId} · {s.siteName}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Fills in the location, partner, lease and rent its assets share. You can change them on the next steps.</p>
          {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
        </div>
      ) : (
        <div>
          <label htmlFor="field-siteId" className={labelCls}>Site ID *</label>
          <div className="flex items-center gap-2">
            <input
              id="field-siteId"
              value={siteId}
              onChange={(e) => onType(e.target.value)}
              onBlur={onBlurId}
              placeholder={newSiteId}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error || !!taken}
              aria-describedby="field-siteId-help"
              className={cn(inputCls, "max-w-48 font-mono", (error || taken) && "border-red-300")}
            />
            {typed !== newSiteId && (
              <button type="button" onClick={() => onType(newSiteId)} className="shrink-0 text-xs font-medium text-zeno-teal hover:underline">
                Use {newSiteId}
              </button>
            )}
          </div>
          {taken ? (
            <div role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="flex items-start gap-1.5 font-semibold"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{taken.siteId} already exists. Are you sure?</p>
              <p className="mt-1">
                It&apos;s “{taken.siteName}”{taken.town ? `, ${taken.town}` : ""}, with {takenAssets.length} asset{takenAssets.length === 1 ? "" : "s"}{takenArchived ? " (all archived)" : ""}.
                A new site can&apos;t reuse its ID. If this asset is at that site, add it there: its location, partner and rent fill in from the site.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onJoin(taken.siteId)} className="rounded-md bg-zeno-red px-3 py-1.5 font-medium text-white hover:bg-zeno-red-hover">
                  Yes, add it to {taken.siteId}
                </button>
                <button type="button" onClick={() => onType(newSiteId)} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100">
                  No, use {newSiteId}
                </button>
              </div>
            </div>
          ) : error ? (
            <p id="field-siteId-help" className="mt-1 flex items-start gap-1 text-[11px] text-red-600"><AlertCircle className="mt-px h-3 w-3 shrink-0" />{error}</p>
          ) : (
            <p id="field-siteId-help" className="mt-1 text-[11px] text-slate-400">
              Suggested: {newSiteId}, the next free ID. You can change it; it must look like Site-0042 and not belong to another site.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ def, value, error, disabled, hint, onChange, onBlur }: {
  def: FieldDef;
  value: string;
  error?: string;
  disabled?: boolean;
  hint?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const id = `field-${def.key}`;
  const describedBy = error ? `${id}-error` : def.help || hint ? `${id}-help` : undefined;
  const common = {
    id, value, disabled, onBlur,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
    className: cn(inputCls, error && "border-red-300", (def.kind === "lat" || def.kind === "lng" || def.kind === "money") && "tabular-nums"),
  };
  const wide = def.kind === "longtext" || def.key === "siteName" || def.key === "assetName";
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <label htmlFor={id} className={labelCls}>{def.label}{def.required ? " *" : <span className="font-normal text-slate-400"> (optional)</span>}</label>
      {def.kind === "choice" ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">{def.required ? "Choose…" : "Not set"}</option>
          {def.options!.map((o) => <option key={o} value={o}>{def.key === "zone" ? `Zone ${o}` : o}</option>)}
        </select>
      ) : def.kind === "longtext" ? (
        <textarea {...common} rows={2} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={def.kind === "date" ? "date" : "text"}
          inputMode={def.kind === "money" || def.kind === "lat" || def.kind === "lng" ? "decimal" : def.kind === "digits" || def.kind === "phone" ? "tel" : undefined}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1 text-[11px] text-red-600"><AlertCircle className="mt-px h-3 w-3 shrink-0" />{error}</p>
      ) : (hint || def.help) ? (
        <p id={`${id}-help`} className="mt-1 text-[11px] text-slate-400">{hint ?? def.help}</p>
      ) : null}
    </div>
  );
}
