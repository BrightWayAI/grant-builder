import prisma from "@/lib/db";
import { DocumentType } from "@prisma/client";

type ScoreBreakdown = {
  score: number;
  coverage: number;
  freshness: number;
  docStrength: number;
  recommendations: string[];
};

const DOC_WEIGHTS: Partial<Record<DocumentType, number>> = {
  AUDITED_FINANCIALS: 1.2,
  ANNUAL_REPORT: 1.1,
  PROGRAM_DESCRIPTION: 1.0,
  IMPACT_REPORT: 1.0,
  LOGIC_MODEL: 0.9,
  ORG_OVERVIEW: 0.9,
  STAFF_BIOS: 0.6,
  BOARD_BIOS: 0.6,
  FORM_990: 0.9,
  BOILERPLATE: 0.4,
  OTHER: 0.3,
};

const COVERAGE_BUCKETS: { label: string; types: DocumentType[] }[] = [
  { label: "Org overview", types: ["ORG_OVERVIEW"] as DocumentType[] },
  { label: "Programs & outcomes", types: ["PROGRAM_DESCRIPTION", "IMPACT_REPORT", "LOGIC_MODEL"] as DocumentType[] },
  { label: "Financials", types: ["AUDITED_FINANCIALS", "FORM_990"] as DocumentType[] },
  { label: "Staff & governance", types: ["STAFF_BIOS", "BOARD_BIOS"] as DocumentType[] },
];

function monthsSince(date: Date) {
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function recencyFactor(updatedAt: Date) {
  const m = monthsSince(updatedAt);
  if (m <= 12) return 1.0;
  if (m <= 24) return 0.9;
  if (m <= 36) return 0.7;
  return 0.5;
}

function docScore(type: DocumentType, updatedAt: Date) {
  const weight = DOC_WEIGHTS[type] ?? 0.5;
  return weight * recencyFactor(updatedAt);
}

export async function getKnowledgeScore(organizationId: string): Promise<ScoreBreakdown> {
  const docs = await prisma.document.findMany({
    where: { organizationId },
    select: { documentType: true, updatedAt: true },
  });

  if (docs.length === 0) {
    return {
      score: 0,
      coverage: 0,
      freshness: 0,
      docStrength: 0,
      recommendations: [
        "Upload an organization overview",
        "Add a program description",
        "Upload financials (audited or 990)",
      ],
    };
  }

  const perDocScores = docs.map((d) => docScore(d.documentType, d.updatedAt));
  const docStrength = perDocScores.reduce((a, b) => a + b, 0) / perDocScores.length;
  const freshness = Math.max(...docs.map((d) => recencyFactor(d.updatedAt)));

  // coverage: fraction of buckets that have at least one doc
  const coverageHits = COVERAGE_BUCKETS.map((bucket) =>
    docs.some((d) => bucket.types.includes(d.documentType))
  );
  const coverage = coverageHits.filter(Boolean).length / COVERAGE_BUCKETS.length;

  // combined score
  const scoreRaw = docStrength * 0.45 + freshness * 0.2 + coverage * 0.35;
  const score = Math.round(Math.min(1, scoreRaw) * 100);

  // recommendations: missing buckets and stale data
  const recs: string[] = [];
  COVERAGE_BUCKETS.forEach((bucket) => {
    if (!coverageHits[COVERAGE_BUCKETS.indexOf(bucket)]) {
      recs.push(`Add ${bucket.label.toLowerCase()} content`);
    }
  });

  const stale = docs.filter((d) => recencyFactor(d.updatedAt) < 0.8);
  if (stale.length > 0) {
    recs.push("Update recent documents (last 24 months)");
  }

  // If financials missing
  if (!docs.some((d) => ["AUDITED_FINANCIALS", "FORM_990"].includes(d.documentType))) {
    recs.push("Upload financials (audited or 990)");
  }

  // Limit to top 3
  const recommendations = recs.slice(0, 3);

  return {
    score,
    coverage: Math.round(coverage * 100),
    freshness: Math.round(freshness * 100),
    docStrength: Math.round(docStrength * 100),
    recommendations,
  };
}
