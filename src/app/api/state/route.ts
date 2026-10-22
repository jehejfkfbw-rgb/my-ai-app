import { AuthError, requireActiveUser } from "@/lib/auth";
import { EngineError, getDashboardState } from "@/lib/engine";
import { isChartRange } from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const rangeValue = searchParams.get("range");
    const state = await getDashboardState(user.id, searchParams.get("symbol") ?? "NVDA", isChartRange(rangeValue) ? rangeValue : "1D");
    return Response.json(state, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const status = error instanceof AuthError || error instanceof EngineError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تحميل الحساب" }, { status });
  }
}
