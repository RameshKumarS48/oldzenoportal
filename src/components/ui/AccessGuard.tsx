"use client";

import { ShieldCheck } from "lucide-react";
import { useAccess, MODULE_LABELS } from "@/lib/access";
import type { AccessModule } from "@/lib/access";

/**
 * Route guard for dome's five tabs. Hiding a nav link isn't enough — a user who
 * types the URL must be refused too, so every gated page wraps its body in this.
 */
export function AccessGuard({
  module,
  children,
}: {
  module: AccessModule;
  children: React.ReactNode;
}) {
  const { canView, roleName } = useAccess();

  if (!canView(module)) {
    return (
      <main className="flex-1 flex items-center justify-center bg-zeno-bg">
        <div className="text-center max-w-sm px-6">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-700 mb-1">Access Denied</h2>
          <p className="text-sm text-slate-500">
            {MODULE_LABELS[module]} isn&apos;t available to the{" "}
            <span className="font-medium text-slate-600">{roleName}</span> role.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
