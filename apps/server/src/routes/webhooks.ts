import { Router, Request, Response } from 'express';
import { verifyGitHubSignature } from '../security/hmac.js';
import { env } from '../config/env.js';
import { db } from '../db/store.js';
import { processReviewPipeline } from '../reviewer/pipeline.js';
import { createInstallationToken, fetchPullRequestDiff, postReviewToGitHub } from '../github/client.js';

export const webhookRouter = Router();

interface PullRequestWebhookPayload {
  action?: string;
  installation?: { id?: number };
  repository?: { full_name?: string };
  pull_request?: {
    number?: number;
    title?: string;
    user?: { login?: string };
    head?: { ref?: string; sha?: string };
    base?: { ref?: string };
  };
}

async function processPullRequest(payload: PullRequestWebhookPayload): Promise<void> {
  const pullRequest = payload.pull_request;
  const repository = payload.repository?.full_name;
  const [owner, repo] = repository?.split('/') ?? [];
  const prNumber = pullRequest?.number;

  if (!owner || !repo || !prNumber || !pullRequest?.head?.sha) {
    throw new Error('GitHub pull request webhook is missing repository or pull request details.');
  }

  const repoSettings = db.getRepoByName(`${owner}/${repo}`);
  if (!repoSettings.autoReviewEnabled) {
    db.addAuditLog({
      event: 'webhook_received',
      severity: 'info',
      details: `Automatic review skipped because it is disabled for ${owner}/${repo}.`,
      repo: `${owner}/${repo}`,
      prNumber,
    });
    return;
  }

  const installationId = payload.installation?.id;
  if (!installationId) {
    throw new Error('GitHub pull request webhook is missing the App installation ID.');
  }

  const installationToken = await createInstallationToken(installationId);
  const diffText = await fetchPullRequestDiff(owner, repo, prNumber, installationToken);
  const review = await processReviewPipeline({
    repo: `${owner}/${repo}`,
    prNumber,
    prTitle: pullRequest.title ?? `Pull request #${prNumber}`,
    prAuthor: pullRequest.user?.login ?? 'unknown',
    prBranch: pullRequest.head.ref ?? 'unknown',
    baseBranch: pullRequest.base?.ref ?? 'main',
    headSha: pullRequest.head.sha,
    diffText,
  });

  if (!repoSettings.postInlineComments && !repoSettings.postSummaryComment) {
    db.addAuditLog({
      event: 'webhook_received',
      severity: 'info',
      details: `Review generated for ${owner}/${repo} PR #${prNumber}; GitHub posting is disabled in repository settings.`,
      repo: `${owner}/${repo}`,
      prNumber,
    });
    return;
  }

  const result = await postReviewToGitHub(review, installationToken, {
    postInlineComments: repoSettings.postInlineComments,
    postSummaryComment: repoSettings.postSummaryComment,
  });
  if (!result.posted) {
    db.addAuditLog({
      event: 'github_review_failed',
      severity: 'alert',
      details: `Review generated for ${owner}/${repo} PR #${prNumber}, but GitHub could not accept the review: ${result.error ?? 'unknown error'}`,
      repo: `${owner}/${repo}`,
      prNumber,
    });
    console.error(`[GitHub] Failed to submit review for ${owner}/${repo}#${prNumber}: ${result.error}`);
    return;
  }

  db.addAuditLog({
    event: 'github_review_posted',
    severity: 'info',
    details: `Advisory review posted to ${owner}/${repo} PR #${prNumber}.`,
    repo: `${owner}/${repo}`,
    prNumber,
    metadata: result.reviewUrl ? { reviewUrl: result.reviewUrl } : undefined,
  });
}

webhookRouter.post('/github', (req: Request, res: Response): void => {
  const signature = req.headers['x-hub-signature-256'];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const clientIp = req.ip || req.socket.remoteAddress;

  if (!rawBody || typeof signature !== 'string' ||
      !verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)) {
    db.addAuditLog({
      event: 'hmac_failed',
      severity: 'alert',
      details: `Unauthorized webhook attempt: signature verification failed for IP ${clientIp}.`,
      ip: clientIp,
    });
    res.status(401).json({ error: 'HMAC signature verification failed' });
    return;
  }

  const eventName = req.headers['x-github-event'];
  const payload = req.body as PullRequestWebhookPayload;
  const repoName = payload.repository?.full_name;
  const prNumber = payload.pull_request?.number;

  db.addAuditLog({
    event: 'hmac_verified',
    severity: 'info',
    details: `Valid GitHub webhook signature received for event "${eventName}".`,
    repo: repoName,
    prNumber,
  });

  if (eventName !== 'pull_request') {
    res.status(200).json({ status: 'ignored', reason: `Unhandled event type: ${eventName}` });
    return;
  }

  const supportedActions = ['opened', 'synchronize', 'reopened'];
  if (!payload.action || !supportedActions.includes(payload.action)) {
    res.status(200).json({
      status: 'ignored',
      reason: `Pull request action "${payload.action ?? 'unknown'}" does not require code review`,
    });
    return;
  }

  res.status(202).json({
    status: 'enqueued',
    message: `Pull request #${prNumber ?? 'unknown'} queued for review`,
    repo: repoName,
    prNumber,
  });

  void processPullRequest(payload).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown review pipeline error.';
    console.error(`[Worker] GitHub pull request review failed: ${message}`);
    db.addAuditLog({
      event: 'github_review_failed',
      severity: 'alert',
      details: `Could not review ${repoName ?? 'unknown repository'} PR #${prNumber ?? 'unknown'}: ${message}`,
      repo: repoName,
      prNumber,
    });
  });
});
