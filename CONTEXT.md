# PDPAppTemplate — Project Context

> Reference this file at the start of each Copilot session.

---

## 1. What This Template Is

**PDPAppTemplate** is a starter scaffold for building web applications that store user data on [Solid Pods](https://solidproject.org). Developers clone this repo, run the `/create-app` prompt in GitHub Copilot Chat, and describe the app they want — Copilot generates the full application by replacing `AppShell.jsx`.

The recommended pod provider is **privatedatapod.com**.

---

## 2. Tech Stack

| Layer | Detail |
|---|---|
| Frontend | React 19, Vite 7 |
| Solid client | `@inrupt/solid-client` 2.x, `@inrupt/solid-client-authn-browser` 2.x |
| RDF vocab | `@inrupt/vocab-common-rdf` |
| Pod server | Community Solid Server (CSS) at `privatedatapod.com` |
| Hosting | AWS S3 + CloudFront |
| Deployment | `.\deploy\deploy.ps1 -Action update` |

---

## 3. Codebase Structure

```
src/
  main.jsx                  — entry point
  App.jsx                   — auth routing (LoginScreen ↔ AppShell)
  app.css / index.css       — all app styles + design tokens
  hooks/
    useAuth.js              — OIDC session wrapper  (DO NOT MODIFY)
    useToast.js             — toast hook            (DO NOT MODIFY)
  utils/
    solid.js                — ALL Solid protocol ops (DO NOT MODIFY)
    fileUtils.js            — file type helpers      (DO NOT MODIFY)
  lib/
    errorLog.js             — ring-buffer error logger (DO NOT MODIFY)
  components/
    LoginScreen.jsx         — OIDC login UI (branding from VITE_ env vars)
    AppShell.jsx            — ← REPLACE THIS with your application
    Modal.jsx               — generic modal wrapper
    Toast.jsx               — toast notification UI
    SupportModal.jsx        — support email + diagnostics

public/
  client-id.json            — Solid OIDC client registration (update domain)
  icons/                    — PWA icons

deploy/
  deploy.ps1                — AWS S3 + CloudFront deployment script
  state.json                — persisted CloudFront distribution ID (gitignored)
```

---

## 4. Authentication

- Uses `@inrupt/solid-client-authn-browser` v2.x
- **v2.x API change**: `session.onLogout()` removed → use `session.events?.on('logout', cb)`
- `useAuth.js` returns `{ session, isLoggedIn, webId, loading, login, logout }`
- `session.fetch` is the authenticated fetch — pass it to ALL Solid library calls

---

## 5. Login Flow (AppShell init sequence)

```
webId available
  → fetchProfile()            → gets name, storageRoot, avatar
  → define app root           → storageRoot + 'your-app-folder/'
  → HEAD app root             → createFolder() if 404
  → ensureOwnInboxAppendable()  ← MUST be awaited before reading inbox
  → load application data
```

---

## 6. solid.js — Key Functions

### Profile
- `fetchProfile(webId, fetch)` → `{ name, storageRoot, avatar }`

### Containers
- `listContainer(url, fetch)` → `[{ url, name, isFolder, modified, size }]`
- `createFolder(url, fetch)` — uses POST+Slug (not PUT — avoids CORS on 404 paths)
- `uploadFile(targetUrl, file, fetch)` — file is a `File`/`Blob`
- `deleteResource(url, fetch)` — recursive for containers
- `moveResource(src, dest, fetch)` / `copyFile(src, dest, fetch)`
- `getFileObjectUrl(url, fetch)` → `{ objectUrl, mimeType }`

### Access Control (WAC)
- `setPublicRead(url, bool, fetch)`
- `setAgentAccess(url, agentWebId, { read, write, append, control }, fetch)`
- **Always** use `getResourceInfoWithAcl()` — NOT `getSolidDatasetWithAcl()` (causes 501 on non-RDF files)

### Inbox / Sharing (LDN)
- `ensureOwnInboxAppendable(webId, fetch)` — create inbox + public-append ACL
- `sendShareNotification(recipientWebId, resourceUrl, resourceName, senderWebId, fetch)`
- `getSharedWithMe(webId, fetch)` → `[{ url, name, sharedBy, notifUrl }]`

---

## 7. Known CSS Server Quirks

| Issue | Workaround |
|---|---|
| `createContainerAt()` → 409 on existing container | Always HEAD-check first |
| `getSolidDatasetWithAcl()` → 501 on non-RDF files | Use `getResourceInfoWithAcl()` |
| 404 responses missing CORS headers | Wrap HEAD checks in try/catch |
| `deleteFile()` strips trailing slash | Use `fetch(url, { method: 'DELETE' })` for containers |
| Inbox missing on fresh pods | `ensureOwnInboxAppendable()` handles creation |

---

## 8. CSS Design Tokens

```css
--sd-blue:        #1A73E8
--sd-blue-dark:   #1557B0
--sd-blue-light:  #E8F0FE
--sd-green:       #34A853
--sd-text:        #202124
--sd-text-2:      #5F6368
--sd-border:      #DADCE0
--sd-bg:          #F8F9FA
--sd-surface:     #FFFFFF
--sd-shadow:      0 1px 3px rgba(60,64,67,.15)
--sd-radius:      8px
```

Pre-built classes: `.btn-primary`, `.btn-outline`, `.spinner-lg`, `.spinner-sm`
Pre-built components: `Modal`, `ToastContainer`, `SupportModal`

---

## 9. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_APP_NAME         — display name
VITE_APP_SHORT_NAME   — PWA short name
VITE_APP_DESCRIPTION  — meta description
VITE_APP_DOMAIN       — production domain (no https://)
VITE_THEME_COLOR      — PWA theme color hex
VITE_BG_COLOR         — PWA background color hex
VITE_SUPPORT_EMAIL    — support contact email
VITE_MOCK_MODE        — set to 'true' to run without a pod (dev only)
```

## 9a. Mock Mode

Add `VITE_MOCK_MODE=true` to `.env` to run the app without a Solid pod or OIDC login. Data is stored in browser `localStorage` via `src/utils/mockStorage.js`. `App.jsx` detects this flag at startup and skips the login screen entirely, injecting `mockSession` into `AppShell`. All pod operations route through `ops.*` which resolves to either `solidOps` or `mockOps` depending on the flag. Never deploy with this flag enabled.

---

## 10. Deployment

```powershell
# First deploy — creates S3 bucket + CloudFront distribution
.\deploy\deploy.ps1 -Domain "myapp.example.com"

# Subsequent code deploys
.\deploy\deploy.ps1 -Action update -Domain "myapp.example.com"

# Cache bust only
.\deploy\deploy.ps1 -Action invalidate
```

State file `deploy/state.json` persists the CloudFront distribution ID. It is gitignored.  
After first deploy: point your DNS CNAME to the CloudFront domain printed in the output.

---

## 11. Getting Started (for developers)

```bash
# 1. Clone the template
git clone https://github.com/YOUR-ORG/PDPAppTemplate.git my-new-app
cd my-new-app

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your app name and domain

# 4. Update client-id.json
# Replace YOUR-APP-DOMAIN with your production domain

# 5. Generate your application
# Open GitHub Copilot Chat, type:
#   /create-app build me a [type of app] that [what it does]

# 6. Run dev server
npm run dev
```

---

## 12. Code Conventions

- **Never** use bare `fetch()` for pod resources — always `session.fetch`
- **Never** string-concatenate pod URLs — use `buildFileName()` / `buildContainerUrl()`
- **Always** `addToast('...', 'error')` for user-visible errors; `console.error()` for debug
- Plain JSX + vanilla JS ES modules — no TypeScript
- All styles in `src/app.css` using design token variables
