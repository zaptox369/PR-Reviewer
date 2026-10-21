import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReviewSummary, ReviewComment, RepoSettings, SecurityAuditEntry, SystemStats, Category, CommentFeedback, QualityMetrics } from '../types/index.js';
import { DEFAULT_REPO_SETTINGS } from '../rules/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  reviews: ReviewSummary[];
  repos: RepoSettings[];
  auditLogs: SecurityAuditEntry[];
}

const INITIAL_REPOS: RepoSettings[] = [
  {
    id: 'repo-1',
    repo: 'acme-corp/api-gateway',
    focus: ['security', 'bug', 'performance', 'reliability'],
    ignorePaths: ['**/*.lock', 'dist/**', 'docs/**'],
    severityThreshold: 'medium',
    maxComments: 12,
    customGuidelines: '- Prefer async/await over raw promise chains.\n- Never log user emails, tokens, or passwords.\n- Always sanitize inputs and use parameterized database queries.',
    autoReviewEnabled: true,
    postInlineComments: true,
    postSummaryComment: true,
    provider: 'heuristic-engine',
    model: 'gpt-4o',
    strictPrivacyMode: true,
  },
  {
    id: 'repo-2',
    repo: 'acme-corp/frontend-app',
    focus: ['security', 'performance', 'readability', 'testing'],
    ignorePaths: ['**/vendor/**', '**/*.min.js'],
    severityThreshold: 'low',
    maxComments: 20,
    customGuidelines: '- Ensure all click handlers have accessible keyboard counterparts.\n- Clean up timers in useEffect to prevent memory leaks.\n- Never render unsanitized HTML.',
    autoReviewEnabled: true,
    postInlineComments: true,
    postSummaryComment: true,
    provider: 'heuristic-engine',
    model: 'gpt-4o-mini',
    strictPrivacyMode: true,
  },
];

