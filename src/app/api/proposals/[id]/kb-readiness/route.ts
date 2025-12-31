import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { getRFPSpecificReadiness } from "@/lib/knowledge-score-semantic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: proposalId } = await params;

    // Get proposal with sections
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId, organizationId: user.organizationId },
      include: {
        sections: {
          select: {
            id: true,
            sectionName: true,
            description: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Extract requirements from section names and descriptions
    const requirements = proposal.sections
      .map((s) => {
        // Use description if available, otherwise use section name
        if (s.description && s.description.length > 10) {
          return s.description;
        }
        return `Content for ${s.sectionName} section`;
      })
      .filter((r) => r.length > 5);

    // Get KB readiness for these requirements
    const readiness = await getRFPSpecificReadiness(user.organizationId, requirements);

    // Map back to section names for better display
    const sectionReadiness = proposal.sections.map((section, idx) => {
      const req = readiness.requirements[idx];
      return {
        sectionId: section.id,
        sectionName: section.sectionName,
        score: req?.score || 0,
        confidence: req?.confidence || "none",
        matchedContent: req?.matchedContent,
        documentName: req?.documentName,
      };
    });

    return NextResponse.json({
      overallScore: readiness.overallScore,
      sectionReadiness,
      coveredCount: readiness.coveredCount,
      totalCount: readiness.totalCount,
      gaps: readiness.gaps.slice(0, 5),
      recommendations: readiness.recommendations,
    });
  } catch (error) {
    console.error("Error getting KB readiness:", error);
    return NextResponse.json(
      { error: "Failed to calculate KB readiness" },
      { status: 500 }
    );
  }
}
