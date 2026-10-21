import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { StatsCards } from './components/StatsCards.js';
import { ReviewList } from './components/ReviewList.js';
import { ReviewDetailModal } from './components/ReviewDetailModal.js';
import { SandboxSimulator } from './components/SandboxSimulator.js';
import { SecurityAuditView } from './components/SecurityAuditView.js';
import { RepoSettingsView } from './components/RepoSettingsView.js';
import { fetchReviews, fetchStats, fetchAuditLogs, fetchRepos, rerunReview } from './services/api.js';
import { ReviewSummary, SystemStats, SecurityAuditEntry, RepoSettings } from './types/index.js';
import { GitMerge, Lock, Shield, Zap } from 'lucide-react';

type Tab = 'overview' | 'reviews' | 'sandbox' | 'audit' | 'settings';

const pageMeta: Record<Tab, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'Workspace overview', title: 'Code health, at a glance.', description: 'A clear view of review activity, risk, and the issues that need your attention.' },
  reviews: { eyebrow: 'Review activity', title: 'Pull request reviews', description: 'Search, filter, and inspect automated reviews across your repositories.' },
  sandbox: { eyebrow: 'Interactive playground', title: 'Test a review', description: 'Run a sample or your own diff through the review pipeline, safely.' },
  audit: { eyebrow: 'Security & compliance', title: 'Audit trail', description: 'Explore the security events and safeguards protecting your review pipeline.' },
  settings: { eyebrow: 'Workspace configuration', title: 'Review preferences', description: 'Tune the rules, privacy controls, and review engine for each repository.' },
};

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [repos, setRepos] = useState<RepoSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(() => {
    const error = new URLSearchParams(window.location.search).get('auth_error');
    if (!error) return null;
    window.history.replaceState({}, '', window.location.pathname);
    const messages: Record<string, string> = {
      not_configured: 'GitHub sign-in is not set up yet. Configure the OAuth client credentials on the server, then try again.',
      cancelled: 'GitHub sign-in was cancelled.',
      invalid_state: 'Sign-in could not be verified. Please try again.',
      failed: 'GitHub sign-in failed. Please try again later.',
    };
    return messages[error] ?? 'GitHub sign-in failed. Please try again.';
  });

  const loadAllData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [reviewsData, statsData, logsData, reposData] = await Promise.all([
        fetchReviews(),
        fetchStats(),
        fetchAuditLogs(),
        fetchRepos(),
      ]);
      setReviews(reviewsData.reviews);
      setStats(statsData);
      setAuditLogs(logsData.logs);
      setRepos(reposData.repos);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoadError('The dashboard API is not connected. Deploy and configure the server to load reviews, settings, and audit data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
    const interval = window.setInterval(() => void loadAllData(false), 15000);
    return () => window.clearInterval(interval);
  }, [loadAllData]);

  const handleRerun = async (id: string) => {
    try {
      const updated = await rerunReview(id);
      setSelectedReview(updated);
      await loadAllData();
    } catch (error) {
      console.error('Failed to rerun review:', error);
      setLoadError('Could not rerun this review. Check that the dashboard API is available.');
    }
  };

  const handleReviewCreated = (review: ReviewSummary) => {
    setReviews((current) => [review, ...current]);
    void loadAllData();
  };

  const currentPage = pageMeta[activeTab];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', width: '100%' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSandbox={() => setActiveTab('sandbox')} />

      <main className="app-main">
        {authNotice && (
          <div className="load-error" role="alert">
            <span>{authNotice}</span>
            <button className="btn-ghost" onClick={() => setAuthNotice(null)} aria-label="Dismiss sign-in message">Dismiss</button>
          </div>
        )}
        <section className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-mark" />{currentPage.eyebrow}</div>
            <h1>{currentPage.title}</h1>
            <p>{currentPage.description}</p>
          </div>
          <div className="heading-meta">
            <span className="live-indicator">
              <span className={`dot-pulse${loadError ? ' offline' : ''}`} />
              {loadError ? 'API unavailable' : 'Live system'}
            </span>
            <span className="heading-separator" />
            <span className="heading-date">{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </section>

        {loadError && (
          <div className="load-error" role="alert">
            <span>{loadError}</span>
            <button className="btn-ghost" onClick={() => void loadAllData()} disabled={loading}>Retry</button>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {!loadError && (
              <div className="pipeline-status">
                <div className="pipeline-status-items">
                  <div className="pipeline-status-item">
                    <span className="status-dot" />
                    <span>API <strong>connected</strong></span>
                  </div>
                  <span className="pipeline-divider" />
                  <div className="pipeline-status-item">
                    <Lock size={14} />
                    <span>Secret redaction <strong>active</strong></span>
                  </div>
                  <span className="pipeline-divider" />
                  <div className="pipeline-status-item">
                    <Shield size={14} />
                    <span>Webhook security <strong>verified</strong></span>
                  </div>
                </div>
                <button className="status-action" onClick={() => setActiveTab('sandbox')}>
                  <Zap size={13} /> Try the sandbox
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StatsCards stats={stats} loading={loading} />
              <ReviewList reviews={reviews} loading={loading} onSelectReview={setSelectedReview} onRefresh={() => void loadAllData()} />
            </div>
          </>
        )}

        {activeTab === 'reviews' && (
          <ReviewList reviews={reviews} loading={loading} onSelectReview={setSelectedReview} onRefresh={() => void loadAllData()} />
        )}
        {activeTab === 'sandbox' && <SandboxSimulator onReviewCreated={handleReviewCreated} />}
        {activeTab === 'audit' && (
          <SecurityAuditView logs={auditLogs} loading={loading} onRefresh={() => void loadAllData()} />
        )}
        {activeTab === 'settings' && <RepoSettingsView repos={repos} onRefresh={() => void loadAllData()} />}
      </main>

      <footer className="app-footer" style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <GitMerge size={13} color="var(--text-3)" />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>RevAI <span className="footer-separator">/</span> Autonomous code review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-3)' }}>
          <span>HMAC-SHA256</span><span>Zero-leak redaction</span><span>Verified line references</span>
        </div>
      </footer>

      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onRerun={handleRerun}
        />
      )}
    </div>
  );
}

export default App;
