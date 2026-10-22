import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { AuthError, requireDeveloper, writeAudit } from "@/lib/auth";
import { EngineError } from "@/lib/engine";
import { DEFAULT_SETTINGS, type PlatformConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";
const booleanKeys = ["registrationEnabled", "tradingEnabled", "marketOrdersEnabled", "limitOrdersEnabled", "maintenanceMode"] as const;
const numberKeys = ["maxOrderValueUsd", "minDepositEgp", "egpPerUsd", "activationCodeHours"] as const;

export async function PATCH(request: Request) {
  try {
    const developer = await requireDeveloper();
    const body = await request.json() as Partial<Record<keyof PlatformConfig, unknown>>;
    const updates: Array<{ key: string; value: string }> = [];
    for (const key of booleanKeys) if (typeof body[key] === "boolean") updates.push({ key, value: String(body[key]) });
    for (const key of numberKeys) {
      if (body[key] === undefined) continue;
      const value = Number(body[key]);
      const maximum = key === "activationCodeHours" ? 720 : 100000000;
      if (!Number.isFinite(value) || value <= 0 || value > maximum) throw new EngineError(`قيمة ${key} غير صالحة.`);
      updates.push({ key, value: String(value) });
    }
    if (!updates.length) throw new EngineError("لا توجد إعدادات جديدة للحفظ.");
    await db.transaction(async (tx) => {
      for (const update of updates) {
        if (!(update.key in DEFAULT_SETTINGS)) throw new EngineError("إعداد غير معروف.");
        await tx.insert(platformSettings).values({ ...update, updatedBy: developer.id, updatedAt: new Date() })
          .onConflictDoUpdate({ target: platformSettings.key, set: { value: update.value, updatedBy: developer.id, updatedAt: new Date() } });
      }
    });
    await writeAudit({ actorId: developer.id, action: "settings.updated", targetType: "settings", details: updates.map((item) => `${item.key}=${item.value}`).join("، ") });
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ الإعدادات" }, { status });
  }
}
