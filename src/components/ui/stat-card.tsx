import { cn } from "@/lib/utils";

/**
 * A label and a number. These sit above every table in the app, so their job is
 * to be read in one glance and then get out of the way of the rows below.
 *
 * Class order matters here: a Tailwind text-size utility also sets a
 * line-height, so `leading-none` has to come *after* it or tailwind-merge drops
 * it and the card silently grows by a third.
 */

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
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 px-3.5 py-2.5",
        compact && "px-3 py-2",
        className
      )}
    >
      <p className={cn("font-medium text-slate-500 truncate", compact ? "text-[10px] leading-none" : "text-[11px] leading-none")}>
        {label}
      </p>
      <p
        className={cn(
          "font-bold mt-1.5 tabular-nums",
          compact ? "text-[17px] leading-none" : "text-[20px] leading-none",
          valueColor
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {display}
      </p>
      {sublabel && <p className="mt-1.5 text-[11px] leading-none text-slate-400 truncate">{sublabel}</p>}
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
}

/** Stats wrap to two columns on a phone rather than crushing to unreadable widths. */
export function StatGrid({ children, cols = 4, className }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 grid-cols-2 sm:grid-cols-3",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        cols === 5 && "lg:grid-cols-5",
        cols === 6 && "lg:grid-cols-6",
        cols === 7 && "lg:grid-cols-7",
        cols === 8 && "lg:grid-cols-4 xl:grid-cols-8",
        className
      )}
    >
      {children}
    </div>
  );
}
