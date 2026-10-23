import { BellRing } from "lucide-react";
import { fmtEat } from "@/lib/pricing/format";

/** What riders at the plan's stations receive, and when it goes out. */
export function NotificationPreview({
  text,
  leadHours,
  effectiveFrom,
}: {
  text: string;
  leadHours: number;
  effectiveFrom?: string;
}) {
  const valid = effectiveFrom && !Number.isNaN(new Date(effectiveFrom).getTime());
  const sendAt = valid ? new Date(new Date(effectiveFrom).getTime() - leadHours * 3600_000).toISOString() : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <BellRing className="w-3.5 h-3.5" />
        SMS and app notification to riders
        {sendAt && <span className="text-slate-400">· sends {fmtEat(sendAt)}</span>}
      </div>
      <div className="mt-2 max-w-sm rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 shadow-sm">
        <p className="text-[10px] font-semibold text-zeno-teal mb-0.5">Zeno</p>
        {text.trim() || <span className="text-slate-400">The message riders will receive</span>}
      </div>
    </div>
  );
}
