import { ReviewSummary, RepoSettings, SecurityAuditEntry, SystemStats, CommentFeedback } from '../types/index.js';

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const normalizedApiBase = configuredApiBase?.replace(/\/+$/, '');
const API_BASE = normalizedApiBase
  ? normalizedApiBase.endsWith('/api')
    ? normalizedApiBase
    : `${normalizedApiBase}/api`
  : '/api';

export interface AuthStatus {
  configured: boolean;
  user: { id: string; login: string; avatarUrl: string } | null;
}

export function getGoogleSignInUrl(): string {
  return `${API_BASE}/auth/google`;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to check sign-in status');
  return res.json();
}

export async function signOut(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to sign out');
}

export async function fetchGithubIntegration(): Promise<{ appConfigured: boolean; installationUrl: string | null }> {
  const res = await fetch(`${API_BASE}/integrations/github`);
  if (!res.ok) throw new Error('Failed to fetch GitHub integration status');
  return res.json();
}

export async function fetchReviews(params?: {
  repo?: string;
  author?: string;
  severity?: string;
  search?: string;
}): Promise<{ reviews: ReviewSummary[]; count: number }> {
  const query = new URLSearchParams();
  if (params?.repo) query.set('repo', params.repo);
  if (params?.author) query.set('author', params.author);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/reviews?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReviewById(id: string): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/${id}`);
  if (!res.ok) throw new Error('Review not found');
  return res.json();
}

export async function rerunReview(id: string): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/${id}/rerun`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to re-run review');
  return res.json();
}

export async function submitCommentFeedback(
  reviewId: string,
  commentId: string,
  feedback: CommentFeedback
): Promise<{ success: boolean; comment: any }> {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}/comments/${commentId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error('Failed to submit comment feedback');
  return res.json();
}

export async function simulateReview(payload: {
  repo: string;
  prNumber?: number;
  prTitle: string;
  prAuthor: string;
  prBranch: string;
  diffText: string;
}): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Review simulation failed');
  }
  return res.json();
}

export async function fetchSampleDiffs(): Promise<Record<string, { title: string; repo: string; diff: string }>> {
  const res = await fetch(`${API_BASE}/reviews/samples`);
  if (!res.ok) throw new Error('Failed to fetch sample diffs');
  return res.json();
}

export async function fetchRepos(): Promise<{ repos: RepoSettings[]; count: number }> {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function updateRepoSettings(id: string, settings: Partial<RepoSettings>): Promise<RepoSettings> {
  const res = await fetch(`${API_BASE}/repos/${id}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update repository settings');
  return res.json();
}

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch system statistics');
  return res.json();
}

export async function fetchAuditLogs(): Promise<{ logs: SecurityAuditEntry[]; count: number }> {
  const res = await fetch(`${API_BASE}/audit`);
  if (!res.ok) throw new Error('Failed to fetch security audit logs');
  return res.json();
}
