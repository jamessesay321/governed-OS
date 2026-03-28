/**
 * Blueprint Matcher
 * Takes an industry string from the onboarding interview and finds
 * the best matching blueprint from the registry.
 */

import { getBlueprintsForIndustry, type IndustryBlueprint } from '@/lib/blueprints/registry';

export type BlueprintMatch = {
  blueprint: IndustryBlueprint;
  matchScore: number;
  matchReason: string;
};

/**
 * Find the best matching blueprint for a given industry string.
 * Returns the top match (or null if no blueprints match).
 */
export async function matchBlueprint(
  industry: string
): Promise<BlueprintMatch | null> {
  if (!industry || industry.trim().length === 0) {
    return null;
  }

  const blueprints = await getBlueprintsForIndustry(industry);

  if (blueprints.length === 0) {
    return null;
  }

  // Score each blueprint by how closely it matches the industry string
  const scored = blueprints.map((bp) => {
    const bpIndustry = bp.industry.toLowerCase();
    const inputIndustry = industry.toLowerCase();

    let score = 0;
    let reason = '';

    // Exact match
    if (bpIndustry === inputIndustry) {
      score = 1.0;
      reason = `Exact industry match: ${bp.industry}`;
    }
    // Input is a substring of blueprint industry or vice versa
    else if (bpIndustry.includes(inputIndustry) || inputIndustry.includes(bpIndustry)) {
      score = 0.8;
      reason = `Partial industry match: ${bp.industry}`;
    }
    // Word overlap
    else {
      const inputWords = new Set(inputIndustry.split(/\s+/));
      const bpWords = new Set(bpIndustry.split(/\s+/));
      const overlap = [...inputWords].filter((w) => bpWords.has(w)).length;
      const total = Math.max(inputWords.size, bpWords.size);
      score = total > 0 ? (overlap / total) * 0.6 : 0;
      reason = overlap > 0
        ? `Keyword overlap with ${bp.industry} (${overlap} shared terms)`
        : `Loose match with ${bp.industry}`;
    }

    return { blueprint: bp, matchScore: score, matchReason: reason };
  });

  // Sort by score descending, return the best
  scored.sort((a, b) => b.matchScore - a.matchScore);

  const best = scored[0];
  // Only return if there's a meaningful match
  if (best.matchScore < 0.1) {
    return null;
  }

  return best;
}

/**
 * Find all matching blueprints for an industry, sorted by relevance.
 */
export async function matchBlueprints(
  industry: string,
  limit = 3
): Promise<BlueprintMatch[]> {
  if (!industry || industry.trim().length === 0) {
    return [];
  }

  const blueprints = await getBlueprintsForIndustry(industry);

  const scored = blueprints.map((bp) => {
    const bpIndustry = bp.industry.toLowerCase();
    const inputIndustry = industry.toLowerCase();

    let score = 0;
    let reason = '';

    if (bpIndustry === inputIndustry) {
      score = 1.0;
      reason = `Exact industry match: ${bp.industry}`;
    } else if (bpIndustry.includes(inputIndustry) || inputIndustry.includes(bpIndustry)) {
      score = 0.8;
      reason = `Partial industry match: ${bp.industry}`;
    } else {
      const inputWords = new Set(inputIndustry.split(/\s+/));
      const bpWords = new Set(bpIndustry.split(/\s+/));
      const overlap = [...inputWords].filter((w) => bpWords.has(w)).length;
      const total = Math.max(inputWords.size, bpWords.size);
      score = total > 0 ? (overlap / total) * 0.6 : 0;
      reason = overlap > 0
        ? `Keyword overlap with ${bp.industry} (${overlap} shared terms)`
        : `Loose match with ${bp.industry}`;
    }

    return { blueprint: bp, matchScore: score, matchReason: reason };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.filter((s) => s.matchScore >= 0.1).slice(0, limit);
}
