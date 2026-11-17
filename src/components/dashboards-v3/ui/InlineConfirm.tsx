"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * A confirmation that takes the place of a modal's or panel's footer, so a
 * second dialog never opens on top. Focus moves to Keep editing, the safe
 * choice; the question labels the group so it's read out with it.
 */
export function InlineConfirm({
  question, detail, onDiscard, onKeep, discardLabel = "Discard",
}: {
  question: string;
  detail?: string;
  onDiscard: () => void;
  onKeep: () => void;
  discardLabel?: string;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    keep.current?.focus();
  }, []);

  return (
    <div role="group" aria-labelledby={`${id}-q`} aria-describedby={detail ? `${id}-d` : undefined} className="flex w-full flex-wrap items-center gap-2">
      <div className="mr-auto min-w-0">
        <p id={`${id}-q`} className="text-sm font-semibold text-slate-800">{question}</p>
        {detail && <p id={`${id}-d`} className="text-xs text-slate-600">{detail}</p>}
      </div>
      <Button variant="ghost" onClick={onDiscard} className="text-red-700 hover:bg-red-50">{discardLabel}</Button>
      <Button ref={keep} variant="teal" onClick={onKeep}>Keep editing</Button>
    </div>
  );
}
