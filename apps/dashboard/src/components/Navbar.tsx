import React, { useEffect, useState } from 'react';
import { GitMerge, LayoutGrid, GitPullRequest, Terminal, ShieldCheck, Settings, LogIn, Github, LogOut, ExternalLink, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchAuthStatus, getGoogleSignInUrl, signOut } from '../services/api.js';
import type { AuthStatus } from '../services/api.js';

type Tab = 'overview' | 'reviews' | 'sandbox' | 'audit' | 'settings';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSandbox?: () => void;
  appInstallUrl?: string | null;
}

const NAV_ITEMS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview',  label: 'Overview',   icon: LayoutGrid },
  { id: 'reviews',   label: 'Reviews',    icon: GitPullRequest },
  { id: 'sandbox',   label: 'Sandbox',    icon: Terminal },
  { id: 'audit',     label: 'Audit Log',  icon: ShieldCheck },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, appInstallUrl }) => {
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
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <>
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-mark">
            <GitMerge size={16} color="white" />
          </div>
          <span className="app-brand-name">RevAI</span>
        </div>

        {/* Nav tabs */}
        <nav className="app-nav-tabs" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`tab-btn${activeTab === id ? ' active' : ''}`}
              aria-current={activeTab === id ? 'page' : undefined}
              title={label}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Action */}
        <div className="app-nav-action">
          {appInstallUrl ? (
            <a
              className="app-install-link"
              href={appInstallUrl}
              target="_blank"
              rel="noreferrer"
              title="Install RevAI on a GitHub repository"
            >
              <Github size={14} />
              Connect GitHub
            </a>
          ) : (
            <button className="app-install-link" type="button" onClick={() => setShowGithubGuide(true)} title="Learn how to connect a GitHub repository">
              <Github size={14} />
              Set up GitHub
            </button>
          )}
          {auth.user ? (
            <button
              className="btn-primary"
              type="button"
              onClick={() => void handleSignOut()}
              title={`Signed in as ${auth.user.login}. Click to sign out.`}
              aria-label={`Sign out ${auth.user.login}`}
            >
              <span className="account-name">{auth.user.login}</span>
              <LogOut size={13} />
            </button>
          ) : (
            <a className="btn-primary" href={getGoogleSignInUrl()}>
              <LogIn size={13} />
              Sign in with Google
            </a>
          )}
        </div>
      </div>
    </header>
    {showGithubGuide && (
      <div
        role="presentation"
        onClick={(event) => { if (event.target === event.currentTarget) setShowGithubGuide(false); }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(5px)' }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="github-setup-title"
          style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 24, borderRadius: 16, border: '1px solid var(--border-bright)', background: 'var(--bg-1)', color: 'var(--text)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow"><span className="eyebrow-mark" />GitHub integration</div>
              <h2 id="github-setup-title" style={{ margin: '8px 0', fontSize: 22 }}>Connect a repository</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6, fontSize: 13 }}>
                This one-time setup lets RevAI receive pull requests and publish code review comments. It is separate from signing in to RevAI.
              </p>
            </div>
            <button className="btn-ghost" type="button" onClick={() => setShowGithubGuide(false)} aria-label="Close GitHub setup guide">
              <X size={17} />
            </button>
          </div>

          <ol style={{ display: 'grid', gap: 14, paddingLeft: 22, margin: '20px 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>
            <li><strong style={{ color: 'var(--text)' }}>Create a GitHub App.</strong> Give it a name and set its Homepage URL to <code>https://revai-service.onrender.com</code>.</li>
            <li><strong style={{ color: 'var(--text)' }}>Set its webhook.</strong> Use <code>https://revai-service.onrender.com/api/webhooks/github</code> and the same secret as Render’s <code>GITHUB_WEBHOOK_SECRET</code>.</li>
            <li><strong style={{ color: 'var(--text)' }}>Grant access.</strong> Set Repository permissions for Pull requests to <strong>Read and write</strong>, then subscribe to the <strong>Pull request</strong> event. Choose only the repositories you want reviewed.</li>
            <li><strong style={{ color: 'var(--text)' }}>Add the app details to Render.</strong> Add the App ID, App slug, and generated private key as <code>GITHUB_APP_ID</code>, <code>GITHUB_APP_SLUG</code>, and <code>GITHUB_PRIVATE_KEY</code>.</li>
            <li><strong style={{ color: 'var(--text)' }}>Install the app.</strong> Save the GitHub App, install it on your selected repositories, then return here.</li>
          </ol>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button className="btn-ghost" type="button" onClick={() => setShowGithubGuide(false)}>Not now</button>
            <a className="btn-primary" href="https://github.com/settings/apps/new" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <Github size={14} />
              Create GitHub App
              <ExternalLink size={13} />
            </a>
          </div>
        </section>
      </div>
    )}
    </>
  );
};
