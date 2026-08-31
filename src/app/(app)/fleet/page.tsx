"use client";

import Link from "next/link";
import { Bike, BatteryMedium, Zap, Plug, Map, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useVehiclesStore } from "@/store/vehicles";
import { useBatteriesStore } from "@/store/batteries";

const FLEET_SECTIONS = [
  {
    href: "/data/vehicles",
    label: "Vehicles",
    description: "Active fleet, VINs, status, and assignments",
    icon: Bike,
    color: "bg-[#003B49]/10 text-[#003B49]",
  },
  {
    href: "/data/batteries",
    label: "Batteries",
    description: "Battery inventory, state of charge, and swap history",
    icon: BatteryMedium,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/data/swap-stations",
    label: "Swap Stations",
    description: "Swap station locations, capacity, and availability",
    icon: Zap,
    color: "bg-amber-50 text-amber-700",
  },
  {
    href: "/data/fast-chargers",
    label: "Fast Chargers",
    description: "Fast charger locations and utilisation",
    icon: Plug,
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    href: "/data/map",
    label: "Fleet Map",
    description: "Live map view of vehicles and infrastructure",
    icon: Map,
    color: "bg-rose-50 text-rose-700",
  },
];

export default function FleetPage() {
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const batteries = useBatteriesStore((s) => s.batteries);

  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const inService      = batteries.filter((b) => b.status === "active_network").length;

  return (
    <>
      <Topbar title="Fleet" />
      <main className="flex-1 overflow-y-auto bg-zeno-bg p-6 space-y-6">

        <StatGrid>
          <StatCard label="Total Vehicles"  value={vehicles.length}  />
          <StatCard label="Active Vehicles" value={activeVehicles}   valueColor="text-emerald-600" />
          <StatCard label="Batteries"       value={batteries.length} valueColor="text-zeno-teal" />
          <StatCard label="In Service"      value={inService}        valueColor="text-indigo-600" />
        </StatGrid>

        {/* Section links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Fleet Sections</h2>
          <div className="grid grid-cols-2 gap-4">
            {FLEET_SECTIONS.map(({ href, label, description, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#003B49]/30 hover:shadow-sm transition-all group flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700 text-sm" style={{ fontFamily: "var(--font-display)" }}>{label}</p>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#003B49] transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          For fleet provisioning (onboarding vehicles, batteries, swap stations), see the Provisioning section in the sidebar.
        </p>
      </main>
    </>
  );
}
