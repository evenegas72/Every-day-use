/* End-to-end check for the Mexico Trip Planner (travel-expense-tracker/).
 * Run from the repo root:   node tests/trip-planner/e2e.test.js
 * Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
 * Checks: migration from the original tracker, persistence, all views in EN/ES
 * with no missing strings, toll/fuel feeding totals, offline reload, installability.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../travel-expense-tracker');
const PORT = 8765;
const BASE = `http://localhost:${PORT}/`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain' };

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) failures++; };

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, BASE).pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(PORT);
}

const LEGACY = {
  budgetUSD: 2500,
  expenses: [
    { id: 111, desc: 'Tacos', amount: 250, currency: 'MXN', category: 'food', date: '2026-10-02', rateAtEntry: 18, usd: 13.89, mxn: 250 },
    { id: 222, desc: 'Caseta Saltillo', amount: 150, currency: 'MXN', category: 'casetas', date: '2026-10-03', rateAtEntry: 18, usd: 8.33, mxn: 150 },
    { id: 333, desc: 'Uber', amount: 20, currency: 'USD', category: 'transport', date: '2026-10-04', rateAtEntry: 18, usd: 20, mxn: 360 },
  ],
};

async function visibleText(page) { return page.evaluate(() => document.body.innerText); }

async function allViewsClean(page, label) {
  const views = ['today', 'plan', 'spend', 'tolls', 'fuel', 'more'];
  let missing = [];
  for (const v of views) {
    await page.click(`[data-nav="${v}"]`);
    if (v === 'plan') await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    if (v === 'more') {
      for (const tab of ['docs', 'emergency', 'settings', 'data']) {
        await page.click(`[data-name="moreTab"][data-val="${tab}"]`);
        const txt = await page.evaluate(() => document.body.innerHTML);
        if (txt.includes('⟦')) missing.push(`${v}/${tab}: ` + txt.match(/⟦[^⟧]+⟧/g).join(' '));
      }
      continue;
    }
    const html = await page.evaluate(() => document.body.innerHTML);
    if (html.includes('⟦')) missing.push(`${v}: ` + html.match(/⟦[^⟧]+⟧/g).join(' '));
  }
  ok(missing.length === 0, `${label}: every view renders with no missing translation keys` + (missing.length ? ' → ' + missing.join(' | ') : ''));
}

(async () => {
  const server = serve();
  const browser = await chromium.launch();
  const errors = [];

  // ── 1. Migration, persistence, features (clock fixed to the border-day evening) ──
  console.log('Migration + features');
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 }, timezoneId: 'America/Chicago', locale: 'en-US',
    permissions: ['geolocation'], geolocation: { latitude: 25.43, longitude: -101.0 },
  });
  await ctx.clock.install({ time: new Date('2026-12-16T17:30:00-06:00') });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());

  // Seed the ORIGINAL app's storage on this origin, then load the new app.
  await page.goto(BASE + 'manifest.webmanifest');
  await page.evaluate((legacy) => {
    localStorage.clear();
    localStorage.setItem('travel-tracker-v1', JSON.stringify(legacy));
    localStorage.setItem('travel-tracker-rate', JSON.stringify({ rate: 18.2, date: '2026-11-01' }));
  }, LEGACY);
  const legacyBefore = JSON.stringify(LEGACY);
  await page.goto(BASE);
  await page.waitForSelector('.day-num');

  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('mexico-trip-v2')));
  ok(st && st.schema === 2, 'new store written (schema 2)');
  ok(st.expenses.length === 3, 'all 3 original expenses migrated');
  ok(st.expenses.find((e) => e.id === 'v1-222').category === 'toll', 'casetas → Toll');
  ok(st.expenses.find((e) => e.id === 'v1-333').category === 'other' && st.expenses.find((e) => e.id === 'v1-333').legacyCategory === 'transport', 'transport → Other (original category kept)');
  ok(st.expenses.find((e) => e.id === 'v1-111').usd === 13.89, 'original USD amounts / rate kept');
  ok(st.budgetOverallUSD === 2500, 'original overall budget kept');
  ok(st.rate.value === 18.2 && st.rate.source === 'cache', 'cached rate from the original app reused');
  ok(await page.evaluate(() => localStorage.getItem('travel-tracker-v1')) === legacyBefore, 'original data left untouched');

  // Today screen on Dec 16 17:30 → Day 5 with the Day 6 heads-up banner.
  const today = await visibleText(page);
  ok(today.includes('Day 5'), 'Today shows Day 5 on Dec 16');
  ok(today.includes('Tomorrow: Day 6'), 'heads-up banner for Day 6 shows after 5 PM');
  ok(/Sunset \(destination\)/.test(today), 'sunrise/sunset shown');

  // Day checks (sunset rule & time zones) straight from the app's logic
  const checks = await page.evaluate(() => S.days.map((d, i) => ({ n: i + 1, latest: dayChecks(d).latest, warnings: dayChecks(d).warnings, tz: dayChecks(d).tz, sunrise: sunInfo(d) && fmtClock(sunInfo(d).startSunrise, d.startTz), sunset: sunInfo(d) && fmtClock(sunInfo(d).destSunset, d.arriveTz) })));
  checks.forEach((c) => console.log(`    Day ${c.n}: sunrise ${c.sunrise}, sunset ${c.sunset}, latest arrival ${c.latest}; tz: ${c.tz.join(' / ') || '—'}; warnings: ${c.warnings.join(' / ') || 'none'}`));
  ok(checks[1].tz.some((x) => x.includes('+1 h')), 'Day 2 shows +1 h (Pacific → Arizona)');
  ok(checks[3].tz.some((x) => x.includes('+1 h')), 'Day 4 shows +1 h (Mountain → Central)');
  ok(checks[4].tz.every((x) => !x.includes('+1 h')), 'Day 5: Texas → Monterrey is the same clock time in winter');

  // Check-in with GPS
  await page.click('[data-act="checkin"]');
  await page.fill('#modal [name=odometer]', '1000');
  await page.click('#modal [type=submit]');
  await page.waitForFunction(() => S.days[4].checkins.length === 1);
  const ci = await page.evaluate(() => S.days[4].checkins[0]);
  ok(ci.lat != null && ci.odometer === 1000, 'check-in saved with GPS + odometer');

  // Share message
  await page.click('[data-act="share"]');
  await page.waitForFunction(() => document.querySelector('#share-text') && document.querySelector('#share-text').value.includes('google.com/maps'));
  ok((await page.inputValue('#share-text')).includes('Saltillo'), 'share message names the destination and has a Maps link');
  await page.click('#modal [data-act="closeModal"]');

  // Tolls: log the expected 45D toll by name → auto-marked paid
  await page.click('[data-nav="tolls"]');
  await page.fill('form[data-form="toll"] [name=name]', 'Hwy 57 / 57D casetas (Piedras Negras – Saltillo – San Luis Potosí)');
  await page.dispatchEvent('form[data-form="toll"] [name=name]', 'change');
  ok(await page.inputValue('form[data-form="toll"] [name=highway]') === '57D', 'expected toll autocomplete fills the highway');
  await page.fill('form[data-form="toll"] [name=amount]', '120');
  await page.click('form[data-form="toll"] [type=submit]');
  await page.waitForFunction(() => S.tolls.length === 1);
  ok(await page.evaluate(() => expectedStatus().find((x) => x.exp.key === 'out-57d').paid), 'expected toll auto-marked paid');
  const d6 = await page.evaluate(() => ({ r: S.days[5].route, r7: S.days[6].route, t: S.expectedTolls.map((e) => e.highway).join(',') }));
  ok(d6.r.includes('San Miguel de Allende') && d6.r7.includes('San Miguel de Allende') && !d6.t.includes('45D'), 'Days 6–7 go via San Miguel de Allende; no 45D tolls expected');
  const route = await page.evaluate(() => S.days.map((d) => d.to.split(',')[0]).join(' → '));
  ok(route.includes('Eagle Pass → Saltillo') && !route.includes('San Antonio'), 'route crosses at Eagle Pass / Piedras Negras: ' + route);
  const r1 = await page.evaluate(() => mapsRoute(S.days[0]));
  ok(r1.includes('destination=36.00830%2C-119.96180') && r1.includes('origin=42.43900%2C-123.32840'), 'route button sends exact coordinates (Day 1 → Kettleman City): ' + r1);
  ok(await page.evaluate(() => !mapsRoute(S.days[5]).includes('waypoints=') && mapsRoute(S.days[4]).includes('waypoints=Camino%20Real')), 'Day 6 has no extra stops; border day stops only at the Camino Real bridge');
  await page.click('[data-nav="today"]');
  ok(await page.evaluate(() => !!document.getElementById('checkpoints-card') && document.body.innerText.includes('¿Me da la boleta')), 'checkpoint card shows on Today during a Mexico day');
  ok(await page.evaluate(() => S.docs.some((d) => d.key === 'paisanos')), 'Héroes Paisanos convoy item on the checklist');
  ok(await page.evaluate(() => S.days[4].links.length === 5 && S.days[7].links.length === 5), 'both border days have wait-time and backup-bridge links');

  // Fuel: two full fills → mpg
  await page.click('[data-nav="fuel"]');
  const addFuel = async (qty, price, odo) => {
    await page.fill('form[data-form="fuel"] [name=location]', 'Test');
    await page.fill('form[data-form="fuel"] [name=qty]', String(qty));
    await page.selectOption('form[data-form="fuel"] [name=unit]', 'gal');
    await page.fill('form[data-form="fuel"] [name=price]', String(price));
    await page.selectOption('form[data-form="fuel"] [name=currency]', 'USD');
    await page.fill('form[data-form="fuel"] [name=odometer]', String(odo));
    await page.click('form[data-form="fuel"] [type=submit]');
  };
  await addFuel(19, 3, 1000);
  await addFuel(10, 3.2, 1230);
  await page.waitForFunction(() => S.fuel.length === 2);
  const avg = await page.evaluate(() => fuelStats().avgMpg);
  ok(Math.abs(avg - 23) < 0.01, `mpg between full fills = ${avg && avg.toFixed(2)}`);
  ok((await visibleText(page)).includes('Refuel within'), 'range alert shown');

  // Spend: expense + totals include toll and fuel exactly once
  await page.click('[data-nav="spend"]');
  await page.fill('form[data-form="expense"] [name=amount]', '40');
  await page.selectOption('form[data-form="expense"] [name=currency]', 'USD');
  await page.click('form[data-form="expense"] [type=submit]');
  await page.waitForFunction(() => S.expenses.length === 4);
  const led = await page.evaluate(() => ({ n: ledger().length, fuelUSD: ledger().filter((e) => e.category === 'fuel').reduce((s, e) => s + e.usd, 0) }));
  ok(led.n === 4 + 1 + 2, 'ledger = 4 expenses + 1 toll + 2 fuel (no double counting)');
  ok(Math.abs(led.fuelUSD - (57 + 32)) < 0.01, 'fuel cost flows into Spend');
  await page.selectOption('form[data-form="expense"] [name=category]', 'fuel');
  ok(await page.isDisabled('form[data-form="expense"] [type=submit]'), 'choosing Fuel in Spend points to the Fuel log instead');

  // Language toggle
  await allViewsClean(page, 'English');
  await page.click('#lang-chip');
  await allViewsClean(page, 'Spanish');
  await page.click('[data-nav="today"]');
  const es = await visibleText(page);
  ok(es.includes('Registrar') && es.includes('Compartir estado') && es.includes('Mañana: Día 6'), 'Spanish UI text shown on Today');
  const parity = await page.evaluate(() => { const en = Object.keys(I18N.en), es = Object.keys(I18N.es); return { missingEs: en.filter((k) => !(k in I18N.es)), extraEs: es.filter((k) => !(k in I18N.en)) }; });
  ok(parity.missingEs.length === 0 && parity.extraEs.length === 0, 'EN and ES have identical keys' + (parity.missingEs.length ? ' missing: ' + parity.missingEs.join(',') : ''));
  await page.screenshot({ path: path.join(process.env.SHOT_DIR || '/tmp', 'today-es.png') });
  await page.click('#lang-chip');

  // Persistence across a reload
  await page.reload();
  await page.waitForSelector('.day-num');
  const after = await page.evaluate(() => ({ e: S.expenses.length, t: S.tolls.length, f: S.fuel.length, c: S.days[4].checkins.length }));
  ok(after.e === 4 && after.t === 1 && after.f === 2 && after.c === 1, 'all new data persists after reload');
  await page.screenshot({ path: path.join(process.env.SHOT_DIR || '/tmp', 'today-en.png') });
  await page.click('[data-nav="plan"]');
  await page.screenshot({ path: path.join(process.env.SHOT_DIR || '/tmp', 'plan-en.png'), fullPage: false });
  await ctx.close();

  // ── 2. Offline + installability (real clock) ──
  console.log('Offline + install');
  const ctx2 = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(BASE);
  await p2.waitForSelector('.day-num');
  await p2.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p2.reload(); // now controlled by the service worker
  await p2.waitForFunction(() => !!navigator.serviceWorker.controller);
  ok(true, 'service worker controls the page');
  const cdp = await ctx2.newCDPSession(p2);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, 'Chrome reports the app as installable' + (inst.installabilityErrors.length ? ' → ' + JSON.stringify(inst.installabilityErrors) : ''));
  await ctx2.setOffline(true);
  await p2.reload();
  await p2.waitForSelector('.day-num', { timeout: 5000 });
  const offTxt = await visibleText(p2);
  // Prove the network is really down (an uncached URL must fail), then that the app still rendered.
  const netDown = await p2.evaluate(() => fetch('/not-cached-' + Date.now()).then(() => false, () => true));
  ok(netDown && offTxt.includes('Grants Pass') && offTxt.includes('Kettleman City'), 'app loads and works in airplane mode (network confirmed down)');
  await p2.click('[data-nav="spend"]');
  await p2.fill('form[data-form="expense"] [name=amount]', '5');
  await p2.click('form[data-form="expense"] [type=submit]');
  ok(await p2.evaluate(() => JSON.parse(localStorage.getItem('mexico-trip-v2')).expenses.length) === 1, 'can add entries while offline (default rate ' + (await p2.evaluate(() => rate())) + ')');
  await ctx2.close();

  // ── 3. Upgrade a phone that has data from the first release ──
  console.log('Upgrade from first release (fixtures/first-release-state.json)');
  const FIRST = fs.readFileSync(path.join(__dirname, 'fixtures/first-release-state.json'), 'utf8');
  const ctx3 = await browser.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'America/Mexico_City', locale: 'es-MX' });
  await ctx3.clock.install({ time: new Date('2026-12-25T10:00:00-06:00') });
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => errors.push(e.message));
  p3.on('dialog', (d) => d.accept());
  await p3.goto(BASE + 'manifest.webmanifest');
  await p3.evaluate((s) => { localStorage.clear(); localStorage.setItem('mexico-trip-v2', s); }, FIRST);
  await p3.goto(BASE);
  await p3.waitForSelector('.day-num');
  const up = await p3.evaluate(() => ({
    v: S.seedVersion, days: S.days.length, keys: S.days.map((d) => d.key).join(','),
    exp: S.expenses.length, tolls: S.tolls.length, route1: S.days[0].route, start6: S.days[5].start,
    food: S.budget.find((b) => b.cat === 'food').amount, fuel: S.budget.find((b) => b.cat === 'fuel').amount,
    docs: S.docs.length, doc0: S.docs[0].done, ownNote: S.days[5].tomorrowNotes.some((n) => n.text === 'My own note'),
    stops: S.days.every((d) => d.stops.length > 0), backup: !!localStorage.getItem('mexico-trip-v2-backup'),
    retTolls: S.expectedTolls.filter((e) => e.leg === 'return').length, lang: S.settings.lang,
    paid40out: expectedStatus().find((x) => x.exp.key === 'out-40d').paid, ret40: S.expectedTolls.some((e) => e.key === 'ret-40d'),
    colombia: S.expectedTolls.some((e) => e.key === 'out-colombia'), to1: S.days[0].to, from5: S.days[4].from,
  }));
  ok(up.v === 8 && up.days === 12, `plan upgraded to 12 days (out1–6 + ret1–6): ${up.keys}`);
  ok(up.to1 === 'Kettleman City, CA (I-5)' && up.from5 === 'Eagle Pass, TX', 'untouched days moved to the current route (Kettleman City, Eagle Pass)');
  ok(up.exp === 1 && up.tolls === 1, 'existing expenses and tolls kept');
  ok(up.route1 === 'I-5 S (user edit)' && up.food === 400, 'user edits kept (day route, food budget)');
  ok(up.start6 === '07:25' && up.fuel === 1140, 'untouched seed values updated (Day 6 start 7:25, round-trip fuel budget)');
  ok(up.docs === 18 && up.doc0 === true && up.ownNote, 'new documents added, checked items and own notes kept');
  ok(up.stops && up.retTolls === 2 && up.backup && up.lang === 'es', 'stop towns, return tolls, backup copy and settings in place' + ' ' + JSON.stringify({ stops: up.stops, ret: up.retTolls, backup: up.backup, lang: up.lang }));
  ok(up.paid40out && !up.ret40 && !up.colombia, 'old-route toll kept only where a toll was logged against it (40D); unused Colombia items removed');
  const famTxt = await visibleText(p3);
  ok(famTxt.includes('Con la familia') && famTxt.includes('El regreso empieza'), 'Today shows family time on Dec 25 (in Spanish)');
  await p3.reload();
  await p3.waitForSelector('.day-num');
  ok(await p3.evaluate(() => S.days.length === 12 && S.expenses.length === 1), 'upgrade runs once (no duplicates after reload)');

  // Real places: mock the Overpass API with a tiny response
  const OVERPASS_MOCK = { elements: [
    { type: 'node', id: 1, lat: 20.53, lon: -100.80, tags: { tourism: 'hotel', name: 'Small Local Inn' } },
    { type: 'way', id: 2, center: { lat: 20.52, lon: -100.82 }, tags: { tourism: 'hotel', name: 'City Express Celaya', brand: 'City Express', 'addr:street': 'Av. Ejemplo', phone: '+52 461 000 0000' } },
    { type: 'node', id: 3, lat: 20.525, lon: -100.81, tags: { amenity: 'fuel', name: 'OXXO Gas', brand: 'OXXO Gas' } },
  ] };
  let overpassCalls = 0;
  await ctx3.route(/overpass/, (route) => { overpassCalls++; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OVERPASS_MOCK) }); });
  await p3.click('[data-nav="plan"]');
  await p3.evaluate(() => { const d = [...document.querySelectorAll('details.day-card')][5]; d.open = true; });
  ok((await visibleText(p3)).includes('De regreso') && (await visibleText(p3)).includes('De ida'), 'Plan is grouped into going down / coming back');
  await p3.click('details.day-card[open] [data-act="osmOpen"]');
  await p3.waitForFunction(() => document.querySelector('#modal-body') && document.querySelector('#modal-body').innerText.includes('City Express Celaya'));
  const firstHotel = await p3.evaluate(() => document.querySelector('#modal-body .list .entry b').textContent);
  ok(firstHotel === 'City Express Celaya', 'real places load, chain hotels listed first');
  await p3.click('#modal-body [data-act="osmSavePlace"]');
  ok(await p3.evaluate(() => S.days[5].places.some((p) => p.osmId === 'w2')), 'a real place can be saved to My places');
  await p3.click('[data-name="osmKind"][data-val="fuel"]');
  ok((await p3.evaluate(() => document.querySelector('#modal-body').innerText)).includes('OXXO Gas'), 'fuel tab lists gas stations');
  await p3.click('#modal-body [data-act="closeModal"]');
  // Offline: cached results still show, no network call
  const before = overpassCalls;
  await ctx3.setOffline(true);
  await p3.click('details.day-card[open] [data-act="osmOpen"]');
  ok((await p3.evaluate(() => document.querySelector('#modal-body').innerText)).includes('City Express Celaya') && overpassCalls === before, 'saved places work offline');
  await p3.click('#modal-body [data-act="closeModal"]');
  await ctx3.setOffline(false);
  await allViewsClean(p3, 'Spanish after upgrade');
  await p3.screenshot({ path: path.join(process.env.SHOT_DIR || '/tmp', 'plan-upgraded-es.png') });
  await ctx3.close();

  // ── 4. Upgrade a phone that has the round-trip-via-Colombia version (seed v2) ──
  console.log('Upgrade from the Colombia round-trip version (fixtures/v2-state.json)');
  const V2 = fs.readFileSync(path.join(__dirname, 'fixtures/v2-state.json'), 'utf8');
  const ctx4 = await browser.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'America/Chicago' });
  const p4 = await ctx4.newPage();
  p4.on('pageerror', (e) => errors.push(e.message));
  await p4.goto(BASE + 'manifest.webmanifest');
  await p4.evaluate((s) => { localStorage.clear(); localStorage.setItem('mexico-trip-v2', s); }, V2);
  await p4.goto(BASE);
  await p4.waitForSelector('.day-num');
  const u4 = await p4.evaluate(() => ({
    v: S.seedVersion, n: S.days.length, out4: S.days[3].to, ret2: S.days[7].to, ret5: S.days[10].to,
    hours4: S.days[3].driveHours, route1: S.days[0].route,
    notes5: S.days[4].tomorrowNotes.map((n) => (typeof n.text === 'object' ? n.text.en : n.text)),
    done5: S.days[4].tomorrowNotes.find((n) => (n.text.en || '').startsWith('Have ready')).done,
    own: S.days[5].tomorrowNotes.some((n) => n.text === 'My own note'),
    tollKeys: S.expectedTolls.map((e) => e.key).join(','), exp: S.expenses.length, tolls: S.tolls.length,
  }));
  ok(u4.v === 8 && u4.n === 12 && u4.out4 === 'Eagle Pass, TX' && u4.ret2 === 'Eagle Pass, TX' && u4.ret5 === 'Kettleman City, CA (I-5)', 'Colombia days rerouted via Eagle Pass, both directions');
  ok(u4.hours4 === '8 h (my estimate)' && u4.route1 === 'I-5 S (user edit)', 'fields the user edited are kept');
  ok(u4.notes5.some((x) => x.startsWith('Check Puente 2')) && !u4.notes5.some((x) => x.includes('Puente Colombia hours')) && u4.done5, 'border-day notes switched to Puente 2; checked notes stay checked');
  ok(u4.own && u4.exp === 1 && u4.tolls === 1, "user's own notes, expenses and tolls kept");
  ok(u4.tollKeys.includes('out-bridge2') && u4.tollKeys.includes('ret-bridge2') && !u4.tollKeys.includes('ret-colombia') && u4.tollKeys.includes('out-40d'), 'expected tolls: Puente II added, unused Colombia ones removed, paid 40D kept');
  await allViewsClean(p4, 'English after v2 upgrade');
  await ctx4.close();

  // ── 5. Upgrade a phone that has the Eagle Pass / Buttonwillow version (seed v3, live before this one) ──
  console.log('Upgrade from the Eagle Pass / Buttonwillow version (fixtures/v3-state.json)');
  const V3 = fs.readFileSync(path.join(__dirname, 'fixtures/v3-state.json'), 'utf8');
  const ctx5 = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const p5 = await ctx5.newPage();
  p5.on('pageerror', (e) => errors.push(e.message));
  await p5.goto(BASE + 'manifest.webmanifest');
  await p5.evaluate((s) => { localStorage.clear(); localStorage.setItem('mexico-trip-v2', s); }, V3);
  await p5.goto(BASE);
  await p5.waitForSelector('.day-num');
  const u5 = await p5.evaluate(() => ({
    v: S.seedVersion, to: S.days.map((d) => d.to.split(' (')[0]).join(' | '), route1: S.days[0].route, hours4: S.days[3].driveHours,
    fog: S.days[1].tomorrowNotes.some((n) => (n.text.en || '').startsWith('Tule fog')), exp: S.expenses.length,
  }));
  ok(u5.v === 8 && u5.to.startsWith('Kettleman City, CA | Goodyear, AZ | El Paso, TX | Eagle Pass, TX') && u5.to.includes('Goodyear, AZ | Kettleman City, CA | Grants Pass, OR'), 'Day 1 → Kettleman City, Day 2 → Goodyear, mirrored on the return: ' + u5.to);
  ok(u5.route1 === 'I-5 S (user edit)' && u5.hours4 === '8 h (my estimate)' && u5.exp === 1, 'user edits and expenses kept');
  ok(u5.fog, 'tule fog heads-up added before Day 2');
  const stale = await p5.evaluate(() => S.days.filter((d) => /Buttonwillow|Chandler/.test(d.distanceNote || '')).map((d) => d.key));
  ok(stale.length === 0, 'distance notes no longer mention old stops (Buttonwillow / Chandler)' + (stale.length ? ': ' + stale.join(',') : ''));
  const via = await p5.evaluate(() => S.days.map((d) => mapsRoute(d)));
  ok(via.filter((u) => u.includes('waypoints=')).length === 2 && via[4].includes('Camino%20Real') && via[7].includes('Camino%20Real'),
    'old saved stops trimmed: only the two border days add one stop (Camino Real bridge)');
  await p5.click('[data-nav="more"]');
  await p5.click('[data-name="moreTab"][data-val="settings"]');
  const setTxt = await visibleText(p5);
  ok(setTxt.includes('App version 2.9 · trip plan v8') || setTxt.includes('Versión de la app 2.9 · plan del viaje v8'), 'app version shown in Settings');
  await ctx5.close();

  const realErrors = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|net::ERR_FAILED|Failed to fetch|frankfurter|jsdelivr|ERR_TUNNEL|ERR_PROXY|status of 40/i.test(e));
  ok(realErrors.length === 0, 'no JavaScript errors' + (realErrors.length ? ' → ' + realErrors.join(' | ') : ''));

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
