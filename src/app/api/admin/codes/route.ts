import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activationCodes, users } from "@/db/schema";
import { activationHash, AuthError, requireDeveloper, writeAudit } from "@/lib/auth";
import { EngineError } from "@/lib/engine";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const developer = await requireDeveloper();
    const { userId } = await request.json() as { userId?: string };
    if (!userId) throw new EngineError("المستخدم مطلوب.");
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.role !== "user") throw new EngineError("المستخدم غير موجود.", 404);
    if (user.status !== "pending") throw new EngineError("لا يمكن إنشاء كود إلا لحساب بانتظار التفعيل.");
    const config = await getSettings();
    const code = randomInt(0, 10000).toString().padStart(4, "0");
    const expiresAt = new Date(Date.now() + config.activationCodeHours * 3600000);
    await db.insert(activationCodes).values({ userId, codeHash: activationHash(userId, code), status: "active", attempts: 0, expiresAt, usedAt: null })
      .onConflictDoUpdate({ target: activationCodes.userId, set: { codeHash: activationHash(userId, code), status: "active", attempts: 0, expiresAt, usedAt: null, createdAt: new Date() } });
    await writeAudit({ actorId: developer.id, action: "activation.generated", targetType: "user", targetId: userId, details: `إنشاء كود تفعيل للمستخدم ${user.name}؛ لم يُحفظ الكود الصريح` });
    return Response.json({ ok: true, code, expiresAt, user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إنشاء الكود" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const developer = await requireDeveloper();
    const { userId } = await request.json() as { userId?: string };
    if (!userId) throw new EngineError("المستخدم مطلوب.");
    const [updated] = await db.update(activationCodes).set({ status: "disabled" }).where(eq(activationCodes.userId, userId)).returning();
    if (!updated) throw new EngineError("لا يوجد كود لهذا المستخدم.", 404);
    await writeAudit({ actorId: developer.id, action: "activation.disabled", targetType: "user", targetId: userId, details: "تعطيل كود التفعيل الحالي" });
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تعطيل الكود" }, { status });
  }
}
