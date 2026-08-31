"use client";

import { useState, useMemo } from "react";
import { Search, Download, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditStore } from "@/store/audit";
import type { AuditLog } from "@/store/audit";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  auth: "Auth",
  dashboards: "Dashboards",
  reports: "Reports",
  vehicles: "Vehicles",
  batteries: "Batteries",
  swap_stations: "Swap Stations",
  fast_chargers: "Fast Chargers",
  customers: "Customers",
  transactions: "Transactions",
  provisioning: "Provisioning",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
};

const ACTION_COLORS: Record<string, string> = {
  "auth.login": "bg-slate-100 text-slate-500",
  "auth.logout": "bg-slate-100 text-slate-500",
  "record.create": "bg-emerald-50 text-emerald-700",
  "record.update": "bg-blue-50 text-blue-700",
  "record.delete": "bg-red-50 text-red-700",
  "record.bulk_upload": "bg-purple-50 text-purple-700",
  "record.bulk_delete": "bg-red-50 text-red-700",
  "dashboard.create": "bg-emerald-50 text-emerald-700",
  "dashboard.update": "bg-blue-50 text-blue-700",
  "dashboard.delete": "bg-red-50 text-red-700",
  "report.export": "bg-sky-50 text-sky-700",
  "report.schedule": "bg-sky-50 text-sky-700",
  "report.create": "bg-emerald-50 text-emerald-700",
  "user.create": "bg-emerald-50 text-emerald-700",
  "user.update": "bg-blue-50 text-blue-700",
  "user.delete": "bg-red-50 text-red-700",
  "user.invite": "bg-purple-50 text-purple-700",
  "role.create": "bg-emerald-50 text-emerald-700",
  "role.update": "bg-blue-50 text-blue-700",
  "permission.change": "bg-amber-50 text-amber-700",
  "provisioning.create": "bg-emerald-50 text-emerald-700",
  "provisioning.update": "bg-blue-50 text-blue-700",
  "settings.update": "bg-orange-50 text-orange-700",
};

const ROLE_COLORS: Record<string, string> = {
  "Super Admin": "bg-[#FF3B06]/10 text-[#FF3B06]",
  Admin: "bg-[#003B49]/10 text-[#003B49]",
  User: "bg-slate-100 text-slate-600",
};

const ALL_MODULES = Object.keys(MODULE_LABELS);
const ALL_ACTIONS = Object.keys(ACTION_COLORS);

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DiffRow({ label, prev, next }: { label: string; prev?: unknown; next?: unknown }) {
  return (
    <div className="text-xs">
      <span className="font-medium text-slate-500">{label}:</span>{" "}
      {prev !== undefined && (
        <span className="line-through text-red-500 mr-1">{JSON.stringify(prev)}</span>
      )}
      {next !== undefined && (
        <span className="text-emerald-600">{JSON.stringify(next)}</span>
      )}
    </div>
  );
}

function ExpandedRow({ log }: { log: AuditLog }) {
  const prevKeys = log.previousValue ? Object.keys(log.previousValue) : [];
  const newKeys = log.newValue ? Object.keys(log.newValue) : [];
  const allKeys = [...new Set([...prevKeys, ...newKeys])];

  if (allKeys.length === 0 && !log.ipAddress) return null;

  return (
    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
      {allKeys.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Changes</p>
          <div className="space-y-1">
            {allKeys.map((k) => (
              <DiffRow
                key={k}
                label={k}
                prev={log.previousValue?.[k]}
                next={log.newValue?.[k]}
              />
            ))}
          </div>
        </div>
      )}
      {(log.entityId || log.ipAddress) && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Details</p>
          <div className="space-y-1 text-xs text-slate-500">
            {log.entityId && <div><span className="font-medium">Entity ID:</span> {log.entityId}</div>}
            {log.ipAddress && <div><span className="font-medium">IP Address:</span> {log.ipAddress}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function exportCSV(logs: AuditLog[]) {
  const headers = ["Timestamp", "User", "Email", "Role", "Action", "Module", "Entity", "Summary", "IP"];
  const rows = logs.map((l) => [
    l.timestamp, l.userName, l.userEmail, l.userRole, l.action,
    l.module, l.entityId ?? "", l.summary, l.ipAddress ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const { logs } = useAuditStore();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (moduleFilter && l.module !== moduleFilter) return false;
      if (actionFilter && l.action !== actionFilter) return false;
      if (roleFilter && l.userRole !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.summary.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.userEmail.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.entityId ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, moduleFilter, actionFilter, roleFilter]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasFilters = moduleFilter || actionFilter || roleFilter;

  return (
    <AdminGuard>
      <Topbar
        title="Audit Logs"
        actions={
          <Button size="sm" variant="ghost-dark" onClick={() => exportCSV(filtered)} className="ml-4">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        }
      />
      <main className="flex-1 overflow-hidden flex flex-col bg-zeno-bg">

        {/* Search + filter bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, action, entity…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasFilters && "border-[#003B49] text-[#003B49]")}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasFilters && <span className="ml-1 w-4 h-4 bg-[#003B49] text-white rounded-full text-[10px] flex items-center justify-center">
              {[moduleFilter, actionFilter, roleFilter].filter(Boolean).length}
            </span>}
          </Button>
          <p className="text-sm text-slate-400 ml-auto">{filtered.length} entries</p>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
            >
              <option value="">All Modules</option>
              {ALL_MODULES.map((m) => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
            >
              <option value="">All Actions</option>
              {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20"
            >
              <option value="">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => { setModuleFilter(""); setActionFilter(""); setRoleFilter(""); }}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Summary</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                    No audit log entries match your filters
                  </td>
                </tr>
              )}
              {filtered.map((log) => {
                const isExpanded = expanded.has(log.id);
                const hasDiff = log.previousValue || log.newValue || log.ipAddress;
                return (
                  <>
                    <tr
                      key={log.id}
                      className={cn(
                        "group transition-colors",
                        hasDiff ? "cursor-pointer hover:bg-slate-50" : ""
                      )}
                      onClick={() => hasDiff && toggleExpand(log.id)}
                    >
                      <td className="pl-3 py-3">
                        {hasDiff ? (
                          isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                        {formatTs(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{log.userName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", ROLE_COLORS[log.userRole] ?? "bg-slate-100 text-slate-500")}>
                            {log.userRole}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-mono font-semibold", ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600")}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {MODULE_LABELS[log.module] ?? log.module}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {log.summary}
                        {log.entityId && (
                          <span className="ml-2 text-[10px] font-mono text-slate-400">{log.entityId}</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-expanded`}>
                        <td colSpan={6} className="p-0">
                          <ExpandedRow log={log} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </AdminGuard>
  );
}
