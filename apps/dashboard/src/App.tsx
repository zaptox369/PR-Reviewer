import React, { useCallback, useEffect, useState } from 'react';
import { Navbar, Tab } from './components/Navbar.js';
import { StatsCards } from './components/StatsCards.js';
import { ReviewList } from './components/ReviewList.js';
import { ReviewDetailModal } from './components/ReviewDetailModal.js';
import { SandboxSimulator } from './components/SandboxSimulator.js';
import { BlastRadiusView } from './components/BlastRadiusView.js';
import { SecurityAuditView } from './components/SecurityAuditView.js';
import { RepoSettingsView } from './components/RepoSettingsView.js';
import { OverviewShowcase } from './components/OverviewShowcase.js';
import { 
  fetchAuthStatus, 
  fetchReviews, 
  fetchStats, 
  fetchAuditLogs, 
  fetchRepos, 
  fetchGithubIntegration, 
  rerunReview 
} from './services/api.js';
import { ReviewSummary, SystemStats, SecurityAuditEntry, RepoSettings } from './types/index.js';
import { 
  GitMerge, 
  Lock, 
  Shield, 
  Zap, 
  Flame, 
  ArrowRight, 
  Share2, 
  Terminal, 
  RotateCcw,
  Sparkles,
  Activity
} from 'lucide-react';

