/**
 * Mock implementations of solid.js functions, backed by localStorage.
 * Used when VITE_MOCK_MODE=true so the app can be developed/tested
 * without a real Solid pod or OIDC login.
 */

const STORE_PREFIX = 'mock_pod:';

function key(url) { return STORE_PREFIX + url; }

// ─── Profile ────────────────────────────────────────────────────────────────

export function fetchProfile(_webId, _fetch) {
  return Promise.resolve({
    name: 'Mock User',
    storageRoot: 'mock://pod/',
    avatar: null,
  });
}

// ─── Container ───────────────────────────────────────────────────────────────

export function createFolder(_url, _fetch) {
  return Promise.resolve();
}

export function ensureOwnInboxAppendable(_webId, _fetch) {
  return Promise.resolve();
}

/**
 * Lists all items stored under a container URL.
 * Returns objects shaped like the real listContainer result items.
 */
export function listContainer(containerUrl, _fetch) {
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k.startsWith(STORE_PREFIX)) continue;
    const url = k.slice(STORE_PREFIX.length);
    if (url.startsWith(containerUrl) && !url.slice(containerUrl.length).includes('/')) {
      const name = url.slice(containerUrl.length);
      if (name) items.push({ url, name, isFolder: false, modified: null, size: null });
    }
  }
  return Promise.resolve(items);
}

// ─── File operations ─────────────────────────────────────────────────────────

/**
 * Mock session.fetch — handles HEAD checks and JSON reads used in AppShell.
 */
export function mockFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // HEAD — return 200 if exists, 404 if not
  if (method === 'HEAD') {
    const exists = localStorage.getItem(key(url)) !== null;
    return Promise.resolve({ ok: exists, status: exists ? 200 : 404 });
  }

  // GET — return stored JSON
  if (method === 'GET') {
    const raw = localStorage.getItem(key(url));
    if (!raw) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('Not found')),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(raw)),
    });
  }

  return Promise.resolve({ ok: true, status: 200 });
}

/**
 * Writes a Blob/File to localStorage (reads it as text first).
 */
export async function uploadFile(url, blob, _fetch) {
  const text = await blob.text();
  localStorage.setItem(key(url), text);
}

export function deleteResource(url, _fetch) {
  localStorage.removeItem(key(url));
  return Promise.resolve();
}

// ─── Mock session & identity ─────────────────────────────────────────────────

export const MOCK_WEB_ID = 'mock://user#me';

export const mockSession = {
  info: { isLoggedIn: true, webId: MOCK_WEB_ID },
  fetch: mockFetch,
};
