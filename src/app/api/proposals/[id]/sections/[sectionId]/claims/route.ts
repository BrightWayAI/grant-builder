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
  DATE: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:19|20)\d{2}\b/gi,
  NAMED_ORG: /\b(?:partnered?\s+with|collaboration\s+with|working\s+with|funded\s+by|supported\s+by|in\s+partnership\s+with)\s+([A-Z][A-Za-z\s&,]+?)(?:\.|,|\s+to\s|\s+for\s|\s+in\s)/gi,
  OUTCOME: /\b(?:achieved|resulted\s+in|led\s+to|produced|generated|created|increased|decreased|reduced|improved)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|fold|x)\b/gi,
};

interface ExtractedClaim {
  id: string;
  type: string;
  value: string;
  context: string;
  position: { start: number; end: number };
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  status: "VERIFIED" | "UNVERIFIED" | "PARTIAL";
  evidence?: {
    documentId: string;
    documentName: string;
    matchedText: string;
    similarity: number;
  };
}

function getRiskLevel(type: string): "HIGH" | "MEDIUM" | "LOW" {
  if (["NUMBER", "PERCENTAGE", "CURRENCY", "OUTCOME"].includes(type)) return "HIGH";
  if (["DATE", "NAMED_ORG"].includes(type)) return "MEDIUM";
  return "LOW";
}

function extractClaims(text: string): Omit<ExtractedClaim, "status" | "evidence">[] {
  const claims: Omit<ExtractedClaim, "status" | "evidence">[] = [];
  let claimIndex = 0;

  for (const [claimType, pattern] of Object.entries(CLAIM_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const contextStart = Math.max(0, match.index - 40);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 40);

      claims.push({
        id: `claim_${claimIndex++}`,
        type: claimType,
        value: match[0],
        context: text.slice(contextStart, contextEnd),
        position: { start: match.index, end: match.index + match[0].length },
        riskLevel: getRiskLevel(claimType),
      });
    }
  }

  return claims;
}

async function verifyClaim(
  claim: Omit<ExtractedClaim, "status" | "evidence">,
  organizationId: string
): Promise<ExtractedClaim> {
  try {
    const searchQuery = `${claim.value} ${claim.context}`;
    const embedding = await generateEmbedding(searchQuery);
    const results = await queryVectors(embedding, organizationId, 3);

    if (results.length === 0) {
      return { ...claim, status: "UNVERIFIED" };
    }

    const bestMatch = results[0];
    const metadata = bestMatch.metadata as { content?: string; filename?: string; documentId?: string };
    const content = metadata?.content || "";
    const similarity = bestMatch.score || 0;

    // Check if the claim value appears in the matched content
    const claimLower = claim.value.toLowerCase().replace(/[,\s]+/g, "");
    const contentLower = content.toLowerCase().replace(/[,\s]+/g, "");

    // Extract just the number for comparison
    const numberMatch = claim.value.match(/\d[\d,.]*/);
    const claimNumber = numberMatch ? numberMatch[0].replace(/,/g, "") : null;

    const hasExactMatch = contentLower.includes(claimLower);
    const hasNumberMatch = claimNumber && contentLower.includes(claimNumber);

    if ((hasExactMatch || hasNumberMatch) && similarity >= 0.65) {
      return {
        ...claim,
        status: "VERIFIED",
        evidence: {
          documentId: metadata?.documentId || "",
          documentName: metadata?.filename || "Unknown",
          matchedText: content.slice(0, 150) + "...",
          similarity,
        },
      };
    } else if (similarity >= 0.50) {
      return {
        ...claim,
        status: "PARTIAL",
        evidence: {
          documentId: metadata?.documentId || "",
          documentName: metadata?.filename || "Unknown",
          matchedText: content.slice(0, 150) + "...",
          similarity,
        },
      };
    }

    return { ...claim, status: "UNVERIFIED" };
  } catch (error) {
    console.error("Claim verification failed:", error);
    return { ...claim, status: "UNVERIFIED" };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { organizationId } = await requireOrganization();
    const { id: proposalId, sectionId } = await params;

    const section = await prisma.proposalSection.findFirst({
      where: {
        id: sectionId,
        proposalId,
        proposal: { organizationId },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const content = section.content || "";
    
    // Extract claims
    const extractedClaims = extractClaims(content);
    
    // Verify each claim against KB
    const verifiedClaims = await Promise.all(
      extractedClaims.map((claim) => verifyClaim(claim, organizationId))
    );

    // Build summary
    const verified = verifiedClaims.filter((c) => c.status === "VERIFIED").length;
    const partial = verifiedClaims.filter((c) => c.status === "PARTIAL").length;
    const unverified = verifiedClaims.filter((c) => c.status === "UNVERIFIED").length;
    const highRiskUnverified = verifiedClaims.filter(
      (c) => c.status === "UNVERIFIED" && c.riskLevel === "HIGH"
    ).length;

    return NextResponse.json({
      sectionId,
      sectionName: section.sectionName,
      totalClaims: verifiedClaims.length,
      verified,
      partial,
      unverified,
      highRiskUnverified,
      verificationRate: verifiedClaims.length > 0 
        ? Math.round((verified / verifiedClaims.length) * 100) 
        : 100,
      claims: verifiedClaims,
    });
  } catch (error) {
    console.error("Claims API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to get claims" }, { status: 500 });
  }
}
