# Additional Asset — Frontend Implementation & Design Plan

> **Audience:** Cursor (an AI coding agent). Follow this plan literally. Where the plan is silent, choose the simplest option that fits the principles in §1 — **do not ask questions, do not stop to confirm**.
> **Deliverable:** a complete, production-quality single-page frontend in **plain HTML + CSS + vanilla JS**, living entirely inside the `AA_Frontend/` folder.

**Paste this to Cursor to start:**

> Read `AA_Frontend/IMPLEMENTATION_PLAN.md` completely before writing any code. Implement it milestone by milestone (§15). After each milestone, open the page and verify its acceptance criteria. Do not add libraries, frameworks or build tools. Do not skip the motion work — it is part of the product.

---

## 0. Table of contents

1. Product brief & design principles
2. Hard constraints
3. Backend contract & prerequisites
4. Existing assets (logo + animation video)
5. Information architecture & state machine
6. Design system (tokens)
7. Screens (Idle, Processing, Result, Error) + wireframes
8. Component specs
9. Motion system
10. Data layer (API, normalisation, mock mode, errors)
11. Copywriting
12. Accessibility
13. Responsive rules
14. File structure & script order
15. Build milestones with acceptance criteria
16. QA checklist & edge cases
17. Don'ts

---

## 1. Product brief & design principles

**What it is.** A frontend for the *Additional Asset* AI service. A user uploads two photos (the asset, and its barcode/tag), enters a Customer ID (plus optional Asset Class ID and Category ID), and gets back a generated asset record: name, description, master-data classification (class → category → sub-category → make/model with IDs), condition grade, and the asset-tag number.

**Real-world behaviour that shapes the UX** (from the backend analysis — design for these facts):

- The call takes **~10–30 seconds** (several AI calls + a vector search). The waiting experience is the most important screen. It must feel alive, informative and honest.
- The backend **auto-detects which photo is the asset and which is the tag**, even if the user uploads them swapped. So the UI never scolds the user about order.
- Master-data matching can **legitimately fail or be partial** (HTTP 200 with null classification fields). That is a first-class result state, not an error.
- A tag can be **decoded from the barcode/QR** (exact) or **read by AI from the photo** (can be wrong), or **not found**. The UI must make that difference visible.
- Output is AI-generated → show a quiet "verify before saving" note.

**Principles**

1. **Clarity over decoration.** Every animation must communicate state or add delight *without delaying* the user.
2. **Honesty.** Never display invented numbers (no fake "98% confidence"). Progress during processing is explicitly *estimated*.
3. **One page, four states.** No routing, no page reloads.
4. **Light theme only.** Warm, premium, calm. Do not implement dark mode or `prefers-color-scheme: dark`.
5. **Instant to learn.** One primary action per screen.
6. **Craft in the details.** Focus rings, empty states, micro-copy, skeletons, reduced-motion support.

