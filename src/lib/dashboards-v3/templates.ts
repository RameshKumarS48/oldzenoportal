/**
 * Zeno templates are read-only: anyone can view them, change the filters for
 * a visit, export them or duplicate them, but only a copy can be changed.
 * Pure, so the rules can be checked without a browser.
 */
import { formatDistanceStrict, parseISO } from "date-fns";
import { categoryName } from "./catalogue";
import { fmtDate } from "./dates";
import type { Dashboard, Widget } from "./types";

/** Only your own dashboards can be edited, renamed, shared or deleted: never a template, never one shared with you. */
export function canEdit(d: Dashboard): boolean {
  return !d.isTemplate && d.owner === null;
}

/** What a dashboard opened with `?edit=1` gets: edit mode only if it can be edited; otherwise view mode, with the URL put right. */
export function openMode(d: Dashboard, editParam: string | null): { mode: "view" | "edit"; redirect: boolean } {
  const asked = editParam === "1";
  if (asked && !canEdit(d)) return { mode: "view", redirect: true };
  return { mode: asked ? "edit" : "view", redirect: false };
}


/** The template a copy was made from, if it's still there. */
export function basedOn(d: Dashboard, all: Dashboard[]): Dashboard | undefined {
  return d.basedOnTemplateId ? all.find((t) => t.id === d.basedOnTemplateId && t.isTemplate) : undefined;
}

/** Where "Duplicate to customise" opens: an unsaved copy of the template, in edit mode. */
export const copyPath = (templateId: string) => `/dashboards-v3/copy/${templateId}`;

/** When a dashboard was last edited: its last saved change, or when it was created. */
export const lastEdited = (d: Dashboard) => d.updatedAt ?? d.createdAt;

/** Your dashboards copied from this template, most recently edited first. */
export function existingCopies(templateId: string, all: Dashboard[]): Dashboard[] {
  return all
    .filter((d) => d.basedOnTemplateId === templateId && canEdit(d))
    .sort((a, b) => lastEdited(b).localeCompare(lastEdited(a)));
}

/** "You already have Month-end revenue review (copy), last edited 18 Nov 2026." */
export const existingCopyText = (copy: Dashboard) => `You already have ${copy.name}, last edited ${fmtDate(parseISO(lastEdited(copy)))}.`;

/**
 * An unsaved copy of a template, for the editor: yours, only you can see it,
 * the template's category and filters, its widgets with new ids, no
 * description of its own. Nothing is stored until Save.
 */
export function copyDraftOf(template: Dashboard, newWidgetId: () => string): Dashboard {
  const widgets: Widget[] = template.widgets.map((w) => {
    const copy = { ...w, id: newWidgetId() };
    delete copy.mockError;
    return copy;
  });
  return {
    id: `copy-of-${template.id}`,
    name: `${template.name} (copy)`,
    category: template.category,
    visibility: "private",
    owner: null,
    isTemplate: false,
    filters: { ...template.filters, regions: [...template.filters.regions] },
    widgets,
    createdAt: new Date().toISOString(),
    lastViewedAt: null,
    basedOnTemplateId: template.id,
  };
}

/** "just now", "3 hours ago", "2 days ago". */
export function editedAgo(iso: string, now: number): string {
  const t = parseISO(iso).getTime();
  return now - t < 60_000 ? "just now" : `${formatDistanceStrict(t, now)} ago`;
}

/** Which list a dashboard belongs to, for the breadcrumb: the overview view and its name. */
export function listOf(d: Dashboard): { view: "templates" | "mine" | "shared"; label: string } {
  if (d.isTemplate) return { view: "templates", label: "Zeno templates" };
  if (d.owner !== null) return { view: "shared", label: "Shared with you" };
  return { view: "mine", label: "Your dashboards" };
}

/**
 * The muted line under a dashboard's name, without the "Based on" link
 * (added after it where there is one):
 * template: Revenue and billing · Finance team · Reviewed 3 Nov 2026;
 * yours: Revenue and billing · Only you · Edited 2 days ago (or Not saved yet);
 * shared: Revenue and billing · Shared by Finance team · Edited 6 days ago.
 */
export function headerMeta(d: Dashboard, now: number, unsaved = false): string[] {
  const parts = [categoryName(d.category)];
  if (d.isTemplate) {
    if (d.template) parts.push(d.template.ownerTeam, `Reviewed ${fmtDate(parseISO(d.template.lastReviewed))}`);
    return parts;
  }
  parts.push(d.owner !== null ? `Shared by ${d.owner}` : d.visibility === "team" ? "Team" : "Only you");
  parts.push(unsaved ? "Not saved yet" : `Edited ${editedAgo(lastEdited(d), now)}`);
  return parts;
}
