import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getSubscriptionInfo } from "@/lib/subscription";

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

  const subscription = await getSubscriptionInfo(user.organizationId);

  return (
    <div className="min-h-screen bg-surface-page">
      <Sidebar user={user} isBeta={subscription.isBeta} />
      {/* Main content area - offset by sidebar width */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-content mx-auto px-6 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
