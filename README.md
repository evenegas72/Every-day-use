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

The seeded plan is a round trip:
- **Going down:** Dec 12–17, 2026, Grants Pass → Celaya, crossing at Eagle Pass – Piedras Negras (Puente Internacional II, "Puente 2").
- **With family:** Dec 18 – Jan 1.
- **Coming back:** Jan 2–7, 2027, by the same crossing.

Distances are taken from Google Maps where available (marked "Google"), and are estimates otherwise (marked "est.").
Border days link to live bridge wait times and to the two backup bridges, Del Rio – Ciudad Acuña and Puente Colombia.

**Real places:** each day lists towns along the route. "Real places nearby" looks up hotels, gas
stations and branded restaurants around those towns from OpenStreetMap (Overpass API), lists
chains first, and caches the results on the phone for offline use. Only the plan's town-center
coordinates are sent, never the phone's location. Data © OpenStreetMap contributors.

### Files

| File | Purpose |
|---|---|
| `index.html` | App shell (header, bottom nav, modal) |
| `app.js` | All app logic: state, migration, views, actions |
| `i18n.js` | Every UI string, English and Spanish (same keys in both) |
| `seed.js` | Seed itinerary (both directions, with stop towns), fuel stops, expected tolls, budget, notes, documents. Has a `version` and stable `key`s. **No personal data**: the repo is public. |
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
- **Plan updates for phones that already have data:** when `seed.js` gets a higher `version`,
  `applySeedUpdates()` in `app.js` merges it in on the next launch, using `seed-history.js`
  (every value previous versions shipped). It follows these rules:
  - It replaces a value only if it still equals something a previous version shipped, so anything you edited is kept.
  - It adds only items that are new since the phone's version, so things you deleted don't come back.
  - It removes old seed items only if you never edited them. An expected toll that a logged toll matched is kept.
  - It never touches expenses, tolls, fuel, check-ins, places or your own notes, and it saves a backup copy first.

  The upgrade is tested against snapshots from both earlier versions in `tests/trip-planner/fixtures/`.

  **When you change `seed.js`:**
  1. Bump `version`.
  2. Regenerate the history from the repo root, listing the commits of every version already shipped, oldest first:
     ```bash
     node scripts/build-seed-history.js f75ef61 14d3ef9
     ```
     That command covers versions 1 and 2. Once version 3 ships, add its commit to the list.
  3. Save a snapshot of the previous version as a new fixture for the test.
- **Real-places cache:** stored separately under `mexico-trip-osm`.
- **Backups:** importing a backup, clearing expenses or applying a plan update saves a copy under `mexico-trip-v2-backup`.
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
- upgrading first-release data to the round-trip plan without losing edits
- real places, using a mocked Overpass response

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
