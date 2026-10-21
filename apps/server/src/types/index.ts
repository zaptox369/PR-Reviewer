export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Category = 
  | 'security'
  | 'bug'
  | 'performance'
  | 'reliability'
  | 'readability'
  | 'testing'
  | 'architecture';

export type ReviewRisk = 'low' | 'medium' | 'high';

export type CommentFeedback = 'useful' | 'noise' | 'wrong';

export type UserRole = 'admin' | 'security_lead' | 'reviewer' | 'developer';

export interface User {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
  githubId?: string;
  createdAt: string;
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface DiffHunkLine {
  type: 'add' | 'del' | 'context';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffHunkLine[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isBinary: boolean;
  isRenamed: boolean;
  hunks: DiffHunk[];
  validLineNumbers: number[]; // Newly added or modified lines in newPath
}

export interface ReviewComment {
  id: string;
  file: string;
  line: number;
  severity: Severity;
  category: Category;
  title: string;
  message: string;
  suggestion?: string; // Markdown suggestion block
  originalCodeSnippet?: string;
  suggestedCodeSnippet?: string;
  confidence: number; // 0.0 - 1.0
  ruleId?: string;
  feedback?: CommentFeedback;
  feedbackAt?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies?: CommentReply[];
}

export interface RedactedSecretItem {
  type: string;
  placeholder: string;
  preview: string;
}

export interface ReviewSummary {
  id: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prBranch: string;
  baseBranch: string;
  headSha: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  risk: ReviewRisk;
  score: number; // 0 - 100 security & quality score
  summary: string;
  keyChanges: string[];
  securityConcerns: string[];
  commentsCount: number;
  comments: ReviewComment[];
  tokensUsed: {
    input: number;
    output: number;
    estimatedCostUsd: number;
  };
  durationMs: number;
  model: string;
  idempotencyKey: string;
  diffText?: string;
  secretsRedactedCount?: number;
  redactedItems?: RedactedSecretItem[];
}

export interface RepoSettings {
  id: string;
  repo: string;
  focus: Category[];
  ignorePaths: string[];
  severityThreshold: Severity;
  maxComments: number;
  customGuidelines: string;
  autoReviewEnabled: boolean;
  postInlineComments: boolean;
  postSummaryComment: boolean;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'heuristic-engine';
  model: string;
  strictPrivacyMode: boolean; // Auto-redact secrets and PII before dispatching to external LLMs
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  event: 
    | 'webhook_received' 
    | 'hmac_verified' 
    | 'hmac_failed' 
    | 'injection_detected' 
    | 'secret_redacted'
    | 'line_hallucination_fixed' 
    | 'review_completed' 
    | 'rate_limit_triggered'
    | 'feedback_recorded'
    | 'user_login'
    | 'comment_resolved'
    | 'comment_reply_added'
    | 'github_review_posted'
    | 'github_review_failed';
  severity: 'info' | 'warning' | 'alert';
  details: string;
  ip?: string;
  repo?: string;
  prNumber?: number;
  metadata?: Record<string, unknown>;
}

export interface QualityMetrics {
  totalFeedback: number;
  usefulCount: number;
  noiseCount: number;
  wrongCount: number;
  usefulRatePct: number;
  noiseRatePct: number;
  wrongRatePct: number;
  lineAccuracyPct: number;
}

export interface SystemStats {
  totalReviews: number;
  totalComments: number;
  avgScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  categoryDistribution: Record<Category, number>;
  totalTokensUsed: number;
  totalEstimatedCostUsd: number;
  avgDurationMs: number;
  securityIncidentsBlocked: number;
  secretsRedactedTotal: number;
  qualityMetrics: QualityMetrics;
}