const SAMPLE_REVIEWS: ReviewSummary[] = [
  {
    id: 'rev_94812a',
    repo: 'acme-corp/api-gateway',
    prNumber: 482,
    prTitle: 'feat(auth): add refresh token rotation and session revocation',
    prAuthor: 'sarah-dev',
    prBranch: 'feature/token-rotation',
    baseBranch: 'main',
    headSha: 'c8f71b9e29a8d43',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    status: 'completed',
    risk: 'medium',
    score: 79,
    summary: 'Adds refresh token rotation mechanics to the session service. Implements database revocation records.',
    keyChanges: [
      'Added token rotation helper in src/auth/tokenService.ts',
      'Configured Redis revocation blocklist check in middleware',
    ],
    securityConcerns: [
      'Previous token was not explicitly invalidated before returning newly minted pair',
    ],
    commentsCount: 2,
    comments: [
      {
        id: 'c-101',
        file: 'src/auth/tokenService.ts',
        line: 42,
        severity: 'high',
        category: 'security',
        title: 'Old Refresh Token Left Active During Rotation',
        message: 'The existing refresh token remains valid until expiry if revocation transaction fails. Invalidate the previous token in the same atomic transaction.',
        suggestion: '```suggestion\nawait db.transaction(async (trx) => {\n  await trx("refresh_tokens").where({ token: oldToken }).update({ revoked: true });\n  await trx("refresh_tokens").insert(newRefreshToken);\n});\n```',
        confidence: 0.96,
        ruleId: 'SEC-TOKEN-001',
        feedback: 'useful',
        feedbackAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 'c-102',
        file: 'src/auth/tokenService.ts',
        line: 58,
        severity: 'medium',
        category: 'reliability',
        title: 'Unhandled Promise Rejection Risk',
        message: 'Redis write error is not caught in async handler, risking process termination on connection timeout.',
        suggestion: '```suggestion\ntry {\n  await redis.set(cacheKey, "valid", "EX", ttl);\n} catch (redisErr) {\n  logger.warn("Cache write skipped", redisErr);\n}\n```',
        confidence: 0.91,
        ruleId: 'REL-PROMISE-005',
        feedback: 'useful',
        feedbackAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
    ],
    tokensUsed: { input: 1420, output: 410, estimatedCostUsd: 0.00765 },
    durationMs: 1240,
    model: 'gpt-4o',
    idempotencyKey: 'acme-corp/api-gateway-482-c8f71b9e29a8d43',
    diffText: `diff --git a/src/auth/tokenService.ts b/src/auth/tokenService.ts
index 738ab12..9f42c18 100644
--- a/src/auth/tokenService.ts
+++ b/src/auth/tokenService.ts
@@ -38,7 +38,9 @@ export async function rotateRefreshToken(oldToken: string, userId: string) {
   const newRefreshToken = generateSecureToken();
+  // Issue new token without immediate invalidation
+  await db("refresh_tokens").insert({ token: newRefreshToken, userId, expiresAt });
+  return { refreshToken: newRefreshToken };
 }
`,
    secretsRedactedCount: 0,
    redactedItems: [],
  },
  {
    id: 'rev_67182b',
    repo: 'acme-corp/frontend-app',
    prNumber: 139,
    prTitle: 'fix(checkout): add promo code validation endpoint and card formatting',
    prAuthor: 'alex-frontend',
    prBranch: 'fix/checkout-promo',
    baseBranch: 'main',
    headSha: 'a12b4e8992f03',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'completed',
    risk: 'low',
    score: 94,
    summary: 'Implements client-side promo code validation debounce and card input formatting mask.',
    keyChanges: [
      'Added usePromoCode hook with 300ms debounce',
      'Refactored checkout step validation logic',
    ],
    securityConcerns: [],
    commentsCount: 1,
    comments: [
      {
        id: 'c-103',
        file: 'src/components/PromoInput.tsx',
        line: 28,
        severity: 'low',
        category: 'readability',
        title: 'Use async/await syntax',
        message: 'Guideline prefers async/await over raw .then chaining for asynchronous validation.',
        confidence: 0.88,
        ruleId: 'STYLE-ASYNC-006',
        feedback: 'noise',
        feedbackAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
    ],
    tokensUsed: { input: 890, output: 210, estimatedCostUsd: 0.0043 },
    durationMs: 890,
    model: 'gpt-4o',
    idempotencyKey: 'acme-corp/frontend-app-139-a12b4e8992f03',
    diffText: `diff --git a/src/components/PromoInput.tsx b/src/components/PromoInput.tsx
index 4410a82..5592bc1 100644
--- a/src/components/PromoInput.tsx
+++ b/src/components/PromoInput.tsx
@@ -25,4 +25,6 @@ export function PromoInput({ onApply }: PromoProps) {
-  return null;
+  validatePromo(code).then(res => onApply(res));
+  return <input value={code} onChange={e => setCode(e.target.value)} />;
 }
`,
    secretsRedactedCount: 0,
    redactedItems: [],
  },
];

const SAMPLE_AUDIT_LOGS: SecurityAuditEntry[] = [
  {
    id: 'audit-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 36).toISOString(),
    event: 'hmac_verified',
    severity: 'info',
    details: 'GitHub Webhook signature verified via timing-safe HMAC comparison for repo acme-corp/api-gateway PR #482',
    repo: 'acme-corp/api-gateway',
    prNumber: 482,
  },
  {
    id: 'audit-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    event: 'review_completed',
    severity: 'info',
    details: 'Completed review for PR #482. Found 2 issues, score: 79/100, risk: medium.',
    repo: 'acme-corp/api-gateway',
    prNumber: 482,
  },
  {
    id: 'audit-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    event: 'hmac_failed',
    severity: 'alert',
    details: 'Rejected unsigned/invalid signature webhook attempt from 198.51.100.42. Payload discarded.',
    ip: '198.51.100.42',
  },
];

const SAMPLE_REVIEW_IDS = new Set(SAMPLE_REVIEWS.map((review) => review.id));
const SAMPLE_AUDIT_LOG_IDS = new Set(SAMPLE_AUDIT_LOGS.map((entry) => entry.id));

class MemoryStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    this.ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reviews) && Array.isArray(parsed.repos)) {
          const reviews = parsed.reviews.filter((review: ReviewSummary) => !SAMPLE_REVIEW_IDS.has(review.id));
          const auditLogs = Array.isArray(parsed.auditLogs)
            ? parsed.auditLogs.filter((entry: SecurityAuditEntry) => !SAMPLE_AUDIT_LOG_IDS.has(entry.id))
            : [];
          const data: DatabaseSchema = { ...parsed, reviews, auditLogs };

          if (reviews.length !== parsed.reviews.length || auditLogs.length !== (parsed.auditLogs?.length ?? 0)) {
            this.saveData(data);
          }

