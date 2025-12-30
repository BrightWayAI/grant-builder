/**
 * Claim Risk Classification
 * 
 * Defines which claim types are high-risk (block export if unverified)
 * vs medium/low-risk (warn only).
 */

import { ClaimType, ClaimRiskLevel } from '@/types/enforcement';

export interface ClaimRiskConfig {
  riskLevel: ClaimRiskLevel;
  blockIfUnverified: boolean;
  examples: string[];
}

export const CLAIM_RISK_MATRIX: Record<ClaimType, ClaimRiskConfig> = {
  PERCENTAGE: {
    riskLevel: 'HIGH',
    blockIfUnverified: true,
    examples: ['85% success rate', '94% completion rate', '67% of families']
  },
  CURRENCY: {
    riskLevel: 'HIGH',
    blockIfUnverified: true,
    examples: ['$1.2M budget', '$50,000 grant', 'annual budget of $500,000']
  },
  OUTCOME: {
    riskLevel: 'HIGH',
    blockIfUnverified: true,
    examples: ['achieved employment', 'reduced recidivism by', 'improved outcomes', 'demonstrated success']
  },
  ORGANIZATION: {
    riskLevel: 'HIGH',
    blockIfUnverified: true,
    examples: ['partnership with YMCA', 'funded by Ford Foundation', 'collaborate with United Way']
  },
  NUMBER: {
    riskLevel: 'MEDIUM',
    blockIfUnverified: false,
    examples: ['served 500 families', '12 counties', '15 staff members']
  },
  DATE: {
    riskLevel: 'MEDIUM',
    blockIfUnverified: false,
    examples: ['since 2015', 'established in 1998', 'for over 20 years']
  },
  LOCATION: {
    riskLevel: 'LOW',
    blockIfUnverified: false,
    examples: ['Central Valley', 'Bay Area', 'throughout California']
  }
};

export const HIGH_RISK_CLAIM_TYPES: ClaimType[] = Object.entries(CLAIM_RISK_MATRIX)
  .filter(([, config]) => config.blockIfUnverified)
  .map(([type]) => type as ClaimType);

export function getClaimRiskLevel(claimType: ClaimType): ClaimRiskLevel {
  return CLAIM_RISK_MATRIX[claimType]?.riskLevel || 'MEDIUM';
}

export function shouldBlockIfUnverified(claimType: ClaimType): boolean {
  return CLAIM_RISK_MATRIX[claimType]?.blockIfUnverified || false;
}

// Regex patterns for deterministic claim extraction
export const CLAIM_PATTERNS = {
  PERCENTAGE: /\b(\d+(?:\.\d+)?)\s*%/g,
  CURRENCY: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|M|billion|B|thousand|K)?/gi,
  NUMBER: /\b(\d{1,3}(?:,\d{3})*)\s+(?:families|people|individuals|children|youth|seniors|clients|participants|students|members|staff|employees|volunteers|partners|organizations|communities|counties|cities|states|locations|sites|programs|projects|years)/gi,
  DATE: /\b(?:since\s+)?(?:19|20)\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?/gi,
};
