import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, colSpan, className }: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }

  return content;
}
