import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ReviewSummary, ReviewComment } from '../types/index.js';

const GITHUB_API = 'https://api.github.com';

function createAppJwt(): string {
  if (!env.GITHUB_APP_ID || !env.GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App credentials are not configured.');
  }

  const privateKey = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { iat: now - 60, exp: now + 8 * 60, iss: env.GITHUB_APP_ID },
    privateKey,
    { algorithm: 'RS256' },
  );
}

async function githubRequest(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
}

export async function createInstallationToken(installationId: number): Promise<string> {
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new Error('GitHub webhook is missing a valid installation ID.');
  }

  const response = await githubRequest(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    createAppJwt(),
    { method: 'POST' },
  );
  if (!response.ok) {
    throw new Error(`GitHub installation token request failed (${response.status}).`);
  }

  const data = await response.json() as { token?: string };
  if (!data.token) {
    throw new Error('GitHub returned an installation token response without a token.');
  }
  return data.token;
}

export async function fetchPullRequestDiff(
  owner: string,
  repo: string,
  pullNumber: number,
  token: string,
): Promise<string> {
  const response = await githubRequest(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
    token,
    { headers: { Accept: 'application/vnd.github.diff' } },
  );
  if (!response.ok) {
    throw new Error(`GitHub pull request diff request failed (${response.status}).`);
  }

  const diff = await response.text();
  if (!diff.trim()) {
    throw new Error('GitHub returned an empty pull request diff.');
  }
  return diff;
}

export function formatGitHubCommentBody(comment: ReviewComment): string {
  const severityBadge = {
    critical: '🚨 **CRITICAL**',
    high: '⚠️ **HIGH**',
    medium: '⚡ **MEDIUM**',
    low: '💡 **LOW**',
  }[comment.severity];

  const lines = [
    `${severityBadge} \`[${comment.category.toUpperCase()}]\` **${comment.title}**`,
    '',
    comment.message,
  ];

  if (comment.suggestion) {
    lines.push('', comment.suggestion);
  }
  if (comment.ruleId) {
    lines.push('', `_Rule ID: \`${comment.ruleId}\` (Confidence: ${Math.round(comment.confidence * 100)}%)_`);
  }
  return lines.join('\n');
}

export function formatGitHubReviewSummary(review: ReviewSummary): string {
  const riskColor = review.risk === 'high' ? '🔴 High' : review.risk === 'medium' ? '🟡 Medium' : '🟢 Low';

  return `
## 🛡️ RevAI Code Review Summary

| Metric | Result |
| :--- | :--- |
| **Overall Risk** | **${riskColor}** |
| **Health Score** | **${review.score}/100** |
| **Actionable Findings** | ${review.commentsCount} finding(s) |
| **Review Engine** | \`${review.model}\` |
| **Data Privacy** | ${review.secretsRedactedCount ? `🔒 ${review.secretsRedactedCount} credential(s) auto-redacted before LLM` : '✅ Protected'} |

### 📋 Overview
${review.summary}

${review.keyChanges.length > 0 ? `### 🔍 Key Changes Analyzed\n${review.keyChanges.map((change) => `- ${change}`).join('\n')}\n` : ''}

${review.securityConcerns.length > 0 ? `### 🚨 Security Observations\n${review.securityConcerns.map((concern) => `- ${concern}`).join('\n')}\n` : ''}

---
> 💡 _**Notice:** This automated review is advisory. Human reviewers retain final approval authority._
`.trim();
}

export async function postReviewToGitHub(
  review: ReviewSummary,
  token: string,
  options: { postInlineComments: boolean; postSummaryComment: boolean } = {
    postInlineComments: true,
    postSummaryComment: true,
  },
): Promise<{ posted: boolean; reviewUrl?: string; error?: string }> {
  const [owner, repoName] = review.repo.split('/');
  if (!owner || !repoName) {
    return { posted: false, error: 'Invalid repository name format.' };
  }

  const comments = options.postInlineComments ? review.comments.map((comment) => ({
    path: comment.file,
    line: comment.line,
    side: 'RIGHT',
    body: formatGitHubCommentBody(comment),
  })) : [];

  if (!options.postInlineComments && !options.postSummaryComment) {
    return { posted: false, error: 'GitHub posting is disabled in repository settings.' };
  }

  try {
    const response = await githubRequest(
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/pulls/${review.prNumber}/reviews`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commit_id: review.headSha,
          body: options.postSummaryComment ? formatGitHubReviewSummary(review) : '',
          event: 'COMMENT',
          ...(comments.length > 0 ? { comments } : {}),
        }),
      },
    );

    if (!response.ok) {
      return { posted: false, error: `GitHub review submission failed (${response.status}).` };
    }

    const data = await response.json() as { html_url?: string };
    return { posted: true, reviewUrl: data.html_url };
  } catch (error) {
    return {
      posted: false,
      error: error instanceof Error ? error.message : 'GitHub review submission failed.',
    };
  }
}
