import { useState, useEffect } from 'react';
import ToastContainer from './Toast.jsx';
import VaultAccessBanner from './VaultAccessBanner.jsx';
import { useToast } from '../hooks/useToast.js';
import { useVaultStorage } from '../hooks/useVaultStorage.js';
import * as solidOps from '../utils/solid.js';
import * as mockOps from '../utils/mockStorage.js';

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const ops = MOCK_MODE ? mockOps : solidOps;

// Stable reverse-DNS namespace that identifies this app's vault partition.
// Set VITE_APP_NAMESPACE in your .env file (e.g. com.example.myapp).
const APP_NAMESPACE = import.meta.env.VITE_APP_NAMESPACE || 'com.privatedatapod.app';

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
  const [podUrl, setPodUrl] = useState(null);

  // ── Vault ─────────────────────────────────────────────────────────────────
  // storageRef.current is a PodStorage instance once the vault is open.
  // needsApproval=true means this device has no grant yet — show VaultAccessBanner.
  // In MOCK_MODE the vault hook is skipped (data stays in localStorage only).
  const vaultEnabled = !MOCK_MODE;
  const vault = useVaultStorage(podUrl, session.fetch, APP_NAMESPACE);
  const { storageRef, needsApproval, open: openVault, lock: lockVault } = vault;

  // ── Profile + init ────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const p = await ops.fetchProfile(webId, session.fetch);
        setProfile(p);
        setPodUrl(p.storageRoot);
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

  // ── Open vault once pod URL is known ─────────────────────────────────────
  useEffect(() => {
    if (!vaultEnabled || !podUrl) return;
    openVault().catch(err => {
      console.error('Vault open error:', err);
    });
  }, [podUrl, vaultEnabled]);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="spinner-lg" />
      </div>
    );
  }

  function handleLogout() {
    lockVault();
    onLogout();
  }

  return (
    <div className="app-shell">
      {MOCK_MODE && (
        <div className="mock-mode-banner">
          Mock mode — data stored in browser localStorage only
        </div>
      )}
      {vaultEnabled && needsApproval && <VaultAccessBanner podUrl={podUrl} />}
      {/* ── Replace everything below with your application UI ── */}
      <header className="app-shell-header">
        <h1 className="app-shell-title">
          {import.meta.env.VITE_APP_NAME || 'My Solid App'}
        </h1>
        <div className="app-shell-user">
          {profile?.name && <span className="app-shell-username">{profile.name}</span>}
          <button className="btn-outline" onClick={handleLogout}>Sign out</button>
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