**Tone of voice:** friendly, concise, plain English. No jargon (don't say "blind view", "Pinecone", "zxing", "VLM" in the UI).

---

## 2. Hard constraints

- Plain **HTML + CSS + vanilla JS**. No React/Vue/Next/Tailwind/jQuery. No bundler, no npm, no build step.
- Must work by **double-clicking `index.html`** (`file://`) *and* via any static server.
  - ⚠️ **Do NOT use `<script type="module">` or ES `import`/`export`** — Chrome blocks module scripts on `file://`. Use classic `<script defer>` files that attach to one global namespace `window.AA` (see §14).
- **Light theme only.**
- No external JS/CSS CDNs. The **only** allowed external request is Google Fonts (CSS `<link>`), and the UI must look good with the fallback font stacks if offline.
- All output files go **inside `AA_Frontend/`** only.
- Never use `innerHTML` with API or user-provided strings. Use `textContent` / `createElement`. (Static icon SVG literals defined in code are fine.)
- Respect `prefers-reduced-motion` (see §9.6).
- Only animate `transform` and `opacity` (plus SVG `stroke-dashoffset`). No layout-thrashing animations.
- Must work in current Chrome, Edge, Safari 16+, Firefox. Use progressive enhancement for View Transitions API.

---

## 3. Backend contract & prerequisites

### 3.1 Endpoints

| Purpose | Method & path | Notes |
|---|---|---|
| Analyse | `POST {API_BASE}/api/additional_asset` | multipart/form-data |
| Health | `GET {API_BASE}/api/health` | returns `{"status":"healthy", ...}` |

`API_BASE` default: `http://localhost:7071` (Azure Functions local default). Configurable in the UI (§8.12) and persisted in `localStorage` key `aa.apiBase`. Also accept a `?api=https://host` URL parameter that overrides it for the session. Strip trailing slashes.

### 3.2 Request (multipart)

| Form field | Required | Source in UI |
|---|---|---|
| `assetimage` | ✅ file | Asset photo |
| `barcodeimage` | ✅ file | Tag / barcode photo |
| `customerid` | ✅ positive integer | Customer ID |
| `categoryid` | optional positive integer | Category ID — **omit the field entirely if empty** |
| `assetclassid` | optional positive integer | Asset Class ID — **omit the field entirely if empty** |

- Send the **original files unmodified** (the server resizes). Do not compress client-side.
- Do **not** set the `Content-Type` header manually (the browser must add the multipart boundary).
- Server limits: ≤ **10 MB per image**; formats readable by Pillow. UI accepts **JPEG, PNG, WebP**.
- Use **`XMLHttpRequest`** (not `fetch`) so you get **real upload progress** and abort. Timeout: **120 000 ms** (server `functionTimeout` is 2 min).

### 3.3 Response (HTTP 200 sample — the full shape)

```json
{
  "ImageAnalysis": "...", "AssetName": "ASUS Vivobook S laptop",
  "Description": "An ASUS Vivobook S laptop with an asset tag affixed to the palm rest.",
  "AssetClassName": "CP", "MakeModel": "VivoBook S14", "CategoryName": "CP", "SubCategoryName": "LAPTOP",
  "MakeModelId": 7240, "CategoryId": 1015, "CustomerId": 1063, "AssetClassId": 1002, "SubCategoryId": 1323,
  "AssetCondition": {
    "grade": "Good", "condition_score": 9,
    "condition_summary": "Good condition, showing only minor signs of normal use with no significant damage or functional defects.",
    "overall_score": 90, "damage_items": [], "damage_count": 0, "has_damage": false
  },
  "TagNumber": { "decodedtagnumber": "10001882", "detectedtagnumber": "10001882", "tagnumbersource": "decoded" },
  "request_id": "35b53632-…", "llm_provider": "gemini", "timings_ms": {…}, "llm_usage": {…}, "error": null
}
```

### 3.4 Fields shown vs. ignored

**Show in the UI (and only these):**

`AssetName`, `Description`, `AssetClassName`, `MakeModel`, `CategoryName`, `SubCategoryName`, `MakeModelId`, `CategoryId`, `CustomerId`, `AssetClassId`, `SubCategoryId`, `AssetCondition.{grade, condition_score, condition_summary, overall_score, damage_items, damage_count, has_damage}`, `TagNumber.{decodedtagnumber, detectedtagnumber, tagnumbersource}`.

**Never render:** `ImageAnalysis`, `llm_provider`, `timings_ms`, `llm_usage`. 
**Use internally only:** `error` (error handling) and `request_id` (shown *only* inside the error state as a small copyable "Reference").

| Field | Where it appears |
|---|---|
| AssetName, Description | Result → "Identified asset" hero card |
| AssetClassName/Id, CategoryName/Id, SubCategoryName/Id, MakeModel/Id | Result → Classification breadcrumb card |
| CustomerId | Result header chip + Classification card header |
| AssetCondition.* | Result → Condition card (gauge, pips, grade pill, summary, damage list) |
| TagNumber.* | Result → Tag label card |

### 3.5 Error / edge responses (design every one)

| Situation | HTTP | Body | UI |
|---|---|---|---|
| Validation | 400 | `{error:"PAYLOAD_VALIDATION_FAILED", detail:"…"}` | Error state, friendly message from `detail` |
| Bad image | 400 | full body, `error:"IMAGE_PREPROCESS_FAILED: …"` | "One of the photos couldn't be read" |
| AI failure | 502 | full body, `error:"PHASE1_FAILED: …"` | "Analysis failed — try again" |
| Server crash | 500 | `{error:"INTERNAL_SERVER_ERROR", detail}` | Generic error state |
| Network / CORS / offline | — (XHR `onerror`) | — | "Can't reach the service" + Open settings |
| Timeout | — | — | "Taking too long" + Retry |
| User cancel | — | — | Back to Idle + toast "Analysis cancelled" |
| **200 but partial/no master-data match** | 200 | classification fields `null` | **Result state** with "partial/none" variants (§7.4) |
| 200, `AssetCondition` null | 200 | — | Condition card shows "Condition unavailable" |
| 200, `TagNumber.tagnumbersource` = `"NA"` | 200 | both numbers null | Tag card "No tag number found" |

### 3.6 Prerequisite outside the frontend (tell the user in `README.md`)

The browser will block calls from `file://` or another origin unless the Functions host allows CORS. Document this clearly:

- **Local:** in `local.settings.json` add a top-level `Host` block (sibling of `Values`):
  ```json
  "Host": { "LocalHttpPort": 7071, "CORS": "*" }
  ```
  or start with `func start --cors "*"`.
- **Azure:** Function App → *CORS* → add the origin (or `*` for testing).

The UI must detect this failure mode (XHR `onerror`, status 0) and show a specific hint (§10.5).

---

## 4. Existing assets (logo + animation video)

Two files already exist somewhere inside `AA_Frontend/` — **a logo** and **an animation video**. Their file names/paths are not specified here, so:

**Step 0 (before any code):** list the folder recursively, identify the logo (`.svg`/`.png`/`.webp`; name contains "logo" or is the only image) and the video (`.mp4`/`.webm`/`.mov`). **Do not move, rename, re-encode or copy them.** Reference them by their existing relative path. Put the discovered paths in `js/config.js` as `ASSETS.logo` and `ASSETS.video`, and write the decisions into `README.md` ("Asset notes").

### 4.1 Logo

- Header: height **30px** (36px ≥ 1024px), `width:auto`, `alt="Additional Asset"`; clicking returns to Idle (confirm via `window.confirm` only if currently Processing).
- Also use as `<link rel="icon">` (if SVG/PNG).
- **Brand colour:** open/inspect the logo. If its dominant colour is clearly not close to the default `--brand` in §6, change **only** the `--brand-*` tokens to match the logo; leave every other token alone.
- If the logo has a dark/transparent-on-dark design that is unreadable on the light header, place it on a small white rounded chip (`padding:6px 10px; border-radius:12px; box-shadow: var(--shadow-1)`).

### 4.2 Animation video — pick exactly ONE primary role

Inspect the video (duration, dimensions, whether it looks like a loop or a one-off reveal). Use the first rule that matches:

| Rule | Role | Behaviour |
|---|---|---|
| **A.** duration ≤ **6 s** | **Intro splash** | Full-screen white overlay, video centred (max 420 px wide, rounded 24px), plays once per browser session (`sessionStorage` key `aa.introSeen`). "Skip" button bottom-right (appears after 400 ms). Auto-dismiss on `ended` or after 6.5 s. Fade-out 400 ms, then the page entrance choreography (§9.3) runs. Autoplay blocked / error → dismiss immediately. Respect reduced motion → skip splash entirely. |
| **B.** duration > 6 s | **Ambient hero** | In the Idle view's right panel (§7.2): looping, `muted autoplay loop playsinline`, `preload="auto"`, rounded 24px, max-height 340 px, `object-fit: cover`, soft shadow. Pause when off-screen (`IntersectionObserver`) and when the tab is hidden. Reduced motion → show first frame only (`preload="metadata"`, no autoplay, `currentTime=0.1`). |

- **Background colour:** if the video has a white/near-white background, add `mix-blend-mode: multiply` over a white card so it dissolves into the page. If it has a dark/colourful background, keep it inside the rounded card as an intentional "window".
- **Never** block the UI on the video: the form must be usable immediately. If the video errors (`onerror`) remove its container and let the "floating chips" art (§7.2) take its place.
- In rule A, the right panel of Idle uses the decorative **floating chips art** instead of the video.
- Regardless of role, the **Processing** screen uses CSS-only scan animation over the user's own photo (§7.3) — that is the second hero moment.

---

## 5. Information architecture & state machine

Single `index.html`. One `<main id="app">` containing four mutually exclusive **views**:

```
        ┌──────────── submit ────────────┐
  IDLE ─┤                                ├─► PROCESSING ──► RESULT
   ▲    └─ (validation errors stay here) ┘        │            │
   │                                              ▼            │
   ├────────────── retry / edit ───────────── ERROR            │
   └──────── "Analyze another" / "Edit inputs" ◄───────────────┘
```

State lives in `AA.state`:

```js
{
  view: 'idle' | 'processing' | 'result' | 'error',
  files: { asset: File|null, tag: File|null },
  previews: { asset: objectURL|null, tag: objectURL|null },
  inputs: { customerId: '', assetClassId: '', categoryId: '' },
  request: { xhr, startedAt, uploadPct, stageIndex } ,
  result: ViewModel|null, rawResult: object|null,
  error: { kind, title, message, hint, requestId } | null,
  apiBase: string, health: 'checking'|'online'|'offline'
}
```

Rules:
- `AA.setView(name)` is the **only** way to change views. It: updates `state.view`, toggles `hidden`/`aria-hidden`, runs the transition (§9.2), moves focus to the new view's `<h1>/<h2 tabindex="-1">`, updates `document.title`, and announces via the live region.
- **Analyze another asset** → Idle: clear photos (revoke object URLs) but **keep the three ID inputs** (batch workflows reuse them).
- **Edit inputs** (from Result/Error) → Idle with **photos and inputs preserved**.
- Only **CustomerId** persists across reloads (`localStorage` key `aa.customerId`). Never persist images or the other IDs.
- Revoke every `URL.createObjectURL` on replace/reset to avoid leaks.

---

## 6. Design system (tokens)

Create `css/tokens.css` with exactly these (extend if needed, don't rename):

```css
:root {
  color-scheme: light;

  /* Surfaces */
  --bg: #F6F4EE;            /* warm paper */
  --bg-grad-a: #FBFAF6;
  --bg-grad-b: #EEF1F8;
  --surface: #FFFFFF;
  --surface-2: #FAF8F3;      /* inset areas */
  --line: #E7E3D8;
  --line-strong: #D5D0C2;

  /* Ink */
  --ink: #14181F;
  --ink-2: #3B4452;
  --muted: #667085;          /* ≥ 4.5:1 on --surface */
  --faint: #98A2B3;

  /* Brand (override ONLY these if the logo demands it) */
  --brand: #2F5BFF;
  --brand-600: #2447D6;
  --brand-100: #E6ECFF;
  --brand-50: #F2F5FF;
  --scan: #00B8A3;           /* scanner / success-adjacent accent */
  --scan-100: #DDF7F3;

  /* Semantic */
  --ok: #1F9D63;   --ok-100: #E3F6EC;
  --warn: #B7791F; --warn-100: #FDF3DC;
  --orange: #C2410C; --orange-100: #FDEBDD;
  --bad: #B42318;  --bad-100: #FDE7E5;

  /* Grades */
  --g-excellent: #0E8A6A;  --g-excellent-bg: #DDF5EE;
  --g-good:      #2E9E55;  --g-good-bg:      #E3F6E8;
  --g-fair:      #B7791F;  --g-fair-bg:      #FDF3DC;
  --g-poor:      #C2410C;  --g-poor-bg:      #FDEBDD;
  --g-bad:       #B42318;  --g-bad-bg:       #FDE7E5;
  --g-unknown:   #667085;  --g-unknown-bg:   #EEF0F3;

  /* Type */
  --font-ui: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Scale (4px base) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px; --s-6: 24px;
  --s-8: 32px; --s-10: 40px; --s-12: 48px; --s-16: 64px;

  /* Radius */
  --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 28px; --r-pill: 999px;

  /* Elevation (soft, layered, slightly cool) */
  --shadow-1: 0 1px 2px rgba(20,24,31,.05), 0 1px 1px rgba(20,24,31,.03);
  --shadow-2: 0 2px 4px rgba(20,24,31,.04), 0 8px 24px rgba(20,24,31,.06);
  --shadow-3: 0 4px 8px rgba(20,24,31,.05), 0 20px 48px rgba(31,45,90,.12);
  --ring: 0 0 0 3px rgba(47,91,255,.28);

  /* Motion */
  --ease-out: cubic-bezier(.22,1,.36,1);
  --ease-in-out: cubic-bezier(.65,0,.35,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --t-fast: 120ms; --t-base: 200ms; --t-slow: 320ms; --t-xslow: 520ms; --t-hero: 800ms;

  /* Layout */
  --container: 1160px;
  --header-h: 68px;
}
```

**Fonts** (Google Fonts `<link>` with `display=swap`, `preconnect`): *Plus Jakarta Sans* 400/500/600/700/800 for UI; *JetBrains Mono* 500/600 for IDs & tag numbers. Fallbacks must look good.

**Type scale**

| Role | Size / line | Weight | Notes |
|---|---|---|---|
| Display (hero h1) | clamp(32px, 4.4vw, 52px) / 1.05 | 800 | letter-spacing −0.03em |
| H2 (view titles) | 28px / 1.15 | 700 | |
| H3 (card titles) | 15px / 1.3 | 700 | uppercase? **No** — sentence case, `--ink` |
| Body | 15px / 1.55 | 400–500 | `--ink-2` |
| Small / helper | 13px / 1.45 | 500 | `--muted` |
| Micro label | 11.5px / 1.2 | 700 | uppercase, letter-spacing .08em, `--muted` |
| Mono ID | 13px | 600 | `--font-mono`, `font-variant-numeric: tabular-nums` |
| Tag digits | clamp(26px, 4vw, 38px) | 600 | mono, letter-spacing .06em |

**Page background:** `--bg` with two huge, very faint radial gradients (top-left `--bg-grad-b` at 40% opacity, bottom-right `--scan-100` at 30%) plus a **dot grid** (1px dots, `--line` at 60%, 24px spacing) fading out via mask toward the bottom. A slow diagonal "scanner sweep" gradient (`--brand-50`, 8% opacity) travels across the background once every 14 s (CSS only, `transform`).

**Cards:** `--surface`, `1px solid var(--line)`, `--r-lg`, `--shadow-2`, padding 24px (20px on mobile). Card titles have a 28px circular icon chip (tinted `--brand-50`) on the left.

**Icons:** inline SVG, 1.75px stroke, rounded caps/joins, 20px grid, `currentColor`. Define a small icon helper `AA.icon(name)` that returns an `<svg>` element built via `createElementNS` from a static map: `camera, barcode, check, x, copy, refresh, edit, settings, alert, shield, layers, tag, bolt, sparkle, image, trash, upload, info, chevron, building, grid`.

---

## 7. Screens

### 7.0 Global shell

```
┌────────────────────────────────────────────────────────────────────┐
│ [logo]  Additional Asset                  ● Service online   ⚙     │  header (sticky, glass blur)
├────────────────────────────────────────────────────────────────────┤
│                         <main id="app"> (views)                    │
├────────────────────────────────────────────────────────────────────┤
│ AI-generated results — please verify before saving.                │  footer (quiet)
└────────────────────────────────────────────────────────────────────┘
```

- Header: sticky, `backdrop-filter: blur(12px)`, background `rgba(246,244,238,.78)`, bottom border appears (opacity transition) once scrolled > 4px.
- Right side: **health pill** + **settings** icon button (§8.11–8.12).
- Footer: 13px muted, centred.
- `<div id="live" class="sr-only" aria-live="polite" aria-atomic="true">` for announcements. `<div id="toasts">` container.

### 7.1 Entrance choreography (first paint)

1. Header slides down 12px → 0 + fade (320 ms).
2. Hero headline words rise in (translateY 16→0, opacity, 60 ms stagger).
3. Form card fades up (translateY 24→0), right panel fades up 120 ms later.
4. Background sweep begins.

If Role A splash is active, run this *after* the splash fade-out.

### 7.2 View: IDLE ("Capture")

**Hero copy** (left of grid, above the card or inside the left column)

- Eyebrow chip: `✦ AI asset capture`
- H1: **Two photos in. A complete asset record out.**
- Sub: *Add a photo of the asset and a close-up of its tag. We'll identify it, read the tag, grade its condition and match it to your master data.*

**Desktop layout (≥ 1024px):** 12-col grid, gap 32px. Left 7 cols = **Capture card**. Right 5 cols = **Showcase panel**.

```
┌───────────────────────────── Capture card ──────────────────────────┐   ┌─── Showcase ───┐
│ 1  Photos                                                            │   │  [ video  OR   │
│ ┌──────────────────────┐  ┌──────────────────────┐                   │   │  floating chip │
│ │  📷  Asset photo      │  │  ▦  Tag / barcode     │                   │   │  art ]         │
│ │  Drop, click or paste │  │  Drop, click or paste │                   │   │                │
│ │  JPG · PNG · WebP     │  │  JPG · PNG · WebP     │                   │   │  How it works  │
│ └──────────────────────┘  └──────────────────────┘                   │   │  ① Add photos  │
│ 2  Details                                                           │   │  ② We analyse  │
│ Customer ID *      Asset class ID (optional)   Category ID (optional)│   │  ③ Get record  │
│ [ 1063        ]    [            ]               [            ]       │   │                │
│ ──────────────────────────────────────────────────────────────────── │   │  You'll get:   │
│ [ ✦ Analyze asset ]  Reset               ⌘/Ctrl + Enter              │   │  chips of the  │
└──────────────────────────────────────────────────────────────────────┘   │  output fields │
                                                                           └────────────────┘
```

- Step headings inside the card: numbered circular badge (`1`, `2`) + title; badge turns into a ✓ (animated) when that section is valid.
- **Showcase panel**
  - Role B: the video block (§4.2) on top.
  - Role A (or video failed): **Floating chips art** — a CSS viewfinder (four corner brackets around a soft rounded square with a subtle laptop-agnostic geometric glyph) with 4 decorative chips orbiting/bobbing: `LAPTOP`, `Good · 90`, `#10001882`, `CP › LAPTOP › VivoBook S14`. Each bobs with a different duration (5–8 s) via `translateY`. `aria-hidden="true"`.
  - **How it works:** 3 numbered rows, 14px, each with an icon chip. Rows reveal sequentially on load.
  - **You'll get:** wrap of small pill chips: *Asset name · Classification · Condition grade · Tag number*.
- On Idle→Processing the right panel fades/slides out (opacity+translateX 24px) while the card morphs into the processing layout (§9.2).

### 7.3 View: PROCESSING ("Analyzing")

This is the hero moment. Layout: one centred card (max 980px) with two columns (stack on mobile).

```
┌──────────────────────────────────────────────────────────────────────┐
│  Analyzing your asset…                                   00:12  ✕ Cancel │
│  Usually takes 10–30 seconds. Please keep this tab open.             │
│ ┌───────────────── Scanner ─────────────────┐ ┌──── Timeline ───────┐ │
│ │ ┌┐                                    ┌┐    │ │ ✓ Uploading photos  │ │
│ │                [ user's asset photo ]      │ │ ✓ Preparing images  │ │
│ │ ═══════════ scan line ════════════         │ │ ◉ Working out which…│ │
│ │ └┘                         [tag thumb] ┘    │ │ ○ Reading the tag…  │ │
│ └────────────────────────────────────────────┘ │ ○ Analyzing asset…  │ │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  Estimated progress   │ ○ Searching master… │ │
│                                                 │ ○ Matching …        │ │
│                                                 └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Scanner panel** (4:3, `--r-lg`, overflow hidden, bg `--surface-2`):

- The user's **asset photo** (`object-fit: cover`), slightly desaturated (`filter: saturate(.85)`) and lifted when "locked".
- **Corner brackets** (4 SVG/CSS L-shapes, 3px, `--scan`): start 18% inset (wide), **contract to 6% inset** over 900 ms with `--ease-spring` when stage ≥ "Analyzing the asset" ("lock on"), plus a quick brightness pulse.
- **Scan line:** 2px `--scan` line with a 60px soft gradient trail, sweeping top↔bottom, 2.6 s `ease-in-out` infinite alternate, `transform: translateY` only.
- **Grid overlay:** very faint 32px grid (`--scan` at 8%) fading in/out in sync with the sweep.
- **Tag thumbnail** (PiP, bottom-right, 28% width, rounded 12px, white 3px border, shadow) with its own tiny scan shimmer during "Reading the tag" stage.
- Never draw fake bounding boxes or fake detections.

**Timeline (right):** vertical list of 7 stages (§10.3). Each row: status node + label + (for active) a micro sub-label.

- Pending: hollow circle, `--faint` text.
- Active: node = spinning ring (`--brand`), label `--ink` 600, subtle shimmer bar under the label.
- Done: filled `--ok` circle with check that **draws** (stroke-dashoffset, 240 ms); label `--ink-2`.
- A vertical connector line between nodes fills with `--brand` as stages complete (scaleY from top).
- The stage **"Uploading photos" shows real percent** from `xhr.upload.onprogress` (e.g. "Uploading photos · 62%").

**Progress bar** under the scanner: 6px rounded, `--brand` → `--scan` gradient, **always labelled "Estimated progress"**. Progress formula in §10.3; never reaches 100% until the response arrives; has a moving highlight (`translateX` shimmer) while waiting.

**Dynamic copy under the title** (rotates every 4 s with a fade, only while waiting): *"Looking closely at your photos…"*, *"Checking the tag for a barcode…"*, *"Comparing against your master data…"*, *"Nearly there — final checks…"*. After 45 s show: *"This is taking longer than usual — still working."* (swap the rotator off).

**Controls:** elapsed timer (mono, `mm:ss`), `Cancel` ghost button (aborts XHR → Idle, photos preserved). `Esc` does nothing (avoid accidents).

**On response:** fast-forward all remaining stages to done at 140 ms each, scanner brackets turn `--ok` and flash, progress fills to 100%, hold 350 ms, then transition to Result.

### 7.4 View: RESULT

**Header row:** animated success tick (SVG circle draws, then check draws), H2 **"Analysis complete"**, sub *"Customer 1063"* (mono chip). Actions on the right: **Analyze another asset** (primary), **Edit inputs** (secondary), **Copy JSON** (ghost, icon).

**Desktop layout:** 12-col grid. Left 5 cols **sticky** (top = header-h + 24px): photos. Right 7 cols: cards.

```
┌── Photos (sticky) ──────┐  ┌── Identified asset (hero card) ─────────────┐
│ ┌─────────────────────┐ │  │ ASUS Vivobook S laptop      [LAPTOP][S14]   │
│ │  asset photo  ⌜  ⌝  │ │  │ An ASUS Vivobook S laptop with an asset…    │
│ │               ⌞  ⌟  │ │  └─────────────────────────────────────────────┘
│ └─────────────────────┘ │  ┌── Classification ─── Customer 1063 ─────────┐
│ ┌──────────┐            │  │ ● Asset class ─ ● Category ─ ● Sub-category ─ ● Make/model │
│ │ tag photo│ #10001882  │  │   CP  #1002      CP  #1015     LAPTOP #1323     VivoBook S14 #7240 │
│ └──────────┘            │  └─────────────────────────────────────────────┘
└─────────────────────────┘  ┌── Condition ───────────┐ ┌── Tag number ─────┐
                             │  (gauge 90)  Good      │ │  ▦  10001882      │
                             │  ●●●●●●●●●○  9/10      │ │  ✓ Decoded from   │
                             │  summary…              │ │    barcode        │
                             │  ✓ No damage detected  │ │  [copy]           │
                             └────────────────────────┘ └───────────────────┘
```

**Photos column:** asset photo large (4:3 `object-fit: contain` on `--surface-2`) with four **green lock brackets** and a "scan complete" sweep on reveal; tag photo below at ~55% width with a floating pill showing the tag number (or "No tag found"). Clicking either opens a **lightbox** (simple fixed overlay, `Esc`/click to close, focus trapped, image `object-fit: contain`, fade+scale 0.96→1).

**Hero card — Identified asset**

- `AssetName` as H2 (34px, 800). Reveal **word-by-word** (clip + translateY, 50 ms stagger).
- `Description` below, 16px, `--ink-2`.
- Chips (only if values exist): `SubCategoryName` (brand tint), `MakeModel` (neutral). 
- Soft decorative corner glow using `--scan-100`.

**Classification card** — "breadcrumb path" with IDs

- Four nodes in a row (desktop) / vertical timeline (mobile): **Asset class → Category → Sub-category → Make / model**.
- Each node: small micro-label above (e.g. `ASSET CLASS`), **name** (16px 700), and an **ID chip** (`#1002`, mono). Connector lines **draw** left→right between nodes (stroke-dashoffset, 300 ms each, 120 ms stagger), nodes pop in with `--ease-spring`.
- Card header right side: `Customer #1063` mono chip.
- **"From your input" marker:** if the user provided `AssetClassId` / `CategoryId`, and the returned ID equals it, show a tiny `Provided by you` tag (info icon) under that ID chip. (The backend always echoes user-provided IDs, even when no match was found.)
- **Match states** (`viewModel.matchStatus`):
  - `full` — all four nodes populated. Small ✓ "Matched to master data".
  - `partial` — sub-category present, make/model null → make/model node is **dashed** with text "No make/model match" and a muted note: *"The category was matched, but this exact make/model isn't in your master data."*
  - `none` — sub-category null → nodes after the provided ones are dashed "—". Show an inline info callout (amber tint): **"No master-data match found."** *"Try adding a Category or Asset class ID, or retake the photo closer to the asset."* with a `Edit inputs` link-button.
- Any individual null name renders `—` (never "null"/"undefined").

**Condition card**

- **Gauge:** 180° SVG arc (r=80, stroke 14, round caps). Track `--line`. Value arc coloured by grade (§6). Sweeps 0 → `overall_score` over 1100 ms (`--ease-out`), centre number counts up in sync (tabular nums, 44px 800), caption `/ 100`. A small glowing dot rides the arc's end.
- **Grade pill** under the gauge: coloured bg/text per grade + icon, text = `grade` (e.g. "Good"). Grade is always text — colour is never the only signal.
- **Score pips:** 10 small rounded segments; first `condition_score` fill sequentially (40 ms stagger) with the grade colour; caption `9 / 10`.
- **Summary:** `condition_summary` in 14.5px `--ink-2`.
- **Damage block:**
  - `has_damage === false` → green row: ✓ **No damage detected** (`damage_count` 0).
  - `has_damage === true` → heading `Damage found · {damage_count}`; list `damage_items` (each: `location`, `type`, severity chip `minor|moderate|severe`, optional `detail`) — stagger-in. Unknown/missing keys are skipped gracefully. Cap display at 10 with "+N more".
- `AssetCondition` null → card with muted "Condition unavailable for this photo."

**Tag card** — styled like a physical asset label

- White rounded rect with a perforated left edge (radial-gradient dots) and a decorative QR/barcode glyph.
- **Number display:** mono, large. Digits **roll in odometer-style** (each digit column scrolls 0→digit, 40 ms stagger, 700 ms, `--ease-out`). Non-digit characters render statically.
- **Source badge** from `tagnumbersource`:
  - `decoded` → ✓ green: **Decoded from barcode** + helper *"Read directly from the barcode — exact."*
  - `vision` → info/amber: **Read from photo** + helper *"Read by AI from the printed digits — double-check it."*
  - `NA`/null → neutral dashed state: **No tag number found** + helper *"Retake the tag photo closer, in good light, with the code filling the frame."*
- **Comparison logic** (decoded vs detected):
  - both equal → show once, small line "Barcode and visual read agree ✓".
  - both present and different → show decoded as primary and detected as "AI read: …" with amber alert **"The two reads differ — verify manually."**
  - only one present → show it with the matching badge.
- Copy button (icon + tooltip), copies the **primary** number.

**Footer note under cards:** *"AI-generated results — please verify before saving."* with info icon.

**Staggered reveal:** header → photos → hero card → classification → condition + tag. Each card `opacity 0 → 1`, `translateY 20 → 0`, 70 ms × index (`--i` CSS var), 520 ms, `--ease-out`. Inner animations (gauge, odometer, breadcrumb) start when their card finishes revealing (use `animationend`/timeouts keyed from the same index).

**Copy JSON** copies *only the selected fields* using original API names (so it is paste-ready):

```json
{ "AssetName":…, "Description":…, "AssetClassName":…, "MakeModel":…, "CategoryName":…, "SubCategoryName":…,
  "MakeModelId":…, "CategoryId":…, "CustomerId":…, "AssetClassId":…, "SubCategoryId":…,
  "AssetCondition": { "grade":…, "condition_score":…, "condition_summary":…, "overall_score":…, "damage_items":[…], "damage_count":…, "has_damage":… },
  "TagNumber": { "decodedtagnumber":…, "detectedtagnumber":…, "tagnumbersource":… } }
```

### 7.5 View: ERROR

Centred card (max 560px): illustration (CSS/SVG shield-with-exclamation, gentle shake once on enter), H2 title, one-sentence message, optional hint box, then actions.

- Primary **Try again** (re-submits with the *same files and values*), secondary **Edit inputs**, tertiary **Open settings** (only for network/CORS errors).
- `Reference: <request_id>` mono, with copy button — only when available.
- Variants & copy in §11.

---

## 8. Component specs

### 8.1 Dropzone (`upload.js`)

Two instances: `asset` and `tag`. Implemented as a `<div class="dz">` containing a **visually hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`** and a `<button type="button" class="dz-btn">` that triggers it (so it is keyboard & screen-reader operable). Use `<label>`/`aria-label`: "Asset photo — choose a file".

**States**

| State | Visual |
|---|---|
| Empty | Dashed 1.5px `--line-strong`, `--surface-2`, icon chip (camera for asset / barcode for tag), title ("Asset photo" / "Tag or barcode photo"), hint "Drop, click or paste", format hint "JPG · PNG · WebP · up to 10 MB". Icon gently floats (translateY ±3px, 4 s). |
| Hover / focus | Border → `--brand`, bg → `--brand-50`, icon lifts, focus ring. |
| Drag-over | 4 viewfinder corner brackets **expand** outward (scale 0.92 → 1.0) and tint `--scan`; border becomes animated marching ants (`stroke-dashoffset` on an SVG rect or `background-position` on repeating-linear-gradient); label "Release to add". |
| Filled | Preview image (`object-fit: cover`), bottom gradient bar with filename (ellipsis), `size · W×H`, and two icon buttons **Replace** / **Remove** (≥ 40px hit area). A ✓ badge top-left. |
| Developing (on file accepted) | Preview animates from `blur(14px) saturate(0) brightness(1.2)` → clear over 650 ms, with a quick white "shutter flash" bar sweeping once. |
| Error | Border `--bad`, message below (`role="alert"`), shake once (4px, 280 ms). |

**Behaviours**

- Accept via click, keyboard (Enter/Space), drag-and-drop, and **paste**: a global `paste` handler puts an image from the clipboard into the first empty zone (asset first, then tag) and toasts "Pasted into Asset photo".
- Validate: MIME in {jpeg, png, webp} (fall back to extension check if MIME empty); size ≤ 10 MB; non-empty. Errors: *"Please choose a JPG, PNG or WebP image."* / *"That file is over 10 MB — please use a smaller one."*
- Prevent default browser file-open on window-level `dragover/drop` outside zones.
- If the **same file** (name+size+lastModified) is placed in both zones, show a soft inline warning (not blocking): *"This looks like the same photo as the other slot."*
- Read dimensions via `Image` onload from the object URL; display `W×H`.
- Revoke old object URLs on replace/remove/reset.
- Dispatch a custom event `aa:files-changed` so the form re-validates.

### 8.2 Text field (floating label)

- Height 52px, `--r-md`, 1px `--line-strong`, bg `--surface`. Label floats on focus/filled (translate + scale, 160 ms).
- IDs are `type="text" inputmode="numeric" autocomplete="off"` with `pattern="[0-9]*"`; sanitise input to digits only on `input`; no spinner arrows; max 12 digits.
- **Customer ID**: required — red asterisk + `required` semantics (`aria-required="true"`). Error text: *"Enter a Customer ID (a positive whole number)."* Value `0` or empty is invalid.
- **Asset class ID / Category ID**: optional — small "Optional" pill in the label row; helper text (visible on focus, collapsed otherwise): *"Narrows the master-data search to this asset class."* / *"Narrows the master-data search to this category."*
- Validate on blur and on submit; clear error on input. Valid state shows a tiny green check on the right (draw animation) for non-empty valid values.
- Enter in a field does **not** submit unless the form is valid; ⌘/Ctrl+Enter always attempts submit.

### 8.3 Primary button (`Analyze asset`)

- 52px height, `--brand` fill, white text 600, `--r-md`, icon (sparkle) left. Hover: translateY(-1px) + brighter shadow; active: translateY(0) + scale(.99). A diagonal **shimmer** passes every 3.5 s while enabled.
- Disabled (until both photos + valid Customer ID): `--line` bg, `--faint` text, no shimmer, `aria-disabled="true"` (keep it focusable so clicking explains what's missing via the validation summary — on click while invalid: shake the button, focus first invalid control, show a one-line summary above the button: *"Add both photos and a Customer ID to continue."*).
- On submit: button text → "Starting…" with a small spinner for the ≤ 250 ms before the view transition.
- Secondary button **Reset**: ghost; clears photos and optional IDs (keeps Customer ID).

### 8.4 Stage timeline (`processing.js`)

See §7.3 and §10.3. Each row is `<li>` with `data-state="pending|active|done"` and `aria-current="step"` on active. The list has `aria-label="Analysis progress"`. Announce stage changes through the live region (debounced, "Step 3 of 7: Working out which photo is which").

### 8.5 Gauge (`animations.js` → `AA.fx.gauge(el, value, colorVar)`)

- SVG path arc; length computed with `getTotalLength()`; set `stroke-dasharray = L`, animate `stroke-dashoffset` from `L` to `L*(1-value/100)` via CSS transition (1100 ms `--ease-out`).
- End-dot position: compute via `getPointAtLength` in a `requestAnimationFrame` loop synchronised with the same easing (or animate with `offset-path`); fall back to hiding the dot if unsupported.
- Count-up: `AA.fx.countUp(el, from, to, ms)` with the same easing, `Math.round`, writes `textContent`.

### 8.6 Score pips

Flex row of 10 `<span>`; filled ones get class `on` with `transition-delay: calc(var(--k) * 40ms)`; `role="img"` + `aria-label="Condition score 9 out of 10"`.

### 8.7 Odometer (`AA.fx.odometer(el, string)`)

For each character: if digit → a fixed-height column (`overflow:hidden`) containing digits 0–9 stacked, translateY to `-digit * 1em` (transition 700 ms `--ease-out`, delay = index × 40 ms); otherwise a static span. Real text is also placed in a `sr-only` span for accessibility and copy.

### 8.8 Breadcrumb node (Classification)

`<li class="node" data-empty="true|false">` with micro-label, name, ID chip (mono, `#` prefix, tooltip "ID"). Connector is an absolutely-positioned SVG line (or CSS `::after` with `transform: scaleX` from 0 → 1). Vertical on mobile.

### 8.9 Toast (`toast.js`)

`AA.toast(message, {type:'info'|'success'|'error', ms:2600})`. Bottom-centre, pill, `--ink` background / white text for info; icon at left; slides up 12px + fade; stack max 3; `role="status"`.

### 8.10 Lightbox

Fixed overlay `rgba(20,24,31,.72)` + blur 4px, image centred max 92vw/88vh, close button top-right, `Esc`/backdrop click closes, focus trap, returns focus to the trigger.

### 8.11 Health pill

States: `checking` (grey dot pulsing), `online` (green dot with expanding ring pulse, text "Service online"), `offline` (red dot, text "Service offline"). Check on load, on settings save, on window `focus`, and every 60 s while the Idle view is visible (`GET /api/health`, 4 s timeout). Never blocks submit. On mobile, collapse to dot-only with `aria-label`.

### 8.12 Settings popover

Gear button opens a popover (anchored under the header, 340px, `--shadow-3`, scale-in from the button 0.96→1, 160 ms). Contents: **API base URL** field (default value shown as placeholder), **Test connection** button (shows spinner → ✓ "Connected" or ✗ message), **Save** and **Reset to default**. Validate: must start with `http://` or `https://`. Closes on `Esc`/outside click; focus returns to the gear.

---

## 9. Motion system

### 9.1 Principles

- **Purposeful:** each animation confirms an action, shows progress, or guides the eye.
- **Fast in, calm out:** entrances 320–520 ms with `--ease-out`; exits 160–220 ms.
- **Choreographed, not simultaneous:** stagger with `--i`/`--k` custom properties.
- **Transform/opacity only.** `will-change` only on actively animating elements, removed afterwards.
- Never block interaction on an animation.

### 9.2 View transitions

Use `document.startViewTransition` when available (wrap `AA.setView` DOM swap). Default cross-fade 280 ms + the incoming view `translateY(12px → 0)`. Fallback: manual class-based crossfade (outgoing `.leaving` 180 ms, then incoming `.entering` 320 ms). Idle→Processing additionally: the right showcase panel exits to the right; the form's photo previews **fly into** the scanner (FLIP: measure the preview rect, set the scanner image `transform` from that rect to its final rect, 520 ms `--ease-out`). Processing→Result: the scanner image FLIPs to the Result photo slot the same way. If FLIP measurement fails, just crossfade.

### 9.3 Animation catalog (implement all)

| # | Where | Animation | Spec |
|---|---|---|---|
| 1 | Page load | Header drop + headline word rise + card fade-up | §7.1 |
| 2 | Background | Dot grid + slow scanner sweep | 14 s linear infinite, `transform: translate3d` of a big gradient, opacity .08 |
| 3 | Intro | Video splash (Role A) or ambient hero (Role B) | §4.2 |
| 4 | Dropzone idle | Icon float | ±3px, 4 s ease-in-out infinite |
| 5 | Dropzone drag-over | Viewfinder brackets expand + marching ants | §8.1 |
| 6 | File accepted | "Photo develops" blur→sharp + shutter flash | 650 ms |
| 7 | Step badge | Number → ✓ morph with stroke draw | 240 ms |
| 8 | Field valid | Tiny check draws in | 200 ms |
| 9 | Primary button | Shimmer sweep every 3.5 s; press scale | §8.3 |
| 10 | Invalid submit | Button + first invalid control shake | 4px, 280 ms, 3 cycles damped |
| 11 | View change | View transition + FLIP photo fly | §9.2 |
| 12 | Scanner | Scan line sweep + grid pulse | 2.6 s alternate |
| 13 | Scanner | Bracket "lock on" contraction + pulse | 900 ms `--ease-spring` |
| 14 | Timeline | Active ring spin, connector fill, tick draw | spin 900 ms linear; tick 240 ms |
| 15 | Progress bar | Eased fill + moving highlight | §10.3 |
| 16 | Copy rotator | Fade/slide text swap every 4 s | 220 ms |
| 17 | Completion | Brackets turn green + flash; bar to 100% | 350 ms |
| 18 | Result header | Success circle + tick draw | 600 ms total |
| 19 | Result cards | Staggered fade-up (`--i`) | 520 ms, 70 ms step |
| 20 | Asset name | Word-by-word mask reveal | 50 ms stagger |
| 21 | Breadcrumb | Nodes pop (spring), connectors draw | §8.8 |
| 22 | Gauge | Arc sweep + count-up + end-dot | 1100 ms |
| 23 | Pips | Sequential fill | 40 ms step |
| 24 | Tag number | Odometer roll | 700 ms, 40 ms step |
| 25 | Copy actions | Icon morphs copy → check for 1.4 s, toast | 160 ms |
| 26 | Photos | Hover lift + lightbox zoom | 200 ms |
| 27 | Error | Shield shake once, card fade-in | 400 ms |
| 28 | Health pill | Ring pulse when online | 2.4 s infinite |
| 29 | Grade ≥ "Good" | One restrained sparkle burst (6–8 tiny `--scan`/`--brand` dots radiating from the gauge end-dot, 700 ms, fade) — **not** for Fair/Poor/Bad | CSS only |

### 9.4 Tokens for stagger

Use CSS custom properties: `style="--i:3"` and `animation-delay: calc(var(--i) * 70ms)`. Set them in JS when building DOM.

### 9.5 Performance

- Avoid animating `box-shadow`, `filter` on large areas continuously (the "develop" filter animation is one-shot only).
- Pause infinite animations when the tab is hidden (`document.hidden`) and when their view is not active (`[hidden]` removes them from layout anyway).
- Keep total JS animation work in a single `requestAnimationFrame` per effect; cancel on view exit.

### 9.6 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important;
    transition-duration: .001ms !important; scroll-behavior: auto !important; }
}
```
Plus in JS (`AA.prefersReducedMotion`): skip the splash, skip FLIP, set gauge/pips/odometer/count-up to their **final values immediately**, disable video autoplay, stop the scan line (show a static line at 50%). All information must remain visible.

---

## 10. Data layer

### 10.1 `config.js`

```js
AA.config = {
  ASSETS: { logo: '<discovered relative path>', video: '<discovered relative path>' },
  DEFAULT_API_BASE: 'http://localhost:7071',
  ENDPOINTS: { analyze: '/api/additional_asset', health: '/api/health' },
  REQUEST_TIMEOUT_MS: 120000,
  HEALTH_TIMEOUT_MS: 4000,
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,
  ACCEPT_MIME: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_ID_DIGITS: 12,
  STAGES: [ /* §10.3 */ ],
  GRADES: { /* name → {color, bg, icon} */ }
};
```

### 10.2 `api.js`

```js
AA.api.analyze({ assetFile, tagFile, customerId, assetClassId, categoryId },
               { onUploadProgress(pct), onUploadDone(), signal }) → Promise<{ status, body }>
