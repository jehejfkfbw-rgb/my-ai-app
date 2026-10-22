import "server-only";

import { db } from "@/db";
import { platformSettings } from "@/db/schema";

export interface PlatformConfig {
  registrationEnabled: boolean;
  tradingEnabled: boolean;
  marketOrdersEnabled: boolean;
  limitOrdersEnabled: boolean;
  maintenanceMode: boolean;
  maxOrderValueUsd: number;
  minDepositEgp: number;
  egpPerUsd: number;
  activationCodeHours: number;
}

export const DEFAULT_SETTINGS: Record<keyof PlatformConfig, string> = {
  registrationEnabled: "true",
  tradingEnabled: "true",
  marketOrdersEnabled: "true",
  limitOrdersEnabled: "true",
  maintenanceMode: "false",
  maxOrderValueUsd: "250000",
  minDepositEgp: "50",
  egpPerUsd: "50",
  activationCodeHours: "72",
};

let ready: Promise<void> | null = null;

export async function ensureSettings() {
  if (!ready) {
    ready = db.insert(platformSettings).values(
      Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
    ).onConflictDoNothing().then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}

export async function getSettings(): Promise<PlatformConfig> {
  await ensureSettings();
  const rows = await db.select().from(platformSettings);
  const values = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in values) values[row.key as keyof PlatformConfig] = row.value;
  }
  const boolean = (key: keyof PlatformConfig) => values[key] === "true";
  const number = (key: keyof PlatformConfig, fallback: number) => {
    const parsed = Number(values[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    registrationEnabled: boolean("registrationEnabled"),
    tradingEnabled: boolean("tradingEnabled"),
    marketOrdersEnabled: boolean("marketOrdersEnabled"),
    limitOrdersEnabled: boolean("limitOrdersEnabled"),
    maintenanceMode: boolean("maintenanceMode"),
    maxOrderValueUsd: Math.max(1, number("maxOrderValueUsd", 250000)),
    minDepositEgp: Math.max(1, number("minDepositEgp", 50)),
    egpPerUsd: Math.max(0.01, number("egpPerUsd", 50)),
    activationCodeHours: Math.min(720, Math.max(1, number("activationCodeHours", 72))),
  };
}
