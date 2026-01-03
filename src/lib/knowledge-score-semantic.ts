import { generateEmbedding } from "./ai/openai";
import { queryVectors } from "./ai/pinecone";
import prisma from "./db";

// Common grant question categories that funders ask
// These represent the semantic "buckets" we test against
export const GRANT_QUESTION_CATEGORIES = [
  {
    id: "mission_history",
    label: "Mission & History",
    questions: [
      "What is your organization's mission and when was it founded?",
      "Describe your organization's history and major accomplishments",
      "What is your organization's vision for the future?",
    ],
    weight: 1.0,
  },
  {
    id: "programs_services",
    label: "Programs & Services",
    questions: [
      "What programs and services does your organization provide?",
      "Describe your core program model and theory of change",
      "Who are the primary beneficiaries of your programs?",
    ],
    weight: 1.2,
  },
  {
    id: "outcomes_impact",
    label: "Outcomes & Impact",
    questions: [
      "What measurable outcomes has your organization achieved?",
      "Provide specific data on program results and impact",
      "How many people have you served and what changes did they experience?",
    ],
    weight: 1.3, // High weight - funders care most about this
  },
  {
    id: "evaluation_methods",
    label: "Evaluation Methods",
    questions: [
      "How do you measure and evaluate program effectiveness?",
      "What data collection methods do you use?",
      "How do you use evaluation data to improve programs?",
    ],
    weight: 1.1,
  },
  {
    id: "organizational_capacity",
    label: "Organizational Capacity",
    questions: [
      "Describe your staff qualifications and expertise",
      "What is your organizational structure and governance?",
      "How does your board provide oversight and strategic direction?",
    ],
    weight: 0.9,
  },
  {
    id: "financial_health",
    label: "Financial Health",
    questions: [
      "What is your annual operating budget?",
      "Describe your revenue sources and financial sustainability",
      "What are your major expenses and how do you allocate resources?",
    ],
    weight: 1.0,
  },
  {
    id: "partnerships",
    label: "Partnerships & Collaboration",
    questions: [
      "What partnerships and collaborations does your organization have?",
      "How do you coordinate with other organizations in your community?",
      "Describe any formal coalitions or networks you participate in",
    ],
    weight: 0.8,
  },
  {
    id: "target_population",
    label: "Target Population",
    questions: [
      "Who is your target population and what are their needs?",
      "What demographics do you serve?",
      "How do you ensure equitable access to your services?",
    ],
    weight: 1.0,
  },
];

export interface CategoryScore {
  id: string;
  label: string;
  score: number; // 0-100
  confidence: "high" | "medium" | "low" | "none";
  topChunks: {
    content: string;
    documentName: string;
    documentType: string;
    similarity: number;
  }[];
  recommendation?: string;
}

export interface SemanticKBScore {
  overallScore: number;
  categoryScores: CategoryScore[];
  strongAreas: string[];
  weakAreas: string[];
  recommendations: string[];
  documentCount: number;
  lastUpdated: Date | null;
}

// Thresholds for confidence levels (based on normalized 0-100 scores)
const CONFIDENCE_THRESHOLDS = {
  high: 60,    // 60%+ = green checkmark
  medium: 25,  // 25%+ = yellow checkmark  
  low: 10,     // 10%+ = orange warning
};             // <10% = empty circle

function getConfidence(score: number): "high" | "medium" | "low" | "none" {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  if (score >= CONFIDENCE_THRESHOLDS.low) return "low";
  return "none";
}

