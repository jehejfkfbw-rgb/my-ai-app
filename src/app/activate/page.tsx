import { redirect } from "next/navigation";
import { ActivationScreen } from "@/components/ActivationScreen";
import { getCurrentUser, toSafeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ActivatePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.status === "active" && current.session.scope === "active") redirect(current.user.role === "developer" ? "/developer" : "/platform");
  if (current.user.status !== "pending") redirect("/login");
  return <ActivationScreen user={toSafeUser(current.user)} />;
}
