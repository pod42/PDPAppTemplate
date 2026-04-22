# PDPAppTemplate

A production-ready scaffold for building web applications that store user data on [Solid Pods](https://solidproject.org). Clone this repo, answer a Copilot prompt, and have a fully working app in minutes.

The recommended pod provider is **[privatedatapod.com](https://privatedatapod.com)**.

---

## What Is a Solid Pod?

A Solid Pod is personal online storage that *you* control. Instead of your data living inside a company's database, it lives in your Pod — and applications request permission to read or write it. You can revoke that access at any time, move your Pod to a different provider, and use multiple apps against the same data.

This template gives developers a pre-wired React app that authenticates with any Solid identity provider, reads the user's profile, and stores app data in the user's own Pod storage.

---

## Quick Start

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Included with Node |
| Git | any | |
| GitHub Copilot | latest | Required for app generation |

### 1 — Clone and install

```bash
git clone https://github.com/pod42/PDPAppTemplate.git my-new-app
cd my-new-app
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_APP_NAME=My Recipe App
VITE_APP_SHORT_NAME=Recipes
VITE_APP_DESCRIPTION=Store and manage recipes on your Solid Pod
VITE_APP_DOMAIN=recipes.example.com
VITE_THEME_COLOR=#1A73E8
VITE_BG_COLOR=#F8F9FA
VITE_SUPPORT_EMAIL=support@example.com
```

> **Tip — Mock Mode:** Add `VITE_MOCK_MODE=true` to your `.env` to run the app locally without a Solid pod or OIDC login. Data is stored in browser `localStorage`. Remove the flag before deploying. See [Mock Mode](#mock-mode) for details.

### 3 — Update the OIDC client registration

Edit `public/client-id.json` — replace every occurrence of `YOUR-APP-DOMAIN` with your production domain:

```json
{
  "client_id": "https://recipes.example.com/client-id.json",
  "client_name": "My Recipe App",
  "redirect_uris": [
    "https://recipes.example.com/",
    "http://localhost:5173/"
  ],
  "client_uri": "https://recipes.example.com/"
}
```

> **Why this file matters:** Solid identity providers validate the `client_id` URI during login. The file must be publicly reachable at that URL once deployed. For local dev, `http://localhost:5173/` is already included.

### 4 — Generate your application with Copilot

Start the dev server:

```bash
npm run dev
```

Open **GitHub Copilot Chat** in VS Code, then type the `/create-app` prompt followed by a description:

```
/create-app build me a recipe manager that stores recipes on my pod, 
with a list view, a detail view, and the ability to add/edit/delete recipes
```

Copilot will:
1. Plan the data model and component structure
2. Replace `src/components/AppShell.jsx` with your full application
3. Add all component styles to `src/app.css`
4. Update `.env.example` with appropriate app metadata

### 5 — Sign in and test

Open `http://localhost:5173` in a browser. Sign in with a Solid Pod account (create a free one at [privatedatapod.com](https://privatedatapod.com) if you don't have one). Your app will initialize its data folder on your pod automatically on first login.

---

## Project Structure

```
PDPAppTemplate/
├── .env.example                    ← copy to .env and fill in
├── .github/
│   ├── copilot-instructions.md     ← always-loaded Copilot context (Solid API, CSS tokens)
│   └── prompts/
│       └── create-app.prompt.md   ← /create-app slash command
├── .vscode/
│   └── extensions.json             ← recommends GitHub Copilot
├── CONTEXT.md                      ← detailed reference for this template
├── deploy/
│   ├── deploy.ps1                  ← AWS S3 + CloudFront deploy script
│   └── state.json                  ← persisted distribution ID (gitignored)
├── public/
│   ├── client-id.json              ← Solid OIDC client registration
│   └── icons/                      ← PWA icons (generate with npm run icons)
├── src/
│   ├── App.jsx                     ← auth router: loading → login → app
│   ├── app.css                     ← ALL styles (tokens, login, modals, toasts)
│   ├── index.css                   ← minimal box-sizing reset only
│   ├── main.jsx                    ← entry point, installs error logging
│   ├── components/
│   │   ├── AppShell.jsx            ← ← ← REPLACE THIS with your application
│   │   ├── LoginScreen.jsx         ← OIDC login UI
│   │   ├── Modal.jsx               ← generic accessible modal
│   │   ├── SupportModal.jsx        ← support email + diagnostics dialog
│       ├── Toast.jsx               ← toast notification UI
│       └── VaultAccessBanner.jsx   ← shown when vault delegation is pending approval
│   ├── hooks/
│   │   ├── useAuth.js              ← OIDC session state (do not modify)
│   │   ├── useToast.js             ← toast state hook (do not modify)
│   │   └── useVaultStorage.js      ← encrypted vault hook (do not modify)
│   ├── lib/
│   │   └── errorLog.js             ← ring-buffer error logger (do not modify)
│   └── utils/
│       ├── solid.js                ← all Solid protocol operations (do not modify)
│       └── fileUtils.js            ← file type helpers, URL builders (do not modify)
├── capacitor.config.json           ← iOS/Android config (optional)
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```

### Files you should modify

| File | When |
|---|---|
| `src/components/AppShell.jsx` | Generated by `/create-app` — your app lives here |
| `src/app.css` | Add styles for your generated components |
| `.env` / `.env.example` | App name, domain, support email |
| `public/client-id.json` | Your production domain |
| `capacitor.config.json` | iOS/Android app ID and hostname |

### Files you should **not** modify

These are infrastructure shared by all Solid apps. Modifying them can break authentication, data operations, or error reporting:

- `src/hooks/useAuth.js`
- `src/hooks/useToast.js`
- `src/hooks/useVaultStorage.js`
- `src/utils/solid.js`
- `src/utils/fileUtils.js`
- `src/lib/errorLog.js`

---

## Solid Utilities Reference

All Solid operations are in `src/utils/solid.js`. Import and call them with `session.fetch` (the authenticated fetch from `useAuth`).

### Profile

```js
import { fetchProfile } from '../utils/solid.js';

const { name, storageRoot, avatar } = await fetchProfile(webId, session.fetch);
// storageRoot → 'https://privatedatapod.com/alice/'
```

### Reading a container

```js
import { listContainer } from '../utils/solid.js';

const items = await listContainer(containerUrl, session.fetch);
// items → [{ url, name, isFolder, modified, size }]
// System containers (.acl, .meta, profile, inbox) are filtered out automatically
```

### Creating a folder

```js
import { createFolder } from '../utils/solid.js';

// Always HEAD-check first — the server returns 409 if the container already exists
try {
  const r = await session.fetch(folderUrl, { method: 'HEAD' });
  if (r.status === 404) await createFolder(folderUrl, session.fetch);
} catch {
  await createFolder(folderUrl, session.fetch);
}
```

### Uploading a file

```js
import { uploadFile } from '../utils/solid.js';
import { buildFileName } from '../utils/fileUtils.js';

const targetUrl = buildFileName(containerUrl, file.name);
await uploadFile(targetUrl, file, session.fetch);
```

### Deleting a resource

```js
import { deleteResource } from '../utils/solid.js';

await deleteResource(url, session.fetch);
// Works for both files and containers (recursive)
```

### Reading / writing structured data (JSON on the pod)

The Solid libraries work with RDF. For simple key/value or JSON data, store it as a plain JSON file:

```js
// Write
const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
await uploadFile(targetUrl, blob, session.fetch);

// Read
const resp = await session.fetch(targetUrl);
const data = await resp.json();
```

### Sharing with another user (WAC + LDN)

```js
import { setAgentAccess, sendShareNotification } from '../utils/solid.js';

// Grant read access
await setAgentAccess(resourceUrl, recipientWebId, { read: true, write: false, append: false, control: false }, session.fetch);

// Notify them via their inbox
await sendShareNotification(recipientWebId, resourceUrl, resourceName, webId, session.fetch);
```

---

## Building Your AppShell

`src/components/AppShell.jsx` is the entry point for your application after login. The simplest pattern is:

```jsx
import { useState, useEffect } from 'react';
import ToastContainer from './Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { fetchProfile, ensureOwnInboxAppendable, createFolder } from '../utils/solid.js';

export default function AppShell({ session, webId, onLogout }) {
  const { toasts, addToast, removeToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [appRoot, setAppRoot] = useState(null);
  const [loading, setLoading] = useState(true);
  // ...your app state

  useEffect(() => {
    async function init() {
      try {
        const p = await fetchProfile(webId, session.fetch);
        setProfile(p);

        // Define your app's data folder on the pod
        const root = p.storageRoot + 'my-app/';
        setAppRoot(root);

        // Create the folder if it doesn't exist yet
        try {
          const r = await session.fetch(root, { method: 'HEAD' });
          if (r.status === 404) await createFolder(root, session.fetch);
        } catch {
          await createFolder(root, session.fetch);
        }

        // Ensure inbox exists (needed if you use sharing features)
        await ensureOwnInboxAppendable(webId, session.fetch);

        // Load your app data here...

      } catch (err) {
        console.error('Init error:', err);
        addToast('Could not load your data. Check your pod connection.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [webId]);

  if (loading) return <div className="app-loading"><span className="spinner-lg" /></div>;

  return (
    <div className="app-shell">
      {/* Your UI */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
```

---

## CSS Design System

All styles live in `src/app.css`. Use the design tokens for consistency:

### Tokens

| Token | Value | Use for |
|---|---|---|
| `--sd-blue` | `#1A73E8` | Primary actions, links |
| `--sd-blue-dark` | `#1557B0` | Hover states |
| `--sd-blue-light` | `#E8F0FE` | Highlighted backgrounds |
| `--sd-green` | `#34A853` | Success, badges |
| `--sd-text` | `#202124` | Primary text |
| `--sd-text-2` | `#5F6368` | Secondary / label text |
| `--sd-border` | `#DADCE0` | Borders, dividers |
| `--sd-bg` | `#F8F9FA` | Page background |
| `--sd-surface` | `#FFFFFF` | Cards, panels |
| `--sd-shadow` | elevation | Card box-shadows |
| `--sd-radius` | `8px` | Border radius |

### Pre-built utility classes

```css
.btn-primary   /* filled blue button */
.btn-outline   /* outlined grey button */
.spinner-lg    /* 40px loading spinner */
.spinner-sm    /* 16px inline spinner */
```

### Pre-built components

| Component | Import | Props |
|---|---|---|
| `Modal` | `./Modal.jsx` | `isOpen, onClose, title, size` (`sm`/`md`/`lg`/`xl`) |
| `ToastContainer` | `./Toast.jsx` | `toasts, onRemove` (from `useToast`) |
| `SupportModal` | `./SupportModal.jsx` | `isOpen, onClose, webId, activeView` |

---

## Deployment

There are two ways to deploy your app. The Private Data Pod Developer Center is the quickest path.

### Option 1 — Private Data Pod Developer Center (recommended)

**[developers.privatedatapod.com](https://developers.privatedatapod.com)** is the fastest way to get your app live. Free accounts include 5 hosted app slots; Pro accounts include 25.

1. Build your app:
   ```bash
   npm run build
   ```
2. Go to [developers.privatedatapod.com](https://developers.privatedatapod.com) and sign in with your pod account.
3. Click **Deploy New App** and upload your `dist/` folder (or drag-and-drop the folder).
4. Your app is live at `https://{your-app-name}.privatedatapod.com` — no AWS account, no DNS setup, no certificates.

The dev center also gives you:
- Per-app storage usage tracking
- One-click redeployment
- Vault SDK documentation and quick-start guides

### Option 2 — AWS S3 + CloudFront (custom domain)

Use this if you need your own domain or full infrastructure control. You need the AWS CLI installed and configured (`aws configure`).

#### First deploy

```powershell
.\deploy\deploy.ps1 -Domain "myapp.example.com"
```

This will:
1. Build the app (`npm run build`)
2. Create an S3 bucket with public access blocked
3. Upload the build to S3
4. Create a CloudFront distribution with HTTPS redirect and SPA routing
5. Print the CloudFront domain (e.g. `d3abc123.cloudfront.net`)
6. Save the distribution ID to `deploy/state.json`

After the first deploy, point your DNS CNAME:
```
myapp.example.com  →  d3abc123.cloudfront.net
```

#### Subsequent deploys

```powershell
.\deploy\deploy.ps1 -Action update -Domain "myapp.example.com"
```

#### Cache bust only

```powershell
.\deploy\deploy.ps1 -Action invalidate
```

#### Custom domain with HTTPS

After pointing DNS, request a certificate in AWS Certificate Manager (**us-east-1 region only**), then update your CloudFront distribution to use the custom domain and certificate.

### Environment variables at build time

All `VITE_` variables in `.env` are embedded at build time by Vite. They are public — do not put secrets in `.env`.

---

## Mock Mode

Mock mode lets you build and test your app locally without a Solid pod or OIDC login. All data is stored in browser `localStorage`.

### Enable mock mode

Add to your `.env`:

```env
VITE_MOCK_MODE=true
```

Then run `npm run dev`. The app loads immediately — no login screen, no pod required. A yellow banner at the top of the screen reminds you that mock mode is active.

### How it works

`src/utils/mockStorage.js` provides drop-in replacements for every `solid.js` function used by `AppShell`:

| Function | Mock behaviour |
|---|---|
| `fetchProfile()` | Returns `{ name: 'Mock User', storageRoot: 'mock://pod/' }` |
| `createFolder()` | No-op |
| `ensureOwnInboxAppendable()` | No-op |
| `listContainer(url)` | Scans `localStorage` keys with prefix `mock_pod:` under the given URL |
| `uploadFile(url, blob)` | Reads blob as text, stores at `localStorage['mock_pod:' + url]` |
| `deleteResource(url)` | Removes the `localStorage` key |
| `mockFetch(url)` | `HEAD` → 200/404; `GET` → parsed JSON or 404; anything else → 200 |

`App.jsx` detects `VITE_MOCK_MODE=true` and bypasses auth entirely, passing `mockSession` (whose `.fetch` is `mockFetch`) directly to `AppShell`.

### Switching between real and mock mode

Change `VITE_MOCK_MODE` in `.env` and restart the dev server. No code changes needed.

> **Important:** Never set `VITE_MOCK_MODE=true` in a production `.env` or build — the variable is embedded at build time.

---

## PWA and Mobile

### Progressive Web App

The app is PWA-ready out of the box via `vite-plugin-pwa`. The service worker caches the app shell for offline load. Pod API requests always go to the network.

### PWA icons

Place your icon source (at least 512×512 PNG) at `public/icons/icon-source.png`, then run:

```bash
npm run icons
```

This generates all required sizes automatically.

### Capacitor iOS / Android (optional)

Update `capacitor.config.json` with your app's bundle ID and hostname, then:

```bash
npm run cap:sync
# Open ios/ in Xcode to build and sign
```

---

## Known Solid Server Quirks

These are handled by `solid.js` but worth knowing if you write custom Solid code:

| Quirk | Detail |
|---|---|
| **Container 409** | `createContainerAt()` returns 409 if the container already exists. Always HEAD-check before creating. |
| **WAC 501** | `getSolidDatasetWithAcl()` tries to parse any file body as Turtle, causing 501 on PDFs, images, etc. Use `getResourceInfoWithAcl()` instead. |
| **CORS on 404** | Some pod servers omit CORS headers on 404 responses. The browser blocks the response entirely, surfacing as a `TypeError`. Wrap HEAD checks in `try/catch`. |
| **Container delete** | `deleteFile()` strips the trailing slash, causing 404 on Solid servers that distinguish containers. Use `fetch(url, { method: 'DELETE' })` directly. |
| **Inbox missing** | Fresh pods may not have an inbox container. `ensureOwnInboxAppendable()` creates it if absent. |

---

## FAQ

**Can I use any Solid pod provider?**  
Yes. The login screen lists `solidcommunity.net`, `inrupt.net`, `solidweb.org`, and `privatedatapod.com`. Users can also type any provider URL. The featured "Recommended" provider is `privatedatapod.com` — edit `LoginScreen.jsx` to change it.

**Can I store data as RDF instead of JSON?**  
Yes. Use `getSolidDataset`, `getThing`, `getUrl`, etc. from `@inrupt/solid-client`. See the [Inrupt documentation](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-data/).

**Why plain JSX and no TypeScript?**  
The template prioritises readability for Copilot code generation. TypeScript can be added by renaming files and adding a `tsconfig.json`.

**The build warns about chunk size — is that a problem?**  
No. The `@inrupt/solid-client` library is large. The warning is cosmetic; the bundle is still efficiently split and GZIP-compressed. CloudFront will serve it with strong caching headers.

**How do I add a new page/view?**  
Create a component in `src/components/`, import it into `AppShell.jsx`, and add a state variable for the active view. There is no client-side router by default — use a simple `view` state string and conditional rendering, or add `react-router-dom` if navigation is complex.

---

## Encrypted Storage with the Vault SDK

This template includes [`@privatedatapod/vault-sdk`](https://github.com/pod42/PDPVault-SDK) — a zero-dependency library for client-side encrypted file storage in Solid pods. All encryption runs in the browser; the server never sees plaintext.

The `useVaultStorage` hook in `src/hooks/useVaultStorage.js` wraps the SDK for React. Use it in your `AppShell.jsx` when you need encrypted storage:

```jsx
import { useVaultStorage } from '../hooks/useVaultStorage.js'

export default function AppShell({ session, webId, onLogout }) {
  const { storage, isEncrypted, isDelegated, needsApproval, open, lock } =
    useVaultStorage(profile?.storageRoot, session.fetch, 'com.example.myapp')

  // open the vault once the profile is loaded
  // encrypted if the user has a Pro plan + vault set up; plaintext otherwise
}
```

When `needsApproval` is true, render `<VaultAccessBanner />` to prompt the user to approve your app on their Account page. After approval, the vault opens silently on every subsequent visit — no passphrase prompt.

Encrypted storage requires a **Pro plan** on [privatedatapod.com](https://privatedatapod.com). Free-plan users get the same API in plaintext mode (`isEncrypted === false`). Your code is identical either way.

Full SDK documentation: [github.com/pod42/PDPVault-SDK](https://github.com/pod42/PDPVault-SDK)

---

## Contributing

This template is maintained by the Private Data Pod team. To report issues or suggest improvements, open an issue or PR at [github.com/pod42/PDPAppTemplate](https://github.com/pod42/PDPAppTemplate).

To build apps with this template and deploy them instantly, visit the [Private Data Pod Developer Center](https://developers.privatedatapod.com).

---

## License

MIT — see `LICENSE` file.
