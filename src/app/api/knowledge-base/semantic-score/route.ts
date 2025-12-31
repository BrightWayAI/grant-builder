import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSemanticKBScore } from "@/lib/knowledge-score-semantic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const score = await getSemanticKBScore(user.organizationId);
    return NextResponse.json(score);
  } catch (error) {
    console.error("Error getting semantic KB score:", error);
    return NextResponse.json(
      { error: "Failed to calculate KB score" },
      { status: 500 }
    );
  }
}
