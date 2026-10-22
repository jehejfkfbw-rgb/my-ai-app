import { requireDeveloper, AuthError } from "@/lib/auth";
import { getAdminOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireDeveloper();
    return Response.json(await getAdminOverview(), { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "غير مصرح" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
