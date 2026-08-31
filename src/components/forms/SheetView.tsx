"use client";

import { useRef, useState } from "react";
import { Upload, Download, Plus, Trash2, BarChart3, X, Loader2, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFormsStore, FIELD_TYPE_OPTIONS } from "@/store/forms";
import type { FormDef, FormField, FormSubmission, FieldType, FieldValue } from "@/store/forms";
import { parseFile, mergeMatrixIntoForm, downloadCSV, downloadXLSX } from "@/lib/forms-io";

interface Props {
  form: FormDef;
  submissions: FormSubmission[];
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// --- Inline-editable cell -------------------------------------------------
function SheetCell({ submissionId, field, value }: { submissionId: string; field: FormField; value: FieldValue | undefined }) {
  const update = useFormsStore((s) => s.updateSubmissionValue);
  const [draft, setDraft] = useState<string>(value === undefined || value === null ? "" : String(value));

  const base = "w-full px-2 py-1.5 text-sm bg-transparent focus:outline-none focus:bg-[#003B49]/[0.04] rounded";

  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => update(submissionId, field.id, e.target.checked)}
        className="w-4 h-4 accent-[#FF3B06] ml-2"
      />
    );
  }

  if (field.type === "select") {
    const opts = field.options ?? [];
    const cur = value === undefined ? "" : String(value);
    return (
      <select value={cur} onChange={(e) => update(submissionId, field.id, e.target.value)} className={cn(base, "appearance-none cursor-pointer")}>
        <option value=""></option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        {cur && !opts.includes(cur) && <option value={cur}>{cur}</option>}
      </select>
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value === undefined ? "" : String(value)}
        onChange={(e) => update(submissionId, field.id, e.target.value)}
        className={cn(base, "cursor-text")}
      />
    );
  }

  const commit = () => {
    if (field.type === "number") {
      const raw = draft.trim();
      update(submissionId, field.id, raw === "" ? "" : isNaN(Number(raw)) ? raw : Number(raw));
    } else {
      update(submissionId, field.id, draft);
    }
  };

  return (
    <input
      type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
      value={draft}
      placeholder={field.placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { setDraft(value === undefined ? "" : String(value)); (e.target as HTMLInputElement).blur(); }
      }}
      className={base}
    />
  );
}

export function SheetView({ form, submissions }: Props) {
  const { updateField, removeField, addFields, appendRows, addBlankSubmission, deleteSubmission } = useFormsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const changeType = (field: FormField, type: FieldType) => {
    updateField(form.id, field.id, {
      type,
      options: type === "select" ? (field.options?.length ? field.options : ["Option 1"]) : undefined,
    });
  };

  const addColumn = () => {
    addFields(form.id, [{ id: uid("f"), label: `Column ${form.fields.length + 1}`, type: "text", required: false }]);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const matrix = await parseFile(file);
      const { newFields, rows } = mergeMatrixIntoForm(form, matrix);
      if (!rows.length && !newFields.length) {
        setMsg({ kind: "err", text: "No rows found in that file." });
      } else {
        if (newFields.length) addFields(form.id, newFields);
        if (rows.length) appendRows(form.id, rows);
        setMsg({
          kind: "ok",
          text: `Imported ${rows.length} row${rows.length === 1 ? "" : "s"}${newFields.length ? `, added ${newFields.length} column${newFields.length === 1 ? "" : "s"}` : ""}.`,
        });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? `Import failed: ${err.message}` : "Import failed." });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExcel = async () => {
    setBusy(true);
    try {
      await downloadXLSX(form, submissions);
    } catch {
      setMsg({ kind: "err", text: "Excel export failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-700">{submissions.length}</span> row{submissions.length === 1 ? "" : "s"}
          <span className="text-slate-300 mx-2">·</span>
          <span className="font-bold text-slate-700">{form.fields.length}</span> column{form.fields.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.xls" onChange={handleImport} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
          </Button>
          <Button size="sm" variant="outline" disabled title="Chart this data — coming soon">
            <BarChart3 className="w-4 h-4" /> Build Dashboard
          </Button>
          <Button size="sm" variant="ghost-dark" onClick={() => downloadCSV(form, submissions)}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button size="sm" variant="ghost-dark" onClick={handleExcel} disabled={busy}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      {msg && (
        <div className={cn("text-xs rounded-lg px-3 py-2 border", msg.kind === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600")}>
          {msg.text}
        </div>
      )}

      {/* Sheet */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase w-10 align-top">#</th>
              {form.fields.map((f) => (
                <th key={f.id} className="text-left px-2 py-2 align-top min-w-[10rem] border-l border-slate-100">
                  <div className="flex items-center gap-1">
                    <input
                      value={f.label}
                      onChange={(e) => updateField(form.id, f.id, { label: e.target.value })}
                      placeholder="Column name"
                      className="flex-1 px-1.5 py-1 text-xs font-semibold text-slate-700 bg-transparent rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#003B49]/20"
                    />
                    <button
                      onClick={() => removeField(form.id, f.id)}
                      disabled={form.fields.length <= 1}
                      className="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-colors"
                      title="Delete column"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    value={f.type}
                    onChange={(e) => changeType(f, e.target.value as FieldType)}
                    className="mt-0.5 ml-1.5 text-[10px] text-slate-400 bg-transparent focus:outline-none cursor-pointer uppercase tracking-wide"
                  >
                    {FIELD_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </th>
              ))}
              <th className="px-2 py-2 w-10 border-l border-slate-100 align-top">
                <button onClick={addColumn} className="p-1 rounded-lg text-slate-400 hover:text-[#FF3B06] hover:bg-slate-100 transition-colors" title="Add column">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.map((s, i) => (
              <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-3 py-1 text-slate-400 tabular-nums align-middle">{i + 1}</td>
                {form.fields.map((f) => (
                  <td key={f.id} className="px-1 py-0.5 align-middle border-l border-slate-50">
                    <SheetCell submissionId={s.id} field={f} value={s.values[f.id]} />
                  </td>
                ))}
                <td className="px-2 py-1 border-l border-slate-50 align-middle">
                  <button
                    onClick={() => deleteSubmission(s.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={form.fields.length + 2} className="px-4 py-8 text-center text-sm text-slate-400">
                  No rows yet — add one below, fill the form, or import a CSV/Excel file.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add row */}
        <button
          onClick={() => addBlankSubmission(form.id)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-[#003B49] hover:bg-slate-50 border-t border-slate-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add row
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        Edit any cell inline. Columns here are the form&apos;s fields — rename, retype, add, or remove them and the form updates too.
        {submissions.length > 0 && ` Last edited ${format(new Date(form.updatedAt), "d MMM yyyy, HH:mm")}.`}
      </p>
    </div>
  );
}
