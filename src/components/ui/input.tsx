import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal",
          error ? "border-red-400" : "border-slate-300",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
