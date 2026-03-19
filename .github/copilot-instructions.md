# Solid Pod App Template — Copilot Instructions

This workspace is the **PDPAppTemplate** — a ready-to-scaffold template for building web applications that store data on [Solid Pods](https://solidproject.org). The recommended pod provider is **privatedatapod.com**.

## Tech Stack

| Layer | Detail |
|---|---|
| Frontend | React 19 + Vite 7 |
| Solid client | `@inrupt/solid-client` 2.x, `@inrupt/solid-client-authn-browser` 2.x |
| RDF vocab | `@inrupt/vocab-common-rdf` |
| Hosting | AWS S3 + CloudFront (via `deploy/deploy.ps1`) |
| Mobile | Capacitor iOS (optional) |
| PWA | `vite-plugin-pwa` |

## Project Structure

```
src/
  App.jsx                    — auth router: LoginScreen ↔ AppShell
  app.css                    — all styles (design tokens, login, modal, toast, app shell)
  index.css                  — minimal reset only
  main.jsx                   — entry point, installs error log
  hooks/
    useAuth.js               — OIDC session wrapper (DO NOT MODIFY)
    useToast.js              — toast hook (DO NOT MODIFY)
  utils/
    solid.js                 — ALL Solid protocol operations (DO NOT MODIFY)
    fileUtils.js             — file type helpers (DO NOT MODIFY)
  lib/
    errorLog.js              — ring-buffer error logger (DO NOT MODIFY)
  components/
    LoginScreen.jsx          — OIDC login UI (branding from VITE_ env vars)
    AppShell.jsx             — authenticated app scaffold ← REPLACE THIS
    Modal.jsx                — generic modal wrapper
    Toast.jsx                — toast notification UI
    SupportModal.jsx         — support email + diagnostics modal
```

## Authentication

`useAuth.js` returns `{ session, isLoggedIn, webId, loading, login, logout }`.

- `session.fetch` is an authenticated fetch you pass to ALL Solid library calls
- `@inrupt/solid-client-authn-browser` v2.x — `session.onLogout()` was removed; use `session.events?.on('logout', cb)`
- OIDC redirect uses `clientId: window.location.origin + '/client-id.json'` — update `public/client-id.json` with your domain

## Key Solid Utilities (`src/utils/solid.js`)

All functions accept `(url, fetchFn)` where `fetchFn` is `session.fetch`.

### Profile & Storage
```js
fetchProfile(webId, fetch)
  // → { name, storageRoot, avatar }
  // storageRoot = pim:storage from profile, or derived as origin/username/
```

### Container Operations
```js
listContainer(containerUrl, fetch)
  // → [{ url, name, isFolder, modified, size }]
  // Filters system containers (.acl, .meta, profile, inbox, etc.)

createFolder(containerUrl, fetch)
  // Uses POST+Slug (not PUT) — avoids CORS issues on 404 paths

uploadFile(targetUrl, file, fetch)
  // file is a File/Blob; targetUrl is the full destination URL

deleteResource(url, fetch)
  // Handles both files and containers (recursive)

moveResource(sourceUrl, destUrl, fetch)
copyFile(sourceUrl, destUrl, fetch)
getFileObjectUrl(url, fetch)
  // → { objectUrl, mimeType } — creates object URL for download/preview
```

### Access Control (WAC)
```js
setPublicRead(resourceUrl, isPublic, fetch)
  // Sets/unsets public read on any resource

setAgentAccess(resourceUrl, agentWebId, { read, write, append, control }, fetch)
  // Sets per-agent WAC permissions

// IMPORTANT: Always use getResourceInfoWithAcl() (not getSolidDatasetWithAcl())
// for WAC operations — the latter tries to parse non-RDF files as Turtle → 501 errors
```

### Inbox / Sharing (LDN)
```js
ensureOwnInboxAppendable(webId, fetch)
  // Creates inbox if missing, sets public-append ACL
  // MUST be called after login before reading shared items

sendShareNotification(recipientWebId, resourceUrl, resourceName, senderWebId, fetch)
  // POSTs ActivityStreams as:Offer to recipient's inbox

getSharedWithMe(webId, fetch)
  // → [{ url, name, sharedBy, notifUrl }]
  // Validates each shared resource (removes stale 404s)
```

## File Utilities (`src/utils/fileUtils.js`)

```js
getFileType(name, isFolder)   // → 'image' | 'video' | 'audio' | 'code' | 'text' | 'pdf' | 'folder' | 'file' ...
getFileMeta(name, isFolder)   // → { type, label, color, bgColor }
getIconSvg(type)              // → SVG <path> string for file type icon
formatSize(bytes)             // → '1.4 MB'
formatDate(date)              // → 'Mar 19, 2026'
isPreviewable(name)           // → true for image/video/audio/text/code/pdf
isText(name)                  // → true for text/code files
buildFileName(containerUrl, name)     // → full file URL
buildContainerUrl(parentUrl, name)    // → full container URL (trailing slash)
sanitizeFolderName(name)      // → replaces illegal path chars with _
```

## CSS Design Tokens (`src/app.css`)

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
--sd-shadow:      /* elevation shadow */
--sd-radius:      8px
--sd-font:        system-ui sans-serif stack
```

Pre-built utility classes: `.btn-primary`, `.btn-outline`, `.spinner-lg`, `.spinner-sm`

## Environment Variables (`.env`)

```
VITE_APP_NAME         — display name shown in UI and browser tab
VITE_APP_SHORT_NAME   — PWA short name
VITE_APP_DESCRIPTION  — meta description
VITE_APP_DOMAIN       — production domain (no https://)
VITE_THEME_COLOR      — PWA theme color hex
VITE_BG_COLOR         — PWA background color hex
VITE_SUPPORT_EMAIL    — support email for SupportModal
VITE_MOCK_MODE        — set to 'true' for local dev without a pod (dev only, never deploy)
```

## Mock Mode (`src/utils/mockStorage.js`)

When `VITE_MOCK_MODE=true`, `App.jsx` bypasses OIDC entirely and renders `AppShell` with `mockSession`. `AppShell` switches all pod operations to `mockOps` (localStorage-backed):

```js
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const ops = MOCK_MODE ? mockOps : solidOps;
// then use ops.fetchProfile(), ops.listContainer(), ops.uploadFile() etc.
```

The mock exports mirror solid.js exactly — generated apps work in both modes with no logic changes.

## Login Flow (post-authentication)

After `isLoggedIn` becomes true, `AppShell` runs:
1. `fetchProfile(webId, session.fetch)` → gets `name`, `storageRoot`, `avatar`
2. Define your app's data root as `storageRoot + 'your-app-name/'`
3. HEAD-check if it exists → create with `createFolder()` if 404
4. `await ensureOwnInboxAppendable(webId, session.fetch)` — must be awaited
5. Load application data

## Known Solid/CSS Server Quirks

- `createContainerAt()` returns 409 if container exists — always HEAD-check first
- `getSolidDatasetWithAcl()` tries to parse file bodies as Turtle → use `getResourceInfoWithAcl()` for WAC
- Inbox may not exist on fresh pods → `ensureOwnInboxAppendable()` handles creation
- CSS 404 responses may lack CORS headers — use try/catch around HEAD checks
- `deleteFile()` strips trailing slashes — use `fetch(url, { method: 'DELETE' })` for containers

## Deployment

```powershell
# First deploy (creates S3 bucket + CloudFront)
.\deploy\deploy.ps1 -Domain "myapp.example.com"

# Subsequent deploys
.\deploy\deploy.ps1 -Action update -Domain "myapp.example.com"

# CloudFront cache bust only
.\deploy\deploy.ps1 -Action invalidate
```

State (CloudFront distribution ID) persisted to `deploy/state.json` — gitignored.

## Code Conventions

- All Solid calls use `session.fetch` — never use bare `fetch()` for pod resources
- File URLs: always use `buildFileName()` / `buildContainerUrl()` — never string concatenate
- Error handling: show `addToast('message', 'error')` for user-visible errors, `console.error()` for debugging
- No TypeScript — plain JSX + vanilla JS ES modules
- Styles in `src/app.css` using the design token variables above
