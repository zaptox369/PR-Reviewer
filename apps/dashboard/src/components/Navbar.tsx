import React, { useEffect, useState } from 'react';
import { 
  GitMerge, 
  LayoutGrid, 
  GitPullRequest, 
  Terminal, 
  ShieldCheck, 
  Settings, 
  LogIn, 
  Github, 
  LogOut, 
  ExternalLink, 
  X,
  Share2,
  Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchAuthStatus, getGoogleSignInUrl, signOut } from '../services/api.js';
import type { AuthStatus } from '../services/api.js';

export type Tab = 'overview' | 'reviews' | 'sandbox' | 'blast' | 'audit' | 'settings';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSandbox?: () => void;
  appInstallUrl?: string | null;
  onSignedOut?: () => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: LucideIcon; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'reviews', label: 'Reviews', icon: GitPullRequest },
  { id: 'sandbox', label: 'Simulator', icon: Terminal, badge: 'Live' },
  { id: 'blast', label: 'Blast Radius', icon: Share2 },
  { id: 'audit', label: 'Audit', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  appInstallUrl, 
  onSignedOut 
}) => {
  const [auth, setAuth] = useState<AuthStatus>({ configured: false, user: null });
  const [showGithubGuide, setShowGithubGuide] = useState(false);

  useEffect(() => {
    void fetchAuthStatus()
      .then(setAuth)
      .catch((error: unknown) => console.error('Failed to load sign-in status:', error));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuth((current) => ({ ...current, user: null }));
      onSignedOut?.();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          {/* Brand Logo - Crisis Twin inspired */}
          <button 
            type="button" 
            onClick={() => setActiveTab('overview')} 
            className="app-brand bg-transparent border-0 text-left p-0"
            aria-label="RevAI Home"
          >
            <div className="app-brand-mark">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="12" cy="16" r="7.5" stroke="#cbd8ff" strokeWidth="2.2" />
                <circle cx="20" cy="16" r="7.5" stroke="#1a2fd4" strokeWidth="2.2" />
                <circle cx="16" cy="16" r="2.8" fill="#ff5a2c" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="app-brand-name">RevAI</span>
              <span className="app-brand-badge">Gate</span>
            </div>
          </button>

          {/* Navigation Pill tabs */}
          <nav className="app-nav-tabs" aria-label="Main navigation">
            {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`tab-btn${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-ice/70'} />
                  <span>{label}</span>
                  {badge && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-ember/20 text-ember border border-ember/30 uppercase tracking-wider">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action pill group */}
          <div className="app-nav-action">
            {appInstallUrl ? (
              <a
                className="app-install-link"
                href={appInstallUrl}
                target="_blank"
                rel="noreferrer"
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden sm:inline">Connect GitHub</span>
              </a>
            ) : (
              <button
                className="app-install-link"
                type="button"
                onClick={() => setShowGithubGuide(true)}
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden sm:inline">Set up GitHub</span>
              </button>
            )}

            {auth.user ? (
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-white border border-line transition-colors"
                  type="button"
                  onClick={() => void handleSignOut()}
                  title={`Signed in as ${auth.user.login}. Click to sign out.`}
                  aria-label={`Sign out ${auth.user.login}`}
                >
                  {auth.user.avatarUrl ? (
                    <img 
                      src={auth.user.avatarUrl} 
                      alt="" 
                      className="w-4 h-4 rounded-full border border-white/20" 
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-mint" />
                  )}
                  <span className="account-name font-medium">{auth.user.login}</span>
                  <LogOut size={11} className="opacity-60 hover:opacity-100 ml-0.5" />
                </button>
              </div>
            ) : (
              <a
                className="btn-primary"
                href={getGoogleSignInUrl()}
                title="Sign in with Google"
              >
                <LogIn size={13} />
                <span>Sign in</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* GitHub Guide Modal */}
      {showGithubGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="surface max-w-lg w-full p-6 relative slide-up border-line-bright">
            <button
              onClick={() => setShowGithubGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-ice/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-line flex items-center justify-center">
                <Github size={20} className="text-white" />
              </div>
              <div>
                <h3 className="head text-lg text-white">Connect GitHub Repository</h3>
                <p className="text-xs text-ice/70">Activate automated PR simulations and gatekeeper reviews</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-ice/85">
              <p>
                To install the RevAI gatekeeper on your GitHub organization:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs bg-ink/60 p-3.5 rounded-xl border border-line">
                <li>Create or configure your <strong>GitHub App</strong> in GitHub Developer Settings.</li>
                <li>Set Webhook URL to: <code className="text-ember font-mono text-[11px]">/api/webhook</code></li>
                <li>Subscribe to <strong>Pull request</strong> and <strong>Issue comment</strong> events.</li>
                <li>Add the App Private Key and Webhook Secret in your server environment variables.</li>
              </ol>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowGithubGuide(false)}
              >
                Close
              </button>
              <a
                className="btn-primary"
                href="https://github.com/settings/apps"
                target="_blank"
                rel="noreferrer"
              >
                GitHub App Settings <ExternalLink size={13} className="ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
