"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";
import { autoTitle, dashFilterFor, getRecord, measureDefinition } from "@/lib/dashboards/registry";
import { cardSpan } from "@/lib/dashboards/rules";
import { effectiveView } from "@/lib/dashboards/shape";
import { rangeText } from "@/lib/dashboards/time";
import type { QueryContext } from "@/lib/dashboards/query";
import type { Card } from "@/lib/dashboards/types";
import { cn } from "@/lib/utils";
import { useQuery, useRegistry, type Me } from "./api";
import { CardBody, Message } from "./CardBody";
import { Menu, type MenuItem } from "./Menu";

const SPAN = { 1: "", 2: "sm:col-span-2", 4: "sm:col-span-2 lg:col-span-4" } as const;

/** One card on a dashboard: its heading, its view, and the few things that can be done with it. */
export function CardFrame({ card, ctx, me, menu, onRemove }: { card: Card; ctx: QueryContext; me: Me; menu: MenuItem[]; onRemove?: () => void }) {
  const registry = useRegistry();
  const allowed = me.canViewCard(card);
  const query = useQuery(card, ctx, allowed);
  const span = cardSpan(registry, card);
  const view = effectiveView(registry, card);
  const record = getRecord(registry, card.measures[0]?.record ?? card.steps?.[0]?.record);
  const title = card.title?.trim() || autoTitle(registry, card);
  const definition = card.kind === "chart" && card.measures[0] ? card.measures.map((m) => measureDefinition(registry, m)).filter(Boolean).join(" ") : "";
  // Dashboard filters this card's data has no field for.
  const skipped = record && card.kind !== "note" ? ctx.filters.filter((f) => !dashFilterFor(registry, record.id, f)).map((f) => f.name) : [];
  const tall = card.kind === "note" ? "" : span === 1 ? "h-44" : span === 4 ? "h-96" : "h-80";

  return (
    <section className={cn("flex flex-col rounded-xl border border-slate-200 bg-white p-4", SPAN[span], tall)} aria-label={title || "Note"}>
      <header className="mb-2 flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          {title && <h2 className="truncate text-sm font-semibold text-slate-800" title={title}>{title}{definition && <InfoTip content={definition} className="ml-1.5 align-middle" placement="bottom" />}</h2>}
          {card.time.range && card.kind !== "note" && <p className="text-[11px] text-slate-400">{rangeText(card.time.range, ctx.today)}</p>}
        </div>
        <Menu label={`Actions for ${title || "this note"}`} items={menu} />
      </header>
      <div className="dash-viz min-h-0 flex-1">
        {!allowed ? (
          <Message><Lock className="mx-auto mb-1.5 h-4 w-4 text-slate-300" />You don’t have access to this data.</Message>
        ) : query.status === "loading" ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" aria-label="Loading" />
        ) : (
          <CardBody card={card} view={view} result={query.result} compareLabel={card.time.compare === "year" ? "vs a year earlier" : "vs the period before"} onRetry={query.retry} onRemove={onRemove} />
        )}
      </div>
      {(skipped.length > 0 || (record?.page && card.kind === "records")) && (
        <footer className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>{skipped.length > 0 && allowed ? `${skipped.join(" and ")} ${skipped.length > 1 ? "filters don’t" : "filter doesn’t"} apply to this card.` : ""}</span>
          {record?.page && card.kind === "records" && allowed && <Link href={record.page} className="shrink-0 font-medium text-zeno-teal hover:underline">Open {record.name}</Link>}
        </footer>
      )}
    </section>
  );
}
