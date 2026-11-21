"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { copyPath, existingCopies, existingCopyText } from "@/lib/dashboards-v3/templates";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { useDashboardsV3 } from "@/store/dashboards-v3";

/** Room the prompt needs below its button before it opens above instead. */
const ROOM_BELOW = 150;

/**
 * "Duplicate to customise", the same from every place it's offered: if you
 * already have a copy of the template, a prompt beside the button offers it
 * first; otherwise, or on "Make another copy", the template opens as an
 * unsaved copy in edit mode. Render `prompt` wherever the hook is used.
 */
export function useCustomise() {
  const router = useRouter();
  const [asking, setAsking] = useState<{ template: Dashboard; copy: Dashboard; anchor: HTMLElement | null } | null>(null);

  function begin(template: Dashboard) {
    useDashboardsV3.getState().startCopy(template.id);
    router.push(copyPath(template.id));
  }

  /** `anchor` is the button that asked; after a ⋯ menu closes, focus is back on its button, so it defaults to that. */
  function customise(template: Dashboard, anchor?: HTMLElement | null) {
    const [copy] = existingCopies(template.id, useDashboardsV3.getState().dashboards);
    if (!copy) { begin(template); return; }
    setAsking({ template, copy, anchor: anchor ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null) });
  }

  const prompt = asking && (
    <ExistingCopyPopover
      anchor={asking.anchor}
      copy={asking.copy}
      onOpen={() => { setAsking(null); router.push(`/dashboards-v3/${asking.copy.id}`); }}
      onAnother={() => { setAsking(null); begin(asking.template); }}
      onClose={() => setAsking(null)}
    />
  );
  return { customise, begin, prompt };
}

/** The prompt's words and buttons; Open it is the primary choice and takes focus. */
export function ExistingCopyNotice({ copy, onOpen, onAnother, className }: { copy: Dashboard; onOpen: () => void; onAnother: () => void; className?: string }) {
  const open = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    open.current?.focus();
  }, []);
  return (
    <div role="group" aria-labelledby={id} className={className}>
      <p id={id} className="text-sm text-slate-700">{existingCopyText(copy)}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onAnother}>Make another copy</Button>
        <Button ref={open} variant="teal" size="sm" onClick={onOpen}>Open it</Button>
      </div>
    </div>
  );
}

/** The prompt as a small popover beside the button that asked. Escape or a click away closes it, and focus goes back to the button. */
function ExistingCopyPopover({
  anchor, copy, onOpen, onAnother, onClose,
}: { anchor: HTMLElement | null; copy: Dashboard; onOpen: () => void; onAnother: () => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos] = useState(() => {
    const r = anchor?.getBoundingClientRect();
    if (!r) return { top: 80, right: 24 };
    const right = Math.max(8, window.innerWidth - r.right);
    return r.bottom + ROOM_BELOW > window.innerHeight ? { bottom: window.innerHeight - r.top + 6, right } : { top: r.bottom + 6, right };
  });

  useEffect(() => {
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !anchor?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", away);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  const dismiss = () => { onClose(); anchor?.focus(); };
  return (
    <div
      ref={box}
      role="dialog"
      aria-label="You already have a copy"
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); dismiss(); } }}
      style={{ position: "fixed", ...pos }}
      className="z-[60] w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
    >
      <ExistingCopyNotice copy={copy} onOpen={onOpen} onAnother={onAnother} />
    </div>
  );
}
