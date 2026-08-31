import { cn } from "@/lib/utils";
import {
  CONNECTIVITY_META,
  IMMOBILIZATION_META,
  VEHICLE_STATUS_META,
  type Connectivity,
  type Immobilization,
  type VehicleStatus,
} from "@/lib/asset-status";

/** A coloured status dot. `dot` is a bg-* utility (see asset-status meta maps). */
export function StatusDot({ dot, className }: { dot: string; className?: string }) {
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", dot, className)} />;
}

/** Dot + label, the standard inline status treatment used in tables and panels. */
export function StatusLabel({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot dot={dot} />
      <span className="text-slate-700">{children}</span>
    </span>
  );
}

export function ConnectivityBadge({ value }: { value: Connectivity }) {
  const meta = CONNECTIVITY_META[value] ?? { dot: "bg-status-idle", label: value };
  return <StatusLabel dot={meta.dot}>{meta.label}</StatusLabel>;
}

export function ImmobilizationBadge({ value }: { value: Immobilization }) {
  const meta = IMMOBILIZATION_META[value] ?? { dot: "bg-status-idle", label: value };
  return <StatusLabel dot={meta.dot}>{meta.label}</StatusLabel>;
}

export function VehicleStatusPill({ value }: { value: VehicleStatus }) {
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", VEHICLE_STATUS_META[value] ?? "bg-slate-100 text-slate-600")}>
      {value}
    </span>
  );
}
