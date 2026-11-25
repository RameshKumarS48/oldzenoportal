"use client";

/** The one search box: records, their number fields and named metrics, paged. */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchRegistry, type SearchItem } from "@/lib/dashboards/search";
import { cn } from "@/lib/utils";
import { useRegistry, type Me } from "../api";

const SECTIONS: [SearchItem["kind"], string][] = [["record", "Records"], ["number", "Numbers"], ["metric", "Metrics"]];

export function RegistrySearch({ me, only, placeholder, onPick, autoFocus = true }: {
  me: Me;
  /** Records only, for funnel steps, flows and retention. */
  only?: "record";
  placeholder: string;
  onPick: (item: SearchItem) => void;
  autoFocus?: boolean;
}) {
  const registry = useRegistry();
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const result = useMemo(() => {
    const items: SearchItem[] = [];
    let hasMore = false;
    for (let page = 0; page < pages; page++) {
      const r = searchRegistry(registry, query, { page, pageSize: 12, canView: me.canViewRecord, only });
      items.push(...r.items);
      hasMore = r.hasMore;
    }
    return { items, hasMore };
  }, [registry, query, pages, me.canViewRecord, only]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input autoFocus={autoFocus} value={query} onChange={(e) => { setQuery(e.target.value); setPages(1); }} placeholder={placeholder} aria-label={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20" />
      </div>
      <div className="mt-2 max-h-[46vh] overflow-auto rounded-lg border border-slate-200">
        {SECTIONS.map(([kind, heading]) => {
          const items = result.items.filter((i) => i.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind}>
              {(query.trim() !== "" && !only) && <p className="sticky top-0 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{heading}</p>}
              {items.map((item) => (
                <button key={item.key} type="button" onClick={() => onPick(item)} className={cn("flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none")}>
                  <span className="truncate text-sm text-slate-800">{item.label}</span>
                  {!only && <span className="shrink-0 text-[11px] text-slate-400">{item.sub}</span>}
                </button>
              ))}
            </div>
          );
        })}
        {!result.items.length && <p className="px-3 py-3 text-xs text-slate-500">Nothing matches “{query.trim()}”.</p>}
        {result.hasMore && <button type="button" onClick={() => setPages((n) => n + 1)} className="w-full border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-zeno-teal hover:bg-slate-50">Show more</button>}
      </div>
    </div>
  );
}
