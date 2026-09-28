import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, title: string, detail?: string) => string;
  dismiss: (id: string) => void;
}

let seq = 0;

/**
 * Every action in the app used to commit in silence: a row changed somewhere
 * below the fold and nothing said so. Actions report their outcome here.
 *
 * Keep the wording the same as the control that triggered it, past tense:
 * "Approve" produces "Approved". Errors say what happened and what to do next.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, title, detail) => {
    const id = `t${++seq}`;
    set((s) => ({ toasts: [...s.toasts, { id, tone, title, detail }].slice(-4) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Call outside React too, so store actions can report their own outcome. */
export const toast = {
  success: (title: string, detail?: string) => useToastStore.getState().push("success", title, detail),
  error:   (title: string, detail?: string) => useToastStore.getState().push("error", title, detail),
  info:    (title: string, detail?: string) => useToastStore.getState().push("info", title, detail),
};
