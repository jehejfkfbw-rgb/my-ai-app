import { AuthError, requireActiveUser } from "@/lib/auth";
import { cancelOrder, EngineError, placeOrder } from "@/lib/engine";
import type { OrderKind, OrderSide, TimeInForce } from "@/lib/trading-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();
    const body = await request.json() as Record<string, unknown>;
    const order = await placeOrder(user.id, {
      symbol: typeof body.symbol === "string" ? body.symbol.toUpperCase() : "",
      side: body.side as OrderSide,
      kind: body.kind as OrderKind,
      quantity: Number(body.quantity),
      limitPrice: body.limitPrice === null || body.limitPrice === undefined || body.limitPrice === "" ? undefined : Number(body.limitPrice),
      timeInForce: (body.timeInForce ?? "GTC") as TimeInForce,
    });
    return Response.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إرسال الأمر" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser();
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new EngineError("رقم الأمر غير صالح.");
    const order = await cancelOrder(user.id, id);
    return Response.json({ ok: true, order });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إلغاء الأمر" }, { status });
  }
}
