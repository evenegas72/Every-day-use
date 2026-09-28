# Care Log (Bitácora de cuidados del paciente)

A shared, append-only caregiving journal for the family's care rotation.
Family members sign in with Google, log what the doctor said, medications and
symptoms, next steps for whoever is on shift next, and notes. They can also
attach a photo of a monitor or a handwritten note, with an optional AI reading
of it. Once an entry is saved, nobody can edit it, including its author.
Only the admin (`rickv72@gmail.com`, set in `isAdmin()` in `firestore.rules`)
can delete an entry, and every deletion leaves a record the family can see.
A "Turnos de guardia" section shows who is on watch duty. The security
rules enforce all of this, not just the UI.

The UI is in Spanish. Field names in code and in Firestore (`when`, `who`,
`doctor`, `meds`, `next`, `notes`, …) stay in English.

It lives in the existing **rks-family-apps** Firebase project (the same project
as the rks-hub, trip-planner and a1c-roadmap sites) as its own Hosting site,
with its own Firestore database (`dad-care-log`), so the patient's health information
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
   (`firebase apps:create web "Care Log"`, then
   `firebase apps:sdkconfig web <appId>`). Until it's filled in the page shows
   a "Falta configurar la aplicación" message.

5. **Family emails**: replace the `@replace-me.invalid` placeholders in
   **both** files, using each person's Google account email in lowercase:
   - `firestore.rules`, in `familyNames()`: `'email': 'Name'`. The name is
     what the person's entries are saved under. The app shows it as
     "Escribes como: …" and the rules refuse any other name for that account.
   - `storage.rules`: the same email in the list.

   `cd dad-care-log/tests && npm test` fails if the two files list different
   emails.

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
  `allow update: if false;` on `/entries/{entryId}`, and a delete rule that
  only lets the admin delete together with a `/deletions` record. The
  `(default)` database's rules tab should be unchanged.
- In the Rules tab, use the **Rules Playground**: simulate an `update` on
  `/entries/anything` as any authenticated family email, and a `delete` as a
  family email that isn't the admin. Both should be **denied**.

## Local testing

```bash
cd dad-care-log/tests && npm install && npm test   # 69 rule tests on the emulators
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

## General AI information about a reading

When someone ticks the confirmation box on a monitor reading, the page calls
the `explainCareReading` Cloud Function with the **confirmed** text (not the
photo). Claude returns, for each value: what it measures, the general adult
range, and whether the value is within, below or above it (or has no general
range, e.g. ventilator settings the medical team chooses), plus questions for
the nurse or doctor.

- It appears in its own blue box labelled "Información general generada por
  IA", with colour chips: green = within, amber = below/above (with
  "Consulte con el médico o la enfermera para una evaluación precisa"),
  grey = no general range. A fixed line says it is general information, not a
  diagnosis.
- Editing the reading clears it; it is re-requested on the next confirmation.
- Saved with the entry (`aiFlags`, `aiQuestions`): only the values outside the
  general range and the questions, shown in the entry's blue section and in
  the WhatsApp share. The full per-value explanation is on screen only.
- The rules accept these fields only alongside a confirmed photo reading.

## "Pregúntale a la IA"

An optional box under "Lo que dijo el doctor": type a question or paste what
the doctor said (e.g. "Derrame pleural bilateral y neumonía") and tap
**Preguntar a la IA**. The `askCareQuestion` function returns a plain-Spanish
general explanation plus questions for the doctor, shown in the blue AI box
with the same "no es un diagnóstico" line. It gives no prognosis for this
patient and recommends no medications or treatment changes.

- "Guardar esta explicación con la entrada" (ticked by default) saves the
  question, answer and questions in the entry (`aiAsk`), shown in a blue AI
  section under the author's name and included in the WhatsApp share.
- Editing the question clears the answer; an unanswered question blocks
  saving so nobody thinks it was answered.
- Access: the function checks the caller is family by reading
  `/familycheck/me` with the caller's own sign-in; the rules allow that only
  for family, so the family list stays in the rules files.

## Corrections ("Corregir")

Entries can't be edited, so each entry has a **Corregir** button. It opens the
form prefilled with that entry's content. Saving creates a *new* entry with
`correctsId` pointing at the original, which stays exactly as it was:

- The original shows a "Corregida" tag and a note "Corregida por <nombre> el
  <fecha>" with a link to the correction. The correction shows a "Corrección"
  tag and a link back to the original.
- The rules only accept a `correctsId` that points at an existing entry.
- A correction may reuse the original's photo (and only that photo) so a
  misread number can be fixed without re-uploading. The reading must be
  re-confirmed by the person correcting.
- Sharing the original to WhatsApp adds a line saying it was corrected later.

## Deleting entries (admin only)

The admin sees a **Borrar entrada** button on each entry. It opens a box
asking for the **reason** (required, at least 3 characters); "Borrar
definitivamente" stays disabled until one is written. Deleting writes a
record to `/deletions` in the same step (entry date, author, patient, the
reason, and when it was deleted); the rules refuse a deletion without that
record or without a reason, and the record can't be changed or removed. The family sees these under
"Entradas borradas por el administrador" at the bottom of the log. Photos
attached to deleted entries stay in Storage.

As project owner you can also delete documents from the Firebase console
(the rules apply to the app, not to project admins), but that leaves no
record, so prefer the button.

## Watch schedule ("Turnos de guardia")

At the top of the app: who is on duty now, the upcoming shifts, and a form to
add one (person, start, end, optional note). Any family member can add a
shift for anyone; whoever added it, or the admin, can remove it. Shifts can
last up to 31 days. Shifts are stored in `/shifts` and, unlike entries, can
be removed because schedules change.

## Time zone

Dates are entered and shown in `America/Mexico_City` time (`CARE_TIME_ZONE`
in `index.html`), so an entry written from the US shows the same clock time
for everyone. Change it if the patient is in a different Mexican time zone.
