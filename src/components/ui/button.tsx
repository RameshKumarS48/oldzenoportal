import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "teal" | "secondary" | "ghost" | "danger" | "outline" | "ghost-dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary:     "bg-zeno-red hover:bg-zeno-red-hover text-white shadow-sm",   // signature action (Export, Immobilize)
  teal:        "bg-zeno-teal hover:bg-zeno-teal-hover text-white shadow-sm", // primary surface action (Apply, Login)
  secondary:   "bg-slate-100 hover:bg-slate-200 text-slate-700",
  ghost:       "hover:bg-slate-100 text-slate-600",
  danger:      "bg-red-500 hover:bg-red-600 text-white",
  outline:     "border border-slate-300 hover:bg-slate-50 text-slate-700",
  "ghost-dark": "border border-white/20 bg-white/[0.06] text-white/75 hover:bg-white/[0.13] hover:text-white hover:border-white/30",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zeno-red/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
