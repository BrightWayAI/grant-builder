import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSemanticKBScore } from "@/lib/knowledge-score-semantic";
import prisma from "@/lib/db";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Check cache unless force refresh
    if (!forceRefresh) {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { kbScoreCache: true, kbScoreCachedAt: true },
      });

      if (org?.kbScoreCache && org?.kbScoreCachedAt) {
        const cacheAge = Date.now() - new Date(org.kbScoreCachedAt).getTime();
        if (cacheAge < CACHE_TTL_MS) {
          return NextResponse.json(org.kbScoreCache);
        }
      }
    }

    // Compute fresh score
    const score = await getSemanticKBScore(user.organizationId);

    // Save to cache
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        kbScoreCache: JSON.parse(JSON.stringify(score)),
        kbScoreCachedAt: new Date(),
      },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error("Error getting semantic KB score:", error);
    return NextResponse.json(
      { error: "Failed to calculate KB score" },
      { status: 500 }
    );
  }
}
