# RKS Family Apps

Static sites on Firebase Hosting (project `rks-family-apps`):

| Folder | Hosting target | Site |
|---|---|---|
| `travel-expense-tracker/` | `trip-planner` | https://rks-trip-planner.web.app — **Mexico Trip Planner** |
| `a1c-roadmap/` | `a1c-roadmap` | https://rks-a1c-roadmap.web.app |
| `hub/` | `hub` | https://rks-hub.web.app |

All three are plain HTML/CSS/JS with no build step.

---

## Mexico Trip Planner (`travel-expense-tracker/`)

A mobile-first, offline-capable (PWA) road-trip app: day-by-day plan with sunrise/sunset
driving rules, check-ins and status sharing, spending in USD/MXN, a toll (caseta) tracker,
a fuel log with range alerts, heads-up notes for tomorrow, documents and emergency info.
English/Spanish, miles/km, dark and high-contrast sunlight themes.

### Files

| File | Purpose |
|---|---|
| `index.html` | App shell (header, bottom nav, modal) |
| `app.js` | All app logic: state, migration, views, actions |
| `i18n.js` | Every UI string, English and Spanish (same keys in both) |
| `seed.js` | Seed itinerary, fuel stops, expected tolls, budget, notes, documents. **No personal data**: the repo is public. |
| `styles.css` | Styles (dark default, `sun` theme) |
| `sw.js` | Service worker: precaches the app for offline use |
| `manifest.webmanifest`, `icons/` | Install (PWA) metadata |
| `vendor/suncalc.js` | [SunCalc](https://github.com/mourner/suncalc) 1.9.0 (BSD-2), bundled so it works offline |

### Data

Everything is stored in the phone's `localStorage` under `mexico-trip-v2`.
There is no server, Firestore or login.

- **Migration:** on first run, data from the original expense tracker (`travel-tracker-v1`)
  is copied in. The categories map like this:
  - food → Food
  - lodging → Hotel
  - casetas → Toll
  - transport, activities, shopping and other → Other (the original category is shown on each entry)

  The original key is **never modified or deleted**. Its cached exchange rate is reused too.
- **Backups:** importing a backup or clearing expenses saves a copy under `mexico-trip-v2-backup`.
  You can restore it from More → Data.
- **Exports:** More → Data exports everything as JSON, plus CSV files for expenses, tolls and fuel.
  Importing a JSON backup asks before it replaces anything.
- **Exchange rate:** live from frankfurter.app, with jsDelivr currency-api as a fallback.
  The last rate is cached, and you can enter a manual rate (tap the rate chip).
  With no rate at all, it uses 18.5 MXN per USD.
- **Personal details** such as your name for status messages are entered in Settings and stay on the phone.

### Run locally

The service worker needs `http://localhost` or HTTPS, so don't open the file directly.

```bash
cd travel-expense-tracker && python3 -m http.server 8080
```

Then open http://localhost:8080.

Or with the Firebase emulator:

```bash
npx firebase-tools serve --only hosting:trip-planner
```

### Build and test

There is no build step. The files in `travel-expense-tracker/` are deployed as they are.

Checks:

```bash
for f in travel-expense-tracker/*.js; do node --check "$f"; done
```

```bash
node tests/trip-planner/e2e.test.js
```

The end-to-end test needs Playwright with Chromium. If it's missing, install it first:

```bash
npm i -D playwright && npx playwright install chromium
```

The test runs headless Chromium and covers:
- migration from the original tracker
- persistence after reload
- every screen in English and Spanish, with no missing strings
- tolls and fuel flowing into spending totals
- the heads-up banner
- time-zone changes
- installability
- loading with the network off

### Releasing a new version

When you change any app file, **bump `CACHE` in `sw.js`**, for example `mexico-trip-v2-1` → `mexico-trip-v2-2`.
Installed phones then download the new files on their next online launch.

### Deploy (rks-trip-planner only)

**Automatic:** pushing to `main` runs `.github/workflows/firebase-deploy.yml`.
It deploys only the sites whose folder changed, so a change in `travel-expense-tracker/`
deploys only `hosting:trip-planner`.

The workflow deploys **all** sites in three cases:
- a manual "Run workflow"
- a push that changes `firebase.json` or `.firebaserc`
- a push where there is no previous commit to compare against

**Manual**, from the repo root:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only hosting:trip-planner --project rks-family-apps
```

### On the phone (Android Chrome)

1. Open https://rks-trip-planner.web.app once while online.
2. Use Chrome menu → **Install app** (or More → Settings → Install).
3. It now works in airplane mode.
4. Download Google Maps offline areas for the route. The app's "Find nearby" and route buttons open Google Maps, which uses those offline areas.
5. Export a JSON backup now and then (More → Data).
