"use client";

import { useState } from "react";
import { AlertTriangle, Edit2, Check, X, Plus, Trash2, Info, RotateCcw, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { usePromoRulesStore, DEFAULT_PROMO_RULES } from "@/store/promo-rules";
import { useMetricsStore } from "@/store/metrics";
import { useComparisonStore, type ComparisonPeriod } from "@/store/comparison";
import { METRIC_DEFINITIONS } from "@/lib/mock/kpi-partner";
import { INFRA_METRIC_DEFINITIONS } from "@/lib/mock/kpi-infra";
import { REFERRAL_METRIC_DEFINITIONS } from "@/lib/mock/kpi-referral";
import { WALLET_METRIC_DEFINITIONS } from "@/lib/mock/kpi-wallet";
import { ENERGY_METRIC_DEFINITIONS } from "@/lib/mock/kpi-energy";
import { PREORDER_METRIC_DEFINITIONS } from "@/lib/mock/kpi-preorder";
import { cn } from "@/lib/utils";
import type { PromoRules, PromoFrequency } from "@/store/promo-rules";

type TabId = "rules" | "comparison" | "params";

// ──────────────────────────────────────────────────────────────
// Business Rules Tab
// ──────────────────────────────────────────────────────────────

function BusinessRulesTab() {
  const { rules, updateRules, resetToDefaults } = usePromoRulesStore();
  const [draft, setDraft] = useState<PromoRules>({ ...rules });
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(rules);

  const handleSave = () => {
    updateRules(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    setDraft({ ...DEFAULT_PROMO_RULES });
    setResetConfirm(false);
  };

  const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Changes to promo rules affect all <strong>new</strong> customer activations and onboardings. Existing allocations are not retroactively modified.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>Promo Point Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure point allocations for customer onboarding scenarios.</p>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fresh Retail Customer Promo
                <span className="ml-1 font-normal text-slate-400">(points on first activation)</span>
              </label>
              <input type="number" className={fieldClass} value={draft.freshRetailPromo}
                onChange={(e) => setDraft((d) => ({ ...d, freshRetailPromo: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Retail Referral Bonus
                <span className="ml-1 font-normal text-slate-400">(extra points if referred)</span>
              </label>
              <input type="number" className={fieldClass} value={draft.freshRetailReferralBonus}
                onChange={(e) => setDraft((d) => ({ ...d, freshRetailReferralBonus: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Referrer Bonus
                <span className="ml-1 font-normal text-slate-400">(pending until bike delivered)</span>
              </label>
              <input type="number" className={fieldClass} value={draft.referrerBonus}
                onChange={(e) => setDraft((d) => ({ ...d, referrerBonus: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Partner Customer Promo
                <span className="ml-1 font-normal text-slate-400">(Greenwheels, M-KOPA, etc.)</span>
              </label>
              <input type="number" className={fieldClass} value={draft.partnerPromo}
                onChange={(e) => setDraft((d) => ({ ...d, partnerPromo: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Partner Referral Bonus
                <span className="ml-1 font-normal text-slate-400">(if partner customer was referred)</span>
              </label>
              <input type="number" className={fieldClass} value={draft.partnerReferralBonus}
                onChange={(e) => setDraft((d) => ({ ...d, partnerReferralBonus: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Promo Frequency</label>
              <select className={fieldClass} value={draft.promoFrequency}
                onChange={(e) => setDraft((d) => ({ ...d, promoFrequency: e.target.value as PromoFrequency }))}>
                <option value="once_per_lifetime">Once per lifetime</option>
                <option value="monthly">Monthly</option>
                <option value="per_activation">Per activation</option>
              </select>
            </div>
          </div>

          {/* Rule summary */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-2">Current Rules Summary</p>
            <p>• Fresh retail customer: <strong>{draft.freshRetailPromo.toLocaleString()} pts</strong> on activation</p>
            <p>• If referred: additional <strong>{draft.freshRetailReferralBonus.toLocaleString()} pts</strong></p>
            <p>• Referrer gets: <strong>{draft.referrerBonus.toLocaleString()} pts</strong> (pending → active on bike delivery)</p>
            <p>• Partner customer: <strong>{draft.partnerPromo.toLocaleString()} pts</strong> + <strong>{draft.partnerReferralBonus.toLocaleString()} pts</strong> if referred</p>
            <p>• Promo allocation: <strong>{draft.promoFrequency === "once_per_lifetime" ? "once per customer lifetime" : draft.promoFrequency}</strong></p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          {!resetConfirm ? (
            <button onClick={() => setResetConfirm(true)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
            </button>
          ) : (
            <span className="text-xs text-slate-600">
              Reset to defaults?{" "}
              <button onClick={handleReset} className="text-red-500 hover:text-red-700 font-medium">Yes</button>{" / "}
              <button onClick={() => setResetConfirm(false)} className="text-slate-400 hover:text-slate-600">No</button>
            </span>
          )}
          <div className="ml-auto flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setDraft({ ...rules })} disabled={!isDirty}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty}>
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Rules</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Comparison Period Tab (from admin/settings)
// ──────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: "1w",     label: "Last week" },
  { value: "4w",     label: "Last month" },
  { value: "13w",    label: "3 months" },
  { value: "26w",    label: "6 months" },
  { value: "custom", label: "Custom date" },
];

function ComparisonTab() {
  const period = useComparisonStore((s) => s.period);
  const customDate = useComparisonStore((s) => s.customDate);
  const setPeriod = useComparisonStore((s) => s.setPeriod);
  const setCustomDate = useComparisonStore((s) => s.setCustomDate);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>KPI Comparison Period</h2>
        <p className="text-xs text-slate-500 mt-0.5">Controls the "% change vs" badge shown on every KPI card.</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={cn("px-4 py-2 rounded-lg text-xs font-semibold border transition-all",
                period === opt.value
                  ? "bg-[#FF3B06] border-[#FF3B06] text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-[#FF3B06] hover:text-[#FF3B06]"
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs text-slate-500 shrink-0">Compare to week of:</label>
            <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30" />
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Data Params Tab (from admin/settings — simplified)
// ──────────────────────────────────────────────────────────────

type SourceId = "all" | "partner" | "infra" | "referral" | "wallet" | "energy" | "preorder";
type MetricDef = { key: string; label: string; unit: string; group: string; definition: string };

const SOURCES: { id: SourceId; label: string; definitions: readonly MetricDef[] }[] = [
  { id: "partner",  label: "Partner",        definitions: METRIC_DEFINITIONS as readonly MetricDef[] },
  { id: "infra",    label: "Infrastructure", definitions: INFRA_METRIC_DEFINITIONS as readonly MetricDef[] },
  { id: "referral", label: "Referral",       definitions: REFERRAL_METRIC_DEFINITIONS as readonly MetricDef[] },
  { id: "wallet",   label: "Wallet",         definitions: WALLET_METRIC_DEFINITIONS as readonly MetricDef[] },
  { id: "energy",   label: "Energy",         definitions: ENERGY_METRIC_DEFINITIONS as readonly MetricDef[] },
  { id: "preorder", label: "Pre-order",      definitions: PREORDER_METRIC_DEFINITIONS as readonly MetricDef[] },
];

const ALL_BUILTIN = SOURCES.flatMap((s) => s.definitions.map((d) => ({ ...d, source: s.label })));
const TOTAL_BUILTIN = ALL_BUILTIN.length;

function ParamsTab() {
  const [activeSource, setActiveSource] = useState<SourceId>("all");
  const [search, setSearch] = useState("");
  const { custom, overrides, setOverride, addCustom, updateCustom, removeCustom, getDefinition } = useMetricsStore();
  const [activeTab, setActiveTab] = useState<"builtin" | "custom">("builtin");

  const sourcePool = activeSource === "all"
    ? ALL_BUILTIN
    : SOURCES.find((s) => s.id === activeSource)?.definitions.map((d) => ({ ...d, source: SOURCES.find((s2) => s2.id === activeSource)!.label })) ?? [];

  const filtered = sourcePool.filter((m) =>
    m.label.toLowerCase().includes(search.toLowerCase()) ||
    m.group.toLowerCase().includes(search.toLowerCase())
  );
  const groups = Array.from(new Set(filtered.map((m) => m.group)));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Data Parameters</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit metric definitions that appear as tooltips on KPI cards.</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["builtin","custom"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              {t === "builtin" ? `Built-in (${TOTAL_BUILTIN})` : `Custom (${custom.length})`}
            </button>
          ))}
        </div>
        <input className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#FF3B06]/30"
          placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {activeTab === "builtin" && (
        <div className="flex flex-wrap gap-2">
          {([{ id: "all" as SourceId, label: `All (${TOTAL_BUILTIN})` }, ...SOURCES.map((s) => ({ id: s.id, label: `${s.label} (${s.definitions.length})` }))]).map((opt) => (
            <button key={opt.id} onClick={() => setActiveSource(opt.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                activeSource === opt.id ? "bg-[#FF3B06] border-[#FF3B06] text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-[#FF3B06] hover:text-[#FF3B06]")}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === "builtin" && groups.map((group) => {
          const items = filtered.filter((m) => m.group === group);
          return (
            <div key={group}>
              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group}</span>
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>
              {items.map((m) => (
                <DefinitionRow key={m.key} metricKey={m.key} label={m.label} group={m.group} unit={m.unit}
                  currentDef={getDefinition(m.key)} onSave={(def) => setOverride(m.key, def)} />
              ))}
            </div>
          );
        })}
        {activeTab === "builtin" && filtered.length === 0 && (
          <p className="px-5 py-8 text-sm text-center text-slate-400">No metrics match your search.</p>
        )}

        {activeTab === "custom" && (
          <>
            {custom.length === 0 && !search && (
              <div className="px-5 py-10 text-center">
                <Plus className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">No custom parameters yet</p>
              </div>
            )}
            {custom.map((m) => (
              <div key={m.key} className="px-5 py-3 border-b border-slate-100 last:border-0 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{m.label}</p>
                  <p className="text-xs text-slate-400">{m.group} · {m.definition || "No definition"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => updateCustom(m.key, {})} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeCustom(m.key)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <AddCustomForm />
          </>
        )}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">Definitions appear as tooltips on KPI cards and metric selectors.</p>
        </div>
      </div>
    </div>
  );
}

function DefinitionRow({ metricKey, label, group, unit, currentDef, onSave }: { metricKey: string; label: string; group: string; unit: string; currentDef: string; onSave: (def: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentDef);
  return (
    <div className="px-5 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{group}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{unit}</span>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
          {!editing ? (
            <p className="text-xs text-slate-500 leading-relaxed">{currentDef || <span className="italic text-slate-300">No definition</span>}</p>
          ) : (
            <div className="space-y-2 mt-2">
              <textarea autoFocus className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" rows={2}
                value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe this metric…" />
              <div className="flex gap-2">
                <button onClick={() => { setDraft(currentDef); setEditing(false); }} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button onClick={() => { onSave(draft); setEditing(false); }} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          )}
        </div>
        {!editing && (
          <button onClick={() => { setDraft(currentDef); setEditing(true); }} className="shrink-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddCustomForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [def, setDef] = useState("");
  const { addCustom } = useMetricsStore();

  const handleAdd = () => {
    if (!name.trim()) return;
    const key = `custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Math.random().toString(36).slice(2, 6)}`;
    addCustom({ key, label: name.trim(), unit: "#s", group: "Custom", definition: def.trim() });
    setName(""); setDef(""); setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-slate-100">
        <Plus className="w-4 h-4" /> Add custom parameter
      </button>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-blue-50/60 space-y-3">
      <p className="text-xs font-semibold text-blue-700">New custom parameter</p>
      <input autoFocus className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none bg-white" placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none bg-white" rows={2} placeholder="Definition (optional)" value={def} onChange={(e) => setDef(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-lg hover:bg-white">
          <X className="w-3 h-3" /> Cancel
        </button>
        <button onClick={handleAdd} disabled={!name.trim()} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Settings Page
// ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "zeno_super_admin";

  const defaultTab: TabId = isSuperAdmin ? "rules" : "comparison";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const TABS = [
    ...(isSuperAdmin ? [{ id: "rules" as TabId, label: "Business Rules" }] : []),
    { id: "comparison" as TabId, label: "Comparison Period" },
    { id: "params" as TabId, label: "Data Parameters" },
  ];

  return (
    <AdminGuard>
      <Topbar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6 bg-zeno-bg">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Tab bar */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-[#003B49] text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "rules"      && <BusinessRulesTab />}
          {activeTab === "comparison" && <ComparisonTab />}
          {activeTab === "params"     && <ParamsTab />}
        </div>
      </main>
    </AdminGuard>
  );
}
