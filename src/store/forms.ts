"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Forms module — a lightweight "Google Forms + Sheets" experience hosted inside
 * the dashboard. Admins design forms (schemas) in the builder; submitted data is
 * collected into a spreadsheet-like responses view. Shapes are kept flat and
 * typed so numeric fields can later be aggregated into dashboards.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "checkbox";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for `select`
}

export interface FormDef {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type FieldValue = string | number | boolean;

export interface FormSubmission {
  id: string;
  formId: string;
  values: Record<string, FieldValue>;
  submittedAt: string;
  submittedBy?: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text:     "Short Text",
  textarea: "Paragraph",
  number:   "Number",
  email:    "Email",
  phone:    "Phone",
  date:     "Date",
  select:   "Dropdown",
  checkbox: "Checkbox",
};

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] =
  (Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] }));

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

function defaultField(type: FieldType): FormField {
  return {
    id: uid("f"),
    label: "",
    type,
    required: false,
    ...(type === "select" ? { options: ["Option 1"] } : {}),
  };
}

// ---------------------------------------------------------------------------
// Seed data — one example form with a couple of responses so the builder,
// fill view, and responses sheet all have something to show on first visit.
// ---------------------------------------------------------------------------
const SEED_FORMS: FormDef[] = [
  {
    id: "form-vehicle-intake",
    title: "Vehicle Intake",
    description: "Capture details when a new vehicle is added to the fleet.",
    fields: [
      { id: "f-vin",   label: "VIN",            type: "text",     required: true,  placeholder: "e.g. ZN-0001" },
      { id: "f-model", label: "Model",          type: "select",   required: true,  options: ["Zeno Emflux", "Zeno Cargo", "Zeno City"] },
      { id: "f-odo",   label: "Odometer (km)",  type: "number",   required: false },
      { id: "f-sale",  label: "Date of Sale",   type: "date",     required: false },
      { id: "f-notes", label: "Notes",          type: "textarea", required: false, placeholder: "Anything else worth noting" },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    createdBy: "System",
  },
];

const SEED_SUBMISSIONS: FormSubmission[] = [
  {
    id: "sub-seed-1",
    formId: "form-vehicle-intake",
    values: { "f-vin": "ZN-0001", "f-model": "Zeno Emflux", "f-odo": 12, "f-sale": "2026-07-15", "f-notes": "Delivered to Nairobi hub" },
    submittedAt: "2026-07-15T09:30:00.000Z",
    submittedBy: "Ramesh Kumar",
  },
  {
    id: "sub-seed-2",
    formId: "form-vehicle-intake",
    values: { "f-vin": "ZN-0002", "f-model": "Zeno Cargo", "f-odo": 3, "f-sale": "2026-07-18", "f-notes": "" },
    submittedAt: "2026-07-18T14:05:00.000Z",
    submittedBy: "Willie Omondi",
  },
];

interface FormsState {
  forms: FormDef[];
  submissions: FormSubmission[];

  createForm: (data?: { title?: string; createdBy?: string; columns?: number }) => FormDef;
  importForm: (data: { title: string; fields: FormField[]; rows: Record<string, FieldValue>[]; createdBy?: string }) => FormDef;
  updateForm: (id: string, patch: Partial<Pick<FormDef, "title" | "description">>) => void;
  deleteForm: (id: string) => void;
  duplicateForm: (id: string) => FormDef | undefined;

  addField: (formId: string, type: FieldType) => void;
  addFields: (formId: string, fields: FormField[]) => void;
  updateField: (formId: string, fieldId: string, patch: Partial<FormField>) => void;
  removeField: (formId: string, fieldId: string) => void;
  moveField: (formId: string, fieldId: string, dir: "up" | "down") => void;

  addSubmission: (formId: string, values: Record<string, FieldValue>, submittedBy?: string) => void;
  appendRows: (formId: string, rows: Record<string, FieldValue>[], submittedBy?: string) => void;
  addBlankSubmission: (formId: string) => void;
  updateSubmissionValue: (submissionId: string, fieldId: string, value: FieldValue) => void;
  deleteSubmission: (id: string) => void;
}

export const useFormsStore = create<FormsState>()(
  persist(
    (set, get) => ({
      forms: SEED_FORMS,
      submissions: SEED_SUBMISSIONS,

      createForm: (data) => {
        const ts = now();
        const cols = data?.columns ?? 0;
        const fields =
          cols > 0
            ? Array.from({ length: cols }, (_, i) => ({ ...defaultField("text"), label: `Column ${i + 1}` }))
            : [{ ...defaultField("text"), label: "" }];
        const form: FormDef = {
          id: uid("form"),
          title: data?.title?.trim() || "Untitled Form",
          description: "",
          fields,
          createdAt: ts,
          updatedAt: ts,
          createdBy: data?.createdBy,
        };
        set((s) => ({ forms: [form, ...s.forms] }));
        return form;
      },

      importForm: (data) => {
        const ts = now();
        const fields = data.fields.length ? data.fields : [{ ...defaultField("text"), label: "Column 1" }];
        const form: FormDef = {
          id: uid("form"),
          title: data.title.trim() || "Imported Sheet",
          description: "",
          fields,
          createdAt: ts,
          updatedAt: ts,
          createdBy: data.createdBy,
        };
        const submissions: FormSubmission[] = data.rows.map((values) => ({
          id: uid("sub"),
          formId: form.id,
          values,
          submittedAt: ts,
          submittedBy: data.createdBy,
        }));
        set((s) => ({ forms: [form, ...s.forms], submissions: [...s.submissions, ...submissions] }));
        return form;
      },

      updateForm: (id, patch) =>
        set((s) => ({
          forms: s.forms.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: now() } : f)),
        })),

      deleteForm: (id) =>
        set((s) => ({
          forms: s.forms.filter((f) => f.id !== id),
          submissions: s.submissions.filter((sub) => sub.formId !== id),
        })),

      duplicateForm: (id) => {
        const original = get().forms.find((f) => f.id === id);
        if (!original) return undefined;
        const ts = now();
        const copy: FormDef = {
          ...original,
          id: uid("form"),
          title: `${original.title} (copy)`,
          fields: original.fields.map((fld) => ({ ...fld, id: uid("f") })),
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({ forms: [copy, ...s.forms] }));
        return copy;
      },

      addField: (formId, type) =>
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId ? { ...f, fields: [...f.fields, defaultField(type)], updatedAt: now() } : f
          ),
        })),

      addFields: (formId, fields) =>
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId ? { ...f, fields: [...f.fields, ...fields], updatedAt: now() } : f
          ),
        })),

      updateField: (formId, fieldId, patch) =>
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId
              ? {
                  ...f,
                  fields: f.fields.map((fld) => (fld.id === fieldId ? { ...fld, ...patch } : fld)),
                  updatedAt: now(),
                }
              : f
          ),
        })),

      removeField: (formId, fieldId) =>
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId ? { ...f, fields: f.fields.filter((fld) => fld.id !== fieldId), updatedAt: now() } : f
          ),
        })),

      moveField: (formId, fieldId, dir) =>
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f;
            const idx = f.fields.findIndex((fld) => fld.id === fieldId);
            if (idx === -1) return f;
            const target = dir === "up" ? idx - 1 : idx + 1;
            if (target < 0 || target >= f.fields.length) return f;
            const fields = [...f.fields];
            [fields[idx], fields[target]] = [fields[target], fields[idx]];
            return { ...f, fields, updatedAt: now() };
          }),
        })),

      addSubmission: (formId, values, submittedBy) =>
        set((s) => ({
          submissions: [
            ...s.submissions,
            { id: uid("sub"), formId, values, submittedAt: now(), submittedBy },
          ],
        })),

      appendRows: (formId, rows, submittedBy) =>
        set((s) => {
          const ts = now();
          const added = rows.map((values) => ({ id: uid("sub"), formId, values, submittedAt: ts, submittedBy }));
          return { submissions: [...s.submissions, ...added] };
        }),

      addBlankSubmission: (formId) =>
        set((s) => {
          const form = s.forms.find((f) => f.id === formId);
          if (!form) return {};
          const values: Record<string, FieldValue> = {};
          for (const fld of form.fields) values[fld.id] = fld.type === "checkbox" ? false : "";
          return {
            submissions: [...s.submissions, { id: uid("sub"), formId, values, submittedAt: now(), submittedBy: undefined }],
          };
        }),

      updateSubmissionValue: (submissionId, fieldId, value) =>
        set((s) => ({
          submissions: s.submissions.map((sub) =>
            sub.id === submissionId ? { ...sub, values: { ...sub.values, [fieldId]: value } } : sub
          ),
        })),

      deleteSubmission: (id) =>
        set((s) => ({ submissions: s.submissions.filter((sub) => sub.id !== id) })),
    }),
    { name: "zeno-forms" }
  )
);
