import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.status === "pending") redirect("/activate");
  if (current.user.status === "active" && current.session.scope === "active") redirect(current.user.role === "developer" ? "/developer" : "/platform");
  redirect("/login");
}
