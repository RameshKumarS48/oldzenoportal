"use client";

import { ChevronUp, ChevronDown, Trash2, GripVertical, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFormsStore, FIELD_TYPE_OPTIONS } from "@/store/forms";
import type { FormField, FieldType } from "@/store/forms";

interface Props {
  formId: string;
  field: FormField;
  index: number;
  total: number;
}

export function FieldEditor({ formId, field, index, total }: Props) {
  const { updateField, removeField, moveField } = useFormsStore();

  const handleTypeChange = (type: FieldType) => {
    updateField(formId, field.id, {
      type,
      options: type === "select" ? (field.options?.length ? field.options : ["Option 1"]) : undefined,
    });
  };

  const setOption = (i: number, value: string) => {
    const options = [...(field.options ?? [])];
    options[i] = value;
    updateField(formId, field.id, { options });
  };

  const addOption = () => {
    const options = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`];
    updateField(formId, field.id, { options });
  };

  const removeOption = (i: number) => {
    const options = (field.options ?? []).filter((_, idx) => idx !== i);
    updateField(formId, field.id, { options: options.length ? options : ["Option 1"] });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col items-center gap-1 pt-1.5 text-slate-300">
          <GripVertical className="w-4 h-4" />
          <div className="flex flex-col">
            <button
              onClick={() => moveField(formId, field.id, "up")}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveField(formId, field.id, "down")}
              disabled={index === total - 1}
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {/* Label + type */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Question / field label"
                value={field.label}
                onChange={(e) => updateField(formId, field.id, { label: e.target.value })}
              />
            </div>
            <div className="w-full sm:w-44 shrink-0">
              <Select
                value={field.type}
                onChange={(e) => handleTypeChange(e.target.value as FieldType)}
                options={FIELD_TYPE_OPTIONS}
              />
            </div>
          </div>

          {/* Options editor for dropdowns */}
          {field.type === "select" && (
            <div className="space-y-2 pl-1">
              {(field.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove option"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="flex items-center gap-1.5 text-xs font-medium text-[#003B49] hover:text-[#FF3B06] transition-colors pl-3.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            </div>
          )}

          {/* Placeholder + help text (not applicable to checkbox) */}
          {field.type !== "checkbox" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Placeholder (optional)"
                value={field.placeholder ?? ""}
                onChange={(e) => updateField(formId, field.id, { placeholder: e.target.value })}
              />
              <Input
                placeholder="Help text (optional)"
                value={field.helpText ?? ""}
                onChange={(e) => updateField(formId, field.id, { helpText: e.target.value })}
              />
            </div>
          )}

          {/* Footer: required toggle + delete */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none pt-2">
              <button
                type="button"
                role="switch"
                aria-checked={field.required}
                onClick={() => updateField(formId, field.id, { required: !field.required })}
                className={cn(
                  "relative w-9 h-5 rounded-full shrink-0 transition-colors duration-150",
                  field.required ? "bg-[#FF3B06]" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-150",
                    field.required ? "translate-x-[19px]" : "translate-x-[3px]"
                  )}
                />
              </button>
              <span className="text-xs font-medium text-slate-600">Required</span>
            </label>

            <button
              onClick={() => removeField(formId, field.id)}
              disabled={total <= 1}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors pt-2"
              title={total <= 1 ? "A form needs at least one field" : "Delete field"}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
