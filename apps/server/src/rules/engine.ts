import { Severity, Category, ReviewComment, ReviewRisk, RepoSettings } from '../types/index.js';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const DEFAULT_REPO_SETTINGS: RepoSettings = {
  id: 'default',
  repo: 'global/default',
  focus: ['security', 'bug', 'performance', 'reliability'],
  ignorePaths: [],
  severityThreshold: 'medium',
  maxComments: 15,
  customGuidelines: '- Prefer async/await over raw promise chains.\n- Never log tokens, passwords, or PII.\n- Ensure all external inputs are strictly validated.\n- Enforce error handling and avoid silent swallowing.',
  autoReviewEnabled: true,
  postInlineComments: true,
  postSummaryComment: true,
  provider: 'heuristic-engine',
  model: 'gpt-4o',
  strictPrivacyMode: true,
};

/**
 * Filters and prioritizes comments based on repo rules and limits.
 */
export function applyRepoRulesToComments(
  comments: ReviewComment[],
  settings: RepoSettings
): {
  filteredComments: ReviewComment[];
  suppressedCount: number;
} {
  const thresholdWeight = SEVERITY_WEIGHTS[settings.severityThreshold] || 2;

  // 1. Filter by severity threshold
  const aboveThreshold = comments.filter((c) => {
    const weight = SEVERITY_WEIGHTS[c.severity] || 1;
    return weight >= thresholdWeight;
  });

  // 2. Filter by focus areas if specified
  const inFocus = aboveThreshold.filter((c) => {
    if (!settings.focus || settings.focus.length === 0) return true;
    return settings.focus.includes(c.category);
  });

  // 3. Sort by severity descending, then confidence descending
  const sorted = inFocus.sort((a, b) => {
    const diff = (SEVERITY_WEIGHTS[b.severity] || 0) - (SEVERITY_WEIGHTS[a.severity] || 0);
    if (diff !== 0) return diff;
    return b.confidence - a.confidence;
  });

  // 4. Cap comments
  const capped = sorted.slice(0, settings.maxComments);
  const suppressedCount = comments.length - capped.length;

  return {
    filteredComments: capped,
    suppressedCount,
  };
}

/**
 * Computes an overall risk level and health/security score (0 - 100).
 */
export function calculateRiskAndScore(comments: ReviewComment[]): {
  risk: ReviewRisk;
  score: number;
} {
  let score = 100;

  for (const c of comments) {
    switch (c.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 6;
        break;
      case 'low':
        score -= 2;
        break;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let risk: ReviewRisk = 'low';
  if (score < 50 || comments.some((c) => c.severity === 'critical')) {
    risk = 'high';
  } else if (score < 80 || comments.some((c) => c.severity === 'high')) {
    risk = 'medium';
  }

  return { risk, score };
}
