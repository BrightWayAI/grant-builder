import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionInfo } from "@/lib/subscription";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const subscription = await getSubscriptionInfo(user.organizationId);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Subscription info error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription info" },
      { status: 500 }
    );
  }
}
