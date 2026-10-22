import type { Instrument } from "@/lib/markets";

export function formatPrice(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMoney(value: number, decimals = 2): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${formatPrice(Math.abs(value), decimals)}`;
}

export function formatEgp(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ج.م`;
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatDate(value: string, withTime = true): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Cairo",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function feeRateFor(instrument: Instrument): number {
  if (instrument.category === "crypto") return 0.001;
  if (instrument.category === "forex") return 0.0002;
  if (instrument.category === "etf") return 0.00025;
  return 0.0005;
}

export function estimatedFee(notional: number, instrument: Instrument): number {
  return Math.max(0.01, notional * feeRateFor(instrument));
}

export function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = typeof value === "string" && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
}
