import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { accountIdFor, AuthError, requireActiveUser } from "@/lib/auth";
import { EngineError, ensureAccount } from "@/lib/engine";
import { getInstrument } from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();
    await ensureAccount(user.id);
    const accountId = accountIdFor(user.id);
    const body = await request.json() as { symbol?: unknown };
    const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
    if (!getInstrument(symbol)) throw new EngineError("الأداة غير موجودة.", 404);
    const existing = await db.select().from(watchlist).where(and(eq(watchlist.accountId, accountId), eq(watchlist.symbol, symbol))).limit(1);
    if (existing[0]) {
      await db.delete(watchlist).where(eq(watchlist.id, existing[0].id));
      return Response.json({ ok: true, watched: false, symbol });
    }
    await db.insert(watchlist).values({ accountId, symbol }).onConflictDoNothing();
    return Response.json({ ok: true, watched: true, symbol });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تحديث المراقبة" }, { status });
  }
}
