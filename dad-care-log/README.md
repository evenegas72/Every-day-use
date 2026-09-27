# Dad's Care Log (Bitácora de cuidados de papá)

A shared, append-only caregiving journal for the family's care rotation.
Family members sign in with Google, log what the doctor said, medications and
symptoms, next steps for whoever is on shift next, and notes. They can also
attach a photo of a monitor or a handwritten note, with an optional AI reading
of it. Once an entry is saved, nobody can edit or delete it, including its
author. The security rules enforce this, not just the UI.

The UI is in Spanish. Field names in code and in Firestore (`when`, `who`,
`doctor`, `meds`, `next`, `notes`, …) stay in English.

It lives in the existing **rks-family-apps** Firebase project (the same project
as the rks-hub, trip-planner and a1c-roadmap sites) as its own Hosting site,
with its own Firestore database (`dad-care-log`), so Dad's health information
isn't in the `(default)` database.

## Layout

| Path | What it is |
|---|---|
| `public/index.html` | The whole app: markup, styles and logic. |
| `firestore.rules` | Family allow-list + append-only entries, for the `dad-care-log` database only. |
| `storage.rules` | Same allow-list for photos; photos are write-once too. |
| `firestore.indexes.json` | Empty; the one query (entries by `when`) needs no composite index. |
| `functions/` | `readCarePhoto` Cloud Function: sends an uploaded photo to Claude and returns a *suggested* reading. |
| `tests/` | Security-rule tests against the local emulators (`npm test`). |

Hosting, Firestore, Storage and Functions are configured in the repo-root
`firebase.json` (target `care-log` → site `dad-care-log`) and `.firebaserc`.

## One-time setup

All commands run from the **repo root** (where `firebase.json` is).

1. **Hosting site** (do this *before* merging to `main`; the GitHub Action
   deploys every hosting target and fails if the site doesn't exist yet):

   ```bash
   firebase use rks-family-apps
   firebase hosting:sites:create dad-care-log
   ```

   The `care-log → dad-care-log` target mapping is already in `.firebaserc`, so
   `firebase target:apply hosting care-log dad-care-log` is only needed if you
   pick a different site id.

2. **Firestore database** with delete protection on (a deploy would otherwise
   auto-create it *without* delete protection):

   ```bash
   firebase firestore:databases:create dad-care-log --location=nam5 --delete-protection=ENABLED
   ```

3. **Google sign-in**: Firebase console → Authentication → Sign-in method →
   Google must be enabled. Then Authentication → Settings → **Authorized
   domains** must list `dad-care-log.web.app` and `dad-care-log.firebaseapp.com`.
   Add them if missing, or sign-in fails on the new site.

4. **firebaseConfig** in `public/index.html`: Project settings → General →
   Your apps. None of the other apps in this repo use the Firebase JS SDK, so
   if no web app is registered yet, create one
   (`firebase apps:create web "Dad's Care Log"`, then
   `firebase apps:sdkconfig web <appId>`). Until it's filled in the page shows
   a "Falta configurar la aplicación" message.

5. **Family emails**: replace the eight `@replace-me.invalid` placeholders
   in **both** `firestore.rules` and `storage.rules` with each person's Google
   account email, in lowercase. `cd dad-care-log/tests && npm test` fails if
   the two lists differ.

6. **Photos + AI reading** (needs the Blaze plan for Storage and Functions):
   - Firebase console → Storage → Get started (creates the default bucket).
     Deploying `storage.rules` replaces the default bucket's rules. Nothing
     else in this project uses Storage today; check before deploying if that
     changes.
   - Anthropic API key as a secret (never in the browser):
     `firebase functions:secrets:set ANTHROPIC_API_KEY`
   - Each AI reading costs a few US cents of Claude API usage.

## Deploying

```bash
cd dad-care-log/functions && npm ci && cd ../..
firebase deploy --only hosting:care-log,firestore:dad-care-log,storage,functions:dad-care-log
```

Live at **https://dad-care-log.web.app**. After a merge to `main`, the GitHub
Action also redeploys the hosting part. Rules and functions are only deployed
by hand with the command above.

To change the family list later: edit both rules files, run the tests, then
`firebase deploy --only firestore:dad-care-log,storage`.

## Checking the deployed rules

- Firebase console → Firestore → database **dad-care-log** → Rules: shows
  `allow update, delete: if false;` on `/entries/{entryId}`. The `(default)`
  database's rules tab should be unchanged.
- In the Rules tab, use the **Rules Playground**: simulate an `update` or
  `delete` on `/entries/anything` as an authenticated family email. It should
  be **denied**.

## Local testing

```bash
cd dad-care-log/tests && npm install && npm test   # 37 rule tests on the emulators
cd ../functions && npm test                        # prompt / response parsing
```

To try the app against the emulators, run
`firebase emulators:start --only auth,firestore,storage,hosting --project demo-care-log`
from the repo root and open `http://localhost:5000/?emulator=1` (the
`?emulator=1` switch only works on localhost).

## How the AI reading stays a suggestion

- The browser uploads the photo to `dad-care-log/photos/<uid>/…`. The function
  only reads photos in the caller's own folder, and only family members can
  upload there.
- The reading appears in a yellow box labelled "Leído por IA, por favor
  verifica", separate from the person's own text, with anything the AI was
  unsure of listed. The text is editable.
- Saving is blocked until the person ticks "Revisé esta lectura contra la foto
  y está correcta". Editing the text afterwards unticks it.
- The Firestore rules refuse any entry with a `photoReading` unless
  `photoReadingConfirmed == true`. The saved entry shows "leída por IA y
  confirmada por <nombre>".

## Time zone

Dates are entered and shown in `America/Mexico_City` time (`CARE_TIME_ZONE`
in `index.html`), so an entry written from the US shows the same clock time
for everyone. Change it if Dad is in a different Mexican time zone.
