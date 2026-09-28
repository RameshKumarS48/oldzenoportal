"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, PenLine, PencilRuler, Table2, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useFormsStore, FIELD_TYPE_OPTIONS } from "@/store/forms";
import type { FieldType, FieldValue } from "@/store/forms";
import { FieldEditor } from "@/components/forms/FieldEditor";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { SheetView } from "@/components/forms/SheetView";

type Tab = "build" | "fill" | "sheet";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "build", label: "Build", icon: PencilRuler },
  { key: "fill",  label: "Fill",  icon: PenLine },
  { key: "sheet", label: "Sheet", icon: Table2 },
];

function isTab(v: string | null): v is Tab {
  return v === "build" || v === "fill" || v === "sheet";
}

function FormDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab: Tab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "build";
  const user = useAuthStore((s) => s.user);
  const { forms, submissions, updateForm, addField, addSubmission } = useFormsStore();

  const form = forms.find((f) => f.id === id);
  const formSubmissions = submissions.filter((s) => s.formId === id);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [justSubmitted, setJustSubmitted] = useState(false);

  if (!form) {
    return (
      <>
        <Topbar title="Forms" />
        <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-sm font-medium text-slate-700">Form not found</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">It may have been deleted.</p>
            <Link href="/forms"><Button size="sm" variant="outline"><ArrowLeft className="w-4 h-4" /> Back to Forms</Button></Link>
          </div>
        </main>
      </>
    );
  }

  const handleSubmit = (values: Record<string, FieldValue>) => {
    addSubmission(form.id, values, user?.name);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 4000);
  };

  return (
    <>
      <Topbar
        title={form.title || "Untitled Form"}
        actions={
          <Link href="/forms" className="ml-4">
            <Button size="sm" variant="ghost-dark"><ArrowLeft className="w-4 h-4" /> All Forms</Button>
          </Link>
        }
      />

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setJustSubmitted(false); }}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                active ? "text-[#003B49]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.key === "sheet" && formSubmissions.length > 0 && (
                <span className="ml-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{formSubmissions.length}</span>
              )}
              {active && <span className="absolute left-0 bottom-0 w-full h-[2px] bg-[#FF3B06]" />}
            </button>
          );
        })}
        <p className="ml-auto text-[11px] text-slate-400 hidden md:block">
          Same data, three views. <span className="text-slate-500">Build</span> the structure, <span className="text-slate-500">Fill</span> it in, or edit it as a <span className="text-slate-500">Sheet</span>.
        </p>
      </div>

      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        {/* ---------------- BUILD ---------------- */}
        {tab === "build" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Header card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 border-t-4 border-t-[#FF3B06]">
              <input
                value={form.title}
                onChange={(e) => updateForm(form.id, { title: e.target.value })}
                placeholder="Form title"
                className="w-full text-lg font-semibold text-slate-800 placeholder-slate-300 focus:outline-none"
                style={{ fontFamily: "var(--font-display)" }}
              />
              <textarea
                value={form.description ?? ""}
                onChange={(e) => updateForm(form.id, { description: e.target.value })}
                placeholder="Form description (optional)"
                rows={2}
                className="w-full mt-2 text-sm text-slate-600 placeholder-slate-300 focus:outline-none resize-none"
              />
            </div>

            {/* Fields */}
            {form.fields.map((field, i) => (
              <FieldEditor key={field.id} formId={form.id} field={field} index={i} total={form.fields.length} />
            ))}

            {/* Add field */}
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-44">
                <Select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                  options={FIELD_TYPE_OPTIONS}
                />
              </div>
              <Button variant="outline" onClick={() => addField(form.id, newFieldType)} className="shrink-0">
                <Plus className="w-4 h-4" /> Add Field
              </Button>
              <p className="text-xs text-slate-400 sm:ml-auto self-center">Changes save automatically</p>
            </div>
          </div>
        )}

        {/* ---------------- FILL ---------------- */}
        {tab === "fill" && (
          <div className="max-w-2xl mx-auto space-y-4">
            {justSubmitted && (
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 flex-1">Response recorded.</p>
                <button onClick={() => setTab("sheet")} className="text-sm font-medium text-green-700 underline hover:text-green-800">View in Sheet</button>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 border-t-4 border-t-[#FF3B06]">
              <h2 className="text-lg font-semibold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>{form.title || "Untitled Form"}</h2>
              {form.description && <p className="text-sm text-slate-500 mt-1 mb-5">{form.description}</p>}
              <div className={cn(!form.description && "mt-5")}>
                <FormRenderer form={form} onSubmit={handleSubmit} />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- SHEET ---------------- */}
        {tab === "sheet" && (
          <div className="max-w-6xl mx-auto">
            <SheetView form={form} submissions={formSubmissions} />
          </div>
        )}
      </main>
    </>
  );
}

export default function FormDetailPage() {
  return (
    <Suspense fallback={null}>
      <FormDetail />
    </Suspense>
  );
}
