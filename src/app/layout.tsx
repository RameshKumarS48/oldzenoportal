import type { Metadata } from "next";
import { Geist, Geist_Mono, Work_Sans } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
// Serial numbers, RFIDs, phone numbers and session clocks only line up in a
// monospace face; `font-mono` resolves to this via the --font-mono theme token.
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Zeno Dashboard",
  description: "Centralized KPI and analytics dashboard for Zeno",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${workSans.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