          return data;
        }
      } catch (err) {
        console.error('Failed to parse db.json, using empty review and audit data:', err);
      }
    }

    const initial: DatabaseSchema = {
      reviews: [],
      repos: INITIAL_REPOS,
      auditLogs: [],
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  public getReviews(): ReviewSummary[] {
    return [...this.data.reviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getReviewById(id: string): ReviewSummary | undefined {
    return this.data.reviews.find((r) => r.id === id);
  }

  public saveReview(review: ReviewSummary): ReviewSummary {
    const idx = this.data.reviews.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      this.data.reviews[idx] = review;
    } else {
      this.data.reviews.unshift(review);
    }
    this.saveData(this.data);
    return review;
  }

  public getReviewByIdempotencyKey(key: string): ReviewSummary | undefined {
    return this.data.reviews.find((r) => r.idempotencyKey === key);
  }

  public recordCommentFeedback(
    reviewId: string,
    commentId: string,
    feedback: CommentFeedback
  ): ReviewComment | null {
    const review = this.data.reviews.find((r) => r.id === reviewId);
    if (!review) return null;

    const comment = review.comments.find((c) => c.id === commentId);
    if (!comment) return null;

    comment.feedback = feedback;
    comment.feedbackAt = new Date().toISOString();
    review.updatedAt = new Date().toISOString();

    this.saveData(this.data);

    this.addAuditLog({
      event: 'feedback_recorded',
      severity: 'info',
      details: `Developer labeled comment "${comment.title}" in ${review.repo} PR #${review.prNumber} as [${feedback.toUpperCase()}].`,
      repo: review.repo,
      prNumber: review.prNumber,
      metadata: { commentId, feedback, category: comment.category },
    });

    return comment;
  }

  public getRepos(): RepoSettings[] {
    return this.data.repos;
  }

  public getRepoByName(name: string): RepoSettings {
    const found = this.data.repos.find((r) => r.repo.toLowerCase() === name.toLowerCase());
    return found || { ...DEFAULT_REPO_SETTINGS, repo: name };
  }

  public saveRepo(settings: RepoSettings): RepoSettings {
    const idx = this.data.repos.findIndex((r) => r.id === settings.id || r.repo === settings.repo);
    if (idx >= 0) {
      this.data.repos[idx] = settings;
    } else {
      this.data.repos.push(settings);
    }
    this.saveData(this.data);
    return settings;
  }

  public addAuditLog(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>): SecurityAuditEntry {
    const item: SecurityAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(item);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData(this.data);
    return item;
  }

  public getAuditLogs(): SecurityAuditEntry[] {
    return this.data.auditLogs;
  }

  public getStats(): SystemStats {
    const reviews = this.data.reviews;
    const totalReviews = reviews.length;
    let totalScore = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let totalComments = 0;
    let secretsRedactedTotal = 0;

    let totalFeedback = 0;
    let usefulCount = 0;
    let noiseCount = 0;
    let wrongCount = 0;

    const riskDistribution = { low: 0, medium: 0, high: 0 };
    const categoryDistribution: Record<Category, number> = {
      security: 0,
      bug: 0,
      performance: 0,
      reliability: 0,
      readability: 0,
      testing: 0,
      architecture: 0,
    };

    for (const r of reviews) {
      totalScore += r.score;
      totalTokens += (r.tokensUsed.input + r.tokensUsed.output);
      totalCost += r.tokensUsed.estimatedCostUsd;
      totalDuration += r.durationMs;
      totalComments += r.commentsCount;
      secretsRedactedTotal += (r.secretsRedactedCount || 0);
      riskDistribution[r.risk] = (riskDistribution[r.risk] || 0) + 1;

      for (const c of r.comments) {
        categoryDistribution[c.category] = (categoryDistribution[c.category] || 0) + 1;
        if (c.feedback) {
          totalFeedback++;
          if (c.feedback === 'useful') usefulCount++;
          else if (c.feedback === 'noise') noiseCount++;
          else if (c.feedback === 'wrong') wrongCount++;
        }
      }
    }

    const blockedIncidents = this.data.auditLogs.filter(
      (a) => a.event === 'hmac_failed' || a.event === 'injection_detected'
    ).length;

    const usefulRatePct = totalFeedback > 0 ? Math.round((usefulCount / totalFeedback) * 100) : 100;
    const noiseRatePct = totalFeedback > 0 ? Math.round((noiseCount / totalFeedback) * 100) : 0;
    const wrongRatePct = totalFeedback > 0 ? Math.round((wrongCount / totalFeedback) * 100) : 0;

    const qualityMetrics: QualityMetrics = {
      totalFeedback,
      usefulCount,
      noiseCount,
      wrongCount,
      usefulRatePct,
      noiseRatePct,
      wrongRatePct,
      lineAccuracyPct: 100, // 100% diff-snapped guarantee
    };

    return {
      totalReviews,
      totalComments,
      avgScore: totalReviews > 0 ? Math.round(totalScore / totalReviews) : 0,
      riskDistribution,
      categoryDistribution,
      totalTokensUsed: totalTokens,
      totalEstimatedCostUsd: Number(totalCost.toFixed(4)),
      avgDurationMs: totalReviews > 0 ? Math.round(totalDuration / totalReviews) : 0,
      securityIncidentsBlocked: blockedIncidents,
      secretsRedactedTotal,
      qualityMetrics,
    };
  }
}

export const db = new MemoryStore();
