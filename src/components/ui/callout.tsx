import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An inline message box: the one style for notes, warnings, errors and
 * success lines inside a page or modal, so they don't drift apart. Modelled
 * on shadcn/ui's Alert: an icon, an optional title, the message, and an
 * optional action on the right.
 */

type Variant = "info" | "success" | "warning" | "danger" | "neutral";

const VARIANTS: Record<Variant, { box: string; icon: string; Icon: LucideIcon }> = {
  info:    { box: "border-sky-200 bg-sky-50 text-sky-900",             icon: "text-sky-600",     Icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "text-emerald-600", Icon: CheckCircle2 },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900",       icon: "text-amber-600",   Icon: AlertTriangle },
  danger:  { box: "border-red-200 bg-red-50 text-red-700",             icon: "text-red-600",     Icon: AlertCircle },
  neutral: { box: "border-slate-200 bg-slate-50 text-slate-600",       icon: "text-slate-400",   Icon: Info },
};

export function Callout({
  variant = "info",
  title,
  action,
  role,
  className,
  children,
}: {
  variant?: Variant;
  title?: React.ReactNode;
  /** A button or link on the right, e.g. the fix for what the callout says. */
  action?: React.ReactNode;
  /** "alert" for errors that block the user, "status" for live updates. */
  role?: "alert" | "status";
  className?: string;
  children?: React.ReactNode;
}) {
  const v = VARIANTS[variant];
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs", v.box, className)}>
      <v.Icon className={cn("mt-px h-4 w-4 shrink-0", v.icon)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