const pageMeta: Record<Tab, { eyebrow: string; title: string; description: string }> = {
  overview: { 
    eyebrow: 'Workspace Overview', 
    title: 'Rehearse the merge before it breaks production.', 
    description: 'A flight simulator for your pull requests. Simulate shocks, detect regressions, and hear three AI reviewers argue over the commit.' 
  },
  reviews: { 
    eyebrow: 'Pull Request Activity', 
    title: 'Pull request reviews', 
    description: 'Inspect automated code reviews, consensus verdicts, and line-level diff suggestions.' 
  },
  sandbox: { 
    eyebrow: 'PR Flight Simulator', 
    title: 'Test code shocks safely', 
    description: 'Inject vulnerability scenarios and observe multi-agent reviewer debates in real-time.' 
  },
  blast: { 
    eyebrow: 'Propagation Map', 
    title: 'PR Blast radius & dependencies', 
    description: 'Trace how diff modifications travel through microservices, caches, and storage tiers.' 
  },
  audit: { 
    eyebrow: 'Security & Compliance', 
    title: 'Immutable audit trail', 
    description: 'Explore the cryptographic HMAC verifications, prompt injection shields, and secret scrubs.' 
  },
  settings: { 
    eyebrow: 'Guardrail Configuration', 
    title: 'Review rules & engine', 
    description: 'Tune sensitivity thresholds, AI providers, and strict privacy mode across repositories.' 
  },
};

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['overview', 'reviews', 'sandbox', 'blast', 'audit', 'settings'].includes(hash)) return hash;
    }
    return 'overview';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['overview', 'reviews', 'sandbox', 'blast', 'audit', 'settings'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };
  const [selectedShockPreset, setSelectedShockPreset] = useState<string>('sqliAndSecrets');
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [repos, setRepos] = useState<RepoSettings[]>([]);
  const [appInstallUrl, setAppInstallUrl] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(() => {
    const error = new URLSearchParams(window.location.search).get('auth_error');
    if (!error) return null;
    window.history.replaceState({}, '', window.location.pathname);
    const messages: Record<string, string> = {
      not_configured: 'Google sign-in is not set up yet. Configure OAuth credentials on the server, then try again.',
      cancelled: 'Google sign-in was cancelled.',
      invalid_state: 'Sign-in could not be verified. Please try again.',
      failed: 'Google sign-in failed. Please try again later.',
    };
    return messages[error] ?? 'Google sign-in failed. Please try again.';
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
      setLoadError('The dashboard API is not connected. Deploy and configure the server to load reviews and audit data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAuthStatus()
      .then(({ user }) => {
        if (!active) return;
        setSignedIn(Boolean(user));
        setAuthReady(true);
        if (user) void loadAllData();
        else setLoading(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to check sign-in status:', error);
        if (active) { setAuthReady(true); setLoading(false); }
      });
    return () => { active = false; };
  }, [loadAllData]);

  useEffect(() => {
    if (!signedIn) return;
    const interval = window.setInterval(() => void loadAllData(false), 15000);
    return () => window.clearInterval(interval);
  }, [signedIn, loadAllData]);

  useEffect(() => {
    void fetchGithubIntegration()
      .then((integration) => setAppInstallUrl(integration.appConfigured ? integration.installationUrl : null))
      .catch((error: unknown) => console.error('Failed to load GitHub integration status:', error));
  }, []);

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

  const handleSignedOut = () => {
    setSignedIn(false);
    setLoadError(null);
    setReviews([]);
    setStats(null);
    setAuditLogs([]);
    setRepos([]);
    setSelectedReview(null);
  };

  const handleTriggerShock = (presetId: string) => {
    setSelectedShockPreset(presetId);
    handleTabChange('sandbox');
  };

  const currentPage = pageMeta[activeTab];

  return (
    <div className="min-h-screen flex flex-col bg-ink text-bone w-full">
      {/* Floating Pill Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onOpenSandbox={() => setActiveTab('sandbox')} 
        appInstallUrl={appInstallUrl} 
        onSignedOut={handleSignedOut} 
      />

      <main className="app-main">
        {authNotice && (
          <div className="load-error" role="alert">
            <span>{authNotice}</span>
            <button className="btn-ghost text-xs" onClick={() => setAuthNotice(null)}>Dismiss</button>
          </div>
        )}

        {/* Page Heading - only on non-overview tabs (overview has its dedicated Hero Banner) */}
        {activeTab !== 'overview' && (
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-mark" />
                {currentPage.eyebrow}
              </div>
              <h1>{currentPage.title}</h1>
              <p>{currentPage.description}</p>
            </div>
            <div className="heading-meta">
              <span className="live-indicator">
                <span className={`dot-pulse${loadError ? ' offline' : ''}`} />
                {loadError ? 'API offline' : 'Live Gate Active'}
              </span>
              <span className="heading-separator" />
              <span className="heading-date">
                {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </section>
        )}

        {authReady && !signedIn && (
          <div className="pipeline-status" role="status">
            <span>Sign in with Google to view live pull requests, adjust repository policies, and run simulation shocks.</span>
          </div>
        )}

        {signedIn && loadError && (
          <div className="load-error" role="alert">
            <span>{loadError}</span>
            <button className="btn-ghost text-xs" onClick={() => void loadAllData()} disabled={loading}>Retry</button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Crisis Hero Banner with Quick Shocks */}
            <div className="surface p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-ink via-ink-card to-ultra/25 border-line-bright">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/10 text-white text-xs font-semibold border border-line">
                      <Flame size={13} className="text-ember" />
                      Autonomous Flight Simulator for Code
                    </div>
                    <span className="live-indicator">
                      <span className={`dot-pulse${loadError ? ' offline' : ''}`} />
                      {loadError ? 'API offline' : 'Live Gate Active'}
                    </span>
                    <span className="text-xs text-ice/40 font-mono">
                      {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="display text-3xl md:text-5xl text-white font-extrabold tracking-tight leading-tight">
                    Pilots rehearse failure in a simulator. Why not developers?
                  </h1>
                  <p className="serif text-base md:text-lg text-ice/90 leading-relaxed">
                    “Most tools check your linting. RevAI shows you what could break in production, why it matters, and lets three AI reviewers debate before anything is merged.”
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('sandbox')}
                      className="btn-primary py-2.5 px-6 font-bold flex items-center gap-2 shadow-lg"
                    >
                      <Terminal size={15} />
                      Open PR Flight Simulator
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('blast')}
                      className="btn-ghost py-2.5 px-5 flex items-center gap-2"
                    >
                      <Share2 size={15} />
                      Inspect Blast Radius Map
                    </button>
                  </div>
                </div>

                {/* Right Shock Launcher Box */}
                <div className="w-full lg:w-80 p-5 rounded-2xl bg-ink/90 border border-line-bright space-y-3.5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ice/60 uppercase tracking-widest">
                      Quick PR Shocks
                    </span>
                    <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
                  </div>

                  <p className="text-xs text-ice/70">
                    Test how the gatekeeper handles high-consequence failure modes:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleTriggerShock('sqliAndSecrets')}
                      className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left text-xs transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-ember transition-colors">
                          SQLi & Secret Leak
                        </div>
                        <div className="text-[10px] text-ice/50">Unsanitized query + API token</div>
                      </div>
                      <ArrowRight size={13} className="text-ice/40 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerShock('raceCondition')}
                      className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left text-xs transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-amber transition-colors">
                          Ledger Race Condition
                        </div>
                        <div className="text-[10px] text-ice/50">Double-spend concurrency lock</div>
                      </div>
                      <ArrowRight size={13} className="text-ice/40 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerShock('authBypass')}
                      className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left text-xs transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-ultra transition-colors">
                          Auth & IDOR Bypass
                        </div>
                        <div className="text-[10px] text-ice/50">Missing tenant security context</div>
                      </div>
                      <ArrowRight size={13} className="text-ice/40 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Status */}
            {signedIn && !loadError && (
              <div className="pipeline-status">
                <div className="pipeline-status-items">
                  <div className="pipeline-status-item">
                    <span className="status-dot" />
                    <span>API <strong>Connected</strong></span>
                  </div>
                  <span className="pipeline-divider" />
                  <div className="pipeline-status-item">
                    <Lock size={13} className="text-mint" />
                    <span>Zero-Leak Redaction <strong>Active</strong></span>
                  </div>
                  <span className="pipeline-divider" />
                  <div className="pipeline-status-item">
                    <Shield size={13} className="text-ultra" />
                    <span>Cryptographic HMAC <strong>Verified</strong></span>
                  </div>
                </div>
                <button className="status-action" onClick={() => setActiveTab('sandbox')}>
                  <Zap size={13} /> Try the simulator
                </button>
              </div>
            )}

            {/* Stats Cards */}
            <StatsCards stats={stats} loading={loading} />

            {/* Recent PR Reviews Feed */}
            <ReviewList 
              reviews={reviews} 
              loading={loading} 
              onSelectReview={setSelectedReview} 
              onRefresh={() => void loadAllData()} 
              canRefresh={signedIn} 
            />

            {/* Deep Scrollable Project Architecture, Interactive Demos & Comparison Showcase */}
            <OverviewShowcase
              onNavigateTab={handleTabChange}
              onTriggerShock={handleTriggerShock}
            />
          </>
        )}

        {/* TAB 2: REVIEWS */}
        {activeTab === 'reviews' && (
          <ReviewList 
            reviews={reviews} 
            loading={loading} 
            onSelectReview={setSelectedReview} 
            onRefresh={() => void loadAllData()} 
            canRefresh={signedIn} 
          />
        )}

        {/* TAB 3: SIMULATOR */}
        {activeTab === 'sandbox' && (
          <SandboxSimulator 
            onReviewCreated={handleReviewCreated} 
            canRun={signedIn} 
            initialPreset={selectedShockPreset}
          />
        )}

        {/* TAB 4: BLAST RADIUS */}
        {activeTab === 'blast' && (
          <BlastRadiusView />
        )}

        {/* TAB 5: AUDIT */}
        {activeTab === 'audit' && (
          <SecurityAuditView 
            logs={auditLogs} 
            loading={loading} 
            onRefresh={() => void loadAllData()} 
            canRefresh={signedIn} 
          />
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <RepoSettingsView 
            repos={repos} 
            onRefresh={() => void loadAllData()} 
          />
        )}
      </main>

      {/* Footer - Flagship Developer Platform Style */}
      <footer className="mt-auto border-t border-line bg-ink-soft/40">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand & Mission (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <circle cx="12" cy="16" r="7" stroke="#cbd8ff" strokeWidth="2.2" />
                  <circle cx="20" cy="16" r="7" stroke="#1a2fd4" strokeWidth="2.2" />
                  <circle cx="16" cy="16" r="2.5" fill="#ff5a2c" />
                </svg>
                <span className="head text-lg text-white">RevAI Gatekeeper</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-ember/15 text-ember border border-ember/30">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs text-ice/65 max-w-md leading-relaxed">
                An enterprise-grade, privacy-first AI code review engine and flight simulator for GitHub Pull Requests.
                Intercepts diffs via HMAC-SHA256 webhooks, scrubs credentials before LLM dispatch, neutralizes prompt
                injections, and synthesizes multi-agent consensus verdicts.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-ice/60">
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-line">HMAC-SHA256 Verified</span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-line">Zero-Leak Redactor</span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-line">100% Hunk-Snapped</span>
              </div>
            </div>

            {/* Platform Navigation */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-white">Platform</div>
              <ul className="space-y-2 text-xs text-ice/65">
                <li>
                  <button type="button" onClick={() => handleTabChange('overview')} className="hover:text-white transition-colors">
                    Workspace Overview
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTabChange('reviews')} className="hover:text-white transition-colors">
                    Live PR Review Feed
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTabChange('sandbox')} className="hover:text-white transition-colors">
                    PR Flight Simulator
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTabChange('blast')} className="hover:text-white transition-colors">
                    Blast Radius & Dependency Map
                  </button>
                </li>
              </ul>
            </div>

            {/* Security & Governance */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-white">Security & Governance</div>
              <ul className="space-y-2 text-xs text-ice/65">
                <li>
                  <button type="button" onClick={() => handleTabChange('audit')} className="hover:text-white transition-colors">
                    Cryptographic Audit Trail
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTabChange('settings')} className="hover:text-white transition-colors">
                    Repository Rules (.prreviewer.yml)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTriggerShock('sqliAndSecrets')} className="hover:text-white transition-colors">
                    Test Secret Scrubbing Demo
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleTriggerShock('raceCondition')} className="hover:text-white transition-colors">
                    Test Concurrency Shock
                  </button>
                </li>
              </ul>
            </div>

            {/* Supported Engines */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-white">Supported AI Engines</div>
              <ul className="space-y-2 text-xs text-ice/65 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint" /> Google Gemini 1.5 Pro
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint" /> Anthropic Claude 3.5
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint" /> OpenAI GPT-4o
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ultra" /> Ollama (Local Air-Gapped)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" /> Offline Heuristic Engine
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ice/50">
            <div>
              © {new Date().getFullYear()} RevAI Gatekeeper. Advisory-only PR governance — never auto-merges without human sign-off.
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-mint">
                <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
                Zero-Trust Sandbox Ready
              </span>
              <span>•</span>
              <span>MIT Licensed</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Review Detail Modal */}
      {signedIn && selectedReview && (
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
