import { useState, useEffect } from 'react';
import ToastContainer from './Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import * as solidOps from '../utils/solid.js';
import * as mockOps from '../utils/mockStorage.js';

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const ops = MOCK_MODE ? mockOps : solidOps;

/**
 * AppShell — the main authenticated app scaffold.
 *
 * This component is the starting point Copilot will replace with your
 * actual application. It handles the common post-login initialisation
 * (profile fetch, inbox setup) and provides toast notifications.
 *
 * Run the /create-app prompt to generate your full application here.
 */
export default function AppShell({ session, webId, onLogout }) {
  const { toasts, addToast, removeToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const p = await ops.fetchProfile(webId, session.fetch);
        setProfile(p);
        // Ensure the user's inbox exists and accepts append (needed for sharing)
        await ops.ensureOwnInboxAppendable(webId, session.fetch);
      } catch (err) {
        console.error('AppShell init error:', err);
        addToast('Could not load profile. Check your pod connection.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [webId, session.fetch]);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="spinner-lg" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {MOCK_MODE && (
        <div className="mock-mode-banner">
          Mock mode — data stored in browser localStorage only
        </div>
      )}
      {/* ── Replace everything below with your application UI ── */}
      <header className="app-shell-header">
        <h1 className="app-shell-title">
          {import.meta.env.VITE_APP_NAME || 'My Solid App'}
        </h1>
        <div className="app-shell-user">
          {profile?.name && <span className="app-shell-username">{profile.name}</span>}
          <button className="btn-outline" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main className="app-shell-main">
        <div className="app-shell-placeholder">
          <h2>Welcome, {profile?.name ?? webId}!</h2>
          <p>Your storage root: <code>{profile?.storageRoot}</code></p>
          <p style={{ color: 'var(--sd-text-2)' }}>
            Run the <strong>/create-app</strong> prompt in GitHub Copilot Chat
            to generate your application here.
          </p>
        </div>
      </main>
      {/* ── End of placeholder UI ── */}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
