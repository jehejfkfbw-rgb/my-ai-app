import { redirect } from "next/navigation";
import { MidarExperience } from "@/components/MidarExperience";
import { getCurrentUser, toSafeUser } from "@/lib/auth";
import { getDashboardState } from "@/lib/engine";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.status === "pending" || current.session.scope !== "active") redirect("/activate");
  if (current.user.status !== "active") redirect("/login");
  const initialState = await getDashboardState(current.user.id, "NVDA", "1D");
  return <MidarExperience initialState={initialState} currentUser={toSafeUser(current.user)} />;
}
