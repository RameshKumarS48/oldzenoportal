import type { Metadata } from "next";
import { Geist, Work_Sans } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Zeno Dashboard",
  description: "Centralized KPI and analytics dashboard for Zeno",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${workSans.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
