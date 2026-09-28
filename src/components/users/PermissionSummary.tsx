"use client";

import { Bike, ScanLine, ArrowLeftRight, Wallet, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  levelFor,
  MODULE_LABELS,
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_BADGE,
} from "@/lib/access";
import type { AccessModule } from "@/lib/access";
import type { UserRole } from "@/lib/mock/users";
import { ROLE_LABELS } from "@/lib/mock/users";

const MODULE_ICONS: Record<AccessModule, LucideIcon> = {
  vehicle:         Bike,
  scanner:         ScanLine,
  swap_info:       ArrowLeftRight,
  wallet_info:     Wallet,
  user_management: Users,
};

/** The four data modules are always shown; User Management only where granted. */
const CORE_MODULES: AccessModule[] = ["vehicle", "scanner", "swap_info", "wallet_info"];

/**
 * Read-only rendering of what a role can reach. Access is fixed by role and not
 * editable per user, so this is a summary rather than a control — it exists to
 * tell whoever is sending an invite exactly what they're handing over.
 */
export function PermissionSummary({ role }: { role: UserRole }) {
  const modules: AccessModule[] = [
    ...CORE_MODULES,
    ...(levelFor(role, "user_management") !== "none" ? (["user_management"] as AccessModule[]) : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 leading-relaxed">
        Permissions for <strong className="text-slate-700">{ROLE_LABELS[role]}</strong>. The user
        will receive exactly these access rights based on their role.
      </p>

      <div className="space-y-2">
        {modules.map((module) => {
          const Icon = MODULE_ICONS[module];
          const level = levelFor(role, module);
          return (
            <div key={module} className="flex items-center gap-3 py-1.5">
              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-700 flex-1">
                {MODULE_LABELS[module]}
              </span>
              <span
                className={cn(
                  "px-3 py-1 rounded-md border text-xs font-semibold shrink-0",
                  ACCESS_LEVEL_BADGE[level]
                )}
              >
                {ACCESS_LEVEL_LABELS[level]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
