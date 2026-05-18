# 🇮🇹 A.L.Ex — Advanced Language Experience

A self-contained Italian learning web app (A1 → B1). React + Vite, all data bundled, progress saved in the browser via `localStorage`. **Installable PWA** — works fully offline and adds to your phone's home screen. Deploys to Vercel with zero config.

## What it does

- **Vocabulary Flashcards** — 1,000+ words. **Multiple choice** (4 options) with an always-present **"I don't know"** button. From A2 onward, A1 words randomly flip between Italian→English and English→Italian, labeled per card.
- **Verb Trainer** — 200 verbs across presente / passato prossimo / futuro semplice. Four modes: multiple choice, fill-in-the-blank, translate, match-pronoun. "I don't know" available on every question.
- **Sentence Builder** — 150+ exercises. Tap word tiles to build the Italian sentence. "I don't know" reveals the answer.
- **Dashboard** — streak, accuracy, per-module mastery, progress to next CEFR level.
- **Persistence** — everything saves to `localStorage` automatically on every answer. Survives refreshes and browser restarts. Cleared only via the Reset button.
- **Installable + offline (PWA)** — add to home screen for a fullscreen, app-like experience. After the first visit the entire app, fonts, and all word/verb/sentence data are cached, so it runs with no network at all.

## Installing on your phone

Once deployed (see below), open the URL on your phone:

- **iOS (Safari)**: tap the Share button → **Add to Home Screen**. Launches fullscreen with the A.L.Ex icon.
- **Android (Chrome)**: tap the **⋮** menu → **Install app** (or accept the install banner). Same result.

The service worker auto-updates: when you push a new deploy, the next launch silently picks it up.


## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173`.

To preview a production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

**Option A — Vercel CLI**

```bash
npm install -g vercel
vercel
```

Accept the defaults. Vercel auto-detects Vite, runs `npm run build`, and serves `dist/`.

**Option B — Git + Vercel dashboard**

1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In the Vercel dashboard: **Add New → Project → Import** the repo.
3. Framework preset auto-detects as **Vite**. Build command `npm run build`, output `dist`. Click **Deploy**.

`vercel.json` is already included (Vite preset + SPA rewrite), so no manual settings are needed.

## Project structure

```
italian_vercel/
├── index.html                 # PWA manifest link + iOS meta tags
├── package.json
├── vite.config.js             # Vite + vite-plugin-pwa config
├── vercel.json
├── .gitignore
├── public/
│   ├── manifest.webmanifest   # PWA manifest (name, icons, theme)
│   ├── icon-192.png           # A.L.Ex icon
│   ├── icon-512.png
│   ├── icon-maskable-512.png  # Android adaptive (safe-zone) icon
│   ├── apple-touch-icon.png   # iOS home-screen icon
│   └── favicon-32.png
└── src/
    ├── main.jsx               # React entry + service-worker registration
    ├── App.jsx                # state + tab navigation
    ├── index.css              # full design system
    ├── vite-env.d.ts          # PWA virtual-module types
    ├── data/
    │   ├── vocabulary.json    # 1,000+ words
    │   ├── verbs.json         # 200 conjugated verbs
    │   └── sentences.json     # 150+ sentence exercises
    ├── lib/
    │   └── store.js           # SR algorithm, leveling, localStorage
    ├── components/
    │   └── UI.jsx             # Card, Pill, ProgressBar, etc.
    └── screens/
        ├── Dashboard.jsx
        ├── Flashcards.jsx     # multiple choice + "I don't know"
        ├── Verbs.jsx
        └── Sentences.jsx
```

## PWA / offline notes

- `vite-plugin-pwa` (Workbox under the hood) generates the service worker at build time and **precaches the whole app** — JS, CSS, HTML, the three JSON data files, and icons.
- Google Fonts are runtime-cached (stylesheet `StaleWhileRevalidate`, font files `CacheFirst` for a year), so typography survives offline too.
- `registerType: 'autoUpdate'` — new deploys install in the background and apply on next launch; no "refresh to update" prompt needed.
- Offline works after the **first** online visit (that's when the cache is populated). Your learning progress was already offline-capable via `localStorage`; now the app itself is too.
- To test offline locally: `npm run build && npm run preview`, load it once, then switch off network and reload. (`devOptions.enabled: true` also enables the SW under `npm run dev`.)

## Spaced repetition

Priority per item moves with each answer:

| Result | Priority delta |
|---|---|
| Wrong / "I don't know" | +5.0 |
| Hard | +2.0 |
| Correct | −1.0 |
| Easy | −2.5 |

Higher priority = appears sooner. Floor 0.1 so nothing fully retires.

## Level unlocks

- **A1 → A2**: 50 questions, 80%+ accuracy
- **A2 → B1**: 100 questions, 80%+ accuracy, 30+ distinct verbs practiced

Content above your level is never shown.

## Expanding the data

The three files under `src/data/` are plain JSON.

- **vocabulary.json**: `{italian, english, pos, example_it, example_en, level, difficulty}`
- **verbs.json**: `{infinitive, english, auxiliary, regularity, group, level, presente, passato_prossimo, futuro}` — each tense keyed by `io, tu, lui, noi, voi, loro`
- **sentences.json**: `{english, italian, words, grammar_point, level, explanation}`

Edit, save, restart `npm run dev`.
