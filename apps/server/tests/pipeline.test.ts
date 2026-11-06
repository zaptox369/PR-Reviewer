import { describe, it, expect } from 'vitest';
import { processReviewPipeline } from '../src/reviewer/pipeline.js';
import { SAMPLE_DIFFS } from '../src/routes/reviews.js';

describe('End-to-End Review Pipeline & Simulator Presets', () => {
  it('exposes all required simulator shock presets for the dashboard', () => {
    const requiredKeys = [
      'sqliAndSecrets',
      'raceCondition',
      'authBypass',
      'cleanPr',
      'dataPrivacySecretLeak',
      'promptInjectionAttack',
      'reactMemoryLeak',
    ] as const;

    for (const key of requiredKeys) {
      expect(SAMPLE_DIFFS[key]).toBeDefined();
      expect(SAMPLE_DIFFS[key].diff.length).toBeGreaterThan(20);
      expect(SAMPLE_DIFFS[key].title.length).toBeGreaterThan(3);
    }
  });

  it('detects SQL injection, redacts secrets, and snaps line numbers in sqliAndSecrets preset', async () => {
    const preset = SAMPLE_DIFFS.sqliAndSecrets;
    const result = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 901,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'fix/sqli-test',
      baseBranch: 'main',
      headSha: `sha-sqli-${Date.now()}`,
      diffText: preset.diff,
      forceRerun: true,
    });

    expect(result.status).toBe('completed');
    expect(result.risk).toBe('high');
    expect(result.score).toBeLessThan(75);
    expect(result.secretsRedactedCount).toBeGreaterThanOrEqual(1);
    expect(result.comments.some((c) => c.ruleId === 'SEC-SQLI-001')).toBe(true);
    expect(result.comments.some((c) => c.ruleId === 'SEC-SECRET-002')).toBe(true);
  });

  it('detects non-atomic balance TOCTOU race conditions in raceCondition preset', async () => {
    const preset = SAMPLE_DIFFS.raceCondition;
    const result = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 902,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'feat/ledger-race',
      baseBranch: 'main',
      headSha: `sha-race-${Date.now()}`,
      diffText: preset.diff,
      forceRerun: true,
    });

    expect(result.status).toBe('completed');
    expect(result.comments.some((c) => c.ruleId === 'REL-RACE-008')).toBe(true);
    expect(result.risk).toBe('high');
  });

  it('detects multi-tenant IDOR missing orgId scope in authBypass preset', async () => {
    const preset = SAMPLE_DIFFS.authBypass;
    const result = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 903,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'refactor/invoices-idor',
      baseBranch: 'main',
      headSha: `sha-idor-${Date.now()}`,
      diffText: preset.diff,
      forceRerun: true,
    });

    expect(result.status).toBe('completed');
    expect(result.comments.some((c) => c.ruleId === 'SEC-IDOR-009')).toBe(true);
    expect(result.risk).toBe('high');
  });

  it('passes clean async refactor with score 100 and low risk', async () => {
    const preset = SAMPLE_DIFFS.cleanPr;
    const result = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 904,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'refactor/clean-async',
      baseBranch: 'main',
      headSha: `sha-clean-${Date.now()}`,
      diffText: preset.diff,
      forceRerun: true,
    });

    expect(result.status).toBe('completed');
    expect(result.risk).toBe('low');
    expect(result.score).toBe(100);
    expect(result.commentsCount).toBe(0);
  });

  it('enforces idempotency cache when forceRerun is false for identical commit SHA', async () => {
    const sha = `sha-idemp-${Date.now()}`;
    const preset = SAMPLE_DIFFS.cleanPr;

    const firstRun = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 905,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'feat/idemp',
      baseBranch: 'main',
      headSha: sha,
      diffText: preset.diff,
      forceRerun: false,
    });

    const secondRun = await processReviewPipeline({
      repo: preset.repo,
      prNumber: 905,
      prTitle: preset.title,
      prAuthor: 'test-runner',
      prBranch: 'feat/idemp',
      baseBranch: 'main',
      headSha: sha,
      diffText: preset.diff,
      forceRerun: false,
    });

    expect(secondRun.id).toBe(firstRun.id);
  });
});

