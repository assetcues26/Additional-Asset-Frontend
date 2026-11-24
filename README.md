# AssetCues AI Modules — Frontend

Plain **HTML + CSS + vanilla JS** UI for two backends. No bundler, no npm, no frameworks.

| Page | Role | Backend API |
|------|------|-------------|
| `index.html` | Hub: lock → choose a module | — |
| `additional-asset.html` | Additional Asset | `POST /api/additional_asset` |
| `validation.html` | Validation & Catalogue | `POST /api/validation_catalogue` |

Works by double-clicking `index.html` (`file://`) or from any static host (Vercel, Netlify, `python -m http.server`). Scripts are classic `<script defer>` on `window.AA` so `file://` works in Chrome.

Both module pages share the same CSS and core JS (upload, form, processing, result, shell, lock, views). Validation adds small `js/vc-*.js` overlays; the Additional Asset analysis flow is unchanged.

---

## Quick start

```bash
# from this folder
python -m http.server 5510
# open http://127.0.0.1:5510/
```

1. Unlock with the access password (default: `AssetCues#AA`).
2. On the hub, pick a module — or turn **Demo mode** on to try both without any backend.
3. For live calls, start the matching API (see [Backends](#backends) below) and set the API base in ⚙ settings if needed.

---

## Hub

After unlocking, `index.html` shows one card per module with a live health pill (uses each module’s saved API base).

- **Demo mode** (`sessionStorage` key `aa.demoMode`) opens both modules with `?mock=1` — no API calls.
- Each module header has **All modules** back to the hub (confirms if analysis is in progress).
- Unlock is shared across pages for the tab session (`sessionStorage` `aa.unlocked`).

---

## Additional Asset (`additional-asset.html`)

| View | Purpose |
|------|---------|
| **Idle** | Asset + tag photos, Customer ID (optional Asset Class / Category) |
| **Processing** | Stage timeline while `POST /api/additional_asset` runs (~10–30 s) |
| **Result** | Name, description, master-data chain, condition, tag source |
| **Error** | Mapped HTTP / network / timeout failures with retry |

The backend auto-detects which photo is the asset vs the tag if the user swaps them. Partial master-data matches (HTTP 200 with nulls) are result states, not errors.

**Default API base:** `https://additional-asset-backend-fastapi.onrender.com`  
Override via ⚙ settings, `?api=https://host`, or `localStorage` key `aa.apiBase`.

| Call | Path |
|------|------|
| Analyse | `POST {API_BASE}/api/additional_asset` |
| Health | `GET {API_BASE}/api/health` |

Multipart fields: `assetimage`, `barcodeimage`, `customerid` (required); `categoryid`, `assetclassid` omitted when empty. Images are sent unmodified (server resizes). UI accepts JPEG / PNG / WebP, ≤ **10 MB**. Timeout: **120 s**.

---

## Validation & Catalogue (`validation.html`)

Same shell as Additional Asset, plus a “registered record” step and a validation card.

| | Fields |
|--|--|
| **Required** | Asset photo, Tag photo, Customer ID |
| **Optional** | Asset class ID, Category ID, Asset name, Description, Tag number |

Multipart: `assetimage`, `barcodeimage`, `customerid`, plus `assetclassid`, `categoryid`, `assetname`, `description`, `tagnumber` only when filled (trimmed; limits 500 / 2000 / 128 chars). Timeout: **180 s**.

**Default API base:** `https://validation-catalogue-recommend.onrender.com`  
Override via ⚙ on the Validation page (`vc.apiBase`) or `validation.html?api=https://host`.

**Result cards**

| Card | Response fields |
|------|-----------------|
| Detected by AI | `DetectedAsset`, `Description`, `CustomerId` |
| Validation against your record | Name/desc match Y/N/%/reasoning, tag match Y/N/%, compared with `UserAssetName` / `UserDescription` / `UserTagNumber`; tag location from `TagNumber.barcodeposition.position` when present; IDs `CustomerId`, `CategoryId`, `AssetClassId` |
| Classification | `AssetClassName`, `CategoryName`, `SubCategory*`, `MakeModel*` |
| Condition / Tag | `AssetCondition`, `TagNumber` (same UI as Additional Asset) |

Not shown: `MatchingRan`, `ImageAnalysis`, `PineconeMode`, timings, LLM usage. **Copy JSON** copies only the displayed fields. Checks the backend skipped (no name/desc, or no tag) show **Not checked** with a shortcut back to that field.

---

## Mock mode (no backend)

Mock data lives in:

| File | Module |
|------|--------|
| `js/mocks.js` | Additional Asset |
| `js/vc-mocks.js` | Validation & Catalogue |

`js/api.js` serves those samples when the URL has `?mock=…` (fake upload progress + latency). You still need photos + Customer ID on the form.

**Hub:** turn on **Demo mode**, then open either card (`?mock=1`).

**Additional Asset** (`additional-asset.html?mock=…`, ~9 s):

| Param | Behaviour |
|-------|-----------|
| `1` / `full` | Full success sample |
| `partial` | No make/model |
| `none` | No master-data match |
| `bad` | Poor condition + damage |
| `vision` / `mismatch` / `notag` | Tag variants |
| `error502` / `error400img` / `network` / `timeout` | Error paths |
| `selftest=1` | Console assertions for `AA.normalize` |

**Validation & Catalogue** (`validation.html?mock=…`, ~10 s):

| Param | Behaviour |
|-------|-----------|
| `1` | Reacts to what you type: Apple/MacBook or generic “laptop” → name match; another brand (HP, Dell…) → mismatch; tag `1000013696` → tag match; blank → Not checked |
| `match` | Both checks pass |
| `mismatch` | Postman-style sample (HP Victus vs Apple MacBook) |
| `skipped` | Both checks Not checked |
| `partial` / `none` / `bad` / `vision` / `notag` | Catalogue / condition variants |
| `error400` / `error400img` / `error502` / `network` / `timeout` | Error paths |
| `selftest=1` | Console assertions for the Validation view model |

Example: `http://127.0.0.1:5510/validation.html?mock=mismatch`

---

## Access lock (soft)

Full-screen gate before the hub / modules. Compares `SHA-256(password + salt)` to a hash in `js/config.js`. Stops casual use only — the hash is public in JS and can be bypassed.

| | |
|--|--|
| **Default password** | `AssetCues#AA` |
| **Re-lock** | Header lock icon |
| **Disable** | `LOCK_ENABLED: false` in `js/config.js` |

Change password: keep or edit `LOCK_SALT`, then set `LOCK_HASH` to hex of `(password + LOCK_SALT)`:

```bash
node -e "const c=require('crypto'); const salt='aa.frontend.lock.v1'; const pw='YOUR_NEW_PASSWORD'; console.log(c.createHash('sha256').update(pw+salt,'utf8').digest('hex'));"
```

Do not put the plaintext password in `config.js`. Change the default before a public deploy if you want stronger gatekeeping.

---

## Backends

| Module | Local project | Typical local URL | Notes |
|--------|---------------|-------------------|--------|
| Additional Asset | `../Additional Asset FastAPI/` | `http://localhost:8000` (or your FastAPI port) | Default in config points at the Render deploy |
| Validation & Catalogue | `../Validation and Catalogue Recommend/` | `http://localhost:8001` | Default in config is the Render deploy |

Each backend must allow the frontend origin in CORS (`CORS_ALLOW_ORIGINS`). Without that you’ll see **Can't reach the service** from `file://` or another host. For local testing, `*` is fine; restrict origins in production.

Settings ⚙ on each module page save **that module’s** API base only (`aa.apiBase` vs `vc.apiBase`).

---

## Deploy (static)

Any static host works. On **Vercel**: import this repo, Framework Preset **Other**, output/root = this folder (no build command). Set production API bases in `js/config.js` (`DEFAULT_API_BASE` / `MODULES.vc.defaultApiBase`) or tell users to use Settings after deploy.

---

## Layout

```
index.html                 # Hub: lock → module cards, demo mode
additional-asset.html      # Additional Asset module
validation.html            # Validation & Catalogue module
assetcues-logo.png         # Header + favicon
assetcues-animation.webm   # Ambient idle hero (muted autoplay loop)
IMPLEMENTATION_PLAN.md     # Original Additional Asset UX / design plan
.gitignore

css/
  tokens.css  base.css  layout.css  components.css
  views.css   motion.css  modules.css

js/
  config.js                # Defaults, stages, module registry → window.AA
  hub.js                   # Hub only
  mocks.js                 # Additional Asset offline responses
  vc-config.js             # Validation config overrides
  vc-mocks.js              # Validation offline responses
  vc-normalize.js  vc-form.js  vc-result.js
  util.js  errors.js  normalize.js  api.js  fx.js  toast.js
  lock.js  shell.js  upload.js  form.js
  processing.js  result.js  views.js  main.js
```

| Asset | Role |
|-------|------|
| `assetcues-logo.png` | Header + favicon; brand blue ≈ `#374EA1` |
| `assetcues-animation.webm` | Idle showcase ambient hero. Processing uses a CSS scan over the user’s photo. Respects `prefers-reduced-motion`. |

---

## Keyboard

- `⌘/Ctrl + Enter` — submit when the form is ready  
- `Esc` — closes settings / lightbox (does **not** cancel analysis)

---

## Browser support

Current Chrome, Edge, Safari 16+, Firefox. View Transitions API when available; classic cross-fade otherwise. Light theme only.

External network: **Google Fonts** (Plus Jakarta Sans + JetBrains Mono). UI remains usable with system fallbacks offline.

---

## Storage keys

| Key | Where | Purpose |
|-----|-------|---------|
| `aa.apiBase` | localStorage | Additional Asset API base |
| `vc.apiBase` | localStorage | Validation & Catalogue API base |
| `aa.customerId` | localStorage | Last Customer ID (shared) |
| `aa.introSeen` | localStorage | Intro / first-run flag |
| `aa.unlocked` | sessionStorage | Soft lock unlocked for this tab |
| `aa.demoMode` | sessionStorage | Hub demo mode on |

---

## Related

- Additional Asset FastAPI: `../Additional Asset FastAPI/`
- Validation & Catalogue: `../Validation and Catalogue Recommend/`
- Original Additional Asset UX plan: `IMPLEMENTATION_PLAN.md`
