import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, description, disabled, className }: CheckboxProps) {
  return (
    <label className={cn("flex items-start gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all mt-0.5",
          checked ? "bg-zeno-teal border-zeno-teal" : "border-slate-300 bg-white hover:border-slate-400"
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
      {(label || description) && (
        <div>
          {label && <span className="text-sm font-medium text-slate-700 leading-tight">{label}</span>}
          {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      )}
    </label>
  );
}
