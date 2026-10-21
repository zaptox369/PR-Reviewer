import React, { useEffect, useState } from 'react';
import { GitMerge, LayoutGrid, GitPullRequest, Terminal, ShieldCheck, Settings, LogIn, Github, LogOut } from 'lucide-react';
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
          <a
            className="app-install-link"
            href={appInstallUrl ?? 'https://github.com/settings/apps/new'}
            target="_blank"
            rel="noreferrer"
            title={appInstallUrl ? 'Install RevAI on a repository' : 'Create a GitHub App before connecting repositories'}
          >
              <Github size={14} />
              {appInstallUrl ? 'Connect GitHub' : 'Set up GitHub'}
          </a>
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
  );
};
