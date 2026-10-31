import React from 'react';
import { SystemStats } from '../types/index.js';
import { GitPullRequest, ShieldCheck, Zap, TrendingUp, Lock, AlertTriangle, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardsProps {
  stats: SystemStats | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  badgeText,
  badgeColor = 'ice',
  loading,
  bars = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: LucideIcon;
  badgeText?: string;
  badgeColor?: 'ember' | 'mint' | 'ultra' | 'ice';
  loading: boolean;
  bars?: boolean;
}) {
  const badgeCls = {
    ember: 'bg-ember/15 text-ember border-ember/30',
    mint: 'bg-mint/15 text-mint border-mint/30',
    ultra: 'bg-ultra/20 text-ice border-ultra/40',
    ice: 'bg-white/10 text-ice border-line',
  }[badgeColor];

  return (
    <div className="surface surface-hover relative overflow-hidden p-5 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold text-ice/60 uppercase tracking-widest flex items-center gap-1.5">
          <Icon size={13} className="text-ice/70" />
          {label}
        </span>
        {badgeText && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeCls}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      {loading ? (
        <div className="shimmer h-9 w-2/3 rounded-lg my-1" />
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <div className="display text-3xl md:text-4xl text-white font-extrabold tracking-tight">
            {value}
          </div>
          {bars && (
            <div className="flex items-end gap-1 h-7 pb-1" aria-hidden="true">
              <span className="w-1.5 bg-ultra rounded-full h-3 bar-live" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 bg-ice rounded-full h-5 bar-live" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 bg-ember rounded-full h-7 bar-live" style={{ animationDelay: '0.4s' }} />
              <span className="w-1.5 bg-mint rounded-full h-4 bar-live" style={{ animationDelay: '0.1s' }} />
            </div>
          )}
        </div>
      )}

      {/* Subtitle / Context */}
      <div className="mt-3 text-xs text-ice/70 flex items-center justify-between">
        {loading ? (
          <div className="shimmer h-3.5 w-1/2 rounded" />
        ) : (
          <span>{sub}</span>
        )}
      </div>
    </div>
  );
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const highRisk = stats?.riskDistribution.high ?? 0;
  const medRisk = stats?.riskDistribution.medium ?? 0;
  const lowRisk = stats?.riskDistribution.low ?? 0;
  const totalRisks = highRisk + medRisk + lowRisk || 1;

  const pctHigh = Math.round((highRisk / totalRisks) * 100);
  const pctMed = Math.round((medRisk / totalRisks) * 100);
  const pctLow = Math.max(0, 100 - pctHigh - pctMed);

  return (
    <div className="space-y-4">
      {/* 4 Telemetry Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Pull Requests"
          value={stats?.totalReviews ?? 0}
          sub={`${stats?.totalComments ?? 0} AI comments posted`}
          icon={GitPullRequest}
          badgeText="Active Gate"
          badgeColor="ultra"
          loading={loading}
          bars={true}
        />

        <StatCard
          label="Health Score"
          value={stats?.totalReviews ? `${stats.avgScore}` : '—'}
          sub={stats?.totalReviews ? 'Normalized across repositories' : 'Awaiting initial PR'}
          icon={TrendingUp}
          badgeText={stats?.avgScore && stats.avgScore >= 80 ? 'Healthy' : 'Moderate'}
          badgeColor={stats?.avgScore && stats.avgScore >= 80 ? 'mint' : 'ember'}
          loading={loading}
        />

        <StatCard
          label="Secrets Redacted"
          value={stats?.secretsRedactedTotal ?? 0}
          sub="Zero credentials sent upstream"
          icon={Lock}
          badgeText="Zero Leak"
          badgeColor="mint"
          loading={loading}
        />

        <StatCard
          label="Review Latency"
          value={stats?.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '1.4s'}
          sub="Parallel multi-agent evaluation"
          icon={Zap}
          badgeText="High Speed"
          badgeColor="ice"
          loading={loading}
        />
      </div>

      {/* Crisis Twin Style Stress & Risk Distribution Strip */}
      <div className="surface p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-ember" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ice/60">
              PR Risk Exposure Distribution
            </div>
            <div className="text-sm font-medium text-white">
              {stats?.totalReviews ? (
                <span>
                  {highRisk} Critical shocks <span className="text-ice/40 mx-1">•</span> {medRisk} Moderate <span className="text-ice/40 mx-1">•</span> {lowRisk} Safe merges
                </span>
              ) : (
                <span className="text-ice/60">No pull requests analyzed yet. Run a simulator shock above.</span>
              )}
            </div>
          </div>
        </div>

        {/* Visual Segmented Bar */}
        <div className="w-full md:w-80 space-y-1.5">
          <div className="h-2.5 w-full bg-ink rounded-full overflow-hidden flex border border-line">
            <div 
              style={{ width: `${pctHigh}%` }} 
              className="bg-ember transition-all duration-500" 
              title={`High Risk: ${pctHigh}%`}
            />
            <div 
              style={{ width: `${pctMed}%` }} 
              className="bg-amber transition-all duration-500" 
              title={`Medium Risk: ${pctMed}%`}
            />
            <div 
              style={{ width: `${pctLow}%` }} 
              className="bg-mint transition-all duration-500" 
              title={`Low Risk: ${pctLow}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-ice/60 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ember" /> High ({pctHigh}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Med ({pctMed}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-mint" /> Low ({pctLow}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
