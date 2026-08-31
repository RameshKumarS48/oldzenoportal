"use client";
import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface Props {
  columns: { key: string; label: string }[];
  visible: Set<string>;
  onChange: (visible: Set<string>) => void;
  storageKey?: string;
}

export function ColumnFilterPanel({ columns, visible, onChange, storageKey }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(visible));
  const [saved, setSaved] = useState(false);

  // Sync draft when panel opens
  useEffect(() => {
    if (open) {
      setDraft(new Set(visible));
      setSaved(false);
    }
  }, [open]);

  const toggle = (key: string) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = () => {
    onChange(draft);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify([...draft])); } catch {}
    }
    setSaved(true);
    setTimeout(() => setOpen(false), 320);
  };

  const handleCancel = () => {
    setDraft(new Set(visible));
    setOpen(false);
  };

  const dirty = [...draft].sort().join() !== [...visible].sort().join();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={handleCancel} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-lg w-48 overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Columns</span>
              <button onClick={handleCancel}>
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <div className="px-2 pb-2 space-y-0.5 max-h-72 overflow-y-auto">
              {columns.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.has(col.key)}
                    onChange={() => toggle(col.key)}
                    className="accent-[#FF3B06]"
                  />
                  <span className="text-xs text-slate-600">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100">
              <button
                onClick={handleCancel}
                className="flex-1 text-xs font-medium text-slate-500 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#003B49] text-white hover:bg-[#004d5e]"
              >
                {saved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
