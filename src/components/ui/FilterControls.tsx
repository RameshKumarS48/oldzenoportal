"use client";

import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 transition-colors";

/** Label + control column. The standard filter/field wrapper. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-slate-500 font-medium">{label}</label>
      {children}
    </div>
  );
}

/** Styled native <select> with the shared chevron. */
export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(CONTROL, "appearance-none pr-8 cursor-pointer")}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
    </Field>
  );
}

/** A button styled like a select, for controls that open a popover/modal. */
export function TriggerField({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Field label={label}>
      <button
        onClick={onClick}
        className={cn(CONTROL, "flex items-center justify-between hover:border-slate-300 text-left")}
      >
        <span className="truncate">{children}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" />
      </button>
    </Field>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, "pl-9")}
      />
    </div>
  );
}

/** Pill toggle group (e.g. List / Map view). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            value === o.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
