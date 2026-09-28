"use client";

import { Car, ScanLine, ArrowLeftRight, Wallet, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelFor, MODULE_LABELS, ACCESS_LEVEL_LABELS } from "@/lib/access";
import type { AccessModule, AccessLevel } from "@/lib/access";
import type { UserRole } from "@/lib/mock/users";
import { ROLE_LABELS } from "@/lib/mock/users";

const MODULE_ICONS: Record<AccessModule, LucideIcon> = {
  vehicle:         Car,
  scanner:         ScanLine,
  swap_info:       ArrowLeftRight,
  wallet_info:     Wallet,
  user_management: Users,
};

/** Level reads as a state chip: granted is green, withheld recedes. */
const LEVEL_CHIP: Record<AccessLevel, string> = {
  read_write: "border-emerald-200 bg-emerald-50 text-emerald-700",
  read_only:  "border-slate-300 bg-white text-slate-600",
  none:       "border-slate-200 bg-transparent text-slate-400",
};

const CORE_MODULES: AccessModule[] = ["vehicle", "scanner", "swap_info", "wallet_info"];

/**
 * What a role can reach, rendered read-only. Access follows the role and isn't
 * editable per person, so this is a statement of fact for whoever is sending the
 * invite — not a set of controls.
 */
export function PermissionSummary({ role }: { role: UserRole }) {
  const modules: AccessModule[] = [
    ...CORE_MODULES,
    ...(levelFor(role, "user_management") !== "none" ? (["user_management"] as AccessModule[]) : []),
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-slate-600">
        Permissions for <span className="font-semibold text-slate-800">{ROLE_LABELS[role]}</span>.
        The user will receive exactly these access rights based on their role.
      </p>

      <ul className="space-y-1">
        {modules.map((module) => {
          const Icon = MODULE_ICONS[module];
          const level = levelFor(role, module);
          return (
            <li key={module} className="flex items-center gap-3 py-2">
              <Icon className="w-[18px] h-[18px] text-slate-500 shrink-0" />
              <span className="flex-1 text-[15px] font-semibold text-slate-800">
                {MODULE_LABELS[module]}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-3 py-1.5 text-[13px] font-medium",
                  LEVEL_CHIP[level]
                )}
              >
                {ACCESS_LEVEL_LABELS[level]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
