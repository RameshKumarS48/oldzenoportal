"use client";

import { cn } from "@/lib/utils";
import { MODULE_LABELS, MODULE_ACTIONS, MODULES } from "@/store/roles";
import type { Module, RolePermission } from "@/store/roles";

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
  schedule: "Schedule",
  bulk_upload: "Bulk Upload",
};

const MODULE_GROUPS: { label: string; modules: Module[] }[] = [
  { label: "Analytics", modules: ["dashboards", "reports"] },
  { label: "Operations", modules: ["vehicles", "batteries", "swap_stations", "fast_chargers", "customers", "transactions", "provisioning"] },
  { label: "Administration", modules: ["users", "roles", "audit_logs", "settings"] },
];

interface PermissionMatrixProps {
  permissions: RolePermission[];
  onChange?: (permissions: RolePermission[]) => void;
  readonly?: boolean;
}

function hasAction(permissions: RolePermission[], module: Module, action: string): boolean {
  return permissions.find((p) => p.module === module)?.actions.includes(action) ?? false;
}

function toggleAction(
  permissions: RolePermission[],
  module: Module,
  action: string,
  enabled: boolean
): RolePermission[] {
  const existing = permissions.find((p) => p.module === module);
  if (!existing) {
    return enabled ? [...permissions, { module, actions: [action] }] : permissions;
  }
  const newActions = enabled
    ? [...new Set([...existing.actions, action])]
    : existing.actions.filter((a) => a !== action);
  const updated = { ...existing, actions: newActions };
  return permissions.map((p) => (p.module === module ? updated : p));
}

function toggleModule(
  permissions: RolePermission[],
  module: Module,
  enabled: boolean
): RolePermission[] {
  const actions = enabled ? [...MODULE_ACTIONS[module]] : [];
  const existing = permissions.find((p) => p.module === module);
  if (!existing) {
    return enabled ? [...permissions, { module, actions }] : permissions;
  }
  return permissions.map((p) => (p.module === module ? { ...p, actions } : p));
}

function isModuleFullyEnabled(permissions: RolePermission[], module: Module): boolean {
  const p = permissions.find((p) => p.module === module);
  if (!p) return false;
  return MODULE_ACTIONS[module].every((a) => p.actions.includes(a));
}

function isModulePartiallyEnabled(permissions: RolePermission[], module: Module): boolean {
  const p = permissions.find((p) => p.module === module);
  if (!p || p.actions.length === 0) return false;
  return !isModuleFullyEnabled(permissions, module);
}

export function PermissionMatrix({ permissions, onChange, readonly = false }: PermissionMatrixProps) {
  const handleToggleAction = (module: Module, action: string, enabled: boolean) => {
    if (readonly || !onChange) return;
    onChange(toggleAction(permissions, module, action, enabled));
  };

  const handleToggleModule = (module: Module, enabled: boolean) => {
    if (readonly || !onChange) return;
    onChange(toggleModule(permissions, module, enabled));
  };

  return (
    <div className="space-y-6">
      {MODULE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
            {group.label}
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {group.modules.map((mod, idx) => {
              const actions = MODULE_ACTIONS[mod];
              const fullyEnabled  = isModuleFullyEnabled(permissions, mod);
              const anyEnabled    = (permissions.find((p) => p.module === mod)?.actions.length ?? 0) > 0;

              return (
                <div
                  key={mod}
                  className={cn(
                    "px-4 py-3 flex items-center gap-3",
                    idx !== group.modules.length - 1 && "border-b border-slate-100"
                  )}
                >
                  {/* Toggle — ON = orange-red accent, OFF = slate-200 */}
                  <button
                    type="button"
                    onClick={() => handleToggleModule(mod, !fullyEnabled)}
                    disabled={readonly}
                    aria-checked={anyEnabled}
                    role="switch"
                    className={cn(
                      "relative w-9 h-5 rounded-full shrink-0",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      anyEnabled
                        ? "bg-[#FF3B06] focus-visible:ring-[#FF3B06]/30"
                        : "bg-slate-200 focus-visible:ring-slate-400/30",
                      readonly ? "cursor-default opacity-50" : "cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white",
                        "shadow-[0_1px_3px_rgba(0,0,0,0.20)]",
                        "transition-transform duration-150",
                        anyEnabled ? "translate-x-[19px]" : "translate-x-[3px]"
                      )}
                    />
                  </button>

                  {/* Module name */}
                  <span
                    className="text-sm font-medium text-slate-700 w-32 shrink-0"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {MODULE_LABELS[mod]}
                  </span>

                  {/* Action chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => {
                      const active = hasAction(permissions, mod, action);
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleToggleAction(mod, action, !active)}
                          disabled={readonly}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all duration-100",
                            active
                              ? "bg-[#003B49] border-[#003B49] text-white"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500",
                            readonly && "cursor-default"
                          )}
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {ACTION_LABELS[action] ?? action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
