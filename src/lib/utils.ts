import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 0): string {
  if (value === 0) return "–";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (value === 0) return "–";
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number, currency = "KES"): string {
  if (value === 0) return "–";
  return `${currency} ${new Intl.NumberFormat("en-US").format(Math.round(value))}`;
}

export function formatVariance(value: number): string {
  if (value === 0) return "–";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}`;
}
