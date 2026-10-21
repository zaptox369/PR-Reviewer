import { v4 as uuidv4 } from 'uuid';
import { parseUnifiedDiff, validateAndSnapLineNumber } from '../diff/parser.js';
import { filterDiffFiles } from '../diff/filter.js';
import { chunkDiffFiles } from '../diff/chunker.js';
import { executeChunkReview } from '../llm/provider.js';
import { applyRepoRulesToComments, calculateRiskAndScore } from '../rules/engine.js';
import { db } from '../db/store.js';
import { ReviewSummary, ReviewComment, RepoSettings, RedactedSecretItem } from '../types/index.js';
import { sanitizeAndCheckInjection, redactSecretsAndPII } from '../security/sanitizer.js';
import { env } from '../config/env.js';

export interface RunReviewOptions {
  repo: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prBranch: string;
  baseBranch: string;
  headSha: string;
  diffText: string;
  forceRerun?: boolean;
}

export async function processReviewPipeline(options: RunReviewOptions): Promise<ReviewSummary> {
  const {
    repo,
    prNumber,
    prTitle,
    prAuthor,
    prBranch,
    baseBranch,
    headSha,
    diffText,
    forceRerun = false,
  } = options;

  const idempotencyKey = `${repo}-${prNumber}-${headSha}`;

  // 1. Idempotency Check: Don't charge or re-evaluate duplicate webhooks
  if (!forceRerun) {
    const existing = db.getReviewByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === 'completed') {
      return existing;
    }
  }

  const reviewId = `rev_${uuidv4().substring(0, 8)}`;
  const settings: RepoSettings = db.getRepoByName(repo);

  // 2. Data Privacy & Secret Masking Guard (Zero Cloud Leakage)
  let processedDiff = diffText;
  let secretsRedactedCount = 0;
  let redactedItems: RedactedSecretItem[] = [];

  const shouldRedact = settings.strictPrivacyMode !== false && env.STRICT_PRIVACY_MODE !== false;
  if (shouldRedact) {
    const redaction = redactSecretsAndPII(diffText);
    if (redaction.hasRedactions) {
      processedDiff = redaction.redactedText;
      secretsRedactedCount = redaction.redactedCount;
      redactedItems = redaction.items;

      db.addAuditLog({
        event: 'secret_redacted',
        severity: 'warning',
        details: `Redacted ${redaction.redactedCount} live credentials/PII in PR #${prNumber} on ${repo} before external LLM dispatch.`,
        repo,
        prNumber,
        metadata: {
          types: redaction.items.map((i) => i.type),
          previews: redaction.items.map((i) => i.preview),
        },
      });
    }
  }

  // 3. Security Sanitization & Injection Defense Check
  const injection = sanitizeAndCheckInjection(processedDiff);
  if (injection.hasInjectionRisk) {
    db.addAuditLog({
      event: 'injection_detected',
      severity: 'alert',
      details: `Prompt injection attack vector detected and defused in PR #${prNumber} on ${repo}.`,
      repo,
      prNumber,
      metadata: { findings: injection.findings },
    });
  }

  // 4. Unified Diff Parsing
  const allParsedFiles = parseUnifiedDiff(injection.sanitizedDiff);

  // 5. Smart Noise & Lockfile Filtering
  const { acceptedFiles, ignoredFiles } = filterDiffFiles(allParsedFiles, settings.ignorePaths);

  if (acceptedFiles.length === 0) {
    const zeroDiffReview: ReviewSummary = {
      id: reviewId,
      repo,
      prNumber,
      prTitle,
      prAuthor,
      prBranch,
      baseBranch,
      headSha,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'completed',
      risk: 'low',
      score: 100,
      summary: `PR contains only non-reviewable changes (${ignoredFiles.map((f) => f.reason).join(', ') || 'lockfiles or documentation'}). No inline comments required.`,
      keyChanges: ['No code logic modified.'],
      securityConcerns: [],
      commentsCount: 0,
      comments: [],
      tokensUsed: { input: 50, output: 20, estimatedCostUsd: 0 },
      durationMs: 50,
      model: settings.model,
      idempotencyKey,
      diffText,
      secretsRedactedCount,
      redactedItems,
    };
    db.saveReview(zeroDiffReview);
    return zeroDiffReview;
  }

  // 6. Intelligent Chunking
  const chunks = chunkDiffFiles(acceptedFiles);

  let rawComments: ReviewComment[] = [];
  const aggregatedKeyChanges: string[] = [];
  const aggregatedSecurityConcerns: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;

  if (secretsRedactedCount > 0) {
    aggregatedSecurityConcerns.push(
      `[Privacy Guard] Auto-masked ${secretsRedactedCount} credential/token pattern(s) before transmission to LLM provider.`
    );
  }

  // Map files for fast line lookup during hallucination validation
  const fileDiffMap = new Map(acceptedFiles.map((f) => [f.newPath, f]));

  // 7. Review Chunks with chosen provider
  for (const chunk of chunks) {
    const result = await executeChunkReview(chunk, settings);
    totalInputTokens += result.tokensUsed.input;
    totalOutputTokens += result.tokensUsed.output;
    totalCost += result.tokensUsed.estimatedCostUsd;
    totalDuration += result.durationMs;

    aggregatedKeyChanges.push(...result.response.keyChanges);
    aggregatedSecurityConcerns.push(...result.response.securityConcerns);

    // 8. Hallucination Guard: Validate every single line number against modified diff lines!
    for (const c of result.response.comments) {
      const targetFile = fileDiffMap.get(c.file);
      const { validLine, wasAdjusted } = validateAndSnapLineNumber(targetFile, c.line);

      if (wasAdjusted) {
        db.addAuditLog({
          event: 'line_hallucination_fixed',
          severity: 'info',
          details: `Repaired hallucinated comment line in ${c.file}: shifted from line ${c.line} to valid modified line ${validLine}.`,
          repo,
          prNumber,
        });
      }

      rawComments.push({
        id: uuidv4(),
        file: c.file,
        line: validLine,
        severity: c.severity,
        category: c.category,
        title: c.title,
        message: c.message,
        suggestion: c.suggestion,
        originalCodeSnippet: c.originalCodeSnippet,
        suggestedCodeSnippet: c.suggestedCodeSnippet,
        confidence: c.confidence,
        ruleId: c.ruleId,
      });
    }
  }

  // 9. Apply Repository Rules & Deduplication
  const { filteredComments } = applyRepoRulesToComments(rawComments, settings);

  // 10. Calculate Risk and Overall Health Score
  const { risk, score } = calculateRiskAndScore(filteredComments);

  const reviewSummary: ReviewSummary = {
    id: reviewId,
    repo,
    prNumber,
    prTitle,
    prAuthor,
    prBranch,
    baseBranch,
    headSha,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'completed',
    risk,
    score,
    summary:
      filteredComments.length > 0
        ? `Identified ${filteredComments.length} actionable item(s). Risk evaluated as ${risk.toUpperCase()} (Score: ${score}/100).`
        : `All checked files conform to security and code guidelines. No critical vulnerabilities or quality issues identified.`,
    keyChanges: Array.from(new Set(aggregatedKeyChanges)),
    securityConcerns: Array.from(new Set(aggregatedSecurityConcerns)),
    commentsCount: filteredComments.length,
    comments: filteredComments,
    tokensUsed: {
      input: totalInputTokens,
      output: totalOutputTokens,
      estimatedCostUsd: Number(totalCost.toFixed(6)),
    },
    durationMs: totalDuration,
    model: settings.model,
    idempotencyKey,
    diffText,
    secretsRedactedCount,
    redactedItems,
  };

  db.saveReview(reviewSummary);

  db.addAuditLog({
    event: 'review_completed',
    severity: 'info',
    details: `Review completed for ${repo} PR #${prNumber}. Score: ${score}/100, Risk: ${risk}, Comments: ${filteredComments.length}, Redacted Secrets: ${secretsRedactedCount}`,
    repo,
    prNumber,
  });

  return reviewSummary;
}
