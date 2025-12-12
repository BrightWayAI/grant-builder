import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.organizationId) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <DashboardNav user={user} />
      <main className="max-w-content mx-auto px-6 md:px-8 py-8">{children}</main>
    </div>
  );
}
