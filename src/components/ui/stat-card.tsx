import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  sublabel?: string;
  compact?: boolean;
  className?: string;
}

export function StatCard({ label, value, valueColor = "text-slate-700", sublabel, compact, className }: StatCardProps) {
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 px-4 py-3", compact && "px-3", className)}>
      <p className={cn("font-bold text-slate-400 uppercase tracking-widest leading-none", compact ? "text-[9px]" : "text-[10px]")}>{label}</p>
      <p
        className={cn("font-bold mt-1.5 leading-none", compact ? "text-xl mt-1" : "text-2xl", valueColor)}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {display}
      </p>
      {sublabel && <p className="text-[11px] text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
}

export function StatGrid({ children, cols = 4, className }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
        cols === 5 && "grid-cols-5",
        cols === 6 && "grid-cols-6",
        cols === 7 && "grid-cols-7",
        cols === 8 && "grid-cols-8",
        className
      )}
    >
      {children}
    </div>
  );
}
