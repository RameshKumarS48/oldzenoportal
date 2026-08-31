"use client";

import { useState, useRef, useCallback } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  content: string;
  className?: string;
  placement?: "right" | "left" | "top" | "bottom";
}

export function InfoTip({ content, className, placement = "right" }: InfoTipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({ x: cx, y: cy });
  }, []);

  if (!content) return null;

  const tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 9999, width: 256, pointerEvents: "none" };
  if (pos) {
    if (placement === "right")  { tooltipStyle.left = pos.x + 10; tooltipStyle.top = pos.y; tooltipStyle.transform = "translateY(-50%)"; }
    if (placement === "left")   { tooltipStyle.right = window.innerWidth - pos.x + 10; tooltipStyle.top = pos.y; tooltipStyle.transform = "translateY(-50%)"; }
    if (placement === "top")    { tooltipStyle.left = pos.x; tooltipStyle.bottom = window.innerHeight - pos.y + 8; tooltipStyle.transform = "translateX(-50%)"; }
    if (placement === "bottom") { tooltipStyle.left = pos.x; tooltipStyle.top = pos.y + 10; tooltipStyle.transform = "translateX(-50%)"; }
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span
        ref={iconRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setPos(null)}
        className="text-slate-400 hover:text-blue-500 cursor-help transition-colors inline-flex"
      >
        <Info className="w-3.5 h-3.5" />
      </span>
      {pos && (
        <span
          style={tooltipStyle}
          className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl leading-relaxed whitespace-normal"
        >
          {content}
        </span>
      )}
    </span>
  );
}