// Normalize raw embedding similarity scores to a more intuitive 0-100 range
// Raw cosine similarity typically ranges 0.30-0.85 for relevant content
// This maps: 0.30 → 0%, 0.50 → 50%, 0.75+ → 100%
function normalizeScore(rawScore: number): number {
  const MIN_SCORE = 0.30; // Below this = no real match
  const MAX_SCORE = 0.75; // Above this = excellent match
  
  if (rawScore <= MIN_SCORE) return 0;
  if (rawScore >= MAX_SCORE) return 100;
  
  // Linear interpolation between min and max
  return Math.round(((rawScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100);
}

function generateRecommendation(category: typeof GRANT_QUESTION_CATEGORIES[0], score: number): string | undefined {
  if (score >= 70) return undefined;
  
  const recommendations: Record<string, string> = {
    mission_history: "Upload your organization overview, strategic plan, or annual report with history section",
    programs_services: "Add detailed program descriptions, logic models, or program manuals",
    outcomes_impact: "Upload impact reports, evaluation reports, or documents with specific outcome data and statistics",
    evaluation_methods: "Add evaluation plans, data collection tools, or reports describing your measurement approach",
    organizational_capacity: "Upload staff bios, organizational charts, or board member profiles",
    financial_health: "Add audited financials, Form 990, or annual budget documents",
    partnerships: "Upload MOUs, partnership agreements, or documents listing your collaborators",
    target_population: "Add needs assessments, demographic reports, or program intake data summaries",
  };
  
  return recommendations[category.id];
}

export async function getSemanticKBScore(organizationId: string): Promise<SemanticKBScore> {
  // Get document count and last update
  const docs = await prisma.document.findMany({
    where: { organizationId, status: "INDEXED" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  if (docs.length === 0) {
    return {
      overallScore: 0,
      categoryScores: GRANT_QUESTION_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        score: 0,
        confidence: "none",
        topChunks: [],
        recommendation: generateRecommendation(cat, 0),
      })),
      strongAreas: [],
      weakAreas: GRANT_QUESTION_CATEGORIES.map((c) => c.label),
      recommendations: [
        "Upload your organization overview to establish baseline",
        "Add program descriptions with outcome data",
        "Upload financial documents (audited financials or 990)",
      ],
      documentCount: 0,
      lastUpdated: null,
    };
  }

  // Query each category
  const categoryScores: CategoryScore[] = [];
  
  for (const category of GRANT_QUESTION_CATEGORIES) {
    // Test all questions in this category
    const questionScores: number[] = [];
    const allChunks: { content: string; documentName: string; documentType: string; similarity: number }[] = [];
    
    for (const question of category.questions) {
      try {
        const embedding = await generateEmbedding(question);
        const results = await queryVectors(embedding, organizationId, 3);
        
        if (results.length > 0) {
          // Take best match score for this question
          const bestScore = results[0].score || 0;
          questionScores.push(bestScore);
          
          // Collect top chunks (deduplicated later)
          for (const match of results.slice(0, 2)) {
            const metadata = match.metadata as { content: string; filename: string; documentType?: string };
            allChunks.push({
              content: metadata.content?.slice(0, 200) + "...",
              documentName: metadata.filename || "Unknown",
              documentType: metadata.documentType || "OTHER",
              similarity: normalizeScore(match.score || 0) / 100, // Store as 0-1 for display consistency
            });
          }
        } else {
          questionScores.push(0);
        }
      } catch (error) {
        console.error(`Error querying category ${category.id}:`, error);
        questionScores.push(0);
      }
    }
    
    // Average raw score for this category, then normalize to intuitive 0-100
    const avgRawScore = questionScores.length > 0
      ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
      : 0;
    const avgScore = normalizeScore(avgRawScore);
    
    // Deduplicate and sort chunks
    const uniqueChunks = allChunks
      .filter((chunk, idx, arr) => 
        arr.findIndex((c) => c.content === chunk.content) === idx
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    categoryScores.push({
      id: category.id,
      label: category.label,
      score: Math.round(avgScore),
      confidence: getConfidence(avgScore / 100),
      topChunks: uniqueChunks,
      recommendation: generateRecommendation(category, avgScore),
    });
  }

  // Calculate weighted overall score
  const totalWeight = GRANT_QUESTION_CATEGORIES.reduce((sum, cat) => sum + cat.weight, 0);
  const weightedScore = categoryScores.reduce((sum, cs, idx) => {
    return sum + (cs.score * GRANT_QUESTION_CATEGORIES[idx].weight);
  }, 0) / totalWeight;

  // Identify strong and weak areas
  const sortedCategories = [...categoryScores].sort((a, b) => b.score - a.score);
  const strongAreas = sortedCategories.filter((c) => c.score >= 70).map((c) => c.label);
  const weakAreas = sortedCategories.filter((c) => c.score < 50).map((c) => c.label);

  // Generate prioritized recommendations
  const recommendations = categoryScores
    .filter((c) => c.recommendation)
    .sort((a, b) => {
      // Prioritize by weight * inverse score
      const catA = GRANT_QUESTION_CATEGORIES.find((cat) => cat.id === a.id)!;
      const catB = GRANT_QUESTION_CATEGORIES.find((cat) => cat.id === b.id)!;
      return (catB.weight * (100 - b.score)) - (catA.weight * (100 - a.score));
    })
    .map((c) => c.recommendation!)
    .slice(0, 3);

  return {
    overallScore: Math.round(weightedScore),
    categoryScores,
    strongAreas,
    weakAreas,
    recommendations,
    documentCount: docs.length,
    lastUpdated: docs[0]?.updatedAt || null,
  };
}

// RFP-specific KB readiness
export interface RFPRequirement {
  id: string;
  text: string;
  category: string;
  score: number;
  confidence: "high" | "medium" | "low" | "none";
  matchedContent?: string;
  documentName?: string;
}

export interface RFPReadiness {
  overallScore: number;
  requirements: RFPRequirement[];
  coveredCount: number;
  totalCount: number;
  gaps: string[];
  recommendations: string[];
}

export async function getRFPSpecificReadiness(
  organizationId: string,
  rfpRequirements: string[]
): Promise<RFPReadiness> {
  if (rfpRequirements.length === 0) {
    return {
      overallScore: 0,
      requirements: [],
      coveredCount: 0,
      totalCount: 0,
      gaps: [],
      recommendations: ["No RFP requirements provided"],
    };
  }

  const requirements: RFPRequirement[] = [];
  
  for (let i = 0; i < rfpRequirements.length; i++) {
    const req = rfpRequirements[i];
    
    try {
      const embedding = await generateEmbedding(req);
      const results = await queryVectors(embedding, organizationId, 2);
      
      if (results.length > 0 && (results[0].score || 0) > 0.3) {
        const metadata = results[0].metadata as { content: string; filename: string };
        requirements.push({
          id: `req-${i}`,
          text: req,
          category: categorizeRequirement(req),
          score: normalizeScore(results[0].score || 0),
          confidence: getConfidence(normalizeScore(results[0].score || 0)),
          matchedContent: metadata.content?.slice(0, 150) + "...",
          documentName: metadata.filename,
        });
      } else {
        requirements.push({
          id: `req-${i}`,
          text: req,
          category: categorizeRequirement(req),
          score: 0,
          confidence: "none",
        });
      }
    } catch (error) {
      console.error(`Error checking requirement ${i}:`, error);
      requirements.push({
        id: `req-${i}`,
        text: req,
        category: "other",
        score: 0,
        confidence: "none",
      });
    }
  }

  const coveredCount = requirements.filter((r) => r.confidence !== "none").length;
  const overallScore = requirements.length > 0
    ? Math.round(requirements.reduce((sum, r) => sum + r.score, 0) / requirements.length)
    : 0;

  const gaps = requirements
    .filter((r) => r.confidence === "none" || r.confidence === "low")
    .map((r) => r.text);

  // Group gaps by category for recommendations
  const gapCategories = Array.from(new Set(requirements.filter((r) => r.score < 50).map((r) => r.category)));
  const recommendations = gapCategories.slice(0, 3).map((cat) => {
    const catReqs = requirements.filter((r) => r.category === cat && r.score < 50);
    return `Upload documents addressing ${cat}: ${catReqs.map((r) => r.text.slice(0, 50)).join("; ")}`;
  });

  return {
    overallScore,
    requirements,
    coveredCount,
    totalCount: requirements.length,
    gaps,
    recommendations,
  };
}

function categorizeRequirement(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes("outcome") || lower.includes("impact") || lower.includes("result")) {
    return "outcomes";
  }
  if (lower.includes("budget") || lower.includes("financial") || lower.includes("cost")) {
    return "financial";
  }
  if (lower.includes("staff") || lower.includes("team") || lower.includes("personnel")) {
    return "capacity";
  }
  if (lower.includes("evaluat") || lower.includes("measure") || lower.includes("data")) {
    return "evaluation";
  }
  if (lower.includes("partner") || lower.includes("collaborat")) {
    return "partnerships";
  }
  if (lower.includes("sustain") || lower.includes("future") || lower.includes("continu")) {
    return "sustainability";
  }
  if (lower.includes("need") || lower.includes("problem") || lower.includes("issue")) {
    return "need";
  }
  if (lower.includes("method") || lower.includes("approach") || lower.includes("strategy")) {
    return "methods";
  }
  
  return "general";
}
