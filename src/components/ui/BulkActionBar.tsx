"use client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Action {
  label: string;
  variant?: "primary" | "danger" | "secondary";
  onClick: () => void;
}

interface Props {
  count: number;
  actions: Action[];
  onClear: () => void;
}

export function BulkActionBar({ count, actions, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#003B49] text-white text-sm">
      <button onClick={onClear} className="p-0.5 rounded hover:bg-white/10 transition-colors">
        <X className="w-3.5 h-3.5 text-white/60" />
      </button>
      <span className="font-medium text-white/90">{count} selected</span>
      <div className="flex items-center gap-2 ml-2">
        {actions.map(a => (
          <Button
            key={a.label}
            size="sm"
            variant={a.variant === "danger" ? "danger" : a.variant === "secondary" ? "secondary" : "primary"}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
