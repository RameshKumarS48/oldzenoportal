"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { METRICS } from "@/lib/dashboards-v3/catalogue";
import { cn } from "@/lib/utils";

/** Lines the input grows to before it scrolls. */
const MAX_LINES = 3;
const LINE_PX = 20;
const SHOWN = 3;

interface Option {
  id: string;
  /** What's sent when it's picked. */
  text: string;
  kind: "suggestion" | "recent" | "match" | "asTyped";
}

/** Suggestions, recent prompts and metric names that contain the typed text, recent first, three at most. */
function matchesFor(typed: string, suggestions: string[], recent: string[]): string[] {
  const q = typed.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...recent, ...suggestions, ...METRICS.map((m) => m.name)]) {
    const key = c.toLowerCase();
    if (seen.has(key) || key === q || !key.includes(q)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === SHOWN) break;
  }
  return out;
}

/** The text with the part that matches the typed text in bold. */
function Highlight({ text, typed }: { text: string; typed: string }) {
  const q = typed.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold text-slate-900">{text.slice(at, at + q.length)}</strong>
      {text.slice(at + q.length)}
    </>
  );
}

/**
 * The chat-style input for drafting a dashboard: a pill with a sparkle, a
 * round send button, and a dropdown of suggestions under it.
 *
 * Empty and focused, the dropdown offers "Try asking" and "Recent"; while
 * typing, up to three matches with the match in bold, and always a last row
 * to draft the text as typed. It's an ARIA combobox: ↑ ↓ move through the
 * options, Enter picks one (or sends the text when none is highlighted),
 * Shift+Enter adds a line, Escape or clicking away closes the dropdown.
 */
export function PromptComposer({
  inputId, text, onText, suggestions, recent, busy, onSend,
}: {
  /** The input's id, so the page can put focus back in it. */
  inputId: string;
  text: string;
  onText: (t: string) => void;
  suggestions: string[];
  recent: string[];
  /** A draft is on its way: sending waits. */
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const setText = onText;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const typed = text.trim();

  // Grows with its text up to three lines, then scrolls.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, LINE_PX * MAX_LINES)}px`;
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const groups = useMemo((): { label?: string; options: Option[] }[] => {
    if (!typed) {
      return [
        { label: "Try asking", options: suggestions.map((s, i) => ({ id: `${id}-s${i}`, text: s, kind: "suggestion" as const })) },
        { label: "Recent", options: recent.slice(0, SHOWN).map((r, i) => ({ id: `${id}-r${i}`, text: r, kind: "recent" as const })) },
      ].filter((g) => g.options.length > 0);
    }
    return [
      {
        options: [
          ...matchesFor(typed, suggestions, recent).map((m, i) => ({ id: `${id}-m${i}`, text: m, kind: "match" as const })),
          { id: `${id}-typed`, text: typed, kind: "asTyped" as const },
        ],
      },
    ];
  }, [typed, suggestions, recent, id]);
  const options = groups.flatMap((g) => g.options);
  const activeOption = open && active >= 0 ? options[active] : undefined;

  function send(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    setText(v);
    setOpen(false);
    setActive(-1);
    onSend(v);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(e.key === "ArrowDown" ? 0 : options.length - 1); return; }
      // Positions run from -1 (the input itself) to the last option, and wrap.
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => {
        const next = a + step;
        return next >= options.length ? -1 : next < -1 ? options.length - 1 : next;
      });
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(activeOption ? activeOption.text : text);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const empty = typed === "";
  const showList = open && options.length > 0;

  return (
    <div ref={box} className="relative w-full">
      <div
        className={cn(
          // 44px tall on one line; the sparkle and Send stay on the last line as it grows.
          "flex min-h-11 items-end gap-2 rounded-3xl border bg-white py-1 pl-4 pr-1 transition-colors",
          "border-slate-300 focus-within:border-zeno-teal focus-within:ring-2 focus-within:ring-zeno-teal/20"
        )}
      >
        <Sparkles className="mb-2 h-4 w-4 shrink-0 text-zeno-teal" aria-hidden />
        <textarea
          ref={input}
          id={inputId}
          rows={1}
          value={text}
          role="combobox"
          aria-label="Ask for a dashboard"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
          placeholder="Ask for a dashboard, e.g. swaps by station this month"
          maxLength={200}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{ lineHeight: `${LINE_PX}px` }}
          className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="button"
          aria-label="Send"
          aria-disabled={empty || busy}
          onClick={() => send(text)}
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
            empty || busy ? "cursor-default bg-slate-100 text-slate-400" : "bg-zeno-teal text-white hover:bg-zeno-teal-hover"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {showList && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <ul id={listId} role="listbox" aria-label="Suggestions" className="py-1">
            {groups.map((g, gi) => (
              <li key={g.label ?? gi} role="presentation">
                {g.label && (
                  <p id={`${id}-g${gi}`} className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">{g.label}</p>
                )}
                <ul role="group" aria-labelledby={g.label ? `${id}-g${gi}` : undefined}>
                  {g.options.map((o) => {
                    const i = options.indexOf(o);
                    return (
                      <li
                        key={o.id}
                        id={o.id}
                        role="option"
                        aria-selected={i === active}
                        // Keep focus in the input: picking happens on mouse down.
                        onMouseDown={(e) => { e.preventDefault(); send(o.text); }}
                        onMouseEnter={() => setActive(i)}
                        className={cn("cursor-pointer px-3 py-2 text-sm text-slate-700", i === active && "bg-slate-100")}
                      >
                        {o.kind === "asTyped" ? (
                          <span>Draft “<span className="font-medium text-slate-900">{o.text}</span>” as typed</span>
                        ) : (
                          <Highlight text={o.text} typed={o.kind === "match" ? typed : ""} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Drafts are matched to the metric list. Nothing is saved until you create it.
          </p>
        </div>
      )}
    </div>
  );
}
