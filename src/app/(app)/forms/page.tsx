"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Copy, Trash2, ListChecks, Table2, Upload, Grid3x3, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth";
import { useFormsStore } from "@/store/forms";
import type { FormDef } from "@/store/forms";
import { parseFile, matrixToDraft } from "@/lib/forms-io";

export default function FormsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { forms, submissions, createForm, importForm, duplicateForm, deleteForm, addBlankSubmission } = useFormsStore();
  const [deleteTarget, setDeleteTarget] = useState<FormDef | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const countFor = (formId: string) => submissions.filter((s) => s.formId === formId).length;

  const handleCreate = () => {
    const form = createForm({ createdBy: user?.name });
    router.push(`/forms/${form.id}`);
  };

  const handleCreateSheet = () => {
    const form = createForm({ title: "Untitled Sheet", createdBy: user?.name, columns: 3 });
    addBlankSubmission(form.id);
    router.push(`/forms/${form.id}?tab=sheet`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const matrix = await parseFile(file);
      const { fields, rows } = matrixToDraft(matrix);
      if (!fields.length) throw new Error("That file has no columns to import.");
      const title = file.name.replace(/\.[^.]+$/, "");
      const form = importForm({ title, fields, rows, createdBy: user?.name });
      router.push(`/forms/${form.id}?tab=sheet`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not import that file.");
      setImporting(false);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <Topbar
        title="Forms"
        actions={
          <div className="flex items-center gap-2 ml-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xlsm,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button size="sm" variant="ghost-dark" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
            </Button>
            <Button size="sm" variant="ghost-dark" onClick={handleCreateSheet}>
              <Grid3x3 className="w-4 h-4" /> New Sheet
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="w-4 h-4" /> New Form
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6">
        <p className="text-sm text-slate-500 mb-5 max-w-2xl">
          Build custom data-collection forms, share them, and view submissions as a live sheet.
          Design any asset-intake or survey flow here without code — add, edit, and reorder fields as your requirements change.
          Already have a spreadsheet? <span className="text-slate-600 font-medium">Import</span> a CSV or Excel file to start from it.
        </p>

        {importError && (
          <div className="mb-4 text-xs rounded-lg px-3 py-2 border bg-red-50 border-red-200 text-red-600 max-w-2xl">
            {importError}
          </div>
        )}

        {forms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">No forms yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Create your first form to start collecting data.</p>
            <Button size="sm" onClick={handleCreate}><Plus className="w-4 h-4" /> New Form</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms.map((form) => (
              <div key={form.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
                <Link href={`/forms/${form.id}`} className="flex-1 p-5">
                  <div className="w-9 h-9 rounded-lg bg-[#003B49]/5 flex items-center justify-center mb-3">
                    <FileText className="w-4.5 h-4.5 text-[#003B49]" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-1" style={{ fontFamily: "var(--font-display)" }}>
                    {form.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
                    {form.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-slate-400" /> {form.fields.length} fields</span>
                    <span className="flex items-center gap-1.5"><Table2 className="w-3.5 h-3.5 text-slate-400" /> {countFor(form.id)} responses</span>
                  </div>
                </Link>
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">Updated {format(new Date(form.updatedAt), "d MMM yyyy")}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => duplicateForm(form.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(form)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Form">
        <p className="text-sm text-slate-600 mb-5">
          Delete <strong>{deleteTarget?.title}</strong> and all of its responses? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => { if (deleteTarget) deleteForm(deleteTarget.id); setDeleteTarget(null); }}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
