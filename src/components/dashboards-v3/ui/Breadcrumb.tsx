"use client";

import { Fragment } from "react";
import Link from "next/link";
import { listOf } from "@/lib/dashboards-v3/templates";
import type { Dashboard } from "@/lib/dashboards-v3/types";

const LINK = "rounded hover:text-slate-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

export interface Crumb {
  label: string;
  /** Unset for the current page, the last crumb. */
  href?: string;
}

/** "Dashboards / Your dashboards": the overview, then the list a dashboard is in. */
export function dashboardCrumbs(d: Dashboard): Crumb[] {
  const list = listOf(d);
  return [
    { label: "Dashboards", href: "/dashboards-v3?list=1" },
    { label: list.label, href: `/dashboards-v3?list=1&view=${list.view}` },
  ];
}

/**
 * The small muted trail above a page's title, every part but the current
 * page a link. `onNavigate` can stop a link to ask first (unsaved changes).
 */
export function Breadcrumb({ items, onNavigate }: { items: Crumb[]; onNavigate?: (href: string, e: React.MouseEvent) => void }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
        {items.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && <li aria-hidden>/</li>}
            <li className="min-w-0 truncate">
              {c.href ? (
                <Link href={c.href} onClick={(e) => onNavigate?.(c.href!, e)} className={LINK}>{c.label}</Link>
              ) : (
                <span aria-current="page" className="text-slate-600">{c.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
