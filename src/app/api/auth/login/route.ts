import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AuthError, createSession, ensureDeveloper, toSafeUser, verifyPassword } from "@/lib/auth";
import { ensureAccount } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDeveloper();
    const body = await request.json() as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new AuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401);
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) throw new AuthError("الحساب مقفل مؤقتاً بسبب محاولات متكررة. حاول بعد 15 دقيقة.", 429);
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      await db.update(users).set({
        failedAttempts: attempts >= 5 ? 0 : attempts,
        lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
      throw new AuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401);
    }
    if (user.status === "suspended") throw new AuthError("هذا الحساب موقوف. تواصل مع إدارة المنصة.", 403);
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    if (user.status === "active") await ensureAccount(user.id);
    await createSession(user.id, user.status === "active" ? "active" : "pending");
    return Response.json({ ok: true, user: toSafeUser({ ...user, lastLoginAt: new Date() }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تسجيل الدخول" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
