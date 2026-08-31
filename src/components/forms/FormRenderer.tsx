"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormDef, FieldValue } from "@/store/forms";

interface Props {
  form: FormDef;
  onSubmit: (values: Record<string, FieldValue>) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialValues(form: FormDef): Record<string, FieldValue> {
  const v: Record<string, FieldValue> = {};
  for (const f of form.fields) v[f.id] = f.type === "checkbox" ? false : "";
  return v;
}

export function FormRenderer({ form, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() => initialValues(form));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (id: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: "" } : prev));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of form.fields) {
      const val = values[f.id];
      if (f.required) {
        if (f.type === "checkbox" && val !== true) next[f.id] = "This must be checked.";
        else if (f.type !== "checkbox" && (val === "" || val === undefined)) next[f.id] = "This field is required.";
      }
      if (f.type === "email" && typeof val === "string" && val && !EMAIL_RE.test(val)) {
        next[f.id] = "Enter a valid email address.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cleaned: Record<string, FieldValue> = {};
    for (const f of form.fields) {
      const val = values[f.id];
      cleaned[f.id] = f.type === "number" && val !== "" ? Number(val) : val;
    }
    onSubmit(cleaned);
    setValues(initialValues(form));
  };

  const inputCls = (id: string) =>
    cn(
      "w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]",
      errors[id] ? "border-red-400" : "border-slate-300"
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {form.fields.map((f) => {
        const val = values[f.id];
        return (
          <div key={f.id}>
            {f.type !== "checkbox" && (
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {f.label || <span className="text-slate-400 italic">Untitled field</span>}
                {f.required && <span className="text-[#FF3B06] ml-0.5">*</span>}
              </label>
            )}

            {f.type === "textarea" ? (
              <textarea
                rows={3}
                placeholder={f.placeholder}
                value={val as string}
                onChange={(e) => set(f.id, e.target.value)}
                className={inputCls(f.id)}
              />
            ) : f.type === "select" ? (
              <select value={val as string} onChange={(e) => set(f.id, e.target.value)} className={cn(inputCls(f.id), "appearance-none")}>
                <option value="">— Select —</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={val as boolean}
                  onChange={(e) => set(f.id, e.target.checked)}
                  className="w-4 h-4 accent-[#FF3B06]"
                />
                <span className="text-sm font-medium text-slate-700">
                  {f.label || "Untitled field"}
                  {f.required && <span className="text-[#FF3B06] ml-0.5">*</span>}
                </span>
              </label>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                placeholder={f.placeholder}
                value={val as string}
                onChange={(e) => set(f.id, e.target.value)}
                className={inputCls(f.id)}
              />
            )}

            {f.helpText && !errors[f.id] && <p className="mt-1 text-xs text-slate-400">{f.helpText}</p>}
            {errors[f.id] && <p className="mt-1 text-xs text-red-500">{errors[f.id]}</p>}
          </div>
        );
      })}

      <div className="pt-2">
        <Button type="submit">Submit response</Button>
      </div>
    </form>
  );
}
