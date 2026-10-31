import React, { useState } from 'react';
import { ReviewSummary } from '../types/index.js';
import { 
  GitPullRequest, 
  Search, 
  RotateCcw, 
  ChevronRight, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  X,
  Clock,
  Layers
} from 'lucide-react';

interface ReviewListProps {
  reviews: ReviewSummary[];
  loading: boolean;
  onSelectReview: (review: ReviewSummary) => void;
  onRefresh: () => void;
  canRefresh?: boolean;
}

export const ReviewList: React.FC<ReviewListProps> = ({ 
  reviews, 
  loading, 
  onSelectReview, 
  onRefresh, 
  canRefresh = true 
}) => {
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
    <div className="surface overflow-hidden">
      {/* Header with Search and Filter Pills */}
      <div className="p-4 md:p-5 border-b border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ultra/20 border border-ultra/40 flex items-center justify-center">
            <GitPullRequest size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="head text-base text-white">Pull Request Reviews</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-ice border border-line">
                {filtered.length}
              </span>
            </div>
            <p className="text-xs text-ice/60">
              Evaluated against safety policies, credential scanners, and multi-agent consensus
            </p>
          </div>
        </div>

        {/* Controls: Search + Risk Pills */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Risk Pills */}
          <div className="flex items-center gap-1 bg-ink/70 p-1 rounded-full border border-line">
            {(['all', 'high', 'medium', 'low'] as const).map((r) => {
              const active = riskFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all ${
                    active
                      ? 'bg-white text-ink font-bold shadow-sm'
                      : 'text-ice/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ice/50 pointer-events-none" />
            <input
              type="text"
              className="input-field pl-8 pr-7 py-1 text-xs h-8"
              placeholder="Search title, repo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ice/60 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          {canRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-full border border-line text-ice/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh reviews"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Review List Items */}
      <div className="divide-y divide-line">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="shimmer h-14 w-full rounded-xl" />
            <div className="shimmer h-14 w-full rounded-xl" />
            <div className="shimmer h-14 w-full rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-ice/60 text-sm">
            <Layers size={36} className="text-ice/30 mx-auto mb-3" />
            <p className="font-semibold text-white">No pull requests match your criteria</p>
            <p className="text-xs text-ice/50 mt-1">
              Try adjusting the risk filter or run a simulation shock in the simulator.
            </p>
          </div>
        ) : (
          filtered.map((rev) => {
            const isHigh = rev.risk === 'high';
            const isMed = rev.risk === 'medium';
            return (
              <div
                key={rev.id}
                onClick={() => onSelectReview(rev)}
                className="p-4 md:p-5 hover:bg-ink-hover/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left details */}
                <div className="flex items-start gap-4">
                  {/* Score badge with Crisis Twin styling */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                    isHigh
                      ? 'bg-ember/15 border-ember/30 text-ember'
                      : isMed
                      ? 'bg-amber/15 border-amber/30 text-amber'
                      : 'bg-mint/15 border-mint/30 text-mint'
                  }`}>
                    {rev.score}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm hover:underline">
                        {rev.prTitle}
                      </span>
                      <span className="text-xs font-mono text-ice/50">
                        #{rev.prNumber || '1'}
                      </span>
                      <span className={`badge uppercase text-[9px] ${
                        isHigh ? 'risk-high' : isMed ? 'risk-medium' : 'risk-low'
                      }`}>
                        {rev.risk} Risk
                      </span>
                      {rev.secretsRedactedCount && rev.secretsRedactedCount > 0 ? (
                        <span className="badge bg-mint/15 text-mint border-mint/30 text-[9px]">
                          <Lock size={10} /> {rev.secretsRedactedCount} Secrets Masked
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ice/60 flex-wrap">
                      <span className="font-mono text-ice/80">{rev.repo}</span>
                      <span>•</span>
                      <span>by <strong className="text-white font-normal">{rev.prAuthor}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-ink border border-line text-ice/70">
                        {rev.prBranch}
                      </span>
                      <span>•</span>
                      <span>{rev.commentsCount} comments</span>
                    </div>
                  </div>
                </div>

                {/* Right metadata & arrow */}
                <div className="flex items-center gap-4 shrink-0 text-xs text-ice/60 self-end md:self-auto">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock size={12} className="text-ice/40" />
                    {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-line flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight size={14} className="text-ice/70" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
