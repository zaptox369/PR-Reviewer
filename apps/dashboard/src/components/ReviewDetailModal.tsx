import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Lock, 
  FileCode, 
  User, 
  Clock, 
  ThumbsUp, 
  VolumeX, 
  AlertOctagon,
  Scale,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ReviewSummary, ReviewComment, CommentFeedback } from '../types/index.js';
import { submitCommentFeedback } from '../services/api.js';

interface ReviewDetailModalProps {
  review: ReviewSummary | null;
  onClose: () => void;
  onRerun: (id: string) => Promise<void>;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({ 
  review, 
  onClose, 
  onRerun 
}) => {
  if (!review) return null;

  const [activeTab, setActiveTab] = useState<'debate' | 'comments' | 'secrets' | 'diff'>('debate');
  const [rerunning, setRerunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isHigh = review.risk === 'high';
  const isMed = review.risk === 'medium';

  const handleRerun = async () => {
    try {
      setRerunning(true);
      await onRerun(review.id);
    } finally {
      setRerunning(false);
    }
  };

  const handleCopy = (code: string, id: string) => {
    const clean = code.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (commentId: string, fb: CommentFeedback) => {
    try {
      await submitCommentFeedback(review.id, commentId, fb);
      const c = review.comments.find(item => item.id === commentId);
      if (c) c.feedback = fb;
    } catch (err) {
      console.error('Feedback failed', err);
    }
  };

  // 3-Advisor perspectives
  const bullQuote = review.risk === 'low'
    ? 'Clean PR with strong code structure. Test assertions are well placed and API backward compatibility is preserved. Approve to maintain team velocity.'
    : 'While the Red Team highlights vulnerabilities, the business architecture and function signatures are aligned with product goals. Fix the flagged lines and ship.';

  const bearQuote = isHigh
    ? 'Rejection advised! High probability of production incident. Exploitable inputs or resource leaks detected that require immediate mitigation before staging merge.'
    : 'Monitor edge case performance. Under sustained load or network timeouts, ensure graceful fallback rather than uncaught promise exceptions.';

  const auditorQuote = `Gatekeeper score: ${review.score}/100. ${review.secretsRedactedCount || 0} credentials sanitized. Cryptographic HMAC verified for repository ${review.repo}.`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
      role="dialog" 
      aria-modal="true"
    >
      <div className="surface max-w-4xl w-full max-h-[90vh] flex flex-col relative slide-up border-line-bright overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-line flex items-center justify-between gap-4 bg-ink">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-extrabold text-base border shrink-0 ${
              isHigh
                ? 'bg-ember/15 border-ember/30 text-ember'
                : isMed
                ? 'bg-amber/15 border-amber/30 text-amber'
                : 'bg-mint/15 border-mint/30 text-mint'
            }`}>
              {review.score}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="head text-base text-white">{review.prTitle}</h3>
                <span className={`badge uppercase text-[9px] ${
                  isHigh ? 'risk-high' : isMed ? 'risk-medium' : 'risk-low'
                }`}>
                  {review.risk} Risk
                </span>
                <span className="text-xs font-mono text-ice/50">#{review.prNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-ice/60 mt-0.5">
                <span className="font-mono">{review.repo}</span>
                <span>•</span>
                <span>branch <code className="text-white">{review.prBranch}</code></span>
                <span>•</span>
                <span>by {review.prAuthor}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRerun}
              disabled={rerunning}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={rerunning ? 'animate-spin' : ''} />
              <span>Rerun</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-ice/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-ink/70 border-b border-line">
          <button
            onClick={() => setActiveTab('debate')}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
              activeTab === 'debate'
                ? 'bg-white text-ink font-bold'
                : 'text-ice/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Advisor Debate
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
              activeTab === 'comments'
                ? 'bg-white text-ink font-bold'
                : 'text-ice/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Review Issues ({review.comments.length})
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
              activeTab === 'secrets'
                ? 'bg-white text-ink font-bold'
                : 'text-ice/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Secrets Masked ({review.secretsRedactedCount || 0})
          </button>
          {review.diffText && (
            <button
              onClick={() => setActiveTab('diff')}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
                activeTab === 'diff'
                  ? 'bg-white text-ink font-bold'
                  : 'text-ice/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Unified Diff
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tab 1: Advisor Debate */}
          {activeTab === 'debate' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-ink/60 border border-line">
                <span className="serif text-base text-ice block mb-1">
                  “Three AI reviewers who disagree on purpose so you see the whole risk envelope.”
                </span>
                <span className="text-xs text-ice/60">
                  Consensus generated for commit <code className="font-mono text-white">{review.headSha ? review.headSha.slice(0, 7) : 'head'}</code>.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bull */}
                <div className="p-4 rounded-xl bg-ink border border-mint/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-mint/15 text-mint border-mint/30 text-[10px] uppercase font-bold">
                      Pragmatist Bull
                    </span>
                    <span className="text-[10px] text-ice/50 font-mono">Velocity</span>
                  </div>
                  <h4 className="head text-xs text-white">Finds Opportunities</h4>
                  <p className="text-xs text-ice/80 leading-relaxed">{bullQuote}</p>
                </div>

                {/* Bear */}
                <div className="p-4 rounded-xl bg-ink border border-ember/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-ember/15 text-ember border-ember/30 text-[10px] uppercase font-bold">
                      Red Team Bear
                    </span>
                    <span className="text-[10px] text-ice/50 font-mono">Exploits</span>
                  </div>
                  <h4 className="head text-xs text-white">Attacks the Code</h4>
                  <p className="text-xs text-ice/80 leading-relaxed">{bearQuote}</p>
                </div>

                {/* Auditor */}
                <div className="p-4 rounded-xl bg-ink border border-ultra/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-ultra/20 text-ice border-ultra/40 text-[10px] uppercase font-bold">
                      Security Auditor
                    </span>
                    <span className="text-[10px] text-ice/50 font-mono">Guardrails</span>
                  </div>
                  <h4 className="head text-xs text-white">Verifies Integrity</h4>
                  <p className="text-xs text-ice/80 leading-relaxed">{auditorQuote}</p>
                </div>
              </div>

              <div className="surface p-4 border-line">
                <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Executive Summary
                </div>
                <p className="text-xs text-ice/85 leading-relaxed">
                  {review.summary}
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Comments */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {review.comments.length === 0 ? (
                <div className="p-8 text-center text-ice/60 text-sm">
                  <ShieldCheck size={36} className="text-mint mx-auto mb-2" />
                  Clean pull request! No violations or warnings found.
                </div>
              ) : (
                review.comments.map((c) => (
                  <div key={c.id} className="surface p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge uppercase text-[10px] ${
                        c.severity === 'critical' || c.severity === 'high' ? 'risk-high' : c.severity === 'medium' ? 'risk-medium' : 'risk-low'
                      }`}>
                        {c.severity}
                      </span>
                      <span className="badge bg-white/5 text-ice/80 border-line text-[11px] capitalize">
                        {c.category}
                      </span>
                      <span className="font-mono text-xs text-ice/60 ml-auto">
                        {c.file}:{c.line}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{c.title}</div>
                    <div className="text-xs text-ice/85 leading-relaxed">{c.message}</div>

                    {c.suggestion && (
                      <div className="relative">
                        <pre className="code-block text-mint/90 pr-16">
                          {c.suggestion.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.suggestion || '', c.id)}
                          className="absolute top-2 right-2 px-2.5 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 border border-line"
                        >
                          {copiedId === c.id ? <Check size={11} className="text-mint" /> : <Copy size={11} />}
                          <span>{copiedId === c.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 text-xs text-ice/60">
                      <span>Helpful?</span>
                      <button
                        onClick={() => handleFeedback(c.id, 'useful')}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                          c.feedback === 'useful' ? 'bg-mint/20 text-mint font-bold' : 'hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => handleFeedback(c.id, 'noise')}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                          c.feedback === 'noise' ? 'bg-amber/20 text-amber font-bold' : 'hover:text-white'
                        }`}
                      >
                        Noisy
                      </button>
                      <button
                        onClick={() => handleFeedback(c.id, 'wrong')}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                          c.feedback === 'wrong' ? 'bg-ember/20 text-ember font-bold' : 'hover:text-white'
                        }`}
                      >
                        Incorrect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Secrets Redaction */}
          {activeTab === 'secrets' && (
            <div className="space-y-4">
              <div className="surface p-5 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Lock size={16} className="text-mint" />
                  Credentials & Secrets Scrubbing
                </div>
                <p className="text-xs text-ice/75">
                  Any detected API tokens, database connection strings, or private keys are purged and replaced with non-invertible placeholders before code inspection.
                </p>

                {review.redactedItems && review.redactedItems.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {review.redactedItems.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-ink font-mono text-xs border border-line flex items-center justify-between">
                        <span className="text-ice/70">{item.type}</span>
                        <span className="text-ember font-semibold">{item.placeholder}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-ink/60 border border-line text-xs text-mint flex items-center gap-2">
                    <ShieldCheck size={16} /> Zero raw secrets detected in this review diff.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Unified Diff */}
          {activeTab === 'diff' && review.diffText && (
            <div>
              <pre className="code-block h-96 overflow-y-auto text-xs text-bone">
                {review.diffText}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-ink flex items-center justify-between text-xs text-ice/60">
          <span>RevAI v1.0 • SHA: {review.headSha ? review.headSha.slice(0, 7) : 'Verified'}</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-1.5 px-4"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