AA.api.health() → Promise<{ ok, info }>
```

Implementation notes:
- Build `FormData`: `assetimage`, `barcodeimage`, `customerid`; append `assetclassid` / `categoryid` **only if non-empty**.
- XHR `POST`; `xhr.upload.onprogress` → percent; `xhr.upload.onload` → `onUploadDone` (this starts the simulated stage clock); `xhr.responseType='text'`, parse JSON defensively (invalid JSON → treat as server error).
- `xhr.timeout = REQUEST_TIMEOUT_MS`; `ontimeout`, `onerror` (status 0), `onabort` map to typed rejections: `{kind:'timeout'|'network'|'aborted'}`.
- Expose `abort()` through the returned handle (`state.request.xhr`).
- Mock mode intercepts here (§10.4).

### 10.3 Stages & progress

```js
STAGES: [
  { id:'upload',   label:'Uploading photos',                   real:true },
  { id:'prepare',  label:'Preparing images',                   est: 600 },
  { id:'identify', label:'Working out which photo is which',   est: 4500 },
  { id:'tag',      label:'Reading the tag & barcode',          est: 2500 },
  { id:'analyze',  label:'Analyzing the asset & its condition',est: 4000 },
  { id:'search',   label:'Searching your master data',         est: 2200 },
  { id:'match',    label:'Matching category & make/model',     est: 1800 }
]
```

- The simulated clock starts at `onUploadDone`. Stages advance when their `est` elapses. The **last stage never completes by timer** — it stays active (indeterminate shimmer) until the response arrives.
- **Progress %** = `(completedStagesWeight + currentFraction * currentWeight) / totalWeight`, with the upload stage weight = 8% and driven by real upload %; clamp to **max 94%** until the response arrives; ease with `1 - Math.pow(1 - x, 2)`.
- On response: fast-forward remaining stages (140 ms each), progress → 100%.
- Timer shows real elapsed `mm:ss` (from submit).

### 10.4 Mock mode (for building & testing without a backend)

Create `js/mocks.js` with fixtures and enable via URL param:

- `?mock=1` — the **full sample response** from §3.3 (use it verbatim, including nested objects), simulated total latency **9 s** (upload progress simulated over 1 s).
- `?mock=partial` — same but `MakeModel`, `MakeModelId` = `null` (sub-category present).
- `?mock=none` — all classification names/ids/sub-category/make-model `null` except echoed `CustomerId` (and echoed `AssetClassId`/`CategoryId` if the form provided them).
- `?mock=bad` — `AssetCondition`: grade `"Poor"`, `condition_score: 3`, `overall_score: 30`, `has_damage: true`, `damage_count: 2`, `damage_items: [{location:"Screen",type:"Crack",severity:"severe",detail:"Visible crack across the lower-left corner."},{location:"Chassis",type:"Dent",severity:"moderate"}]`.
- `?mock=vision` — `tagnumbersource:"vision"`, `decodedtagnumber:null`, `detectedtagnumber:"10001882"`.
- `?mock=mismatch` — decoded `"10001882"`, detected `"10001862"`, source `"decoded"`.
- `?mock=notag` — both null, source `"NA"`.
- `?mock=error502` / `?mock=error400img` / `?mock=network` / `?mock=timeout` — emit the matching error paths.

When any mock is active show a small, unobtrusive **"Mock data"** pill next to the health pill (and force health to "online (mock)").

### 10.5 `normalize.js` — view-model builder

```js
AA.normalize(raw, inputs) → {
  asset:   { name, description },
  customerId,
  classification: {
    assetClass:  { name, id, fromInput },
    category:    { name, id, fromInput },
    subCategory: { name, id },
    makeModel:   { name, id }
  },
  matchStatus: 'full' | 'partial' | 'none',
  condition: null | { grade, tone, score10, score100, summary, hasDamage, damageCount, damageItems[] },
  tag: { decoded, detected, source: 'decoded'|'vision'|'none', primary, relation: 'match'|'mismatch'|'single'|'none' },
  copyPayload: { /* selected fields in API shape */ }
}
```

Rules:
- Treat `null`, `undefined`, `""`, `"NA"`, `"N/A"`, `"null"` names as empty.
- `score100 = overall_score ?? (condition_score <= 10 ? condition_score * 10 : condition_score)`; `score10 = condition_score ?? Math.round(score100/10)`; clamp both.
- `tone` from grade (case-insensitive) via `GRADES`; unknown grade → `unknown` tone; if grade missing derive from score100 (≥85 excellent, ≥70 good, ≥50 fair, ≥30 poor, else bad).
- `fromInput`: `true` when the user supplied that ID and `String(returnedId) === String(inputId)`.
- `matchStatus`: `full` if `subCategory.name && makeModel.name`; `partial` if `subCategory.name` only; else `none`.
- `damageItems`: array filter objects; keep only `location, type, severity, detail`.
- Tag: `source` = `tagnumbersource === 'decoded'` → `decoded`; `'vision'` → `vision`; else if a number exists → `vision`; else `none`. `primary = decoded || detected`. `relation`: both equal → `match`; both non-empty & different → `mismatch`; one → `single`; none → `none`.

### 10.6 Error mapping (`errors.js`)

```js
AA.errors.fromResponse(status, body) | fromFailure(kind) → { kind, title, message, hint, requestId, canRetry, showSettings }
```
Copy per kind is in §11.

---

## 11. Copywriting (use verbatim)

| Place | Text |
|---|---|
| App name | Additional Asset |
| Eyebrow | ✦ AI asset capture |
| H1 | Two photos in. A complete asset record out. |
| Hero sub | Add a photo of the asset and a close-up of its tag. We'll identify it, read the tag, grade its condition and match it to your master data. |
| Section 1 | Photos |
| Section 2 | Details |
| Asset dropzone | **Asset photo** — "Drop, click or paste" · hint "The whole asset, in good light" |
| Tag dropzone | **Tag or barcode photo** — "Drop, click or paste" · hint "A close-up of the asset tag" |
| Order note (small, under dropzones) | Not sure which is which? No problem — we'll work it out. |
| Customer ID | Customer ID · error "Enter a Customer ID (a positive whole number)." |
| Optional pills | Optional |
| Primary CTA | Analyze asset |
| Invalid summary | Add both photos and a Customer ID to continue. |
| Processing title | Analyzing your asset… |
| Processing sub | Usually takes 10–30 seconds. Please keep this tab open. |
| Progress label | Estimated progress |
| Long wait | This is taking longer than usual — still working. |
| Cancel toast | Analysis cancelled. Your photos are still here. |
| Result title | Analysis complete |
| Result actions | Analyze another asset · Edit inputs · Copy JSON |
| Copy toasts | Copied · JSON copied |
| Partial match | No make/model match — The category was matched, but this exact make/model isn't in your master data. |
| No match | No master-data match found. — Try adding a Category or Asset class ID, or retake the photo closer to the asset. |
| Condition unavailable | Condition unavailable for this photo. |
| No damage | No damage detected |
| Tag decoded | Decoded from barcode — Read directly from the barcode — exact. |
| Tag vision | Read from photo — Read by AI from the printed digits — double-check it. |
| Tag none | No tag number found — Retake the tag photo closer, in good light, with the code filling the frame. |
| Tag mismatch | The two reads differ — verify manually. |
| Footer | AI-generated results — please verify before saving. |

**Error variants**

| Kind | Title | Message | Hint |
|---|---|---|---|
| network | Can't reach the service | We couldn't connect to the analysis service. | Check the API address in settings and that the service is running. If you opened this file directly, the service must allow CORS (see README). → *Open settings* |
| timeout | That took too long | The analysis didn't finish in time. | Try again — a smaller or clearer photo can help. |
| validation | Something's missing | (server `detail`, softened — e.g. "Missing required field: assetimage" → "Both photos are required.") | — |
| image | We couldn't read a photo | One of the photos couldn't be opened. | Use a standard JPG, PNG or WebP image under 10 MB. |
| analysis (502) | Analysis failed | Our AI service couldn't complete this one. | Please try again in a moment. |
| server (500/other) | Something went wrong | An unexpected error occurred. | Try again. If it keeps happening, share the reference below with support. |

---

## 12. Accessibility (WCAG 2.2 AA)

- Landmarks: `<header>`, `<main>`, `<footer>`. One `<h1>` (Idle hero); other views use `<h2 tabindex="-1">` that receives focus on view change.
- All interactive elements are native `<button>`/`<input>`; hit areas ≥ 44×44px on touch.
- Visible focus ring everywhere: `outline:none; box-shadow: var(--ring)` via `:focus-visible`.
- Colour contrast ≥ 4.5:1 for text, ≥ 3:1 for UI; **grade/state is never colour-only** (text + icon).
- Dropzone: button with `aria-describedby` linking hint/error; preview `<img alt="Preview of asset photo: filename">`.
- Form errors: `aria-invalid="true"`, `aria-describedby` → error element, summary uses `role="alert"`.
- Processing: timeline is an ordered list; progress bar has `role="progressbar"` + `aria-valuenow` (rounded) + `aria-valuetext="Estimated progress 42 percent"`; announcements via `#live` (throttled to stage changes).
- Result: on entry announce "Analysis complete. {AssetName}. Condition {grade}." in `#live`.
- Lightbox/popover: focus trap, `Esc`, restore focus.
- Decorative SVG/art: `aria-hidden="true"`; video: `aria-hidden="true"`, `tabindex="-1"`, `disablePictureInPicture`, no controls (it's decorative).
- Respect reduced motion (§9.6). Support 200% zoom without horizontal scroll.

---

## 13. Responsive rules

| Breakpoint | Behaviour |
|---|---|
| ≥ 1024px | Two-column Idle (7/5), Result 5/7 with sticky photos, Processing two columns |
| 640–1023px | Idle: showcase panel moves **below** the card (video max-height 260px); Result: photos become a 2-up row on top, cards single column (Condition + Tag side-by-side if ≥ 760px); Processing stacked |
| < 640px | Single column; dropzones stack (each 16:10); ID fields stack; **sticky bottom action bar** (safe-area aware, `padding-bottom: env(safe-area-inset-bottom)`) holds the primary CTA on Idle and "Analyze another" on Result; Result photos become a horizontal scroll-snap carousel with dots; Classification becomes a vertical timeline; header health pill collapses to a dot |

Use container-friendly CSS (`clamp()`, `minmax()`, `grid-template-columns: repeat(auto-fit, …)` where natural). Max content width `--container`, side padding `clamp(16px, 4vw, 32px)`. Test at 360, 390, 768, 1024, 1280, 1536 px.

---

## 14. File structure & script order

```
AA_Frontend/
├─ index.html
├─ README.md                  ← how to run, CORS prerequisite, mock URLs, asset notes
├─ IMPLEMENTATION_PLAN.md     ← this file (leave as is)
├─ <existing logo file>       ← untouched
├─ <existing video file>      ← untouched
├─ css/
│  ├─ tokens.css
│  ├─ base.css                (reset, typography, background, utilities, sr-only, focus)
│  ├─ layout.css              (header, footer, grids, views, responsive)
│  ├─ components.css          (buttons, fields, dropzone, cards, chips, pills, toast, popover, lightbox)
│  ├─ views.css               (idle, processing, result, error specifics)
│  └─ motion.css              (all keyframes + reduced-motion block)
└─ js/
   ├─ config.js      → creates window.AA, AA.config
   ├─ util.js        → AA.$, AA.el(), AA.icon(), AA.format (bytes, mm:ss), AA.copy(), AA.prefersReducedMotion
   ├─ mocks.js       → AA.mocks
   ├─ errors.js      → AA.errors
   ├─ normalize.js   → AA.normalize
   ├─ api.js         → AA.api
   ├─ fx.js          → AA.fx (countUp, gauge, odometer, flip, sparkle, wordReveal, shake)
   ├─ toast.js       → AA.toast
   ├─ shell.js       → header, health pill, settings popover, live region, scroll shadow
   ├─ upload.js      → dropzones + paste + drag guard
   ├─ form.js        → fields, validation, submit orchestration
   ├─ processing.js  → processing view, stages, progress, timer
   ├─ result.js      → result view rendering + lightbox + copy JSON
   ├─ views.js       → AA.setView, transitions, focus & title management
   └─ main.js        → boot: read params, init modules, splash/hero video, entrance choreography
```

`index.html` loads CSS in the order above, then scripts **in the order listed**, all with `defer`, no modules. Each file is an IIFE: `(function (AA) { … })(window.AA = window.AA || {});`. `index.html` contains the static skeleton for the shell and the four view containers (`<section id="view-idle">`, `…-processing`, `…-result`, `…-error`, all but idle `hidden`); dynamic parts are built in JS.

Code quality: small functions, JSDoc on public functions, no globals except `window.AA`, no unused code, consistent naming (`kebab-case` classes with a light BEM: `.dz`, `.dz__preview`, `.dz--filled`).

---

## 15. Build milestones (do in order; verify each before moving on)

**M0 — Recon (no code)**
List `AA_Frontend/`, identify logo + video, inspect video duration/dimensions, choose Role A or B, note brand colour decision. Write these into `README.md` "Asset notes".
*Accept:* README exists with decisions; paths copied into `config.js` later.

**M1 — Skeleton & design system**
`index.html`, all CSS files with tokens/base/layout, header (logo, health pill placeholder, settings button), footer, background, fonts, `AA.setView` with four empty views.
*Accept:* page opens via `file://`, looks polished and empty-but-intentional at all breakpoints; no console errors; no module scripts used.

**M2 — Idle view (static)**
Hero copy, capture card, dropzones (all states), fields, buttons, showcase panel (video or chips art), How-it-works, entrance choreography, splash if Role A.
*Accept:* every dropzone state reachable (hover, drag-over, filled with the "develop" animation, error); paste works; validation works; button disabled/enabled logic correct; Customer ID persists across reload.

**M3 — Data layer & mock mode**
`config`, `util`, `mocks`, `errors`, `normalize`, `api`. Unit-check `normalize` against every mock fixture (console assertions are fine in a hidden `?selftest=1` helper).
*Accept:* `?mock=1` round-trips through `api.analyze` and yields the exact view-model; all error kinds map to the right copy.

**M4 — Processing view**
Scanner, brackets, scan line, timeline, real upload progress (non-mock), simulated stages, progress bar, timer, rotating copy, cancel, fast-forward on completion, FLIP photo fly.
*Accept:* with `?mock=1` the 9 s run shows all 7 stages completing in order; cancelling returns to Idle with photos intact; progress never hits 100% early; stage announcements reach the live region.

**M5 — Result view**
Header, photos + lightbox, hero card, classification (3 match states), condition (gauge, pips, damage list), tag card (decoded/vision/none/mismatch), copy actions, staggered choreography, sparkle for Good/Excellent only.
*Accept:* every mock variant renders correctly; no `null`/`undefined` text anywhere; Copy JSON yields exactly the selected-fields payload; Analyze another / Edit inputs behave per §5.

**M6 — Error view, settings, health**
Error variants with retry that reuses files, settings popover with test connection, health pill states, CORS hint path.
*Accept:* `?mock=network|timeout|error502|error400img` show correct screens; Try again works; changing API base persists and re-checks health.

**M7 — Polish & QA**
Reduced motion, keyboard-only run-through, screen-reader labels, responsive passes (360→1536), performance check (no long tasks > 50 ms during animation), cross-browser sanity, README finish. Run §16 checklist.
*Accept:* every §16 item ticked.

---

## 16. QA checklist & edge cases

**Functional**
- [ ] Submit blocked without both photos or Customer ID; first invalid control focused.
- [ ] Optional IDs are **omitted** from the request when empty (verify in DevTools → Network).
- [ ] Customer ID rejects `0`, negatives, letters, decimals; digits-only sanitising works with paste.
- [ ] 10 MB+ file, `.gif`/`.heic`/`.pdf`/text file → friendly error, state unchanged.
- [ ] Swapping the photos (tag in asset slot) is accepted with no complaint.
- [ ] Cancel mid-upload and mid-processing returns to Idle with files and values intact.
- [ ] Double-click on Analyze does not send two requests.
- [ ] Retry from Error resubmits identical data.
- [ ] Result "Edit inputs" keeps photos; "Analyze another" clears photos but keeps the three IDs.
- [ ] Object URLs revoked (no growth after 20 cycles).
- [ ] Long `AssetName`/`Description`/`condition_summary` wrap, never overflow; 60+ char names don't break layout.
- [ ] Very long `damage_items` list capped with "+N more".
- [ ] Tag with letters/dashes (non-digit) renders statically, still copyable.
- [ ] All mock variants in §10.4 look right.

**Visual / motion**
- [ ] Light theme only; no dark-mode media queries anywhere.
- [ ] Gauge ends exactly at `overall_score`; count-up number equals final value.
- [ ] Sparkle only for Good/Excellent.
- [ ] No layout shift when views swap; header never jumps.
- [ ] Animations paused when tab hidden; video paused off-screen.
- [ ] Reduced-motion mode: everything visible, nothing animating, no splash.

**Accessibility**
- [ ] Full keyboard path: tab through → add files via Enter → submit → cancel → result actions → lightbox.
- [ ] Focus lands on the new view heading after each transition.
- [ ] Screen reader hears stage changes and the final summary once (not spammed).
- [ ] Contrast spot-checked on muted text, chips, pills.

**Resilience**
- [ ] Backend down → offline pill + network error screen with working "Open settings".
- [ ] Malformed JSON response → "Something went wrong" (no crash).
- [ ] `video` missing/blocked → graceful fallback art, no console errors.
- [ ] Offline fonts → fallback stacks still look intentional.

---

## 17. Don'ts

- ❌ No frameworks, libraries, CDNs for JS/CSS, build tooling, or `type="module"`.
- ❌ No dark theme.
- ❌ No `innerHTML` with dynamic data; no inline event-handler attributes.
- ❌ No fake detections, bounding boxes, confidence percentages or invented metrics.
- ❌ Don't render `ImageAnalysis`, `timings_ms`, `llm_usage`, `llm_provider`.
- ❌ Don't compress/alter uploaded images client-side.
- ❌ Don't send empty optional fields.
- ❌ Don't persist images or the optional IDs.
- ❌ Don't move/rename/re-encode the existing logo or video.
- ❌ Don't scold users about photo order or format beyond the specific validation messages.
- ❌ Don't add features not in this plan (history, login, batch upload, export to CSV) — polish what's here instead.

---

*End of plan. When every acceptance criterion in §15 and every box in §16 is satisfied, the frontend is done.*
