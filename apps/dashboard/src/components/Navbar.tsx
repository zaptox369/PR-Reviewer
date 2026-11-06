import React, { useEffect, useState } from 'react';
import { 
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
  Search,
  Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchAuthStatus, getGoogleSignInUrl, signOut } from '../services/api.js';
import type { AuthStatus } from '../services/api.js';

export type Tab = 'overview' | 'reviews' | 'sandbox' | 'blast' | 'audit' | 'settings';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSandbox?: () => void;
  onOpenCommandPalette?: () => void;
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
  onOpenCommandPalette,
  appInstallUrl, 
  onSignedOut 
}) => {
  const [auth, setAuth] = useState<AuthStatus>({ configured: false, user: null });
  const [showGithubGuide, setShowGithubGuide] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          {/* Brand Logo */}
          <button 
            type="button" 
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} 
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

          {/* Navigation Pill tabs (Desktop) */}
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
            {/* Quick Search / Command Palette Trigger (Linear / Raycast style) */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/12 border border-line text-xs text-ice/80 hover:text-white transition-colors"
                title="Open Quick Command Palette (Ctrl+K / ⌘K)"
              >
                <Search size={13} className="text-ice/70" />
                <span className="hidden xl:inline text-ice/60">Quick Jump...</span>
                <kbd className="kbd text-[10px] py-0 px-1.5 hidden sm:inline">⌘K</kbd>
              </button>
            )}

            {appInstallUrl ? (
              <a
                className="app-install-link hidden sm:inline-flex"
                href={appInstallUrl}
                target="_blank"
                rel="noreferrer"
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden lg:inline">Connect GitHub</span>
              </a>
            ) : (
              <button
                className="app-install-link hidden sm:inline-flex"
                type="button"
                onClick={() => setShowGithubGuide(true)}
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden lg:inline">Set up GitHub</span>
              </button>
            )}

            {auth.user ? (
              <div className="flex items-center gap-2">
                {auth.configured ? (
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
                ) : (
                  <span
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-mint/10 px-3 py-1.5 text-xs text-mint border border-mint/25"
                    title="Workspace Operator Mode Active"
                  >
                    <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
                    <span className="font-mono text-[11px] font-semibold">Workspace Ready</span>
                  </span>
                )}
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

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-full bg-white/8 hover:bg-white/15 text-white border border-line"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-20 z-40 md:hidden surface p-3 border-line-bright shadow-card slide-up space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  isActive ? 'bg-white text-ink font-bold' : 'text-ice hover:bg-white/8'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{label}</span>
                </span>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-ember/20 text-ember border border-ember/30 uppercase">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-line flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowGithubGuide(true);
              }}
              className="btn-ghost w-full text-xs py-2"
            >
              <Github size={13} /> Connect GitHub
            </button>
          </div>
        </div>
      )}

      {/* GitHub Guide Modal */}
      {showGithubGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGithubGuide(false)}
        >
          <div
            className="surface max-w-lg w-full p-6 relative slide-up border-line-bright"
            onClick={(e) => e.stopPropagation()}
          >
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
                <li>Set Webhook URL to: <code className="text-ember font-mono text-[11px]">/api/webhooks/github</code></li>
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
