import { MapPin } from "lucide-react";

export function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-slate-100 rounded-xl border border-slate-200 min-h-[400px] ${className ?? ""}`}
    >
      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-500">Map view coming soon</p>
      <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
        Live vehicle locations will appear here once map integration is enabled.
      </p>
    </div>
  );
}
