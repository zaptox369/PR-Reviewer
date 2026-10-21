import React, { useState } from 'react';
import { ReviewSummary } from '../types/index.js';
import { GitPullRequest, Search, RotateCcw, ChevronRight, Lock, AlertTriangle, CheckCircle, ShieldAlert, X } from 'lucide-react';

interface ReviewListProps {
  reviews: ReviewSummary[];
  loading: boolean;
  onSelectReview: (review: ReviewSummary) => void;
  onRefresh: () => void;
  canRefresh?: boolean;
}

const RISK_CONFIG = {
  high:   { label: 'High',   cls: 'sev-high',   dot: '#f87171' },
  medium: { label: 'Medium', cls: 'sev-medium',  dot: '#fbbf24' },
  low:    { label: 'Low',    cls: 'sev-low',     dot: '#4ade80' },
};

function SkeletonRow() {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
      <div className="shimmer" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="shimmer" style={{ height: 13, width: '45%', borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 11, width: '70%', borderRadius: 4 }} />
      </div>
      <div className="shimmer" style={{ height: 24, width: 60, borderRadius: 6, flexShrink: 0 }} />
    </div>
  );
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews, loading, onSelectReview, onRefresh, canRefresh = true }) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.prTitle.toLowerCase().includes(q) ||
      r.repo.toLowerCase().includes(q) ||
      r.prAuthor.toLowerCase().includes(q);
    const matchRisk = riskFilter === 'all' || r.risk === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="review-list-header"
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitPullRequest size={15} color="var(--text-2)" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            Reviews
          </span>
          {!loading && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: 99,
                background: 'var(--bg-2)',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
              }}
            >
              {filtered.length}
            </span>
          )}
        </div>

        <div className="review-list-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              color="var(--text-3)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              className="input-field"
              type="text"
              placeholder="Search reviews…"
              aria-label="Search reviews by title, repository, or author"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: 180, fontSize: 13, height: 32, padding: '0 10px 0 30px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Risk filter pills */}
          <div className="risk-filter-group" role="group" aria-label="Filter reviews by risk">
            {(['all', 'high', 'medium', 'low'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                aria-pressed={riskFilter === r}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: riskFilter === r ? 'var(--border-bright)' : 'var(--border)',
                  background: riskFilter === r ? 'var(--bg-2)' : 'transparent',
                  color: riskFilter === r ? 'var(--text)' : 'var(--text-3)',
                  transition: 'all 0.12s',
                  textTransform: 'capitalize',
                }}
              >
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>

          <button
            className="btn-ghost"
            onClick={onRefresh}
            disabled={!canRefresh}
            aria-label="Refresh reviews"
            title={canRefresh ? 'Refresh reviews' : 'Sign in to load reviews'}
            style={{ height: 32, padding: '0 10px', fontSize: 12 }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* List body */}
      <div>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            {reviews.length === 0
              ? canRefresh
                ? 'No reviews yet — connect GitHub or run a review from the Sandbox.'
                : 'No reviews yet — sign in and connect GitHub or run a review from the Sandbox.'
              : (
                <>
                  <p style={{ margin: '0 0 10px' }}>No reviews match your search or risk filter.</p>
                  <button
                    className="btn-ghost"
                    onClick={() => { setSearch(''); setRiskFilter('all'); }}
                  >
                    Clear filters
                  </button>
                </>
              )}
          </div>
        ) : (
          filtered.map((r) => {
            const rc = RISK_CONFIG[r.risk];
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`Open review for ${r.repo} pull request ${r.prNumber}: ${r.prTitle}, ${rc.label} risk`}
                onClick={() => onSelectReview(r)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectReview(r);
                  }
                }}
                style={{
                  padding: '13px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Score ring */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{r.score}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1, marginTop: 1 }}>/100</span>
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {r.repo}#{r.prNumber}
                    </span>
                    <span className={`badge ${rc.cls}`}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: rc.dot, display: 'inline-block' }} />
                      {rc.label}
                    </span>
                    {r.secretsRedactedCount && r.secretsRedactedCount > 0 ? (
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.2)' }}>
                        <Lock size={9} />
                        {r.secretsRedactedCount} masked
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.prTitle}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    by {r.prAuthor} · {r.commentsCount} comment{r.commentsCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <ChevronRight size={15} color="var(--text-3)" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
