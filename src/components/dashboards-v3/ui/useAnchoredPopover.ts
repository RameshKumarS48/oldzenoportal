"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A popover fixed beside its button, so a scrolling column (the widget
 * panel) never clips it. It opens below the button, or above when there's
 * no room, kept inside the window. Escape (wire `onKeyDown` to the panel), a
 * click outside or scrolling the page close it; Escape and choosing give
 * focus back to the button.
 */
export function useAnchoredPopover<B extends HTMLElement = HTMLButtonElement>({ width, height = 320 }: { width?: number; height?: number } = {}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const button = useRef<B>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  function show() {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const w = width ?? r.width;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const top = r.bottom + 4 + height > window.innerHeight && r.top - 4 - height > 0 ? r.top - 4 - height : r.bottom + 4;
    setPos({ top, left, width: w });
  }
  function close(returnFocus = true) {
    setPos(null);
    if (returnFocus) button.current?.focus();
  }
  const toggle = () => (open ? close() : show());
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setPos(null);
    };
    // Scrolling anything but the popover's own list moves the button away from it.
    const scrolled = (e: Event) => { if (!panel.current?.contains(e.target as Node)) setPos(null); };
    const resized = () => setPos(null);
    document.addEventListener("mousedown", away);
    window.addEventListener("scroll", scrolled, true);
    window.addEventListener("resize", resized);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("resize", resized);
    };
  }, [open]);

  const style: React.CSSProperties | undefined = pos ? { position: "fixed", top: pos.top, left: pos.left, width: pos.width } : undefined;
  return { open, button, panel, show, close, toggle, onKeyDown, style };
}
