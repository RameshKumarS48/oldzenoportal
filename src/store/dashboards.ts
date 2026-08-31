"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRESET_DASHBOARDS, INITIAL_CUSTOM_DASHBOARDS } from "@/lib/mock/dashboards";
import type { Dashboard, Widget, ShareTarget } from "@/lib/mock/dashboards";

export interface ShareNotification {
  id: string;
  dashboardId: string;
  dashboardTitle: string;
  fromUserId: string;
  fromUserName: string;
  sharedWith: ShareTarget;
  sharedAt: string;
}

export interface PublishOptions {
  visibility: "private" | "shared";
  sharedWith?: ShareTarget;
}

interface DashboardsState {
  presets: Dashboard[];
  custom: Dashboard[];
  received: Dashboard[];
  notifications: ShareNotification[];
  presetOverrides: Record<string, Widget[]>;
  createDashboard: (
    title: string,
    description: string,
    ownerId: string,
    ownerName?: string,
    publishOptions?: PublishOptions
  ) => Dashboard;
  deleteDashboard: (id: string) => void;
  addWidget: (dashboardId: string, widget: Omit<Widget, "id">) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  updateWidgetLayout: (dashboardId: string, layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  addWidgetToPreset: (presetId: string, widget: Omit<Widget, "id">) => void;
  removeWidgetFromPreset: (presetId: string, widgetId: string) => void;
  getDashboard: (id: string) => Dashboard | undefined;
  dismissNotification: (id: string) => void;
}

export const useDashboardsStore = create<DashboardsState>()(
  persist(
    (set, get) => ({
      presets: PRESET_DASHBOARDS,
      custom: INITIAL_CUSTOM_DASHBOARDS,
      received: [],
      notifications: [],
      presetOverrides: {},

      createDashboard: (title, description, ownerId, ownerName, publishOptions) => {
        const visibility = publishOptions?.visibility ?? "private";
        const sharedWith = publishOptions?.sharedWith;
        const now = new Date().toISOString();

        const dash: Dashboard = {
          id: `custom-${Date.now()}`,
          title,
          description,
          type: "custom",
          ownerId,
          ownerName,
          widgets: [],
          createdAt: now,
          updatedAt: now,
          visibility,
          sharedWith: visibility === "shared" ? sharedWith : undefined,
          sharedAt: visibility === "shared" ? now : undefined,
        };

        const updates: Partial<DashboardsState> = {
          custom: [...get().custom, dash],
        };

        if (visibility === "shared" && sharedWith) {
          const notification: ShareNotification = {
            id: `notif-${Date.now()}`,
            dashboardId: dash.id,
            dashboardTitle: title,
            fromUserId: ownerId,
            fromUserName: ownerName ?? ownerId,
            sharedWith,
            sharedAt: now,
          };
          updates.received = [...get().received, { ...dash }];
          updates.notifications = [...get().notifications, notification];
        }

        set(updates as DashboardsState);
        return dash;
      },

      deleteDashboard: (id) =>
        set((s) => ({ custom: s.custom.filter((d) => d.id !== id) })),

      addWidget: (dashboardId, widgetData) => {
        const widget: Widget = { ...widgetData, id: `w-${Date.now()}` };
        set((s) => ({
          custom: s.custom.map((d) =>
            d.id === dashboardId
              ? { ...d, widgets: [...d.widgets, widget], updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      removeWidget: (dashboardId, widgetId) =>
        set((s) => ({
          custom: s.custom.map((d) =>
            d.id === dashboardId
              ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId), updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      updateWidgetLayout: (dashboardId, layouts) =>
        set((s) => ({
          custom: s.custom.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) => {
                    const l = layouts.find((l) => l.id === w.id);
                    return l ? { ...w, ...l } : w;
                  }),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        })),

      addWidgetToPreset: (presetId, widgetData) => {
        const widget: Widget = { ...widgetData, id: `pw-${Date.now()}`, x: 0, y: 0 };
        set((s) => ({
          presetOverrides: {
            ...s.presetOverrides,
            [presetId]: [...(s.presetOverrides[presetId] ?? []), widget],
          },
        }));
      },

      removeWidgetFromPreset: (presetId, widgetId) =>
        set((s) => ({
          presetOverrides: {
            ...s.presetOverrides,
            [presetId]: (s.presetOverrides[presetId] ?? []).filter((w) => w.id !== widgetId),
          },
        })),

      getDashboard: (id) => {
        const { presets, custom, received } = get();
        return [...presets, ...custom, ...received].find((d) => d.id === id);
      },

      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
    }),
    {
      name: "zeno-dashboards",
      partialize: (s) => ({
        custom: s.custom,
        received: s.received,
        notifications: s.notifications,
        presetOverrides: s.presetOverrides,
      }),
    }
  )
);
