import { useState, useRef } from 'react';
import {
  PodStorage,
  VaultAccessDeniedError,
  getOrCreateDelegationKeyPair,
  publishDelegationPublicKey,
} from '@privatedatapod/vault-sdk';

/** Derive a human-readable device label from the User-Agent string. */
function getDeviceName() {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'Mac';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  return `${os} (${browser})`;
}

/**
 * useVaultStorage — manages an encrypted PodStorage session.
 *
 * Uses delegation-only mode: the user approves this device once on their
 * Account page at privatedatapod.com. No passphrase is ever collected by
 * the app itself.
 *
 * @param {string}   podUrl       - User's pod root URL (from profile.storageRoot)
 * @param {Function} fetchFn      - Authenticated fetch from Solid OIDC (session.fetch)
 * @param {string}   appNamespace - Stable reverse-DNS app identifier, e.g. "com.example.myapp"
 *
 * @returns {{
 *   storageRef: React.MutableRefObject<PodStorage|null>,
 *   isEncrypted: boolean,
 *   isDelegated: boolean,
 *   needsApproval: boolean,
 *   error: Error|null,
 *   open: () => Promise<{needsApproval: boolean}>,
 *   lock: () => void,
 * }}
 *
 * Usage:
 *   const { storageRef, needsApproval, open, lock } = useVaultStorage(
 *     profile.storageRoot, session.fetch, 'com.example.myapp'
 *   );
 *
 *   // Call open() once after profile loads:
 *   await open();
 *
 *   // If needsApproval is true, show <VaultAccessBanner />.
 *   // Otherwise use storageRef.current to read/write encrypted files:
 *   await storageRef.current.put('notes.txt', encoded, 'text/plain');
 *   const bytes = await storageRef.current.get('notes.txt');
 */
export function useVaultStorage(podUrl, fetchFn, appNamespace) {
  const storageRef = useRef(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isDelegated, setIsDelegated] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Open the vault using a delegation grant. Call once after profile loads.
   * Returns { needsApproval: boolean }.
   */
  async function open() {
    if (storageRef.current) return { needsApproval: false };
    setError(null);
    setNeedsApproval(false);
    try {
      const s = await PodStorage.open({
        podUrl,
        fetch: fetchFn,
        appNamespace,
        delegation: true,
        rdfIndex: true,
      });
      // Publish/update delegation public key — best-effort, never blocks vault open
      try {
        await s.registerDelegationKey(getDeviceName());
      } catch (regErr) {
        console.warn('[vault] registerDelegationKey failed (non-fatal):', regErr?.message);
      }
      storageRef.current = s;
      setIsEncrypted(s.isEncrypted);
      setIsDelegated(s.isDelegated);
      const approval = s.isEncrypted && !s.isDelegated;
      setNeedsApproval(approval);
      return { needsApproval: approval };
    } catch (err) {
      if (err instanceof VaultAccessDeniedError) {
        // No grant yet — still register the public key so the Account page
        // shows a "Pending approval" entry.
        try {
          const { publicKeyJwk, thumbprint } = await getOrCreateDelegationKeyPair(appNamespace);
          await publishDelegationPublicKey(fetchFn, podUrl, appNamespace, publicKeyJwk, thumbprint, getDeviceName());
        } catch (publishErr) {
          console.warn('[vault] key registration failed (non-fatal):', publishErr?.message);
        }
        setNeedsApproval(true);
        return { needsApproval: true };
      }
      setError(err);
      throw err;
    }
  }

  /** Lock the vault and clear the in-memory key. Call on logout. */
  function lock() {
    storageRef.current?.lock();
    storageRef.current = null;
    setIsEncrypted(false);
    setIsDelegated(false);
    setNeedsApproval(false);
  }

  return { storageRef, isEncrypted, isDelegated, needsApproval, error, open, lock };
}
