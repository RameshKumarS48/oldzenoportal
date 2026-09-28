"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useThemeStore } from "@/store/theme";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  // globals.css defines the whole dark palette under `.dark`, but nothing was
  // ever putting that class on the document — so the toggle flipped state and
  // changed nothing. This is the missing half.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
