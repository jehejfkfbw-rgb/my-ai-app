import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activationCodes, sessions, users } from "@/db/schema";
import { activationHash, AuthError, getCurrentUser, toSafeUser, writeAudit } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current || current.session.scope !== "pending" || current.user.status !== "pending") throw new AuthError("لا يوجد حساب بانتظار التفعيل في هذه الجلسة.", 401);
    const body = await request.json() as { code?: unknown };
    const code = String(body.code ?? "").trim();
    if (!/^\d{4}$/.test(code)) throw new AuthError("أدخل الكود المكوّن من أربعة أرقام.", 400);
    const [record] = await db.select().from(activationCodes).where(eq(activationCodes.userId, current.user.id)).limit(1);
    if (!record || record.status !== "active") throw new AuthError("لا يوجد كود نشط. اطلب كوداً جديداً من إدارة المنصة.", 400);
    if (record.expiresAt.getTime() <= Date.now()) throw new AuthError("انتهت صلاحية الكود. اطلب كوداً جديداً.", 400);
    if (record.attempts >= 5) throw new AuthError("تم إيقاف الكود بعد محاولات غير صحيحة.", 429);
    if (activationHash(current.user.id, code) !== record.codeHash) {
      const attempts = record.attempts + 1;
      await db.update(activationCodes).set({ attempts, status: attempts >= 5 ? "disabled" : "active" }).where(eq(activationCodes.id, record.id));
      throw new AuthError("الكود غير صحيح. تحقق من الأرقام وحاول مجدداً.", 400);
    }
    const activated = await db.transaction(async (tx) => {
      const [user] = await tx.update(users).set({ status: "active", updatedAt: new Date() }).where(and(eq(users.id, current.user.id), eq(users.status, "pending"))).returning();
      if (!user) throw new AuthError("تغيّرت حالة الحساب؛ سجّل الدخول مجدداً.", 409);
      await tx.update(activationCodes).set({ status: "used", usedAt: new Date(), attempts: 0 }).where(eq(activationCodes.id, record.id));
      await tx.update(sessions).set({ scope: "active", lastUsedAt: new Date() }).where(eq(sessions.userId, current.user.id));
      return user;
    });
    await writeAudit({ actorId: activated.id, action: "user.activated", targetType: "user", targetId: activated.id, details: "تم تفعيل الحساب بكود صحيح" });
    return Response.json({ ok: true, user: toSafeUser(activated) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تفعيل الحساب" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
