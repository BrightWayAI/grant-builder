import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getSubscriptionInfo } from "@/lib/subscription";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { WelcomeWizardTrigger } from "@/components/onboarding/welcome-wizard-trigger";

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

  const showWelcomeWizard = !user.hasSeenWelcome;

  return (
    <div className="min-h-screen bg-surface-page">
      {process.env.APP_ENV === "staging" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 text-amber-900 text-sm py-2 px-4 border-b border-amber-200 flex items-center justify-center">
          <span className="font-semibold">Staging</span>
          <span className="ml-2 text-amber-800">You are viewing the staging environment</span>
        </div>
      )}
      <Sidebar user={user} isBeta={subscription.isBeta} />
      {/* Main content area - offset by sidebar width */}
      <main className={`lg:pl-16 ${process.env.APP_ENV === "staging" ? "pt-16" : "pt-14"} lg:pt-0 transition-all duration-200`}>
        <div className="max-w-content mx-auto px-6 md:px-8 py-8">
          {children}
        </div>
        <FeedbackButton />
      </main>
      <WelcomeWizardTrigger shouldShow={showWelcomeWizard} />
    </div>
  );
}
