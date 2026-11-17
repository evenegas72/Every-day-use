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

  // Tolls: log the expected 40D toll by name → auto-marked paid
  await page.click('[data-nav="tolls"]');
  await page.fill('form[data-form="toll"] [name=name]', 'Monterrey – Saltillo');
  await page.dispatchEvent('form[data-form="toll"] [name=name]', 'change');
  ok(await page.inputValue('form[data-form="toll"] [name=amount]') === '150', 'expected toll autocomplete fills highway/amount');
  await page.click('form[data-form="toll"] [type=submit]');
  await page.waitForFunction(() => S.tolls.length === 1);
  ok(await page.evaluate(() => expectedStatus().find((x) => x.exp.highway === '40D').paid), 'expected toll auto-marked paid');

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
  ok(netDown && offTxt.includes('Grants Pass') && offTxt.includes('Bakersfield'), 'app loads and works in airplane mode (network confirmed down)');
  await p2.click('[data-nav="spend"]');
  await p2.fill('form[data-form="expense"] [name=amount]', '5');
  await p2.click('form[data-form="expense"] [type=submit]');
  ok(await p2.evaluate(() => JSON.parse(localStorage.getItem('mexico-trip-v2')).expenses.length) === 1, 'can add entries while offline (default rate ' + (await p2.evaluate(() => rate())) + ')');
  await ctx2.close();

  const realErrors = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|frankfurter|jsdelivr|ERR_TUNNEL|ERR_PROXY|status of 40/i.test(e));
  ok(realErrors.length === 0, 'no JavaScript errors' + (realErrors.length ? ' → ' + realErrors.join(' | ') : ''));

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
