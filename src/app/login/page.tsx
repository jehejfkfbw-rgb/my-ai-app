import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current?.user.status === "pending") redirect("/activate");
  if (current?.user.status === "active" && current.session.scope === "active") redirect(current.user.role === "developer" ? "/developer" : "/platform");
  return <AuthScreen mode="login" />;
}
