import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, activationCodes, ledger, sessions, users } from "@/db/schema";
import { accountIdFor, AuthError, requireDeveloper, writeAudit } from "@/lib/auth";
import { EngineError, ensureAccount } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const developer = await requireDeveloper();
    const body = await request.json() as Record<string, unknown>;
    const userId = String(body.userId ?? "");
    const action = String(body.action ?? "");
    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target || target.role !== "user") throw new EngineError("المستخدم غير موجود أو لا يمكن تعديله.", 404);
    if (["activate", "suspend", "restore"].includes(action)) {
      const status = action === "suspend" ? "suspended" : "active";
      await db.transaction(async (tx) => {
        await tx.update(users).set({ status, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, userId));
        if (action === "suspend") await tx.delete(sessions).where(eq(sessions.userId, userId));
        else {
          await tx.update(sessions).set({ scope: "active" }).where(eq(sessions.userId, userId));
          await tx.update(activationCodes).set({ status: "used", usedAt: new Date() }).where(eq(activationCodes.userId, userId));
        }
      });
      await writeAudit({ actorId: developer.id, action: `user.${action}`, targetType: "user", targetId: userId, details: `${action === "suspend" ? "إيقاف" : "تفعيل"} الحساب بواسطة المطور` });
      return Response.json({ ok: true, status });
    }
    if (action === "adjustBalance") {
      const amount = Number(body.amount);
      const reason = String(body.reason ?? "").trim();
      if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) throw new EngineError("أدخل مبلغ تسوية صالحاً.");
      if (reason.length < 5 || reason.length > 180) throw new EngineError("اكتب سبباً واضحاً للتسوية من 5 إلى 180 حرفاً.");
      await ensureAccount(userId);
      const accountId = accountIdFor(userId);
      const result = await db.transaction(async (tx) => {
        const [account] = await tx.select().from(accounts).where(eq(accounts.id, accountId)).for("update");
        const cashAfter = account.cash + amount;
        if (cashAfter < 0) throw new EngineError("لا يمكن أن يصبح الرصيد النقدي سالباً.");
        await tx.update(accounts).set({ cash: cashAfter, netDeposits: Math.max(0, account.netDeposits + amount), updatedAt: new Date() }).where(eq(accounts.id, accountId));
        const reference = `ADM-${Date.now()}`;
        await tx.insert(ledger).values({ accountId, type: "adjustment", amount, balanceAfter: cashAfter, description: `تسوية إدارية: ${reason}`, reference });
        return { cashAfter, reference };
      });
      await writeAudit({ actorId: developer.id, action: "account.adjusted", targetType: "user", targetId: userId, details: `${reason} — ${amount} USD — ${result.reference}` });
      return Response.json({ ok: true, ...result });
    }
    throw new EngineError("الإجراء غير معروف.");
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تنفيذ الإجراء" }, { status });
  }
}
