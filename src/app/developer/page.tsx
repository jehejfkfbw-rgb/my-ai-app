import { redirect } from "next/navigation";
import { DeveloperDashboard } from "@/components/DeveloperDashboard";
import { getAdminOverview } from "@/lib/admin";
import { getCurrentUser, toSafeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/developer/login");
  if (current.user.status === "pending") redirect("/activate");
  if (current.user.status !== "active" || current.session.scope !== "active") redirect("/developer/login");
  if (current.user.role !== "developer") redirect("/platform");
  return <DeveloperDashboard initialData={await getAdminOverview()} currentUser={toSafeUser(current.user)} />;
}
