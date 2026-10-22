import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { depositRequests } from "@/db/schema";
import { accountIdFor, AuthError, requireActiveUser } from "@/lib/auth";
import { EngineError, ensureAccount } from "@/lib/engine";
import { getSettings } from "@/lib/settings";
import { WALLET_NUMBERS } from "@/lib/wallets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();
    await ensureAccount(user.id);
    const accountId = accountIdFor(user.id);
    const config = await getSettings();
    const body = await request.json() as Record<string, unknown>;
    const amountEgp = Number(body.amountEgp);
    const walletNumber = String(body.walletNumber ?? "").replace(/\s/g, "");
    const senderNumber = String(body.senderNumber ?? "").replace(/\s/g, "");
    const transferReference = String(body.transferReference ?? "").trim();
    if (!Number.isFinite(amountEgp) || amountEgp < config.minDepositEgp || amountEgp > 1_000_000) throw new EngineError(`المبلغ يجب ألا يقل عن ${config.minDepositEgp} جنيه.`);
    if (!WALLET_NUMBERS.includes(walletNumber as typeof WALLET_NUMBERS[number])) throw new EngineError("اختر أحد رقمي المحفظة الموضحين.");
    if (!/^01[0125][0-9]{8}$/.test(senderNumber)) throw new EngineError("أدخل رقم المحفظة المُرسِلة من 11 رقماً.");
    if (transferReference.length < 6 || transferReference.length > 80) throw new EngineError("أدخل رقم عملية صالحاً.");
    const duplicate = await db.select({ id: depositRequests.id }).from(depositRequests).where(eq(depositRequests.transferReference, transferReference)).limit(1);
    if (duplicate[0]) throw new EngineError("رقم العملية مسجل بالفعل.", 409);
    const [created] = await db.insert(depositRequests).values({
      accountId, amountEgp, walletNumber, senderNumber, transferReference, status: "pending",
      note: "بانتظار مراجعة المطور؛ لم يُضف رصيد بعد",
    }).returning();
    return Response.json({ ok: true, request: created }, { status: 201 });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تسجيل الطلب" }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireActiveUser();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new EngineError("رقم الطلب غير صالح.");
    const [updated] = await db.update(depositRequests).set({ status: "cancelled", note: "ألغاه صاحب الحساب", updatedAt: new Date() })
      .where(and(eq(depositRequests.id, id), eq(depositRequests.accountId, accountIdFor(user.id)), eq(depositRequests.status, "pending"))).returning();
    if (!updated) throw new EngineError("لا يمكن إلغاء الطلب في حالته الحالية.", 409);
    return Response.json({ ok: true, request: updated });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إلغاء الطلب" }, { status });
  }
}
