import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/openai";
import { queryVectors } from "@/lib/ai/pinecone";

// Claim patterns for extraction
const CLAIM_PATTERNS = {
  NUMBER: /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:people|participants|youth|students|families|seniors|clients|members|individuals|organizations|partners|communities|staff|volunteers|employees|beneficiaries|children|adults|residents|households)\b/gi,
  PERCENTAGE: /\b(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
  CURRENCY: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|thousand|M|B|K)?|\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*dollars?\b/gi,
  OUTCOME: /\b(?:achieved|resulted\s+in|led\s+to|produced|generated|created|increased|decreased|reduced|improved)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|fold|x)\b/gi,
};

interface ExtractedClaim {
  type: string;
  value: string;
  sectionName: string;
}

function extractHighRiskClaims(text: string, sectionName: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  for (const [claimType, pattern] of Object.entries(CLAIM_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      claims.push({
        type: claimType,
        value: match[0],
        sectionName,
      });
    }
  }

  return claims;
}

async function verifyClaim(claim: ExtractedClaim, organizationId: string): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(claim.value);
    const results = await queryVectors(embedding, organizationId, 2);

    if (results.length === 0) return false;

    const content = ((results[0].metadata as { content?: string })?.content || "").toLowerCase();
    const similarity = results[0].score || 0;

    // Extract number for comparison
    const numberMatch = claim.value.match(/\d[\d,.]*/);
    const claimNumber = numberMatch ? numberMatch[0].replace(/,/g, "") : null;

    if (claimNumber && content.includes(claimNumber) && similarity >= 0.60) {
      return true;
    }

    return similarity >= 0.70;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireOrganization();
    const { id: proposalId } = await params;

    // Fetch proposal with sections and coverage
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        organizationId,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            coverageRecord: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Check voice profile
    const voiceProfile = await prisma.voiceProfile.findUnique({
      where: { organizationId },
    });
    const voiceProfileReady = voiceProfile?.buildStatus === "READY";

    // Get document count
    const documentCount = await prisma.document.count({
      where: { organizationId },
    });

    // Extract and verify claims from all sections
    const allClaims: ExtractedClaim[] = [];
    const unverifiedHighRiskClaims: Array<{
      sectionName: string;
      claim: string;
      type: string;
    }> = [];

    for (const section of proposal.sections) {
      if (!section.content) continue;
      const claims = extractHighRiskClaims(section.content, section.sectionName);
      allClaims.push(...claims);
    }

    // Verify claims (limit to first 20 for performance)
    const claimsToVerify = allClaims.slice(0, 20);
    let verifiedCount = 0;

    for (const claim of claimsToVerify) {
      const isVerified = await verifyClaim(claim, organizationId);
      if (isVerified) {
        verifiedCount++;
      } else {
        unverifiedHighRiskClaims.push({
          sectionName: claim.sectionName,
          claim: claim.value,
          type: claim.type,
        });
      }
    }

    // If we sampled, estimate total verified
    const totalClaims = allClaims.length;
    const verificationRate = claimsToVerify.length > 0 
      ? verifiedCount / claimsToVerify.length 
      : 1;
    const estimatedVerified = Math.round(totalClaims * verificationRate);

    // Calculate section coverage
    const sectionsWithContent = proposal.sections.filter(
      (s) => s.content && s.content.trim().length > 50
    );
    const sectionsWithCoverage = proposal.sections.filter(
      (s) => s.coverageRecord && s.coverageRecord.coverageScore >= 40
    );

    const weakSections = proposal.sections
      .filter((s) => {
        const coverage = s.coverageRecord?.coverageScore ?? 0;
        const hasContent = s.content && s.content.trim().length > 50;
        return hasContent && coverage < 50;
      })
      .map((s) => ({
        sectionId: s.id,
        sectionName: s.sectionName,
        coverageScore: s.coverageRecord?.coverageScore ?? 0,
      }));

    // Get unique documents used
    const usedDocIds = new Set<string>();
    for (const section of proposal.sections) {
      if (section.coverageRecord) {
        const docs = section.coverageRecord.sourceDocuments as Array<{ documentId: string }>;
        docs?.forEach((d) => usedDocIds.add(d.documentId));
      }
    }

    // Calculate overall score
    // Weights: claims verification (35%), section coverage (35%), voice (15%), doc count (15%)
    const claimsScore = totalClaims > 0 ? (estimatedVerified / totalClaims) * 100 : 100;
    const coverageScore =
      sectionsWithContent.length > 0
        ? (sectionsWithCoverage.length / sectionsWithContent.length) * 100
        : 0;
    const voiceScore = voiceProfileReady ? 100 : 0;
    const docScore = Math.min(100, (documentCount / 10) * 100);

    const overallScore = Math.round(
      claimsScore * 0.35 + coverageScore * 0.35 + voiceScore * 0.15 + docScore * 0.15
    );

    return NextResponse.json({
      overallScore,
      claimsVerified: estimatedVerified,
      claimsTotal: totalClaims,
      highRiskUnverified: unverifiedHighRiskClaims.length,
      sectionsWithCoverage: sectionsWithCoverage.length,
      sectionsTotal: sectionsWithContent.length,
      voiceProfileReady,
      documentsUsed: usedDocIds.size,
      weakSections,
      unverifiedHighRiskClaims: unverifiedHighRiskClaims.slice(0, 10),
    });
  } catch (error) {
    console.error("Readiness API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to compute readiness" }, { status: 500 });
  }
}
