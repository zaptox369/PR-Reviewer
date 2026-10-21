import React from 'react';
import { SystemStats } from '../types/index.js';
import { GitPullRequest, MessageSquare, Shield, Zap, TrendingUp, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardsProps {
  stats: SystemStats | null;
  loading: boolean;
}

function Skeleton() {
  return <div className="shimmer" style={{ height: 24, borderRadius: 6, width: '60%' }} />;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: LucideIcon;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="surface surface-hover" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `${color}14`,
            border: `1px solid ${color}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={14} color={color} />
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
          )}
        </>
      )}
    </div>
  );
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const riskBars = stats
    ? [
        { label: 'High', val: stats.riskDistribution.high, color: '#ef4444' },
        { label: 'Medium', val: stats.riskDistribution.medium, color: '#f59e0b' },
        { label: 'Low', val: stats.riskDistribution.low, color: '#22c55e' },
      ]
    : [];
  const total = riskBars.reduce((s, x) => s + x.val, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4-col stat cards */}
      <div className="stats-grid" style={{ display: 'grid', gap: 12 }}>
        <StatCard
          label="Total Reviews"
          value={stats?.totalReviews ?? 0}
          sub={`${stats?.totalComments ?? 0} comments generated`}
          icon={GitPullRequest}
          color="#2496ed"
          loading={loading}
        />
        <StatCard
          label="Avg Health Score"
          value={stats?.totalReviews ? `${stats.avgScore}/100` : '—'}
          sub={stats?.totalReviews ? 'Across all repositories' : 'No reviews yet'}
          icon={TrendingUp}
          color="#22c55e"
          loading={loading}
        />
        <StatCard
          label="Secrets Blocked"
          value={stats?.secretsRedactedTotal ?? 0}
          sub="PII & tokens masked before LLM"
          icon={Lock}
          color="#3b82f6"
          loading={loading}
        />
        <StatCard
          label="Incidents Blocked"
          value={stats?.securityIncidentsBlocked ?? 0}
          sub="Injection attacks defused"
          icon={Shield}
          color="#f59e0b"
          loading={loading}
        />
      </div>

      {/* Two-col row: risk distribution + category breakdown */}
      <div className="stats-breakdown" style={{ display: 'grid', gap: 12 }}>
        {/* Risk distribution */}
        <div className="surface" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Risk Distribution
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[70, 45, 25].map((w, i) => (
                <div key={i} className="shimmer" style={{ height: 14, borderRadius: 6, width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {riskBars.map(({ label, val, color }) => {
                const pct = Math.round((val / total) * 100);
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{val}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${val > 0 ? Math.max(pct, 2) : 0}%`,
                          background: color,
                          borderRadius: 99,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="surface" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Findings by Category
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 26, width: 80, borderRadius: 6 }} />
              ))}
            </div>
          ) : stats ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(stats.categoryDistribution).map(([cat, count]) => (
                <div
                  key={cat}
                  className="badge"
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-bright)',
                    color: 'var(--text-2)',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{count}</span>
                  <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
