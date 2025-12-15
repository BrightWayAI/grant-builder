import prisma from "@/lib/db";
import { DocumentType } from "@prisma/client";

type ScoreBreakdown = {
  score: number;
  coverage: number;
  highValue: number;
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

const COVERAGE_BUCKETS: { label: string; types: DocumentType[]; targetCount: number }[] = [
  { label: "Org overview", types: ["ORG_OVERVIEW"] as DocumentType[], targetCount: 1 },
  { label: "Programs & outcomes", types: ["PROGRAM_DESCRIPTION", "IMPACT_REPORT", "LOGIC_MODEL"] as DocumentType[], targetCount: 3 },
  { label: "Financials", types: ["AUDITED_FINANCIALS", "FORM_990"] as DocumentType[], targetCount: 2 },
  { label: "Staff & governance", types: ["STAFF_BIOS", "BOARD_BIOS"] as DocumentType[], targetCount: 2 },
];

const HIGH_VALUE_TYPES: DocumentType[] = [
  "ORG_OVERVIEW",
  "PROGRAM_DESCRIPTION",
  "IMPACT_REPORT",
  "LOGIC_MODEL",
  "AUDITED_FINANCIALS",
  "FORM_990",
];

const MIN_DOCS_FOR_FULL_SCORE = 12;

function monthsSince(date: Date) {
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function recencyFactor(updatedAt: Date) {
  const m = monthsSince(updatedAt);
  if (m <= 12) return 1.0;
  if (m <= 24) return 0.85;
  if (m <= 36) return 0.65;
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
      highValue: 0,
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
  const docStrengthRaw = perDocScores.reduce((a, b) => a + b, 0) / perDocScores.length;
  const freshnessRaw = docs.reduce((a, d) => a + recencyFactor(d.updatedAt), 0) / docs.length;

  // coverage: depth-aware per bucket (count vs target)
  const coverageScores = COVERAGE_BUCKETS.map((bucket) => {
    const count = docs.filter((d) => bucket.types.includes(d.documentType)).length;
    return Math.min(1, count / bucket.targetCount);
  });
  const coverageRaw = coverageScores.reduce((a, b) => a + b, 0) / COVERAGE_BUCKETS.length;

  const highValueHits = HIGH_VALUE_TYPES.filter((t) => docs.some((d) => d.documentType === t)).length;
  const highValue = highValueHits / HIGH_VALUE_TYPES.length;

  const docCountFactor = Math.min(1, docs.length / MIN_DOCS_FOR_FULL_SCORE);

  const coverageAdj = coverageRaw * docCountFactor;
  const highValueAdj = highValue * docCountFactor;
  const docStrengthAdj = docStrengthRaw * docCountFactor;
  const freshnessAdj = freshnessRaw * docCountFactor;

  // combined score
  const scoreRaw =
    docStrengthAdj * 0.35 +
    freshnessAdj * 0.15 +
    coverageAdj * 0.3 +
    highValueAdj * 0.2;
  const score = Math.round(Math.min(1, scoreRaw) * 100);

  // recommendations: missing buckets and stale data
  const recs: string[] = [];
  COVERAGE_BUCKETS.forEach((bucket, idx) => {
    if (coverageScores[idx] < 1) {
      recs.push(`Add more ${bucket.label.toLowerCase()} depth`);
    }
  });

  if (highValue < 0.8) {
    recs.push("Upload high-value docs (overview, program, impact, financials)");
  }

  const stale = docs.filter((d) => recencyFactor(d.updatedAt) < 0.8);
  if (stale.length > 0) {
    recs.push("Update recent documents (last 24 months)");
  }

  // If financials missing
  if (!docs.some((d) => ["AUDITED_FINANCIALS", "FORM_990"].includes(d.documentType))) {
    recs.push("Upload financials (audited or 990)");
  }

  if (docs.length < 6) {
    recs.push("Add more source documents for better coverage");
  }

  // Limit to top 3
  const recommendations = recs.slice(0, 3);

  return {
    score,
    coverage: Math.round(coverageAdj * 100),
    highValue: Math.round(highValueAdj * 100),
    freshness: Math.round(freshnessAdj * 100),
    docStrength: Math.round(docStrengthAdj * 100),
    recommendations,
  };
}
