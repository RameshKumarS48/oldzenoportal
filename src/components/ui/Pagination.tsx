"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  perPageOptions?: number[];
}

export function Pagination({ total, page, perPage, onPage, onPerPage, perPageOptions = [25, 50, 100] }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-white text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
          className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 focus:outline-none"
        >
          {perPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span>{start}–{end} of {total.toLocaleString()}</span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className={cn("p-1 rounded hover:bg-slate-100 transition-colors", page <= 1 && "opacity-30 cursor-not-allowed")}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-medium text-slate-700">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className={cn("p-1 rounded hover:bg-slate-100 transition-colors", page >= totalPages && "opacity-30 cursor-not-allowed")}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
