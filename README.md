# Additional Asset — Frontend

Plain **HTML + CSS + vanilla JS** single-page UI for the Additional Asset Azure Functions API (`../Additional Asset/`).

No bundler, no npm, no frameworks. Works by double-clicking `index.html` (`file://`) or from any static file server. Scripts are classic `<script defer>` files on `window.AA` (ES modules are intentionally avoided so `file://` works in Chrome).

---

## What it does

Four in-page views (no router):

| View | Purpose |
|------|---------|
| **Idle** | Upload asset + tag photos, enter Customer ID (optional Asset Class / Category), start analysis |
| **Processing** | Estimated stage timeline + honest wait copy while `POST /api/additional_asset` runs (~10–30 s) |
| **Result** | Name, description, master-data chain, condition, tag source (decoded vs vision) |
| **Error** | Mapped HTTP / network / timeout failures with retry |

The backend auto-detects which photo is the asset vs the tag if the user swaps them. Partial master-data matches (HTTP 200 with nulls) are first-class result states, not errors.

---

## Access lock (soft)

A full-screen gate runs **before** the normal Idle / Processing / Result flow. It compares `SHA-256(password + salt)` to a hash in `js/config.js`. This stops casual use only — the hash is public in JS and can be bypassed. Unlock is stored in `sessionStorage` (`aa.unlocked`) for the tab session.

| | |
|--|--|
| **Default password** | `AssetCues#AA` |
| **Re-lock** | Header lock icon |
| **Disable** | `LOCK_ENABLED: false` in `js/config.js` |

**Change the password:** keep or edit `LOCK_SALT`, then set `LOCK_HASH` to the hex digest of `(password + LOCK_SALT)`:

```bash
node -e "const c=require('crypto'); const salt='aa.frontend.lock.v1'; const pw='YOUR_NEW_PASSWORD'; console.log(c.createHash('sha256').update(pw+salt,'utf8').digest('hex'));"
```

Do not put the plaintext password in `config.js`.

## How to run

1. Open `index.html` (double-click or serve this folder).
2. Enter the access password when the lock screen appears.
3. Start the backend from `../Additional Asset/`:

   ```bash
   func start --cors "*"
   ```

   Or add a `Host` block to that project's `local.settings.json` (sibling of `Values`):

   ```json
   "Host": { "LocalHttpPort": 7071, "CORS": "*" }
   ```

4. Default API base: `http://localhost:7071`  
   Override via ⚙ settings, `?api=https://host`, or `localStorage` key `aa.apiBase`.

### CORS

Browsers block calls from `file://` or another origin unless the Functions host allows CORS. Without it you will see **Can't reach the service**. On Azure: Function App → CORS → add your origin (or `*` for testing).

---

## Backend contract (used by this UI)

| Purpose | Call | Notes |
|---------|------|--------|
| Analyse | `POST {API_BASE}/api/additional_asset` | `multipart/form-data` via **XMLHttpRequest** (upload progress + abort) |
| Health | `GET {API_BASE}/api/health` | Drives the header health pill |

Form fields: `assetimage`, `barcodeimage`, `customerid` (required); `categoryid`, `assetclassid` omitted when empty.  
Images are sent **unmodified** (server resizes). UI accepts JPEG / PNG / WebP, ≤ **10 MB** each. Request timeout: **120 000 ms** (matches backend `functionTimeout`).

---

## Mock mode (no backend)

Open with a query param:

| URL | Behaviour |
|-----|-----------|
| `?mock=1` | Full success sample (~9 s) |
| `?mock=partial` | No make/model match |
| `?mock=none` | No master-data match |
| `?mock=bad` | Poor condition + damage |
| `?mock=vision` | Tag from vision only |
| `?mock=mismatch` | Decoded ≠ detected |
| `?mock=notag` | No tag found |
| `?mock=error502` / `error400img` / `network` / `timeout` | Error paths |
| `?selftest=1` | Console assertions for `AA.normalize` |

Combine with API override, e.g. `index.html?mock=1&api=http://localhost:7071`.

---

## Layout

```
index.html                 # Shell: header, four views, sticky actions, script order
assetcues-logo.png         # Header + favicon (shown on white chip)
assetcues-animation.webm   # Ambient idle hero (muted autoplay loop; Role B)
IMPLEMENTATION_PLAN.md     # Design / build plan (source of truth for product rules)
.gitignore

css/
  tokens.css               # Brand + grade colour tokens
  base.css                 # Reset, typography, utilities
  layout.css               # Page chrome, idle grid
  components.css           # Dropzones, buttons, fields, pills
  views.css                # Processing / result / error layouts
  motion.css               # Transitions, reduced-motion

js/                        # Load order matches index.html
  config.js                # Defaults, stages, localStorage keys → window.AA
  util.js                  # DOM helpers, a11y, reduced-motion
  mocks.js                 # Offline sample responses
  errors.js                # Error mapping / copy
  normalize.js             # API → view model (+ ?selftest=1)
  api.js                   # XHR analyse + health
  fx.js                    # Motion helpers / view transitions
  toast.js
  shell.js                 # Header, settings, health pill
  upload.js                # Dropzones, paste, previews
  form.js                  # IDs, validation, submit gating
  processing.js            # Timeline / rotator
  result.js                # Result rendering
  views.js                 # View state machine
  main.js                  # Boot
```

### Assets

| Asset | Path | Role |
|-------|------|------|
| Logo | `assetcues-logo.png` | Header + favicon; dark plate → white rounded chip; brand blue ≈ `#374EA1` |
| Video | `assetcues-animation.webm` (~13 s, VP9) | Idle showcase ambient hero (`muted autoplay loop playsinline`). Not a splash. Processing uses a CSS scan over the user’s photo. Respects `prefers-reduced-motion`. |

---

## Keyboard

- `⌘/Ctrl + Enter` — submit when the form is ready  
- `Esc` — closes settings / lightbox (does **not** cancel analysis)

---

## Browser support

Current Chrome, Edge, Safari 16+, Firefox. View Transitions API when available; classic cross-fade otherwise. Light theme only.

External network: **Google Fonts** only (Plus Jakarta Sans + JetBrains Mono). UI remains usable with system fallbacks offline.

---

## localStorage keys

| Key | Purpose |
|-----|---------|
| `aa.apiBase` | Saved API base URL |
| `aa.customerId` | Last Customer ID |
| `aa.introSeen` | Intro / first-run flag |

---

## Related

- Backend service & env docs: `../Additional Asset/README.md`
- Full UX / design plan: `IMPLEMENTATION_PLAN.md`
