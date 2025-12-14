import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgeScore } from "@/lib/knowledge-score";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const score = await getKnowledgeScore(user.organizationId);
    return NextResponse.json(score);
  } catch (error) {
    console.error("Knowledge score error:", error);
    return NextResponse.json({ error: "Failed to compute knowledge score" }, { status: 500 });
  }
}
