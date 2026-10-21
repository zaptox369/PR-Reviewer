import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw, Lock, FileCode, User, Clock, ThumbsUp, VolumeX, AlertOctagon } from 'lucide-react';
import { ReviewSummary, ReviewComment, CommentFeedback } from '../types/index.js';
import { submitCommentFeedback } from '../services/api.js';

interface ReviewDetailModalProps {
  review: ReviewSummary | null;
  onClose: () => void;
  onRerun: (id: string) => Promise<void>;
}

const SEV_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: '#9f1239', bg: '#fff1f2', border: '#fecdd3' },
  high:     { text: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  medium:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  low:      { text: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

function CommentRow({ c, reviewId, onFeedbackChange }: { c: ReviewComment; reviewId: string; onFeedbackChange: (id: string, fb: CommentFeedback) => void }) {
  const sev = SEV_STYLES[c.severity] ?? SEV_STYLES.low;
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (fb: CommentFeedback) => {
    try {
      setLoading(true);
      await submitCommentFeedback(reviewId, c.id, fb);
      onFeedbackChange(c.id, fb);
    } catch {}
    finally { setLoading(false); }
  };

  const copySuggestion = () => {
    const clean = (c.suggestion ?? '').replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/,'').trim();
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Top row: badges + file:line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: sev.bg, color: sev.text, borderColor: sev.border, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em', fontWeight: 700 }}>
          {c.severity}
        </span>
        <span className="badge" style={{ background: 'var(--bg-2)', color: 'var(--text-3)', borderColor: 'var(--border)', textTransform: 'capitalize', fontSize: 11 }}>
          {c.category}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {c.file}:{c.line}
        </span>
        {c.ruleId && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.7 }}>{c.ruleId}</span>
        )}
      </div>

      {/* Title + message */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.message}</div>

      {/* Code suggestion */}
      {c.suggestion && (
        <div style={{ position: 'relative' }}>
          <pre className="code-block" style={{ color: '#86efac', fontSize: 11 }}>
            {c.suggestion.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()}
          </pre>
          <button
            onClick={copySuggestion}
            style={{
              position: 'absolute', top: 8, right: 8, background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 5, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text-2)', transition: 'all 0.12s',
            }}
          >
            {copied ? <><Check size={11} color="#4ade80" />Copied</> : <><Copy size={11} />Copy</>}
          </button>
        </div>
      )}

      {/* Feedback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Was this helpful?</span>
        {(['useful', 'noise', 'wrong'] as CommentFeedback[]).map((fb) => {
          const active = c.feedback === fb;
          const colors = { useful: '#4ade80', noise: '#fbbf24', wrong: '#f87171' };
          return (
            <button
              key={fb}
              disabled={loading || !!c.feedback}
              onClick={() => handleFeedback(fb)}
              style={{
                padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: c.feedback ? 'default' : 'pointer',
                border: '1px solid', transition: 'all 0.12s', textTransform: 'capitalize',
                borderColor: active ? `${colors[fb]}40` : 'var(--border)',
                background: active ? `${colors[fb]}10` : 'transparent',
                color: active ? colors[fb] : 'var(--text-3)',
                opacity: (c.feedback && !active) ? 0.35 : 1,
              }}
            >
              {fb}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({ review, onClose, onRerun }) => {
  const [tab, setTab] = useState<'comments' | 'diff' | 'privacy'>('comments');
  const [rerunning, setRerunning] = useState(false);
  const [comments, setComments] = useState<ReviewComment[]>(review?.comments ?? []);

  if (!review) return null;

  const riskColor = review.risk === 'high' ? '#b91c1c' : review.risk === 'medium' ? '#92400e' : '#166534';

  const handleRerun = async () => {
    try { setRerunning(true); await onRerun(review.id); } finally { setRerunning(false); }
  };

  const handleFeedbackChange = (id: string, fb: CommentFeedback) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, feedback: fb, feedbackAt: new Date().toISOString() } : c));
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="slide-up"
        style={{
          width: '100%', maxWidth: 760, maxHeight: '88vh',
          background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
          borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {review.repo}#{review.prNumber}
              </span>
              <span className="badge" style={{ background: `${riskColor}14`, color: riskColor, borderColor: `${riskColor}35`, textTransform: 'uppercase', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
                {review.risk} risk
              </span>
              <span className="badge" style={{ background: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--border)' }}>
                Score {review.score}/100
              </span>
              {review.secretsRedactedCount && review.secretsRedactedCount > 0 ? (
                <span className="badge" style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.2)' }}>
                  <Lock size={10} /> {review.secretsRedactedCount} masked
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{review.prTitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} />{review.prAuthor}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{new Date(review.createdAt).toLocaleString()}</span>
              <span>·</span>
              <span className="mono">{review.prBranch}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button className="btn-ghost" onClick={handleRerun} disabled={rerunning} style={{ height: 32, fontSize: 12, padding: '0 10px' }}>
              <RefreshCw size={13} style={{ animation: rerunning ? 'spin 0.8s linear infinite' : 'none' }} />
              {rerunning ? 'Re-running…' : 'Re-run'}
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
          {review.summary}
        </div>

        {/* Sub-tabs */}
        <div style={{ padding: '0 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 2 }}>
          {([
            ['comments', `${comments.length} Comments`],
            ['diff', 'Diff View'],
            ['privacy', 'Privacy Log'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '10px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
                color: tab === id ? 'var(--text)' : 'var(--text-3)', transition: 'all 0.12s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'comments' && (
            <div>
              {comments.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                  No issues found — this PR is clean ✓
                </div>
              ) : (
                comments.map(c => (
                  <CommentRow key={c.id} c={c} reviewId={review.id} onFeedbackChange={handleFeedbackChange} />
                ))
              )}
            </div>
          )}

          {tab === 'diff' && (
            <div style={{ padding: 16 }}>
              {review.diffText ? (
                <pre className="code-block" style={{ maxHeight: 480, fontSize: 11, lineHeight: 1.65 }}>
                  {review.diffText}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: 13 }}>
                  Diff not stored for this review.
                </div>
              )}
            </div>
          )}

          {tab === 'privacy' && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {review.redactedItems && review.redactedItems.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
                    The following credentials were auto-masked before the diff was sent to any LLM provider:
                  </div>
                  {review.redactedItems.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <Lock size={13} color="#60a5fa" />
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)', fontSize: 11 }}>
                        {item.type}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{item.preview}</span>
                      <span style={{ marginLeft: 'auto' }} className="mono">→</span>
                      <span className="mono" style={{ fontSize: 11, color: '#4ade80' }}>{item.placeholder}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#4ade80', padding: '40px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <Lock size={15} />
                  No sensitive data detected in this PR's diff.
                </div>
              )}

              {/* Stats */}
              <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['Engine', review.model || 'heuristic-engine'],
                  ['Tokens In', review.tokensUsed.input.toLocaleString()],
                  ['Tokens Out', review.tokensUsed.output.toLocaleString()],
                  ['Est. Cost', `$${review.tokensUsed.estimatedCostUsd.toFixed(5)}`],
                  ['Duration', `${review.durationMs}ms`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
