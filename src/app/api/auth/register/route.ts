import { db } from "@/db";
import { users, accounts, watchlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { accountIdFor, AuthError, createSession, ensureDeveloper, hashPassword, toSafeUser, writeAudit } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDeveloper();
    const config = await getSettings();
    if (!config.registrationEnabled || config.maintenanceMode) throw new AuthError("إنشاء الحسابات متوقف مؤقتاً.", 503);
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (name.length < 2 || name.length > 80) throw new AuthError("اكتب الاسم الكامل بين 2 و80 حرفاً.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 255) throw new AuthError("أدخل بريداً إلكترونياً صالحاً.", 400);
    if (password.length < 8 || password.length > 128) throw new AuthError("كلمة المرور يجب أن تكون من 8 إلى 128 خانة.", 400);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) throw new AuthError("هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.", 409);
    const passwordHash = await hashPassword(password);
    const user = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({ name, email, passwordHash, role: "user", status: "pending" }).onConflictDoNothing().returning();
      if (!created) throw new AuthError("هذا البريد مسجل بالفعل.", 409);
      const accountId = accountIdFor(created.id);
      await tx.insert(accounts).values({ id: accountId, userId: created.id, name: `محفظة ${created.name}`, cash: 0, netDeposits: 0 });
      await tx.insert(watchlist).values(["NVDA", "AAPL", "BTCUSD", "XAUUSD"].map((symbol) => ({ accountId, symbol })));
      return created;
    });
    await createSession(user.id, "pending");
    await writeAudit({ actorId: user.id, action: "user.registered", targetType: "user", targetId: user.id, details: `تسجيل حساب جديد باسم ${user.name}` });
    return Response.json({ ok: true, user: toSafeUser(user) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إنشاء الحساب" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
