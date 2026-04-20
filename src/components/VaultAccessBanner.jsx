/**
 * VaultAccessBanner — shown when the user's vault grant has not been issued yet.
 *
 * Display this component when `needsApproval` from `useVaultStorage` is true.
 * It instructs the user to visit their Account page to approve this device.
 */
export default function VaultAccessBanner({ podUrl }) {
  // Build a link to the CSS account page (the /account/ route on the pod origin)
  const accountUrl = podUrl
    ? new URL('/.account/', podUrl).href
    : 'https://privatedatapod.com/.account/';

  return (
    <div className="vault-banner">
      <span className="vault-banner-icon">🔐</span>
      <div className="vault-banner-text">
        <strong>Encrypted storage not yet unlocked.</strong>
        <span>
          {' '}To enable secure data storage, open your{' '}
          <a href={accountUrl} target="_blank" rel="noreferrer">
            Account page
          </a>{' '}
          and approve this device under <em>Pending Approvals</em>.
        </span>
      </div>
    </div>
  );
}
