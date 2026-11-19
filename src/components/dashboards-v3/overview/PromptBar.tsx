"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { draftFromPrompt, EXAMPLE_PROMPTS, type DashboardDraft, type DraftResult } from "@/lib/dashboards-v3/ai-draft";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { isOwn, useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";
import { DraftPreview } from "./DraftPreview";
import { PromptComposer } from "./PromptComposer";

const SUGGESTIONS = ["Swaps by station in Nairobi this month", "Revenue by service for the last 90 days", "Battery inventory by state and batteries needing service"];
const INPUT_ID = "dashboard-prompt";
/** How long the sandbox pretends to think, so the drafting state can be seen. */
const DRAFT_MS = 900;

type Status =
  | { kind: "idle" }
  | { kind: "drafting" }
  | { kind: "ask"; prompt: string; result: Extract<DraftResult, { kind: "ask" }> }
  | { kind: "none"; prompt: string }
  | { kind: "draft"; prompt: string; draft: DashboardDraft };

/**
 * "Describe the dashboard you need": a mocked draft from the words typed.
 * Sandbox only, with no AI and no API: drafts come from matching words to
 * the metric catalogue. Nothing is saved until Create dashboard from this,
 * Open in editor, or Add to dashboard (its widgets, onto one of yours).
 */
export function PromptBar() {
  const router = useRouter();
  const create = useDashboardsV3((s) => s.create);
  const dashboards = useDashboardsV3((s) => s.dashboards);
  const own = dashboards.filter(isOwn);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recent = useDashboardsV3((s) => s.recentPrompts);
  const addRecentPrompt = useDashboardsV3((s) => s.addRecentPrompt);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function run(prompt: string, chosenMetricId?: string) {
    const p = prompt.trim();
    if (!p) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus({ kind: "drafting" });
    timer.current = setTimeout(() => {
      const result = draftFromPrompt(p, chosenMetricId);
      if (result.kind === "ask") setStatus({ kind: "ask", prompt: p, result });
      else if (result.kind === "none") setStatus({ kind: "none", prompt: p });
      else setStatus({ kind: "draft", prompt: p, draft: result.draft });
    }, DRAFT_MS);
  }

  /** A prompt sent from the composer, or an example picked after nothing matched: remembered for Recent, then drafted. */
  function send(p: string) {
    setText(p);
    addRecentPrompt(p);
    run(p);
  }

  function save(then: "view" | "edit") {
    if (status.kind !== "draft") return;
    const d = status.draft;
    const newId = create({
      name: d.name,
      category: d.category,
      visibility: d.visibility,
      description: `Drafted from “${status.prompt}”`.slice(0, 160),
      widgets: d.widgets,
      filters: { range: d.range, country: d.country, regions: d.regions },
    });
    toast.success("Dashboard created", `“${d.name.trim()}” is in Your dashboards.`);
    router.push(then === "edit" ? `/dashboards-v3/${newId}?edit=1` : `/dashboards-v3/${newId}`);
  }

  function addTo(target: Dashboard) {
    if (status.kind !== "draft") return;
    const n = status.draft.widgets.length;
    if (!useDashboardsV3.getState().addWidgetsTo(target.id, status.draft.widgets)) {
      toast.error("Couldn’t add the widgets", `“${target.name}” doesn’t have room for ${n}.`);
      return;
    }
    toast.success(`Added ${n} widget${n === 1 ? "" : "s"}`, `They’re on “${target.name}”.`);
    router.push(`/dashboards-v3/${target.id}`);
  }

  return (
    <section aria-label="Draft a dashboard" className="w-full">
      <PromptComposer
        text={text}
        onText={setText}
        inputId={INPUT_ID}
        suggestions={SUGGESTIONS}
        recent={recent}
        busy={status.kind === "drafting"}
        onSend={send}
      />

      <div aria-live="polite">
        {status.kind === "drafting" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-zeno-teal" aria-hidden /> Drafting your dashboard…
          </p>
        )}

        {status.kind === "ask" && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">{status.result.question}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {status.result.options.map((o) => (
                <Button key={o.metricId} variant="outline" size="sm" onClick={() => run(status.prompt, o.metricId)}>{o.label}</Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStatus({ kind: "idle" })}>Cancel</Button>
            </div>
          </div>
        )}

        {status.kind === "none" && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <SearchX className="h-4 w-4 text-slate-500" aria-hidden />
              I couldn’t match “{status.prompt}” to anything we track.
            </p>
            <p className="mt-1 text-xs text-slate-600">Name a metric, like swaps, top-ups, battery health or new riders. Or try one of these:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700 hover:border-zeno-teal hover:text-zeno-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {status.kind === "draft" && (
          <DraftPreview
            draft={status.draft}
            onChange={(draft) => setStatus({ ...status, draft })}
            onCreate={save}
            own={own}
            onAddTo={addTo}
            onDiscard={() => { setStatus({ kind: "idle" }); document.getElementById(INPUT_ID)?.focus(); }}
          />
        )}
      </div>
    </section>
  );
}
