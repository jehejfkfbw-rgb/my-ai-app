import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, depositRequests, ledger } from "@/db/schema";
import { AuthError, requireDeveloper, writeAudit } from "@/lib/auth";
import { EngineError } from "@/lib/engine";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const developer = await requireDeveloper();
    const body = await request.json() as { id?: unknown; action?: unknown; note?: unknown };
    const id = Number(body.id);
    const action = String(body.action ?? "");
    const note = String(body.note ?? "").trim();
    if (!Number.isInteger(id) || !["approve", "reject"].includes(action)) throw new EngineError("بيانات المراجعة غير صالحة.");
    if (action === "reject" && note.length < 4) throw new EngineError("اكتب سبب الرفض ليظهر للمستخدم.");
    const config = await getSettings();
    const result = await db.transaction(async (tx) => {
      const [deposit] = await tx.select().from(depositRequests).where(eq(depositRequests.id, id)).for("update");
      if (!deposit || deposit.status !== "pending") throw new EngineError("الطلب ليس قيد المراجعة.", 409);
      const [account] = await tx.select().from(accounts).where(eq(accounts.id, deposit.accountId)).for("update");
      if (!account) throw new EngineError("حساب المستخدم غير موجود.", 404);
      if (action === "reject") {
        await tx.update(depositRequests).set({ status: "rejected", note, reviewedBy: developer.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(depositRequests.id, id));
        return { status: "rejected", creditedUsd: 0 };
      }
      const creditedUsd = Math.round((deposit.amountEgp / config.egpPerUsd) * 100) / 100;
      if (creditedUsd <= 0) throw new EngineError("قيمة الاعتماد غير صالحة؛ راجع سعر التحويل.");
      const cashAfter = account.cash + creditedUsd;
      await tx.update(accounts).set({ cash: cashAfter, netDeposits: account.netDeposits + creditedUsd, updatedAt: new Date() }).where(eq(accounts.id, account.id));
      await tx.update(depositRequests).set({ status: "approved", creditedUsd, note: note || "تمت مطابقة التحويل واعتماده بواسطة المطور", reviewedBy: developer.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(depositRequests.id, id));
      await tx.insert(ledger).values({ accountId: account.id, type: "deposit", amount: creditedUsd, balanceAfter: cashAfter, description: `اعتماد تحويل محفظة ${deposit.walletNumber} — ${deposit.amountEgp} EGP`, reference: `DEP-${id}` });
      return { status: "approved", creditedUsd };
    });
    await writeAudit({ actorId: developer.id, action: `deposit.${action}`, targetType: "deposit", targetId: String(id), details: action === "approve" ? `اعتماد ${result.creditedUsd} USD لطلب DEP-${id}` : `رفض DEP-${id}: ${note}` });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر مراجعة الطلب" }, { status });
  }
}
