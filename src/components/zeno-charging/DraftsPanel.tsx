"use client";

import { useState } from "react";
import Link from "next/link";
import { FileClock, Trash2 } from "lucide-react";
import { SECTIONS } from "@/lib/charging/fields";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/store/toast";
import { deleteDraft, useDrafts, type ChargingDraft } from "./api";

const STEP_TITLES = [...SECTIONS.map((s) => s.title), "Review"];

const draftName = (d: ChargingDraft) => d.values.assetName?.trim() || d.values.siteName?.trim() || "Untitled draft";

function savedAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * New assets saved to finish later. Continue reopens the form at the step it
 * was saved on; adding the asset removes the draft.
 */
export function DraftsPanel() {
  const drafts = [...useDrafts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [deleting, setDeleting] = useState<ChargingDraft | null>(null);
  if (drafts.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 shrink-0">
      <h2 className="flex items-center gap-2 border-b border-amber-200/70 px-4 py-2 text-xs font-semibold text-amber-900">
        <FileClock className="h-3.5 w-3.5" /> Drafts · {drafts.length}
        <span className="font-normal text-amber-800/80">Charging assets you started and haven’t added yet</span>
      </h2>
      <ul className="max-h-40 divide-y divide-amber-200/60 overflow-auto">
        {drafts.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-800">{draftName(d)}</span>
              <span className="text-xs text-slate-500">
                {d.values.assetType || "Type not set"} · Step {d.step + 1} of {STEP_TITLES.length}: {STEP_TITLES[d.step]} · Saved {savedAgo(d.updatedAt)} by {d.createdBy}
              </span>
            </span>
            <Link href={`/zeno-charging/new?draft=${encodeURIComponent(d.id)}`} className="rounded-lg bg-zeno-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zeno-red-hover">Continue</Link>
            <button type="button" onClick={() => setDeleting(d)} aria-label={`Delete draft ${draftName(d)}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-100 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <ConfirmModal
        open={!!deleting}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) { deleteDraft(deleting.id); toast.success("Draft deleted", draftName(deleting)); } setDeleting(null); }}
      >
        “{deleting ? draftName(deleting) : ""}” and everything entered in it will be removed. This can’t be undone.
      </ConfirmModal>
    </section>
  );
}
