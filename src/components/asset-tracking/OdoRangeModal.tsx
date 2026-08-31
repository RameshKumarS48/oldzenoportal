"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (from: number | null, to: number | null) => void;
  initialFrom: number | null;
  initialTo: number | null;
}

export function OdoRangeModal({ open, onClose, onApply, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom !== null ? String(initialFrom) : "");
  const [to, setTo] = useState(initialTo !== null ? String(initialTo) : "");

  function handleApply() {
    const f = from.trim() === "" ? null : Number(from);
    const t = to.trim() === "" ? null : Number(to);
    onApply(f, t);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Select Odo Range (0 → ∞)">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">From</label>
            <input
              type="number"
              min={0}
              placeholder="EX - 0"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-100 border-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zeno-teal/30"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">To</label>
            <input
              type="number"
              min={0}
              placeholder="EX - 200"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-100 border-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zeno-teal/30"
            />
          </div>
        </div>
        <Button variant="teal" onClick={handleApply} className="w-full py-3">
          Apply Range
        </Button>
      </div>
    </Modal>
  );
}
