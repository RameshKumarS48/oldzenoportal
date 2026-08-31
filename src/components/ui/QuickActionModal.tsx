"use client";
import { X, Lock, Unlock, RefreshCw, MapPin } from "lucide-react";
import type { Vehicle } from "@/store/vehicles";

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function QuickActionModal({ vehicle, onClose }: Props) {
  if (!vehicle) return null;

  const actions = [
    { label: "Immobilise", icon: Lock, desc: "Remotely lock the vehicle motor controller" },
    { label: "Mobilise", icon: Unlock, desc: "Restore mobility after immobilisation" },
    { label: "Request Diagnostics", icon: RefreshCw, desc: "Trigger a full telemetry snapshot upload" },
    { label: "Locate", icon: MapPin, desc: "Request current GPS coordinates" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
              Quick Actions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{vehicle.vin} · {vehicle.plate}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="space-y-2">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={() => {
                window.alert(`${a.label}: ${vehicle.vin}`);
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#003B49] hover:bg-slate-50 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#003B49]/10 flex items-center justify-center shrink-0">
                <a.icon className="w-4 h-4 text-slate-500 group-hover:text-[#003B49]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{a.label}</div>
                <div className="text-[11px] text-slate-400">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
