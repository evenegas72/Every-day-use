/* Mexico Trip Planner — plain JS, no build step.
 * Data lives in localStorage under STORE_KEY. The original tracker's data
 * (LEGACY_KEY) is migrated once and never modified or deleted.
 */
'use strict';

const APP_VERSION = '2.5'; // keep in step with CACHE in sw.js ('mexico-trip-v2-5')
const STORE_KEY = 'mexico-trip-v2';
const LEGACY_KEY = 'travel-tracker-v1';
const LEGACY_RATE_KEY = 'travel-tracker-rate';
const BACKUP_KEY = 'mexico-trip-v2-backup';
const SCHEMA = 2;
const DEFAULT_RATE = 18.5;
const KM_PER_MI = 1.609344;
const L_PER_GAL = 3.785411784;

const CATS = ['fuel', 'food', 'hotel', 'toll', 'bridge', 'permits', 'other'];
const CAT_ICON = { fuel: '⛽', food: '🍽️', hotel: '🏨', toll: '🛣️', bridge: '🌉', permits: '📄', other: '📦' };
const PAYMENTS = ['cash', 'card', 'tag'];
const TIMEZONES = ['America/Los_Angeles', 'America/Phoenix', 'America/Denver', 'America/Chicago', 'America/Monterrey', 'America/Mexico_City'];
const TZ_KEY = {
  'America/Los_Angeles': 'tz_pacific', 'America/Phoenix': 'tz_arizona', 'America/Denver': 'tz_mountain',
  'America/Chicago': 'tz_central', 'America/Monterrey': 'tz_central_mx', 'America/Mexico_City': 'tz_central_mx',
};
// Old tracker categories -> new categories. "transport" is ambiguous, so it goes to Other.
const LEGACY_CAT = { food: 'food', lodging: 'hotel', casetas: 'toll', transport: 'other', activities: 'other', shopping: 'other', other: 'other' };

let S = null;           // persisted state
const ui = { view: 'today', dayIdx: null, moreTab: 'docs', spendFilter: 'all', spendSearch: '', tollPrefill: null, openDays: {} };
let deferredInstall = null;

// ─── Small helpers ────────────────────────────────────────────────────────────
let _uidN = 0;
const uid = () => Date.now().toString(36) + (_uidN++).toString(36) + Math.random().toString(36).slice(2, 6);
const clone = (o) => JSON.parse(JSON.stringify(o));
const $ = (sel, root = document) => root.querySelector(sel);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const lang = () => (S && S.settings.lang) || 'en';
const locale = () => (lang() === 'es' ? 'es-MX' : 'en-US');
function t(key, vars) {
  const dict = window.I18N[lang()] || {};
  let s = dict[key];
  if (s == null) s = window.I18N.en[key];
  if (s == null) s = '⟦' + key + '⟧';
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}
/** Bilingual seed text { en, es } or plain string. */
function tx(v) {
  if (v && typeof v === 'object') return v[lang()] != null && v[lang()] !== '' ? v[lang()] : (v.en || '');
  return v == null ? '' : String(v);
}
const mapsSearch = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const mapsPoint = (lat, lng) => 'https://www.google.com/maps/search/?api=1&query=' + lat.toFixed(6) + ',' + lng.toFixed(6);
/** Exact coordinates when known (Google can't misread them); otherwise the name without "(…)" notes. */
function mapsPlace(lat, lng, name) {
  if (num(lat) != null && num(lng) != null) return (+lat).toFixed(5) + ',' + (+lng).toFixed(5);
  return String(name || '').replace(/\s*\([^)]*\)/g, '').trim();
}
function mapsRoute(day) {
  let u = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(mapsPlace(day.fromLat, day.fromLng, day.from)) +
    '&destination=' + encodeURIComponent(mapsPlace(day.toLat, day.toLng, day.to));
  if (day.routeVia) u += '&waypoints=' + encodeURIComponent(day.routeVia);
  return u;
}

// ─── Dates & times ────────────────────────────────────────────────────────────
const localDateStr = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function localDateTimeInput(d = new Date()) {
  return localDateStr(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtDate(dateStr, opts) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(locale(), opts || { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || '';
  return d.toLocaleString(locale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtClock(d, tz) {
  try { return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch (e) { return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' }); }
}
/** "15:30" -> localized "3:30 PM" */
function fmtHHMM(s) {
  if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return s || '—';
  const [h, m] = s.split(':').map(Number);
  return new Date(Date.UTC(2026, 0, 1, h, m)).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}
const hhmmToMin = (s) => (s && /^\d{1,2}:\d{2}$/.test(s) ? s.split(':').map(Number).reduce((h, m) => h * 60 + m) : null);
function minutesInTz(d, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = +parts.find((p) => p.type === 'hour').value, m = +parts.find((p) => p.type === 'minute').value;
  return (h % 24) * 60 + m;
}
function minToHHMM(min) { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
function tzAbbr(tz, dateStr) {
  try {
    const d = new Date((dateStr || localDateStr()) + 'T18:00:00Z');
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d).find((x) => x.type === 'timeZoneName');
    return p ? p.value : '';
  } catch (e) { return ''; }
}
function tzOffsetMin(tz, dateStr) {
  try {
    const d = new Date(dateStr + 'T18:00:00Z');
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName');
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(p ? p.value : '');
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0));
  } catch (e) { return 0; }
}
const tzLabel = (tz) => (TZ_KEY[tz] ? t(TZ_KEY[tz]) : tz);

// ─── Money ────────────────────────────────────────────────────────────────────
function rate() {
  const m = num(S.settings.manualRate);
  if (m && m > 0) return m;
  return (S.rate && S.rate.value) || DEFAULT_RATE;
}
const toUSD = (a, c, r = rate()) => (c === 'USD' ? a : a / r);
const toMXN = (a, c, r = rate()) => (c === 'MXN' ? a : a * r);
function money(amount, currency) {
  const r = rate();
  return { amount, currency, rateAtEntry: r, usd: toUSD(amount, currency, r), mxn: toMXN(amount, currency, r) };
}
const nf2 = () => new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSD = (v) => (v < 0 ? '-' : '') + '$' + nf2().format(Math.abs(v || 0));
const fmtMXN = (v) => (v < 0 ? '-' : '') + 'MX$' + nf2().format(Math.abs(v || 0));
const fmtCur = (v, c) => (c === 'MXN' ? fmtMXN(v) : fmtUSD(v));
const dual = (usd, mxn) => `<span class="usd">${fmtUSD(usd)}</span> · <span class="mxn">${fmtMXN(mxn)}</span>`;

// ─── Units ────────────────────────────────────────────────────────────────────
const isKm = () => S.settings.units === 'km';
const distUnit = () => (isKm() ? 'km' : 'mi');
const miToDisplay = (mi) => (isKm() ? mi * KM_PER_MI : mi);
const displayToMi = (v) => (isKm() ? v / KM_PER_MI : v);
const fmtDist = (mi) => (mi == null ? '—' : Math.round(miToDisplay(mi)).toLocaleString(locale()) + ' ' + distUnit());
const odoToMi = (value, unit) => (unit === 'km' ? value / KM_PER_MI : value);
const qtyToGal = (q, unit) => (unit === 'L' ? q / L_PER_GAL : q);
function fmtEconomy(mpg) {
  if (mpg == null || !isFinite(mpg)) return '—';
  return isKm() ? (mpg * KM_PER_MI / L_PER_GAL).toFixed(1) + ' km/L' : mpg.toFixed(1) + ' mpg';
}

// ─── State: defaults, migration, persistence ──────────────────────────────────
function defaultSettings() {
  return { lang: 'en', units: 'mi', theme: 'dark', travelerName: '', manualRate: null, tankGal: 19.4, mpg: 23, usWarnMi: 300, notify: false };
}
function seedDay(d, i) {
  return Object.assign(clone(d), {
    id: uid(), status: 'not_started', checkins: [], places: [],
    tomorrowNotes: (window.SEED.tomorrow[i] || []).map((text) => ({ id: uid(), text: clone(text), done: false })),
  });
}
function seedDays() { return window.SEED.days.map(seedDay); }
const seedDoc = (d) => ({ id: uid(), key: d.key, text: clone(d.text), done: false });
const seedToll = (e) => Object.assign(clone(e), { id: uid(), skipped: false });
function defaultState() {
  return {
    schema: SCHEMA,
    seedVersion: window.SEED.version,
    createdAt: new Date().toISOString(),
    settings: defaultSettings(),
    rate: { value: null, date: null, source: 'default' },
    budgetOverallUSD: 0,
    budget: clone(window.SEED.budget),
    days: seedDays(),
    expenses: [],
    tolls: [],
    expectedTolls: window.SEED.expectedTolls.map(seedToll),
    fuel: [],
    odometer: [],          // manual odometer readings {id, ts, value, unit}
    docs: window.SEED.docs.map(seedDoc),
    notified: {},
    migration: null,
  };
}
/** Convert one record from the original tracker (travel-tracker-v1). */
function fromLegacyExpense(e) {
  const amount = num(e.amount) || 0;
  const currency = e.currency === 'MXN' ? 'MXN' : 'USD';
  const r = num(e.rateAtEntry) || DEFAULT_RATE;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : localDateStr();
  return {
    id: 'v1-' + (e.id != null ? e.id : uid()),
    ts: date + 'T12:00:00',
    date,
    category: LEGACY_CAT[e.category] || 'other',
    legacyCategory: e.category || null,
    amount, currency, payment: '',
    note: e.desc || '',
    rateAtEntry: r,
    usd: num(e.usd) != null ? num(e.usd) : toUSD(amount, currency, r),
    mxn: num(e.mxn) != null ? num(e.mxn) : toMXN(amount, currency, r),
  };
}
function migrateLegacyInto(st, v1) {
  const list = Array.isArray(v1.expenses) ? v1.expenses : [];
  const existing = new Set(st.expenses.map((e) => e.id));
  let added = 0;
  list.forEach((e) => { const n = fromLegacyExpense(e); if (!existing.has(n.id)) { st.expenses.push(n); added++; } });
  if (num(v1.budgetUSD) && !st.budgetOverallUSD) st.budgetOverallUSD = num(v1.budgetUSD);
  st.migration = { from: LEGACY_KEY, at: new Date().toISOString(), expenses: added };
  return added;
}
/** Fill any fields missing from older/newer saves without dropping data. */
function upgrade(st) {
  const d = defaultState();
  st.settings = Object.assign(defaultSettings(), st.settings || {});
  st.rate = Object.assign({ value: null, date: null, source: 'default' }, st.rate || {});
  ['expenses', 'tolls', 'fuel', 'odometer'].forEach((k) => { if (!Array.isArray(st[k])) st[k] = []; });
  if (!Array.isArray(st.days)) st.days = d.days;
  if (!Array.isArray(st.budget)) st.budget = d.budget;
  CATS.forEach((c) => { if (!st.budget.some((b) => b.cat === c)) st.budget.push({ cat: c, amount: 0, currency: 'USD', note: '' }); });
  if (!Array.isArray(st.expectedTolls)) st.expectedTolls = d.expectedTolls;
  if (!Array.isArray(st.docs)) st.docs = d.docs;
  if (!st.notified || typeof st.notified !== 'object') st.notified = {};
  if (typeof st.budgetOverallUSD !== 'number') st.budgetOverallUSD = num(st.budgetOverallUSD) || 0;
  st.days.forEach((day) => {
    day.id = day.id || uid();
    ['checkins', 'places', 'tomorrowNotes', 'fuelStops', 'fuelSearch', 'foodSearch', 'overnightSearch', 'stops'].forEach((k) => { if (!Array.isArray(day[k])) day[k] = []; });
    day.status = day.status || 'not_started';
    day.startTz = day.startTz || 'America/Chicago';
    day.arriveTz = day.arriveTz || day.startTz;
    day.country = day.country || 'US';
  });
  st.schema = SCHEMA;
  return st;
}
/* ── Seed updates for phones that already have data ──────────────────────────
 * When seed.js gets a higher `version`, saved data is brought up to date using
 * seed-history.js (every value previous versions shipped). Rules:
 *  - a field is replaced only if its current value equals something a previous
 *    version shipped (the user never edited it);
 *  - only items that are new since the phone's version are added (so things the
 *    user deleted do not come back);
 *  - old seed items are removed only if untouched; expected tolls are kept when
 *    a logged toll matches them. Expenses, tolls, fuel, check-ins, places and
 *    the user's own notes are never touched. A backup copy is saved first.
 */
const SEED_DAY_FIELDS = ['from', 'to', 'fromLat', 'fromLng', 'toLat', 'toLng', 'country', 'startTz', 'arriveTz', 'distanceMi',
  'distanceNote', 'driveHours', 'start', 'arrive', 'route', 'routeVia', 'tzNote', 'notes', 'stops', 'fuelStops',
  'fuelSearch', 'foodSearch', 'overnightSearch', 'links'];
const SEED_TOLL_FIELDS = ['name', 'highway', 'estAmount', 'currency', 'kind', 'optional', 'note', 'matchHighway', 'leg'];
const enOf = (v) => (v && typeof v === 'object' ? v.en : v);
const jsonOf = (v) => JSON.stringify(v === undefined ? null : v);
function applySeedUpdates(st) {
  const SEED = window.SEED;
  const H = window.SEED_HISTORY || { versions: {}, days: {}, notes: {}, tolls: {}, budget: {}, docs: {}, v1TollNames: {}, v1Docs: {} };
  const from = st.seedVersion || 1;
  if (from >= SEED.version) return null;
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
  const had = H.versions[from] || { days: [], tolls: [], docs: [] };
  const untouched = (hist, cur) => cur === undefined || cur === null || cur === '' || (Array.isArray(cur) && !cur.length) || (hist || []).includes(jsonOf(cur));
  const added = { days: 0, tolls: 0, docs: 0 };
  let changed = 0;

  // Days
  SEED.days.forEach((sd, i) => {
    const d = st.days.find((x) => x.key === sd.key) || st.days.find((x) => !x.key && x.date === sd.date);
    if (!d) {
      if (!had.days.includes(sd.key)) { st.days.push(seedDay(sd, i)); added.days++; }
      return;
    }
    d.key = sd.key;
    d.leg = d.leg || sd.leg;
    const hist = H.days[sd.key] || {};
    SEED_DAY_FIELDS.forEach((f) => {
      if (jsonOf(d[f]) !== jsonOf(sd[f]) && untouched(hist[f], d[f])) { d[f] = clone(sd[f] === undefined ? null : sd[f]); changed++; }
    });
    ['stops', 'fuelStops', 'fuelSearch', 'foodSearch', 'overnightSearch'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
    // Tomorrow notes: seed notes in seed order (keeping done/ids), then the user's own notes.
    // oldSeedEn: every note any earlier version shipped (outdated ones get removed).
    // phoneHadEn: notes this phone's version (or older) shipped — missing ones were deleted by the user.
    const oldSeedEn = new Set(H.notes[sd.key] || []);
    const phoneHadEn = new Set();
    Object.keys(H.notesByVersion || {}).forEach((v) => { if (+v <= from) ((H.notesByVersion[v] || {})[sd.key] || []).forEach((en) => phoneHadEn.add(en)); });
    const seedNotes = window.SEED.tomorrow[i] || [];
    const seedEn = new Set(seedNotes.map((n) => n.en));
    const next = [];
    seedNotes.forEach((text) => {
      const ex = d.tomorrowNotes.find((n) => enOf(n.text) === text.en);
      if (ex) next.push(ex);
      else if (!phoneHadEn.has(text.en)) next.push({ id: uid(), text: clone(text), done: false });
    });
    d.tomorrowNotes.forEach((n) => {
      const en = enOf(n.text);
      if (next.includes(n) || (oldSeedEn.has(en) && !seedEn.has(en))) return; // already placed, or an outdated seed note
      next.push(n);
    });
    d.tomorrowNotes = next;
  });
  st.days.forEach((d) => { if (!d.leg) d.leg = 'out'; });
  st.days.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // Expected tolls
  st.expectedTolls.forEach((e) => { if (!e.key && H.v1TollNames[e.name]) e.key = H.v1TollNames[e.name]; if (!e.leg) e.leg = 'out'; });
  const seedTollKeys = new Set(SEED.expectedTolls.map((e) => e.key));
  st.expectedTolls = st.expectedTolls.filter((e) => {
    if (!e.key || seedTollKeys.has(e.key) || !H.tolls[e.key]) return true;           // user's own, or still in the plan
    const edited = SEED_TOLL_FIELDS.some((f) => !untouched(H.tolls[e.key][f], e[f]));
    const used = st.tolls.some((x) => x.expectedId === e.id) || stTollsMatch(st, e);
    return edited || used;                                                         // keep if edited or paid
  });
  SEED.expectedTolls.forEach((se) => {
    const e = st.expectedTolls.find((x) => x.key === se.key);
    if (e) SEED_TOLL_FIELDS.forEach((f) => { if (jsonOf(e[f]) !== jsonOf(se[f]) && untouched((H.tolls[se.key] || {})[f], e[f])) e[f] = clone(se[f] === undefined ? null : se[f]); });
    else if (!had.tolls.includes(se.key)) { st.expectedTolls.push(seedToll(se)); added.tolls++; }
  });

  // Budget lines
  SEED.budget.forEach((sb) => {
    const b = st.budget.find((x) => x.cat === sb.cat), h = H.budget[sb.cat];
    if (b && h && untouched(h.amount, num(b.amount)) && untouched(h.note, b.note) && untouched(h.currency, b.currency)) {
      b.amount = sb.amount; b.currency = sb.currency; b.note = clone(sb.note);
    }
  });

  // Documents
  st.docs.forEach((d) => { if (!d.key && H.v1Docs[enOf(d.text)]) d.key = H.v1Docs[enOf(d.text)]; });
  SEED.docs.forEach((sd) => {
    const d = st.docs.find((x) => x.key === sd.key);
    if (d) { if (jsonOf(d.text) !== jsonOf(sd.text) && untouched((H.docs[sd.key] || {}).text, d.text)) d.text = clone(sd.text); }
    else if (!had.docs.includes(sd.key)) { st.docs.push(seedDoc(sd)); added.docs++; }
  });

  st.seedVersion = SEED.version;
  st.seedUpdate = { from, to: SEED.version, at: new Date().toISOString(), added, changed };
  return added;
}
/** Whether any logged toll in `st` matches an expected toll (used before S is set). */
function stTollsMatch(st, exp) {
  const prev = S; S = st;
  try { return st.tolls.some((x) => tollMatches(exp, x)); } finally { S = prev; }
}
function runSeedUpdates() {
  try {
    const next = clone(S);
    const added = applySeedUpdates(next);
    if (added) { S = next; save(); ui.notice = t('plan_updated', { d: added.days, t: added.tolls, c: added.docs, r: next.seedUpdate.changed }); }
  } catch (e) { console.warn('Seed update skipped', e); }
}
function load() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { S = upgrade(JSON.parse(raw)); runSeedUpdates(); return; } catch (e) {
      // Never discard: keep the unreadable copy aside and rebuild.
      try { localStorage.setItem(STORE_KEY + '-unreadable-' + Date.now(), raw); } catch (e2) { /* ignore */ }
    }
  }
  S = defaultState();
  try {
    const v1 = localStorage.getItem(LEGACY_KEY);
    if (v1) migrateLegacyInto(S, JSON.parse(v1));
  } catch (e) { console.warn('Legacy migration failed', e); }
  try {
    const r = JSON.parse(localStorage.getItem(LEGACY_RATE_KEY) || 'null');
    if (r && num(r.rate)) S.rate = { value: num(r.rate), date: r.date || null, source: 'cache' };
  } catch (e) { /* ignore */ }
  save();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); return true; } catch (e) { toast(t('err_storage'), 'error'); return false; }
}

// ─── Exchange rate ────────────────────────────────────────────────────────────
async function fetchRate(manual) {
  const apis = [
    async () => {
      const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=MXN', { cache: 'no-store' });
      if (!r.ok) throw new Error('http'); const d = await r.json();
      return { value: d.rates.MXN, date: d.date };
    },
    async () => {
      const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('http'); const d = await r.json();
      return { value: d.usd.mxn, date: d.date };
    },
  ];
  for (const api of apis) {
    try {
      const { value, date } = await api();
      if (num(value) > 0) {
        S.rate = { value: num(value), date, source: 'live', fetchedAt: new Date().toISOString() };
        save(); renderHeader();
        if (manual) toast(t('rate_refreshed'));
        return true;
      }
    } catch (e) { /* try next */ }
  }
  if (manual) toast(t('rate_failed', { rate: rate().toFixed(2) }), 'error');
  return false;
}
function maybeFetchRate() {
  if (!navigator.onLine) return;
  const today = localDateStr();
  const fetchedDay = S.rate.fetchedAt ? localDateStr(new Date(S.rate.fetchedAt)) : null;
  if (S.rate.source !== 'live' || fetchedDay !== today) fetchRate(false);
}

// ─── Derived data ─────────────────────────────────────────────────────────────
function dayIndexForDate(date) { return S.days.findIndex((d) => d.date === date); }
function dayLabelForDate(date) {
  const i = dayIndexForDate(date);
  if (i >= 0) return t('day_n', { n: i + 1 });
  if (S.days.length && date < S.days[0].date) return t('pre_trip');
  if (S.days.length && date > S.days[S.days.length - 1].date) return t('after_trip');
  return '—';
}
function currentDayIdx() {
  if (!S.days.length) return -1;
  const today = localDateStr();
  const i = dayIndexForDate(today);
  if (i >= 0) return i;
  if (today < S.days[0].date) return 0;
  if (today > S.days[S.days.length - 1].date) return S.days.length - 1;
  const next = S.days.findIndex((d) => d.date > today);
  return next >= 0 ? next : S.days.length - 1;
}
/** All spending in one list: expenses + toll log + fuel log. Each record exists once. */
function ledger() {
  const out = [];
  S.expenses.forEach((e) => out.push({ src: 'expense', id: e.id, ts: e.ts, date: e.date, category: e.category, amount: e.amount, currency: e.currency, payment: e.payment, title: e.note || t('cat_' + e.category), usd: e.usd, mxn: e.mxn, legacyCategory: e.legacyCategory }));
  S.tolls.forEach((x) => out.push({ src: 'toll', id: x.id, ts: x.ts, date: x.date, category: x.kind === 'bridge' ? 'bridge' : 'toll', amount: x.amount, currency: x.currency, payment: x.payment, title: x.name + (x.highway ? ' (' + x.highway + ')' : ''), usd: x.usd, mxn: x.mxn }));
  S.fuel.forEach((f) => out.push({ src: 'fuel', id: f.id, ts: f.ts, date: f.date, category: 'fuel', amount: f.amount, currency: f.currency, payment: f.payment, title: (f.location || t('cat_fuel')) + ' · ' + (+f.qty).toFixed(2) + ' ' + f.unit, usd: f.usd, mxn: f.mxn }));
  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
}
function budgetUSD(line) { return toUSD(num(line.amount) || 0, line.currency); }
function overallBudgetUSD() {
  if (S.budgetOverallUSD > 0) return S.budgetOverallUSD;
  return S.budget.reduce((s, b) => s + budgetUSD(b), 0);
}
function currentOdoMi() {
  const vals = [];
  S.fuel.forEach((f) => { if (num(f.odometer) != null) vals.push({ mi: odoToMi(num(f.odometer), f.odoUnit), ts: f.ts }); });
  S.odometer.forEach((o) => vals.push({ mi: odoToMi(num(o.value), o.unit), ts: o.ts }));
  S.days.forEach((d) => d.checkins.forEach((c) => { if (num(c.odometer) != null) vals.push({ mi: odoToMi(num(c.odometer), c.odoUnit), ts: c.ts }); }));
  if (!vals.length) return null;
  return Math.max.apply(null, vals.map((v) => v.mi));
}
function fuelStats() {
  const rows = S.fuel.filter((f) => num(f.odometer) != null).map((f) => ({ f, mi: odoToMi(num(f.odometer), f.odoUnit), gal: qtyToGal(num(f.qty) || 0, f.unit) }))
    .sort((a, b) => a.mi - b.mi);
  const intervals = {};
  let lastFull = null, acc = 0, firstFull = null, totMi = 0, totGal = 0;
  rows.forEach((r) => {
    if (lastFull != null) acc += r.gal;
    if (r.f.full) {
      if (lastFull != null && acc > 0) {
        const miles = r.mi - lastFull.mi;
        intervals[r.f.id] = { miles, gal: acc, mpg: miles / acc };
        totMi += miles; totGal += acc;
      }
      if (!firstFull) firstFull = r;
      lastFull = r; acc = 0;
    }
  });
  return { intervals, avgMpg: totGal > 0 ? totMi / totGal : null, lastFull };
}
function rangeInfo() {
  const st = fuelStats();
  const rangeMi = (num(S.settings.tankGal) || 19.4) * (num(S.settings.mpg) || 23);
  const inMexico = countryOn() === 'MX';
  if (!st.lastFull) return { known: false, rangeMi, inMexico };
  const odo = currentOdoMi();
  const since = odo != null ? Math.max(0, odo - st.lastFull.mi) : 0;
  const limit = inMexico ? rangeMi / 2 : (num(S.settings.usWarnMi) || 300);
  const left = limit - since;
  const level = left <= 0 ? 'danger' : left <= 50 ? 'warn' : 'ok';
  return { known: true, since, limit, left, level, rangeMi, inMexico, tankPct: clamp(1 - since / rangeMi, 0, 1), lastFull: st.lastFull };
}
function sunInfo(day) {
  if (typeof SunCalc === 'undefined' || num(day.toLat) == null || num(day.toLng) == null || !day.date) return null;
  const base = new Date(day.date + 'T19:00:00Z'); // early afternoon across the Americas → correct local day
  const dest = SunCalc.getTimes(base, +day.toLat, +day.toLng);
  const origin = num(day.fromLat) != null ? SunCalc.getTimes(base, +day.fromLat, +day.fromLng) : dest;
  return { startSunrise: origin.sunrise, destSunrise: dest.sunrise, destSunset: dest.sunset };
}
function dayChecks(day) {
  const sun = sunInfo(day);
  const rules = [], warnings = [], tz = [];
  const isUS = day.country === 'US';
  const arriveMin = hhmmToMin(day.arrive), startMin = hhmmToMin(day.start);
  let latestMin = null, sunriseMin = null;
  if (sun) {
    latestMin = minutesInTz(sun.destSunset, day.arriveTz) - 60;
    sunriseMin = minutesInTz(sun.startSunrise, day.startTz);
  }
  const latest = latestMin != null ? fmtHHMM(minToHHMM(latestMin)) : '—';
  if (isUS) rules.push(t('rule_us'));
  else {
    rules.push(t('rule_mx', { sunrise: sun ? fmtClock(sun.startSunrise, day.startTz) : '—', latest }));
    if (day.country === 'BORDER') rules.push(t('rule_border'));
  }
  if (latestMin != null && arriveMin != null && arriveMin > latestMin) warnings.push(t('warn_after_sunset', { arrive: fmtHHMM(day.arrive), latest }));
  if (isUS && arriveMin != null && arriveMin > 17 * 60) warnings.push(t('warn_us_late'));
  if (day.country !== 'US' && MX_TZ.includes(day.startTz) && sunriseMin != null && startMin != null && startMin < sunriseMin) warnings.push(t('warn_before_sunrise', { start: fmtHHMM(day.start), sunrise: fmtClock(sun.startSunrise, day.startTz) }));
  if (day.date) {
    const diff = (tzOffsetMin(day.arriveTz, day.date) - tzOffsetMin(day.startTz, day.date)) / 60;
    const note = tx(day.tzNote) ? ' ' + tx(day.tzNote) : '';
    if (diff !== 0) tz.push(t('tz_change', { diff: (diff > 0 ? '+' : '') + diff + ' h', from: tzLabel(day.startTz), to: tzLabel(day.arriveTz) }) + note);
    else if (tzLabel(day.startTz) !== tzLabel(day.arriveTz)) tz.push(t('tz_same', { from: tzLabel(day.startTz), to: tzLabel(day.arriveTz) }) + note);
    else if (note) tz.push(note.trim());
  } else if (tx(day.tzNote)) tz.push(tx(day.tzNote));
  return { sun, rules, warnings, tz, latest };
}
function haversineMi(a, b) {
  const R = 3958.8, toR = (x) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function dayProgress(day, idx) {
  const dist = num(day.distanceMi) || 0;
  if (day.status === 'arrived') return { pct: 1, mi: dist, method: 'status' };
  const odos = day.checkins.filter((c) => num(c.odometer) != null).map((c) => odoToMi(num(c.odometer), c.odoUnit));
  let start = odos.length ? Math.min.apply(null, odos) : null;
  if (odos.length === 1 && idx > 0) {
    const prevOdos = S.days[idx - 1].checkins.filter((c) => num(c.odometer) != null).map((c) => odoToMi(num(c.odometer), c.odoUnit));
    if (prevOdos.length) start = Math.max.apply(null, prevOdos);
  }
  if (odos.length && start != null && dist > 0) {
    const driven = Math.max.apply(null, odos) - start;
    if (driven > 0) return { pct: clamp(driven / dist, 0, 1), mi: driven, method: 'odometer' };
  }
  const gps = day.checkins.filter((c) => c.lat != null).slice(-1)[0];
  if (gps && num(day.fromLat) != null && num(day.toLat) != null) {
    const from = { lat: +day.fromLat, lng: +day.fromLng }, to = { lat: +day.toLat, lng: +day.toLng };
    const total = haversineMi(from, to), rem = haversineMi({ lat: gps.lat, lng: gps.lng }, to);
    if (total > 0) { const pct = clamp(1 - rem / total, 0, 1); return { pct, mi: pct * dist, method: 'gps' }; }
  }
  return { pct: 0, mi: 0, method: 'none' };
}
/** Days whose "Tomorrow" notes are due: from 5 PM local the evening before until noon of the day. */
function dueTomorrowDays(now = new Date()) {
  return S.days.filter((d) => {
    if (!d.date || !d.tomorrowNotes.length) return false;
    const midnight = new Date(d.date + 'T00:00:00');
    const from = new Date(midnight.getTime() - 7 * 3600e3);
    const until = new Date(d.date + 'T12:00:00');
    return now >= from && now < until;
  });
}
const MX_TZ = ['America/Monterrey', 'America/Mexico_City', 'America/Matamoros', 'America/Chihuahua', 'America/Hermosillo', 'America/Mazatlan', 'America/Tijuana', 'America/Ojinaga', 'America/Bahia_Banderas', 'America/Merida', 'America/Cancun'];
function returnStartDate() {
  const r = S.days.filter((d) => d.leg === 'return' && d.date).map((d) => d.date).sort();
  return r[0] || null;
}
function legOfDate(date) { const r = returnStartDate(); return r && date >= r ? 'return' : 'out'; }
const legOf = (day) => day.leg || legOfDate(day.date);
/** 'MX' or 'US' for a date: based on the last plan day on or before it (border days count as Mexico, to be safe). */
function countryOn(date = localDateStr()) {
  const past = S.days.filter((d) => d.date && d.date <= date).sort((a, b) => a.date.localeCompare(b.date));
  const d = past[past.length - 1];
  if (!d) return 'US';
  return d.country === 'US' ? 'US' : 'MX';
}
const normName = (s) => String(s || '').replace(/\(return\)|\(regreso\)/gi, '').trim().toLowerCase();
function tollMatches(exp, entry) {
  if (entry.expectedId) return entry.expectedId === exp.id;
  if ((exp.leg || 'out') !== legOfDate(entry.date)) return false;
  const n = (s) => String(s || '').trim().toLowerCase();
  if (normName(entry.name) && normName(entry.name) === normName(exp.name)) return true;
  if (exp.matchHighway) return n(entry.highway).includes(n(exp.matchHighway));
  return !!(exp.highway && exp.highway !== 'Bridge' && n(entry.highway) === n(exp.highway));
}
function expectedStatus() {
  const assigned = new Set();
  return S.expectedTolls.map((exp) => {
    const entries = S.tolls.filter((e) => !assigned.has(e.id) && tollMatches(exp, e));
    entries.forEach((e) => assigned.add(e.id));
    return { exp, entries, paidMXN: entries.reduce((s, e) => s + e.mxn, 0), paid: entries.length > 0 };
  });
}

// ─── Geolocation ──────────────────────────────────────────────────────────────
function getPosition(timeout = 12000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 120000 });
  });
}

// ─── UI plumbing ──────────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').classList.add('open');
  $('#modal').setAttribute('aria-hidden', 'false');
}
function closeModal() {
  $('#modal').classList.remove('open');
  $('#modal').setAttribute('aria-hidden', 'true');
  $('#modal-body').innerHTML = '';
}
function go(view) {
  ui.view = view;
  render();
  window.scrollTo(0, 0);
}
function seg(name, options, current) {
  return `<div class="seg" role="group">${options.map(([v, label]) => `<button type="button" data-act="seg" data-name="${name}" data-val="${esc(v)}" class="${String(v) === String(current) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}
const catOptions = (sel, exclude = []) => CATS.filter((c) => !exclude.includes(c)).map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${CAT_ICON[c]} ${esc(t('cat_' + c))}</option>`).join('');
const payOptions = (sel, allowBlank) => (allowBlank ? `<option value="">—</option>` : '') + PAYMENTS.map((p) => `<option value="${p}" ${p === sel ? 'selected' : ''}>${esc(t('pay_' + p))}</option>`).join('');
const curOptions = (sel) => ['USD', 'MXN'].map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
const tzOptions = (sel) => {
  const list = TIMEZONES.includes(sel) || !sel ? TIMEZONES : TIMEZONES.concat([sel]);
  return list.map((z) => `<option value="${z}" ${z === sel ? 'selected' : ''}>${esc(tzLabel(z))} — ${z}</option>`).join('');
};
const mapsBtn = (q, icon = '🔎') => `<a class="btn maps-btn" href="${esc(mapsSearch(q))}" target="_blank" rel="noopener">${icon} ${esc(q)}</a>`;

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
  document.documentElement.lang = lang();
  document.body.dataset.theme = S.settings.theme === 'sun' ? 'sun' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = S.settings.theme === 'sun' ? '#000000' : '#0f1117';
  $('#rate-display').textContent = rate().toFixed(2);
  $('#lang-chip').textContent = lang() === 'es' ? 'EN' : 'ES';
  $('#lang-chip').setAttribute('aria-label', t('lang_toggle'));
  $('#theme-chip').textContent = S.settings.theme === 'sun' ? '🌙' : '☀️';
  $('#theme-chip').setAttribute('aria-label', t('theme_toggle'));
  $('#rate-chip').setAttribute('aria-label', t('exchange_rate'));
  let rs;
  if (num(S.settings.manualRate)) rs = t('rate_manual');
  else if (S.rate.source === 'live') rs = t('rate_live', { date: S.rate.date || '' });
  else if (S.rate.source === 'cache') rs = t('rate_cached', { date: S.rate.date || '' });
  else rs = t('rate_default');
  $('#net-status').textContent = (navigator.onLine ? t('online') : t('offline')) + ' · ' + rs;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.title = t('app_title');
  document.querySelectorAll('.bottom-nav button').forEach((b) => b.classList.toggle('on', b.dataset.nav === ui.view));
}

function render() {
  renderHeader();
  const views = { today: viewToday, plan: viewPlan, spend: viewSpend, tolls: viewTolls, fuel: viewFuel, more: viewMore };
  $('#view').innerHTML = (views[ui.view] || viewToday)();
}

// ─── Day card pieces (shared by Today and Plan) ───────────────────────────────
function dayFacts(day) {
  const c = dayChecks(day);
  const sunRow = c.sun ? `
    <div><div class="label">${t('sunrise')}</div><div class="val">🌅 ${fmtClock(c.sun.startSunrise, day.startTz)} ${esc(tzAbbr(day.startTz, day.date))}</div></div>
    <div><div class="label">${t('sunset_dest')}</div><div class="val">🌇 ${fmtClock(c.sun.destSunset, day.arriveTz)} ${esc(tzAbbr(day.arriveTz, day.date))}</div></div>` : '';
  return `
  <div class="facts">
    <div><div class="label">${t('distance')}</div><div class="val">${fmtDist(num(day.distanceMi))}${day.distanceNote ? `<div class="small muted">${esc(day.distanceNote)}</div>` : ''}</div></div>
    <div><div class="label">${t('est_driving')}</div><div class="val">${esc(day.driveHours || '—')}</div></div>
    <div><div class="label">${t('start')}</div><div class="val">${fmtHHMM(day.start)} ${esc(tzAbbr(day.startTz, day.date))}</div></div>
    <div><div class="label">${t('target_arrival')}</div><div class="val">${fmtHHMM(day.arrive)} ${esc(tzAbbr(day.arriveTz, day.date))}</div></div>
    ${sunRow}
  </div>
  ${c.rules.map((r) => `<div class="rule">🚦 ${esc(r)}</div>`).join('')}
  ${c.tz.map((r) => `<div class="tzchange">🕐 ${esc(r)}</div>`).join('')}
  ${c.warnings.map((r) => `<div class="warning">⚠️ ${esc(r)}</div>`).join('')}
  ${day.route ? `<div class="small"><b>${t('route')}:</b> ${esc(day.route)}</div>` : ''}
  ${tx(day.notes) ? `<div class="small" style="margin-top:6px">📝 ${esc(tx(day.notes))}</div>` : ''}`;
}
function dayHeader(day, i) {
  return `<div class="day-head">
    <div class="day-num">${i + 1}</div>
    <div class="grow">
      <div class="small muted">${esc(fmtDate(day.date))} · ${esc(t('country_' + day.country))}</div>
      <div class="day-route">${esc(day.from)} → ${esc(day.to)}</div>
    </div>
    ${statusBadge(day.status)}
  </div>`;
}
function statusBadge(s) {
  const cls = s === 'arrived' ? 'ok' : s === 'driving' ? 'warn' : '';
  return `<span class="badge ${cls}">${esc(t('status_' + s))}</span>`;
}
function safetyChecklist() {
  return `<details><summary class="btn btn-sm">🛡️ ${t('safety_title')}</summary>
    <ul class="checklist" style="margin-top:8px">${['safety_1', 'safety_2', 'safety_3', 'safety_4', 'safety_5', 'safety_6'].map((k) => `<li>✅ <span>${t(k)}</span></li>`).join('')}</ul></details>`;
}
function tomorrowList(day) {
  return `<ul class="checklist">${day.tomorrowNotes.map((n) => `
    <li class="${n.done ? 'done' : ''}">
      <input type="checkbox" ${n.done ? 'checked' : ''} data-act="toggleNote" data-day="${day.id}" data-id="${n.id}" aria-label="${esc(t('done'))}">
      <span class="txt grow">${esc(tx(n.text))}</span>
      <button class="btn btn-sm btn-icon" data-act="delNote" data-day="${day.id}" data-id="${n.id}" aria-label="${esc(t('delete'))}">✕</button>
    </li>`).join('')}</ul>
    <form class="row" data-form="addNote" data-day="${day.id}" style="margin-top:8px">
      <input class="grow" name="text" placeholder="${esc(t('add_note_ph'))}" required>
      <button class="btn btn-sm" type="submit">＋</button>
    </form>`;
}
function borderLinks(day, bare) {
  if (!Array.isArray(day.links) || !day.links.length) return '';
  const body = `<h3 style="margin-top:0">🛂 ${t('border_title')}</h3><div class="link-list">${day.links.map((l) => `<a class="btn maps-btn" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(tx(l.label))}</a>`).join('')}</div>`;
  return bare ? body : `<div class="section">${body}</div>`;
}
function placesList(day) {
  return `${day.places.length ? `<ul class="list">${day.places.map((p) => `
    <li class="entry">
      <div class="grow"><b>${esc(p.name)}</b> <span class="badge">${esc(t('ptype_' + p.type))}</span>
        ${p.notes ? `<div class="sub">${esc(p.notes)}</div>` : ''}</div>
      <a class="btn btn-sm" href="${esc(p.url || mapsSearch(p.name + ' ' + day.to))}" target="_blank" rel="noopener">🗺️</a>
      <button class="btn btn-sm btn-icon" data-act="delPlace" data-day="${day.id}" data-id="${p.id}" aria-label="${esc(t('delete'))}">✕</button>
    </li>`).join('')}</ul>` : `<div class="small muted">${t('no_places')}</div>`}
    <button class="btn btn-sm" style="margin-top:8px" data-act="addPlace" data-day="${day.id}">＋ ${t('save_place')}</button>`;
}
function dayFullCard(day, i) {
  return `
  ${dayFacts(day)}
  <div class="btn-grid" style="margin-top:12px">
    <a class="btn" href="${esc(mapsRoute(day))}" target="_blank" rel="noopener">🧭 ${t('open_route')}</a>
    <button class="btn" data-act="editDay" data-day="${day.id}">✏️ ${t('edit_day')}</button>
  </div>
  ${borderLinks(day)}
  <div class="section"><h3>⛽ ${t('sec_fuel')}</h3>
    <ul class="list small">${day.fuelStops.map((s) => `<li>${esc(tx(s))}</li>`).join('')}</ul>
    <div class="link-list">${day.fuelSearch.map((q) => mapsBtn(q, '⛽')).join('')}</div>
  </div>
  <div class="section"><h3>🍽️ ${t('sec_food')}</h3>
    <div class="small muted" style="margin-bottom:8px">${t('break_rule')}</div>
    <div class="link-list">${day.foodSearch.map((q) => mapsBtn(q, '🍽️')).join('')}</div>
  </div>
  <div class="section"><h3>🏨 ${t('sec_overnight')}</h3>
    <div class="link-list" style="margin-bottom:10px">${day.overnightSearch.map((q) => mapsBtn(q, '🏨')).join('')}</div>
    ${safetyChecklist()}
  </div>
  <div class="section"><h3>🔎 ${t('osm_title')}</h3>
    <div class="small muted" style="margin-bottom:8px">${t('osm_desc')}</div>
    <button class="btn btn-block" data-act="osmOpen" data-day="${day.id}">🏨 ⛽ 🍽️ ${t('osm_btn')}</button>
  </div>
  <div class="section"><h3>📌 ${t('my_places')}</h3>${placesList(day)}</div>
  <div class="section"><h3>🌙 ${t('tomorrow_notes_for', { n: i + 1 })}</h3>
    <div class="small muted" style="margin-bottom:6px">${t('tomorrow_explain')}</div>
    ${tomorrowList(day)}
  </div>`;
}

/** Days between the last outbound day and the first return day. */
function familyWindow() {
  const outs = S.days.filter((d) => legOf(d) === 'out' && d.date).map((d) => d.date).sort();
  const ret = returnStartDate();
  if (!outs.length || !ret) return null;
  const add = (date, n) => { const x = new Date(date + 'T12:00:00'); x.setDate(x.getDate() + n); return localDateStr(x); };
  const from = add(outs[outs.length - 1], 1), to = add(ret, -1);
  if (from > to) return null;
  const nights = Math.round((new Date(ret + 'T12:00:00') - new Date(outs[outs.length - 1] + 'T12:00:00')) / 86400e3);
  return { from, to, returnDate: ret, nights };
}

// ─── TODAY ────────────────────────────────────────────────────────────────────
function viewToday() {
  if (!S.days.length) return `<div class="card">${t('no_days')} <button class="btn" data-act="addDay">＋ ${t('add_day')}</button></div>`;
  const cur = currentDayIdx();
  if (ui.dayIdx == null || ui.dayIdx >= S.days.length) ui.dayIdx = cur;
  const i = ui.dayIdx, day = S.days[i];
  const today = localDateStr();
  let html = '';

  dueTomorrowDays().forEach((d) => {
    const n = S.days.indexOf(d) + 1;
    const pending = d.tomorrowNotes.filter((x) => !x.done).length;
    html += `<div class="banner"><h2>🌙 ${t(d.date === today ? 'banner_today' : 'banner_title', { n, date: fmtDate(d.date) })}</h2>
      <div class="small" style="margin-bottom:6px">${pending ? t('banner_pending', { n: pending }) : t('banner_all_done')}</div>
      ${tomorrowList(d)}</div>`;
  });

  const daysUntil = (date) => Math.round((new Date(date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400e3);
  if (today < S.days[0].date) {
    html += `<div class="card accent"><div class="kicker">${t('countdown_kicker')}</div><div class="huge">${t('countdown', { n: daysUntil(S.days[0].date) })}</div></div>`;
  }
  const fam = familyWindow();
  if (fam && today >= fam.from && today <= fam.to) {
    html += `<div class="card ok"><div class="kicker">${t('family_kicker')}</div><div class="big">🏡 ${t('family_title')}</div>
      <div class="small" style="margin-top:4px">${t('family_return', { date: fmtDate(fam.returnDate), n: daysUntil(fam.returnDate) })}</div></div>`;
  }
  if (today > S.days[S.days.length - 1].date) {
    html += `<div class="card ok"><div class="big">🏁 ${t('trip_done')}</div><div class="small">${t('trip_done_sub')}</div></div>`;
  }

  const prog = dayProgress(day, i);
  const rg = rangeInfo();
  html += `
  <div class="row between" style="margin-bottom:10px">
    <button class="btn btn-icon" data-act="dayNav" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('prev_day'))}">◀</button>
    <div class="grow" style="text-align:center"><div class="kicker">${i === cur && S.days[i].date === today ? t('today') : t('viewing_day')}</div>
      <div><b>${t('day_n', { n: i + 1 })}</b> · ${esc(fmtDate(day.date))}</div></div>
    <button class="btn btn-icon" data-act="dayNav" data-dir="1" ${i === S.days.length - 1 ? 'disabled' : ''} aria-label="${esc(t('next_day'))}">▶</button>
  </div>
  <div class="card accent">
    ${dayHeader(day, i)}
    <div style="margin:14px 0 6px">${seg('status', [['not_started', t('status_not_started')], ['driving', t('status_driving')], ['arrived', t('status_arrived')]], day.status)}</div>
    <div class="row between small" style="margin-top:12px"><span>${t('progress')}</span><span>${fmtDist(prog.mi)} / ${fmtDist(num(day.distanceMi))}${prog.method !== 'none' && prog.method !== 'status' ? ' · ' + t('by_' + prog.method) : ''}</span></div>
    <div class="bar ${prog.pct >= 1 ? 'ok' : ''}"><span style="width:${Math.round(prog.pct * 100)}%"></span></div>
    ${dayFacts(day)}
  </div>
  <div class="btn-grid" style="margin-bottom:14px">
    <button class="btn btn-primary btn-xl" data-act="checkin">📍 ${t('check_in')}</button>
    <button class="btn btn-ok btn-xl" data-act="share">📣 ${t('share_status')}</button>
  </div>
  <div class="btn-grid three" style="margin-bottom:14px">
    <a class="btn" href="${esc(mapsSearch(day.country === 'US' ? 'gas station' : 'gasolinera Pemex OXXO Gas'))}" target="_blank" rel="noopener">⛽ ${t('near_gas')}</a>
    <a class="btn" href="${esc(mapsSearch(day.country === 'US' ? 'restaurant' : 'restaurante VIPS Sanborns Toks'))}" target="_blank" rel="noopener">🍽️ ${t('near_food')}</a>
    <a class="btn" href="${esc(mapsSearch(day.country === 'US' ? 'hotel' : 'hotel con estacionamiento vigilado'))}" target="_blank" rel="noopener">🏨 ${t('near_hotel')}</a>
  </div>
  <div class="btn-grid" style="margin-bottom:14px">
    <a class="btn" href="${esc(mapsRoute(day))}" target="_blank" rel="noopener">🧭 ${t('open_route')}</a>
    <button class="btn" data-act="osmOpen" data-day="${day.id}">🏨 ${t('osm_btn')}</button>
  </div>
  ${day.links && day.links.length ? `<div class="card warn">${borderLinks(day, true)}</div>` : ''}
  ${rangeCard(rg, true)}
  <div class="card"><div class="card-title"><h2>🕑 ${t('checkins_title')}</h2></div>
    ${day.checkins.length ? `<ul class="timeline">${day.checkins.slice().reverse().map((c) => `
      <li><div class="row between"><b>${esc(fmtDateTime(c.ts))}</b>
        <button class="btn btn-sm btn-icon" data-act="delCheckin" data-day="${day.id}" data-id="${c.id}" aria-label="${esc(t('delete'))}">✕</button></div>
        ${c.status ? `<div>${statusBadge(c.status)}</div>` : ''}
        ${num(c.odometer) != null ? `<div class="small">${t('odometer')}: ${esc(c.odometer)} ${esc(c.odoUnit || '')}</div>` : ''}
        ${c.note ? `<div class="small">${esc(c.note)}</div>` : ''}
        ${c.lat != null ? `<a class="small" href="${esc(mapsPoint(c.lat, c.lng))}" target="_blank" rel="noopener">📍 ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}</a>` : `<div class="small muted">${t('no_gps')}</div>`}
      </li>`).join('')}</ul>` : `<div class="muted small">${t('no_checkins')}</div>`}
  </div>`;
  return html;
}
function rangeCard(rg, compact) {
  if (!rg.known) {
    return `<div class="card"><div class="card-title"><h2>⛽ ${t('range_title')}</h2></div>
      <div class="small muted">${t('range_unknown', { range: fmtDist(rg.rangeMi) })}</div>
      ${compact ? `<button class="btn btn-sm" style="margin-top:8px" data-nav-go="fuel">${t('go_fuel')}</button>` : ''}</div>`;
  }
  const msg = rg.left <= 0 ? t('refuel_now') : t('refuel_within', { d: fmtDist(rg.left) });
  return `<div class="card ${rg.level}">
    <div class="card-title"><h2>⛽ ${t('range_title')}</h2><span class="badge ${rg.level}">${rg.inMexico ? t('rule_half_tank') : t('rule_us_miles', { d: fmtDist(rg.limit) })}</span></div>
    <div class="big">${esc(msg)}</div>
    <div class="small muted">${t('since_fill', { d: fmtDist(rg.since) })} · ${t('est_tank', { p: Math.round(rg.tankPct * 100) })}</div>
    <div class="bar ${rg.level}" style="margin-top:8px"><span style="width:${Math.round(rg.tankPct * 100)}%"></span></div>
    ${compact ? `<button class="btn btn-sm" style="margin-top:10px" data-act="logOdo">🔢 ${t('update_odometer')}</button>` : ''}
  </div>`;
}

// ─── PLAN ─────────────────────────────────────────────────────────────────────
function viewPlan() {
  const total = S.days.reduce((s, d) => s + (num(d.distanceMi) || 0), 0);
  const cur = currentDayIdx();
  let html = `<div class="card"><div class="card-title"><h2>🗺️ ${t('plan_title')}</h2></div>
    <div class="small muted">${t('plan_summary', { days: S.days.length, dist: fmtDist(total) })}</div>
    <div class="small" style="margin-top:6px">${t('maps_offline_tip')}</div></div>`;
  const fam = familyWindow();
  let lastLeg = null;
  html += S.days.map((day, i) => {
    const open = ui.openDays[day.id] != null ? ui.openDays[day.id] : i === cur;
    const leg = legOf(day);
    let head = '';
    if (leg !== lastLeg) {
      if (leg === 'return' && fam) head += `<div class="card ok"><div class="big">🏡 ${t('family_title')}</div><div class="small">${esc(fmtDate(fam.from))} – ${esc(fmtDate(fam.to))} · ${t('nights', { n: fam.nights })}</div></div>`;
      head += `<h2 style="margin:18px 4px 10px">${leg === 'return' ? '⬆️ ' + t('leg_return') : '⬇️ ' + t('leg_out')}</h2>`;
      lastLeg = leg;
    }
    return head + `<details class="card day-card" data-day-card="${day.id}" ${open ? 'open' : ''}>
      <summary>${dayHeader(day, i)}</summary>
      <div style="margin-top:10px">${dayFullCard(day, i)}</div>
      <div class="btn-grid" style="margin-top:14px">
        <button class="btn btn-sm" data-act="moveDay" data-day="${day.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>▲ ${t('move_up')}</button>
        <button class="btn btn-sm btn-danger" data-act="delDay" data-day="${day.id}">🗑 ${t('delete_day')}</button>
      </div>
    </details>`;
  }).join('');
  html += `<button class="btn btn-block" data-act="addDay">＋ ${t('add_day')}</button>`;
  return html;
}

// ─── SPEND ────────────────────────────────────────────────────────────────────
function viewSpend() {
  const L = ledger();
  const totUSD = L.reduce((s, e) => s + e.usd, 0), totMXN = L.reduce((s, e) => s + e.mxn, 0);
  const bud = overallBudgetUSD(), rem = bud - totUSD, pct = bud > 0 ? clamp(totUSD / bud, 0, 1) : 0;
  const byCat = {}; CATS.forEach((c) => { byCat[c] = { usd: 0, mxn: 0 }; });
  L.forEach((e) => { const c = byCat[e.category] || byCat.other; c.usd += e.usd; c.mxn += e.mxn; });
  const byDay = {};
  L.forEach((e) => { const k = dayLabelForDate(e.date); byDay[k] = byDay[k] || { usd: 0, mxn: 0, order: dayIndexForDate(e.date) }; byDay[k].usd += e.usd; byDay[k].mxn += e.mxn; });
  const q = ui.spendSearch.toLowerCase();
  const shown = L.filter((e) => (ui.spendFilter === 'all' || e.category === ui.spendFilter) && (!q || (e.title + ' ' + t('cat_' + e.category)).toLowerCase().includes(q)));

  return `
  <div class="card accent">
    <div class="card-title"><h2>💵 ${t('grand_total')}</h2><button class="btn btn-sm" data-act="editOverall">✏️ ${t('trip_budget')}</button></div>
    <div class="huge usd">${fmtUSD(totUSD)}</div><div class="big mxn">${fmtMXN(totMXN)}</div>
    <div class="stat-grid" style="margin-top:12px">
      <div class="stat"><div class="label">${t('budget')}${S.budgetOverallUSD > 0 ? '' : ' (' + t('sum_of_categories') + ')'}</div><div class="v">${fmtUSD(bud)}</div><div class="small mxn">${fmtMXN(bud * rate())}</div></div>
      <div class="stat"><div class="label">${t('remaining')}</div><div class="v" style="color:${rem < 0 ? 'var(--danger)' : 'var(--ok)'}">${fmtUSD(rem)}</div><div class="small mxn">${fmtMXN(rem * rate())}</div></div>
    </div>
    <div class="bar ${pct >= 0.9 ? 'danger' : pct >= 0.7 ? 'warn' : ''}" style="margin-top:10px"><span style="width:${Math.round(pct * 100)}%"></span></div>
    <div class="small muted" style="margin-top:4px">${t('pct_used', { p: Math.round(pct * 100) })}</div>
  </div>

  <div class="card">
    <h2>➕ ${t('add_expense')}</h2>
    ${expenseForm({})}
  </div>

  <div class="card">
    <div class="card-title"><h2>📊 ${t('budget_vs_actual')}</h2><button class="btn btn-sm" data-act="editBudget">✏️ ${t('edit')}</button></div>
    <table class="tbl"><thead><tr><th>${t('category')}</th><th class="num">${t('actual')}</th><th class="num">${t('budget')}</th></tr></thead><tbody>
    ${CATS.map((c) => {
      const line = S.budget.find((b) => b.cat === c) || { amount: 0, currency: 'USD' };
      const b = budgetUSD(line), a = byCat[c].usd, p = b > 0 ? a / b : 0;
      return `<tr><td>${CAT_ICON[c]} ${esc(t('cat_' + c))}${tx(line.note) ? `<div class="small muted">${esc(tx(line.note))}</div>` : ''}
        ${b > 0 ? `<div class="bar ${p > 1 ? 'danger' : p > 0.85 ? 'warn' : 'ok'}" style="height:8px;margin-top:4px"><span style="width:${Math.round(clamp(p, 0, 1) * 100)}%"></span></div>` : ''}</td>
        <td class="num"><span class="usd">${fmtUSD(a)}</span><div class="small mxn">${fmtMXN(byCat[c].mxn)}</div></td>
        <td class="num">${line.amount ? fmtCur(num(line.amount), line.currency) : '—'}${line.amount && line.currency === 'MXN' ? `<div class="small muted">≈ ${fmtUSD(b)}</div>` : ''}</td></tr>`;
    }).join('')}
    <tr class="total"><td>${t('total')}</td><td class="num"><span class="usd">${fmtUSD(totUSD)}</span><div class="small mxn">${fmtMXN(totMXN)}</div></td><td class="num">${fmtUSD(S.budget.reduce((s, b) => s + budgetUSD(b), 0))}</td></tr>
    </tbody></table>
  </div>

  <div class="card">
    <h2>📅 ${t('by_day')}</h2>
    ${Object.keys(byDay).length ? `<table class="tbl"><tbody>${Object.entries(byDay).sort((a, b) => (a[1].order < 0 ? 999 : a[1].order) - (b[1].order < 0 ? 999 : b[1].order)).map(([k, v]) => `
      <tr><td>${esc(k)}</td><td class="num"><span class="usd">${fmtUSD(v.usd)}</span></td><td class="num"><span class="mxn">${fmtMXN(v.mxn)}</span></td></tr>`).join('')}
      <tr class="total"><td>${t('total')}</td><td class="num usd">${fmtUSD(totUSD)}</td><td class="num mxn">${fmtMXN(totMXN)}</td></tr></tbody></table>` : `<div class="muted small">${t('no_spending')}</div>`}
  </div>

  <div class="card">
    <div class="card-title"><h2>🧾 ${t('all_entries')} <span class="badge">${L.length}</span></h2></div>
    <input type="search" data-input="spendSearch" value="${esc(ui.spendSearch)}" placeholder="${esc(t('search'))}" style="margin-bottom:10px">
    <div class="chips" style="margin-bottom:6px">
      <button class="fchip ${ui.spendFilter === 'all' ? 'on' : ''}" data-act="spendFilter" data-val="all">${t('all')}</button>
      ${CATS.map((c) => `<button class="fchip ${ui.spendFilter === c ? 'on' : ''}" data-act="spendFilter" data-val="${c}">${CAT_ICON[c]} ${esc(t('cat_' + c))}</button>`).join('')}
    </div>
    ${shown.length ? `<ul class="list">${shown.map(entryRow).join('')}</ul>` : `<div class="muted small" style="padding:16px 0">${L.length ? t('no_match') : t('no_spending')}</div>`}
    ${S.expenses.length ? `<button class="btn btn-sm btn-danger" style="margin-top:10px" data-act="clearExpenses">🗑 ${t('clear_expenses')}</button>` : ''}
  </div>`;
}
function entryRow(e) {
  const srcBadge = e.src !== 'expense' ? `<span class="badge">${esc(t('src_' + e.src))}</span>` : '';
  const legacy = e.legacyCategory ? `<span class="badge" title="${esc(t('legacy_hint'))}">${esc(t('was_cat', { c: e.legacyCategory }))}</span>` : '';
  return `<li class="entry">
    <div style="font-size:1.4rem">${CAT_ICON[e.category] || '📦'}</div>
    <div class="grow"><div><b>${esc(e.title)}</b></div>
      <div class="sub">${esc(t('cat_' + e.category))} · ${esc(dayLabelForDate(e.date))} · ${esc(fmtDateTime(e.ts))}${e.payment ? ' · ' + esc(t('pay_' + e.payment)) : ''}</div>
      <div>${srcBadge} ${legacy}</div></div>
    <div class="amt"><div class="${e.currency === 'MXN' ? 'mxn' : 'usd'}">${fmtCur(e.amount, e.currency)}</div>
      <div class="sub">${e.currency === 'MXN' ? fmtUSD(e.usd) : fmtMXN(e.mxn)}</div>
      <div class="row" style="justify-content:flex-end;gap:6px;margin-top:4px">
        <button class="btn btn-sm btn-icon" data-act="editEntry" data-src="${e.src}" data-id="${esc(e.id)}" aria-label="${esc(t('edit'))}">✏️</button>
        <button class="btn btn-sm btn-icon" data-act="delEntry" data-src="${e.src}" data-id="${esc(e.id)}" aria-label="${esc(t('delete'))}">✕</button>
      </div></div>
  </li>`;
}
function expenseForm(e) {
  const isEdit = !!e.id;
  const cat = e.category || 'food';
  return `<form data-form="expense" data-id="${esc(e.id || '')}">
    <div class="form-grid">
      <div class="field full"><label>${t('category')}</label>
        <select name="category" data-change="expCat">${catOptions(cat, isEdit && (cat === 'fuel' || cat === 'toll' || cat === 'bridge') ? [] : [])}</select></div>
      <div class="full hint ${['fuel', 'toll', 'bridge'].includes(cat) && !isEdit ? '' : 'hidden'}" data-redirect>
        ${t('use_log_hint')}
        <div class="btn-grid" style="margin-top:8px"><button type="button" class="btn btn-sm" data-nav-go="fuel">⛽ ${t('nav_fuel')}</button><button type="button" class="btn btn-sm" data-nav-go="tolls">🛣️ ${t('nav_tolls')}</button></div>
      </div>
      <div class="field"><label>${t('amount')}</label><input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required value="${e.amount != null ? esc(e.amount) : ''}"></div>
      <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions(e.currency || defaultCurrency())}</select></div>
      <div class="field"><label>${t('payment')}</label><select name="payment">${payOptions(e.payment || 'card', true)}</select></div>
      <div class="field"><label>${t('date_time')}</label><input name="ts" type="datetime-local" required value="${esc(e.ts ? e.ts.slice(0, 16) : localDateTimeInput())}"></div>
      <div class="field full"><label>${t('note')}</label><input name="note" value="${esc(e.note || '')}" placeholder="${esc(t('note_ph'))}"></div>
    </div>
    <div class="modal-actions">${isEdit ? `<button type="button" class="btn" data-act="closeModal">${t('cancel')}</button>` : ''}
      <button class="btn btn-primary" type="submit" ${['fuel', 'toll', 'bridge'].includes(cat) && !isEdit ? 'disabled' : ''}>${isEdit ? t('save') : t('add_expense')}</button></div>
  </form>`;
}
function defaultCurrency() { return countryOn() === 'MX' ? 'MXN' : 'USD'; }

// ─── TOLLS ────────────────────────────────────────────────────────────────────
function viewTolls() {
  const st = expectedStatus();
  const expectedMXN = st.filter((x) => !x.exp.skipped && num(x.exp.estAmount) != null).reduce((s, x) => s + toMXN(num(x.exp.estAmount), x.exp.currency), 0);
  const legacyTolls = S.expenses.filter((e) => e.category === 'toll' || e.category === 'bridge');
  const paidMXN = S.tolls.reduce((s, x) => s + x.mxn, 0) + legacyTolls.reduce((s, x) => s + x.mxn, 0);
  const paidUSD = S.tolls.reduce((s, x) => s + x.usd, 0) + legacyTolls.reduce((s, x) => s + x.usd, 0);
  const names = Array.from(new Set(S.expectedTolls.map((e) => e.name).concat(S.tolls.map((x) => x.name)).filter(Boolean)));
  const p = ui.tollPrefill || {};
  return `
  <div class="card accent">
    <div class="card-title"><h2>🛣️ ${t('tolls_title')}</h2></div>
    <div class="stat-grid">
      <div class="stat"><div class="label">${t('expected')}</div><div class="v mxn">${fmtMXN(expectedMXN)}</div><div class="small usd">${fmtUSD(expectedMXN / rate())}</div></div>
      <div class="stat"><div class="label">${t('paid')}</div><div class="v mxn">${fmtMXN(paidMXN)}</div><div class="small usd">${fmtUSD(paidUSD)}</div></div>
    </div>
    <div class="small muted" style="margin-top:6px">${t('expected_explain')}</div>
  </div>

  <div class="card" id="toll-form-card">
    <h2>➕ ${t('add_toll')}</h2>
    <form data-form="toll" data-id="">
      <datalist id="toll-names">${names.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
      <div class="form-grid">
        <div class="field full"><label>${t('caseta_name')}</label><input name="name" list="toll-names" required autocomplete="off" value="${esc(p.name || '')}" data-change="tollName"></div>
        <div class="field"><label>${t('highway')}</label><input name="highway" value="${esc(p.highway || '')}"></div>
        <div class="field"><label>${t('amount')}</label><input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required value="${p.amount != null ? esc(p.amount) : ''}"></div>
        <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions(p.currency || 'MXN')}</select></div>
        <div class="field"><label>${t('payment')}</label><select name="payment">${payOptions(p.payment || 'cash')}</select></div>
        <div class="field full"><label>${t('date_time')}</label><input name="ts" type="datetime-local" required value="${esc(localDateTimeInput())}"></div>
        <label class="check-row full"><input type="checkbox" name="gps" checked> ${t('attach_gps')}</label>
      </div>
      <input type="hidden" name="expectedId" value="${esc(p.expectedId || '')}">
      <div class="modal-actions"><button class="btn btn-primary btn-xl" type="submit">${t('add_toll')}</button></div>
    </form>
  </div>

  <div class="card">
    <div class="card-title"><h2>✅ ${t('expected_tolls')}</h2><button class="btn btn-sm" data-act="editExpected" data-id="">＋ ${t('add')}</button></div>
    <ul class="list">${st.map(({ exp, entries, paidMXN: pm, paid }) => `
      <li class="entry">
        <div style="font-size:1.4rem">${paid ? '✅' : exp.skipped ? '⏭️' : '⬜'}</div>
        <div class="grow"><b>${esc(exp.name)}</b> ${exp.highway ? `<span class="badge">${esc(exp.highway)}</span>` : ''} ${exp.optional ? `<span class="badge">${t('optional')}</span>` : ''}
          <div class="sub">${num(exp.estAmount) != null ? t('est') + ' ~' + fmtCur(num(exp.estAmount), exp.currency) : t('est_unknown')}${paid ? ' · ' + t('paid') + ' ' + fmtMXN(pm) + ' (' + entries.length + ')' : ''}${exp.skipped ? ' · ' + t('skipped') : ''}</div>
          ${tx(exp.note) ? `<div class="sub">${esc(tx(exp.note))}</div>` : ''}
          <div class="row" style="margin-top:6px;gap:6px">
            <button class="btn btn-sm" data-act="logExpected" data-id="${exp.id}">＋ ${t('log')}</button>
            <button class="btn btn-sm" data-act="skipExpected" data-id="${exp.id}">${exp.skipped ? t('unskip') : t('skip')}</button>
            <button class="btn btn-sm btn-icon" data-act="editExpected" data-id="${exp.id}" aria-label="${esc(t('edit'))}">✏️</button>
            <button class="btn btn-sm btn-icon" data-act="delExpected" data-id="${exp.id}" aria-label="${esc(t('delete'))}">✕</button>
          </div></div>
      </li>`).join('')}</ul>
  </div>

  <div class="card">
    <h2>🧾 ${t('toll_log')} <span class="badge">${S.tolls.length}</span></h2>
    ${S.tolls.length ? `<ul class="list">${S.tolls.slice().sort((a, b) => b.ts.localeCompare(a.ts)).map((x) => `
      <li class="entry"><div class="grow"><b>${esc(x.name)}</b> ${x.highway ? `<span class="badge">${esc(x.highway)}</span>` : ''}
        <div class="sub">${esc(dayLabelForDate(x.date))} · ${esc(fmtDateTime(x.ts))} · ${esc(t('pay_' + x.payment))}</div>
        ${x.lat != null ? `<a class="small" href="${esc(mapsPoint(x.lat, x.lng))}" target="_blank" rel="noopener">📍 ${t('location')}</a>` : ''}</div>
        <div class="amt"><div class="${x.currency === 'MXN' ? 'mxn' : 'usd'}">${fmtCur(x.amount, x.currency)}</div><div class="sub">${x.currency === 'MXN' ? fmtUSD(x.usd) : fmtMXN(x.mxn)}</div>
          <div class="row" style="justify-content:flex-end;gap:6px;margin-top:4px">
          <button class="btn btn-sm btn-icon" data-act="editEntry" data-src="toll" data-id="${x.id}" aria-label="${esc(t('edit'))}">✏️</button>
          <button class="btn btn-sm btn-icon" data-act="delEntry" data-src="toll" data-id="${x.id}" aria-label="${esc(t('delete'))}">✕</button></div></div></li>`).join('')}</ul>` : `<div class="muted small">${t('no_tolls')}</div>`}
    ${legacyTolls.length ? `<div class="small muted" style="margin-top:8px">${t('legacy_tolls', { n: legacyTolls.length })}</div>` : ''}
  </div>`;
}
function tollEditForm(x) {
  return `<h2>✏️ ${t('edit_toll')}</h2><form data-form="toll" data-id="${esc(x.id)}">
    <div class="form-grid">
      <div class="field full"><label>${t('caseta_name')}</label><input name="name" required value="${esc(x.name)}"></div>
      <div class="field"><label>${t('highway')}</label><input name="highway" value="${esc(x.highway || '')}"></div>
      <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" min="0.01" required value="${esc(x.amount)}"></div>
      <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions(x.currency)}</select></div>
      <div class="field"><label>${t('payment')}</label><select name="payment">${payOptions(x.payment)}</select></div>
      <div class="field full"><label>${t('date_time')}</label><input name="ts" type="datetime-local" required value="${esc(x.ts.slice(0, 16))}"></div>
    </div>
    <input type="hidden" name="expectedId" value="${esc(x.expectedId || '')}">
    <div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div>
  </form>`;
}

// ─── FUEL ─────────────────────────────────────────────────────────────────────
function viewFuel() {
  const st = fuelStats();
  const rg = rangeInfo();
  const totUSD = S.fuel.reduce((s, f) => s + f.usd, 0), totMXN = S.fuel.reduce((s, f) => s + f.mxn, 0);
  const totGal = S.fuel.reduce((s, f) => s + qtyToGal(num(f.qty) || 0, f.unit), 0);
  return `
  ${rangeCard(rg, true)}
  <div class="card">
    <div class="stat-grid">
      <div class="stat"><div class="label">${t('avg_economy')}</div><div class="v">${fmtEconomy(st.avgMpg)}</div><div class="small muted">${t('plan_economy', { e: fmtEconomy(num(S.settings.mpg)) })}</div></div>
      <div class="stat"><div class="label">${t('fuel_total')}</div><div class="v usd">${fmtUSD(totUSD)}</div><div class="small mxn">${fmtMXN(totMXN)}</div></div>
      <div class="stat"><div class="label">${t('fuel_volume')}</div><div class="v">${isKm() ? (totGal * L_PER_GAL).toFixed(1) + ' L' : totGal.toFixed(1) + ' gal'}</div></div>
      <div class="stat"><div class="label">${t('fills')}</div><div class="v">${S.fuel.length}</div></div>
    </div>
  </div>
  <div class="card"><h2>➕ ${t('add_fuel')}</h2>${fuelForm({})}</div>
  <div class="card"><h2>🧾 ${t('fuel_log')}</h2>
    ${S.fuel.length ? `<ul class="list">${S.fuel.slice().sort((a, b) => b.ts.localeCompare(a.ts)).map((f) => {
      const iv = st.intervals[f.id];
      return `<li class="entry"><div class="grow"><b>${esc(f.location || t('cat_fuel'))}</b> ${f.full ? `<span class="badge ok">${t('full')}</span>` : `<span class="badge">${t('partial')}</span>`}
        <div class="sub">${esc(dayLabelForDate(f.date))} · ${esc(fmtDateTime(f.ts))}</div>
        <div class="sub">${(+f.qty).toFixed(2)} ${esc(f.unit)} × ${fmtCur(num(f.price), f.currency)}${num(f.odometer) != null ? ' · ' + t('odometer') + ' ' + esc(f.odometer) + ' ' + esc(f.odoUnit) : ''}</div>
        ${iv ? `<div class="sub"><b>${fmtEconomy(iv.mpg)}</b> · ${fmtDist(iv.miles)}</div>` : ''}</div>
        <div class="amt"><div class="${f.currency === 'MXN' ? 'mxn' : 'usd'}">${fmtCur(f.amount, f.currency)}</div><div class="sub">${f.currency === 'MXN' ? fmtUSD(f.usd) : fmtMXN(f.mxn)}</div>
          <div class="row" style="justify-content:flex-end;gap:6px;margin-top:4px">
          <button class="btn btn-sm btn-icon" data-act="editEntry" data-src="fuel" data-id="${f.id}" aria-label="${esc(t('edit'))}">✏️</button>
          <button class="btn btn-sm btn-icon" data-act="delEntry" data-src="fuel" data-id="${f.id}" aria-label="${esc(t('delete'))}">✕</button></div></div></li>`;
    }).join('')}</ul>` : `<div class="muted small">${t('no_fuel')}</div>`}
  </div>`;
}
function fuelForm(f) {
  const isEdit = !!f.id;
  const mx = countryOn() === 'MX';
  return `<form data-form="fuel" data-id="${esc(f.id || '')}">
    <div class="form-grid">
      <div class="field full"><label>${t('location')}</label><input name="location" value="${esc(f.location || '')}" placeholder="${esc(t('location_ph'))}"></div>
      <div class="field"><label>${t('quantity')}</label><input name="qty" type="number" inputmode="decimal" step="0.001" min="0.01" required value="${f.qty != null ? esc(f.qty) : ''}"></div>
      <div class="field"><label>${t('unit')}</label><select name="unit">${['gal', 'L'].map((u) => `<option value="${u}" ${u === (f.unit || (mx || isKm() ? 'L' : 'gal')) ? 'selected' : ''}>${u === 'gal' ? t('gallons') : t('liters')}</option>`).join('')}</select></div>
      <div class="field"><label>${t('price_per_unit')}</label><input name="price" type="number" inputmode="decimal" step="0.001" min="0.01" required value="${f.price != null ? esc(f.price) : ''}"></div>
      <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions(f.currency || (mx ? 'MXN' : 'USD'))}</select></div>
      <div class="field"><label>${t('odometer')} (${esc(f.odoUnit || distUnit())})</label><input name="odometer" type="number" inputmode="numeric" step="0.1" min="0" value="${f.odometer != null ? esc(f.odometer) : ''}"></div>
      <div class="field"><label>${t('payment')}</label><select name="payment">${payOptions(f.payment || 'card')}</select></div>
      <div class="field full"><label>${t('date_time')}</label><input name="ts" type="datetime-local" required value="${esc(f.ts ? f.ts.slice(0, 16) : localDateTimeInput())}"></div>
      <label class="check-row full"><input type="checkbox" name="full" ${f.full === false ? '' : 'checked'}> ${t('filled_full')}</label>
      <input type="hidden" name="odoUnit" value="${esc(f.odoUnit || distUnit())}">
    </div>
    <div class="modal-actions">${isEdit ? `<button type="button" class="btn" data-act="closeModal">${t('cancel')}</button>` : ''}<button class="btn btn-primary ${isEdit ? '' : 'btn-xl'}" type="submit">${isEdit ? t('save') : t('add_fuel')}</button></div>
  </form>`;
}

// ─── MORE ─────────────────────────────────────────────────────────────────────
function viewMore() {
  const tabs = [['docs', '📄 ' + t('tab_docs')], ['emergency', '🆘 ' + t('tab_emergency')], ['settings', '⚙️ ' + t('tab_settings')], ['data', '💾 ' + t('tab_data')]];
  const body = { docs: moreDocs, emergency: moreEmergency, settings: moreSettings, data: moreData }[ui.moreTab] || moreDocs;
  return `<div class="subtabs">${seg('moreTab', tabs, ui.moreTab)}</div>${body()}`;
}
function moreDocs() {
  const done = S.docs.filter((d) => d.done).length;
  return `<div class="card"><div class="card-title"><h2>📄 ${t('docs_title')}</h2><span class="badge ${done === S.docs.length ? 'ok' : ''}">${done}/${S.docs.length}</span></div>
    <ul class="checklist">${S.docs.map((d) => `<li class="${d.done ? 'done' : ''}">
      <input type="checkbox" ${d.done ? 'checked' : ''} data-act="toggleDoc" data-id="${d.id}" aria-label="${esc(t('done'))}">
      <span class="txt grow">${esc(tx(d.text))}</span>
      <button class="btn btn-sm btn-icon" data-act="delDoc" data-id="${d.id}" aria-label="${esc(t('delete'))}">✕</button></li>`).join('')}</ul>
    <form class="row" data-form="addDoc" style="margin-top:8px"><input class="grow" name="text" required placeholder="${esc(t('add_item_ph'))}"><button class="btn btn-sm" type="submit">＋</button></form>
  </div>
  ${rulesCard()}`;
}
function rulesCard() {
  return `<div class="card warn"><h2>🚦 ${t('rules_title')}</h2><ul class="checklist">${['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((k) => `<li>• <span>${t('rules_' + k)}</span></li>`).join('')}</ul></div>`;
}
function moreEmergency() {
  const nums = [
    ['911', t('em_911'), false, '911'], ['078', t('em_078'), false, '078'], ['088', t('em_088'), false, '088'],
    ['+525525792000', t('em_embassy'), false, '+52 55 2579 2000'],
    ['+528180473100', t('em_consulate'), true, '+52 81 8047 3100'],
  ];
  return `<div class="card danger"><h2>🆘 ${t('emergency_title')}</h2><div class="stack">
    ${nums.map(([n, label, verify, shown]) => `<a class="btn btn-xl btn-block" href="tel:${n}" style="justify-content:space-between"><span>📞 ${esc(label)}</span><b>${esc(shown)}</b></a>
      ${verify ? `<div class="hint">⚠️ ${t('verify_before_trip')}</div>` : ''}`).join('')}
  </div></div>${rulesCard()}`;
}
function moreSettings() {
  const s = S.settings;
  const rs = S.rate.source === 'live' ? t('rate_live', { date: S.rate.date || '' }) : S.rate.source === 'cache' ? t('rate_cached', { date: S.rate.date || '' }) : t('rate_default');
  return `
  <div class="card"><h2>⚙️ ${t('tab_settings')}</h2><div class="stack">
    <div class="label">${t('language')}</div>${seg('lang', [['en', 'English'], ['es', 'Español']], s.lang)}
    <div class="label">${t('units')}</div>${seg('units', [['mi', t('miles')], ['km', t('kilometers')]], s.units)}
    <div class="label">${t('theme')}</div>${seg('theme', [['dark', '🌙 ' + t('theme_dark')], ['sun', '☀️ ' + t('theme_sun')]], s.theme)}
  </div></div>
  <form class="card" data-form="settings">
    <h2>🙋 ${t('traveler')}</h2>
    <div class="field"><label>${t('traveler_name')}</label><input name="travelerName" value="${esc(s.travelerName)}" placeholder="${esc(t('traveler_name_ph'))}"></div>
    <div class="small muted" style="margin-top:4px">${t('traveler_name_help')}</div>
    <h2 style="margin-top:16px">🚙 ${t('vehicle')}</h2>
    <div class="small muted" style="margin-bottom:8px">${t('vehicle_desc')}</div>
    <div class="form-grid">
      <div class="field"><label>${t('tank_gal')}</label><input name="tankGal" type="number" step="0.1" min="1" value="${esc(s.tankGal)}"></div>
      <div class="field"><label>${t('plan_mpg')}</label><input name="mpg" type="number" step="0.1" min="1" value="${esc(s.mpg)}"></div>
      <div class="field full"><label>${t('us_warn_mi')}</label><input name="usWarnMi" type="number" step="1" min="10" value="${esc(s.usWarnMi)}"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" type="submit">${t('save')}</button></div>
  </form>
  <div class="card"><h2>💱 ${t('exchange_rate')}</h2>
    <div class="big">1 USD = ${rate().toFixed(4)} MXN</div>
    <div class="small muted">${num(s.manualRate) ? t('rate_manual') + ' · ' : ''}${esc(rs)}${S.rate.value ? ' (' + S.rate.value.toFixed(4) + ')' : ''}</div>
    <button class="btn btn-block" style="margin-top:10px" data-act="openRate">✏️ ${t('rate_edit')}</button>
  </div>
  <div class="card"><h2>🔔 ${t('notifications')}</h2>
    <div class="small muted" style="margin-bottom:8px">${t('notify_desc')}</div>
    <div class="small" style="margin-bottom:8px">${t('notify_state')}: <b>${esc(notifyStateLabel())}</b></div>
    <button class="btn btn-block" data-act="enableNotify">${s.notify ? t('notify_disable') : t('notify_enable')}</button>
  </div>
  <div class="card ${deferredInstall ? '' : 'hidden'}" id="install-card"><h2>📲 ${t('install_title')}</h2>
    <button class="btn btn-primary btn-block" data-act="install">${t('install_btn')}</button></div>
  <div class="card"><h2>📲 ${t('offline_title')}</h2><div class="small">${t('offline_desc')}</div>
    <div class="small muted" style="margin-top:8px">${t('app_version', { v: APP_VERSION, p: S.seedVersion || 1 })}</div></div>`;
}
function notifyStateLabel() {
  if (!('Notification' in window)) return t('notify_unsupported');
  if (!S.settings.notify) return t('notify_off');
  return Notification.permission === 'granted' ? t('notify_on') : Notification.permission === 'denied' ? t('notify_blocked') : t('notify_off');
}
function moreData() {
  let used = 0; try { used = (localStorage.getItem(STORE_KEY) || '').length; } catch (e) { /* ignore */ }
  const m = S.migration;
  return `
  <div class="card"><h2>💾 ${t('export_title')}</h2><div class="stack">
    <button class="btn btn-block btn-primary" data-act="exportJson">⬇️ ${t('export_json')}</button>
    <button class="btn btn-block" data-act="exportCsv" data-kind="expenses">⬇️ ${t('export_csv_expenses')}</button>
    <button class="btn btn-block" data-act="exportCsv" data-kind="tolls">⬇️ ${t('export_csv_tolls')}</button>
    <button class="btn btn-block" data-act="exportCsv" data-kind="fuel">⬇️ ${t('export_csv_fuel')}</button>
  </div></div>
  <div class="card"><h2>🔎 ${t('osm_title')}</h2>
    <div class="small muted" style="margin-bottom:8px">${t('osm_bulk_desc', { n: allStops().length, c: Object.keys(osmCache()).length })}</div>
    <button class="btn btn-block" data-act="osmBulk" ${navigator.onLine ? '' : 'disabled'}>⬇️ ${t('osm_bulk_btn')}</button>
    <div class="small" id="osm-progress" style="margin-top:6px"></div>
  </div>
  <div class="card"><h2>⬆️ ${t('import_title')}</h2>
    <div class="small muted" style="margin-bottom:8px">${t('import_desc')}</div>
    <label class="btn btn-block">📂 ${t('import_btn')}<input type="file" accept="application/json,.json" data-change="importFile" class="hidden"></label>
  </div>
  <div class="card"><h2>ℹ️ ${t('storage_title')}</h2>
    <div class="small">${t('storage_used', { kb: (used / 1024).toFixed(1) })}</div>
    <div class="small">${t('counts', { e: S.expenses.length, t: S.tolls.length, f: S.fuel.length, d: S.days.length })}</div>
    ${m ? `<div class="small" style="margin-top:6px">${t('migration_info', { n: m.expenses, date: fmtDateTime(m.at) })}</div>` : ''}
    ${S.seedUpdate ? `<div class="small" style="margin-top:6px">${t('plan_updated_info', { date: fmtDateTime(S.seedUpdate.at), d: S.seedUpdate.added.days, t: S.seedUpdate.added.tolls, c: S.seedUpdate.added.docs })}</div>` : ''}
    ${localStorage.getItem(BACKUP_KEY) ? `<div class="small" style="margin-top:6px">${t('backup_exists')}</div>
      <button class="btn btn-sm" style="margin-top:6px" data-act="restoreBackup">↩️ ${t('restore_backup')}</button>` : ''}
  </div>`;
}

// ─── Modals: forms that need more room ────────────────────────────────────────
function rateModal() {
  openModal(`<h2>💱 ${t('exchange_rate')}</h2>
    <div class="big">1 USD = ${rate().toFixed(4)} MXN</div>
    <div class="small muted" style="margin-bottom:12px">${t('rate_explain')}</div>
    <button class="btn btn-block" data-act="refreshRate" ${navigator.onLine ? '' : 'disabled'}>🔄 ${t('rate_refresh')}</button>
    <form data-form="rate" style="margin-top:14px">
      <div class="field"><label>${t('rate_manual_label')}</label><input name="manualRate" type="number" inputmode="decimal" step="0.0001" min="1" value="${esc(S.settings.manualRate || '')}" placeholder="${esc((S.rate.value || DEFAULT_RATE).toFixed(2))}"></div>
      <div class="modal-actions"><button type="button" class="btn" data-act="clearManualRate">${t('rate_use_live')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div>
    </form>`);
}
function checkinModal() {
  const day = S.days[ui.dayIdx];
  const next = day.status === 'not_started' ? 'driving' : day.status;
  openModal(`<h2>📍 ${t('check_in')} · ${t('day_n', { n: ui.dayIdx + 1 })}</h2>
    <form data-form="checkin">
      <div class="stack">
        <div class="label">${t('status')}</div>
        <select name="status">${['not_started', 'driving', 'arrived'].map((s) => `<option value="${s}" ${s === next ? 'selected' : ''}>${t('status_' + s)}</option>`).join('')}</select>
        <div class="field"><label>${t('odometer')} (${distUnit()}) · ${t('optional')}</label><input name="odometer" type="number" inputmode="numeric" step="0.1" min="0"></div>
        <div class="field"><label>${t('note')} · ${t('optional')}</label><input name="note"></div>
        <label class="check-row"><input type="checkbox" name="gps" checked> ${t('attach_gps')}</label>
      </div>
      <div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save_checkin')}</button></div>
    </form>`);
}
function odoModal() {
  openModal(`<h2>🔢 ${t('update_odometer')}</h2><form data-form="odo">
    <div class="field"><label>${t('odometer')} (${distUnit()})</label><input name="value" type="number" inputmode="numeric" step="0.1" min="0" required></div>
    <div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}
function buildShareMessage(pos) {
  const day = S.days[ui.dayIdx];
  const name = (S.settings.travelerName || '').trim();
  const time = new Date().toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const short = (s) => String(s || '').split(',')[0].trim();
  let msg;
  if (day.status === 'arrived') msg = t('share_arrived', { to: short(day.to), time });
  else if (day.status === 'driving') msg = t('share_driving', { to: short(day.to), time });
  else msg = t('share_starting', { from: short(day.from), to: short(day.to), time });
  if (name) msg = name + ': ' + msg;
  if (pos) msg += '\n' + t('share_location') + ' ' + mapsPoint(pos.lat, pos.lng);
  return msg;
}
function shareModal() {
  const lastGps = S.days[ui.dayIdx].checkins.filter((c) => c.lat != null).slice(-1)[0];
  openModal(`<h2>📣 ${t('share_status')}</h2>
    <div class="small muted" id="share-loc">${t('getting_location')}</div>
    <textarea id="share-text" rows="4" style="margin-top:8px">${esc(buildShareMessage(lastGps))}</textarea>
    <div class="stack" style="margin-top:12px">
      <button class="btn btn-ok btn-xl btn-block" data-act="shareVia" data-via="whatsapp">💬 WhatsApp</button>
      <div class="btn-grid">
        <button class="btn" data-act="shareVia" data-via="sms">✉️ SMS</button>
        <button class="btn" data-act="shareVia" data-via="native" ${navigator.share ? '' : 'disabled'}>📤 ${t('share_more')}</button>
      </div>
      <button class="btn" data-act="shareVia" data-via="copy">📋 ${t('copy')}</button>
      <button class="btn" data-act="closeModal">${t('close')}</button>
    </div>`);
  let edited = false;
  $('#share-text').addEventListener('input', () => { edited = true; });
  getPosition(10000).then((pos) => {
    const el = $('#share-loc'); if (!el) return;
    el.textContent = pos ? t('location_ok', { acc: pos.acc }) : t('location_failed');
    if (pos && !edited && $('#share-text')) $('#share-text').value = buildShareMessage(pos);
  });
}
function placeModal(dayId) {
  openModal(`<h2>📌 ${t('save_place')}</h2><form data-form="place" data-day="${dayId}">
    <div class="stack">
      <div class="field"><label>${t('place_name')}</label><input name="name" required></div>
      <div class="field"><label>${t('place_type')}</label><select name="type">${['fuel', 'food', 'hotel', 'other'].map((p) => `<option value="${p}">${t('ptype_' + p)}</option>`).join('')}</select></div>
      <div class="field"><label>${t('note')}</label><input name="notes"></div>
      <div class="field"><label>${t('maps_link')} · ${t('optional')}</label><input name="url" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…"></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}
function lines(arr) { return arr.map(tx).join('\n'); }
function dayModal(day) {
  const d = day || {};
  openModal(`<h2>✏️ ${day ? t('edit_day') : t('add_day')}</h2><form data-form="day" data-day="${esc(d.id || '')}">
    <div class="form-grid">
      <div class="field"><label>${t('date')}</label><input name="date" type="date" required value="${esc(d.date || '')}"></div>
      <div class="field"><label>${t('country')}</label><select name="country">${['US', 'BORDER', 'MX'].map((c) => `<option value="${c}" ${c === (d.country || 'US') ? 'selected' : ''}>${t('country_' + c)}</option>`).join('')}</select></div>
      <div class="field full"><label>${t('from')}</label><input name="from" required value="${esc(d.from || '')}"></div>
      <div class="field full"><label>${t('to')}</label><input name="to" required value="${esc(d.to || '')}"></div>
      <div class="field"><label>${t('distance')} (${distUnit()})</label><input name="distance" type="number" step="1" min="0" value="${num(d.distanceMi) != null ? Math.round(miToDisplay(num(d.distanceMi))) : ''}"></div>
      <div class="field"><label>${t('distance_note')}</label><input name="distanceNote" value="${esc(d.distanceNote || '')}"></div>
      <div class="field"><label>${t('est_driving')}</label><input name="driveHours" value="${esc(d.driveHours || '')}"></div>
      <div class="field"><label>${t('start')}</label><input name="start" type="time" value="${esc(d.start || '06:00')}"></div>
      <div class="field"><label>${t('start_tz')}</label><select name="startTz">${tzOptions(d.startTz || 'America/Chicago')}</select></div>
      <div class="field"><label>${t('target_arrival')}</label><input name="arrive" type="time" value="${esc(d.arrive || '15:00')}"></div>
      <div class="field"><label>${t('arrive_tz')}</label><select name="arriveTz">${tzOptions(d.arriveTz || d.startTz || 'America/Chicago')}</select></div>
      <div class="field full"><label>${t('route')}</label><input name="route" value="${esc(d.route || '')}"></div>
      <div class="field full"><label>${t('route_via')}</label><input name="routeVia" value="${esc(d.routeVia || '')}" placeholder="Town A|Town B"></div>
      <div class="field"><label>${t('from_coords')}</label><input name="fromCoords" inputmode="decimal" placeholder="lat, lng" value="${num(d.fromLat) != null ? esc(d.fromLat + ', ' + d.fromLng) : ''}"></div>
      <div class="field"><label>${t('to_coords')}</label><input name="toCoords" inputmode="decimal" placeholder="lat, lng" value="${num(d.toLat) != null ? esc(d.toLat + ', ' + d.toLng) : ''}"></div>
      <div class="full small muted">${t('coords_help')}</div>
      <div class="field full"><label>${t('notes')}</label><textarea name="notes" rows="2">${esc(tx(d.notes))}</textarea></div>
      <div class="field full"><label>${t('tz_note')}</label><input name="tzNote" value="${esc(tx(d.tzNote))}"></div>
      <div class="field full"><label>${t('fuel_stops_lines')}</label><textarea name="fuelStops">${esc(lines(d.fuelStops || []))}</textarea></div>
      <div class="field full"><label>${t('fuel_search_lines')}</label><textarea name="fuelSearch">${esc((d.fuelSearch || []).join('\n'))}</textarea></div>
      <div class="field full"><label>${t('food_search_lines')}</label><textarea name="foodSearch">${esc((d.foodSearch || []).join('\n'))}</textarea></div>
      <div class="field full"><label>${t('overnight_search_lines')}</label><textarea name="overnightSearch">${esc((d.overnightSearch || []).join('\n'))}</textarea></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}
function budgetModal() {
  openModal(`<h2>📊 ${t('budget_vs_actual')}</h2><form data-form="budget"><div class="stack">
    ${CATS.map((c) => { const b = S.budget.find((x) => x.cat === c) || {}; return `
      <div class="form-grid"><div class="field"><label>${CAT_ICON[c]} ${t('cat_' + c)}</label><input name="amt_${c}" type="number" step="0.01" min="0" value="${esc(b.amount || 0)}"></div>
      <div class="field"><label>${t('currency')}</label><select name="cur_${c}">${curOptions(b.currency || 'USD')}</select></div>
      <div class="field full"><input name="note_${c}" value="${esc(tx(b.note))}" placeholder="${esc(t('note'))}"></div></div>`; }).join('')}
    </div><div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}
function overallModal() {
  openModal(`<h2>💵 ${t('trip_budget')}</h2><div class="small muted" style="margin-bottom:10px">${t('overall_explain', { sum: fmtUSD(S.budget.reduce((s, b) => s + budgetUSD(b), 0)) })}</div>
    <form data-form="overall"><div class="form-grid">
      <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" min="0" value="${S.budgetOverallUSD ? S.budgetOverallUSD.toFixed(2) : ''}"></div>
      <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions('USD')}</select></div></div>
    <div class="modal-actions"><button type="button" class="btn" data-act="useSumBudget">${t('use_sum')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}
function expectedModal(exp) {
  const e = exp || {};
  openModal(`<h2>${exp ? '✏️' : '＋'} ${t('expected_tolls')}</h2><form data-form="expected" data-id="${esc(e.id || '')}"><div class="form-grid">
    <div class="field full"><label>${t('caseta_name')}</label><input name="name" required value="${esc(e.name || '')}"></div>
    <div class="field"><label>${t('highway')}</label><input name="highway" value="${esc(e.highway || '')}"></div>
    <div class="field"><label>${t('kind')}</label><select name="kind">${['toll', 'bridge'].map((k) => `<option value="${k}" ${k === (e.kind || 'toll') ? 'selected' : ''}>${t('cat_' + k)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('est')}</label><input name="estAmount" type="number" step="0.01" min="0" value="${num(e.estAmount) != null ? esc(e.estAmount) : ''}"></div>
    <div class="field"><label>${t('currency')}</label><select name="currency">${curOptions(e.currency || 'MXN')}</select></div>
    <label class="check-row full"><input type="checkbox" name="optional" ${e.optional ? 'checked' : ''}> ${t('optional_if_used')}</label>
    <div class="field full"><label>${t('note')}</label><input name="note" value="${esc(tx(e.note))}"></div>
  </div><div class="modal-actions"><button type="button" class="btn" data-act="closeModal">${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
}

// ─── Real places from OpenStreetMap (Overpass API) ────────────────────────────
// Real, community-maintained data: names, brands, addresses, phone (when mapped).
// Results are cached on the phone so they work offline. Only town-center
// coordinates from the plan are sent, never the user's own location.
const OSM_CACHE_KEY = 'mexico-trip-osm';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CHAIN_RE = /fiesta (inn|americana)|city express|holiday inn|hampton|best western|la quinta|comfort (inn|suites)|courtyard|fairfield|one hotel|gamma|hilton|marriott|wyndham|days inn|super 8|motel 6|quality inn|sleep inn|microtel|camino real|pemex|oxxo|love'?s|pilot|flying j|travelcenters|\bta\b|petro|shell|chevron|exxon|valero|bp\b|g500|mobil|vips|sanborns|toks|denny|ihop|subway|mcdonald|carl'?s|burger king|wendy|starbucks|whataburger|cracker barrel|panda express|chick-fil-a|taco bell|domino|little caesars|kfc/i;
const OSM_KINDS = ['hotel', 'fuel', 'food'];
const stopKey = (s) => (+s.lat).toFixed(3) + ',' + (+s.lng).toFixed(3);
function osmCache() { try { return JSON.parse(localStorage.getItem(OSM_CACHE_KEY) || '{}') || {}; } catch (e) { return {}; } }
function osmStore(key, entry) {
  const c = osmCache(); c[key] = entry;
  try { localStorage.setItem(OSM_CACHE_KEY, JSON.stringify(c)); } catch (e) { toast(t('err_storage'), 'error'); }
}
function stopsFor(day) {
  if (Array.isArray(day.stops) && day.stops.length) return day.stops;
  return num(day.toLat) != null ? [{ name: day.to, lat: +day.toLat, lng: +day.toLng, r: 8000 }] : [];
}
function allStops() {
  const seen = new Map();
  S.days.forEach((d) => stopsFor(d).forEach((s) => { if (!seen.has(stopKey(s))) seen.set(stopKey(s), s); }));
  return Array.from(seen.values());
}
function overpassQuery(s) {
  const a = `(around:${Math.round(s.r || 8000)},${s.lat},${s.lng})`;
  return `[out:json][timeout:25];nwr${a}[tourism~"^(hotel|motel)$"];out center tags 80;nwr${a}[amenity=fuel];out center tags 80;nwr${a}[amenity~"^(restaurant|fast_food)$"][brand];out center tags 80;`;
}
function parseOsm(json, stop) {
  const seen = new Set();
  return (json.elements || []).map((el) => {
    const tg = el.tags || {};
    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lng = el.lon != null ? el.lon : el.center && el.center.lon;
    const name = tg.name || tg.brand;
    if (lat == null || lng == null || !name) return null;
    const id = el.type.charAt(0) + el.id;
    if (seen.has(id)) return null; seen.add(id);
    const kind = tg.amenity === 'fuel' ? 'fuel' : tg.tourism ? 'hotel' : 'food';
    const street = [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ');
    const addr = [street, tg['addr:city']].filter(Boolean).join(', ');
    return {
      id, kind, name, brand: tg.brand || '', lat: +(+lat).toFixed(6), lng: +(+lng).toFixed(6), addr,
      phone: tg.phone || tg['contact:phone'] || '', stars: tg.stars || '', parking: !!(tg.parking || tg['parking:fee']),
      chain: CHAIN_RE.test(name + ' ' + (tg.brand || '')), dist: haversineMi(stop, { lat: +lat, lng: +lng }),
    };
  }).filter(Boolean);
}
async function fetchOsm(stop) {
  for (const url of OVERPASS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 35000);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(overpassQuery(stop)), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('http ' + res.status);
      const items = parseOsm(await res.json(), stop);
      osmStore(stopKey(stop), { at: new Date().toISOString(), name: stop.name, items });
      return items;
    } catch (e) { /* try the next server */ }
  }
  throw new Error('overpass');
}
function osmModal() {
  const o = ui.osm; if (!o) return;
  const day = findDay(o.dayId); if (!day) return;
  const stops = stopsFor(day);
  if (!stops.length) { openModal(`<h2>🔎 ${t('osm_title')}</h2><div class="small">${t('osm_no_coords')}</div><div class="modal-actions"><button class="btn" data-act="closeModal">${t('close')}</button></div>`); return; }
  const stop = stops[clamp(o.stopIdx, 0, stops.length - 1)];
  const cached = osmCache()[stopKey(stop)];
  const items = cached ? cached.items.filter((x) => x.kind === o.kind)
    .sort((a, b) => (b.chain - a.chain) || (a.dist - b.dist)).slice(0, o.all ? 60 : 15) : [];
  const total = cached ? cached.items.filter((x) => x.kind === o.kind).length : 0;
  const icon = { hotel: '🏨', fuel: '⛽', food: '🍽️' };
  let body;
  if (o.loading) body = `<div class="muted" style="padding:16px 0">⏳ ${t('osm_loading', { name: esc(stop.name) })}</div>`;
  else if (!cached) body = `<div class="small muted" style="padding:10px 0">${navigator.onLine ? t('osm_not_loaded') : t('osm_offline_none')}</div>`;
  else if (!items.length) body = `<div class="small muted" style="padding:10px 0">${t('osm_none')}</div>`;
  else body = `<ul class="list">${items.map((x) => `
    <li class="entry"><div style="font-size:1.3rem">${icon[x.kind]}</div>
      <div class="grow"><b>${esc(x.name)}</b> ${x.chain ? `<span class="badge ok">${t('osm_chain')}</span>` : ''}
        ${x.parking ? `<span class="badge">🅿️ ${t('osm_parking')}</span>` : ''} ${x.stars ? `<span class="badge">${'★'.repeat(Math.min(5, parseInt(x.stars, 10) || 0))}</span>` : ''}
        <div class="sub">${fmtDist(x.dist)} ${t('osm_from', { name: esc(stop.name) })}${x.addr ? ' · ' + esc(x.addr) : ''}</div>
        ${x.phone ? `<a class="small" href="tel:${esc(x.phone.replace(/[^+\d]/g, ''))}">📞 ${esc(x.phone)}</a>` : ''}
        <div class="row" style="gap:6px;margin-top:6px">
          <a class="btn btn-sm" href="${esc(mapsSearch(x.name + ', ' + (x.addr || stop.name)))}" target="_blank" rel="noopener">🗺️ Maps</a>
          <button class="btn btn-sm" data-act="osmSavePlace" data-id="${esc(x.id)}">📌 ${t('save')}</button>
        </div></div></li>`).join('')}</ul>
    ${total > items.length ? `<button class="btn btn-sm btn-block" data-act="osmAll">${t('osm_show_all', { n: total })}</button>` : ''}`;
  openModal(`<h2>🔎 ${t('osm_title')}</h2>
    <div class="label" style="margin-bottom:6px">${t('osm_town')}</div>
    <div class="chips" style="margin-bottom:10px">${stops.map((s, i) => `<button class="fchip ${i === o.stopIdx ? 'on' : ''}" data-act="osmStop" data-i="${i}">${esc(s.name)}</button>`).join('')}</div>
    ${seg('osmKind', OSM_KINDS.map((k) => [k, icon[k] + ' ' + t('osm_kind_' + k)]), o.kind)}
    <div class="row between small muted" style="margin:8px 0">
      <span>${cached ? t('osm_saved_at', { date: fmtDateTime(cached.at) }) : ''}</span>
      <button class="btn btn-sm" data-act="osmRefresh" ${navigator.onLine && !o.loading ? '' : 'disabled'}>🔄 ${cached ? t('osm_refresh') : t('osm_load')}</button>
    </div>
    ${o.kind === 'hotel' ? `<div class="small hint" style="margin-bottom:6px">${t('osm_hotel_tip')}</div>` : ''}
    ${body}
    <div class="small muted" style="margin-top:10px">${t('osm_attrib')}</div>
    <div class="modal-actions"><button class="btn" data-act="closeModal">${t('close')}</button></div>`);
}
async function osmLoad() {
  const o = ui.osm; const day = findDay(o.dayId); const stop = stopsFor(day)[o.stopIdx];
  if (!stop) return;
  o.loading = true; osmModal();
  try { await fetchOsm(stop); } catch (e) { toast(t('osm_failed'), 'error'); }
  o.loading = false;
  if (ui.osm === o && $('#modal').classList.contains('open')) osmModal();
}

// ─── Actions (click delegation) ───────────────────────────────────────────────
const findDay = (id) => S.days.find((d) => d.id === id);
const findDayIndex = (day) => S.days.indexOf(day);
const actions = {
  closeModal,
  osmOpen(ds) {
    const day = findDay(ds.day);
    ui.osm = { dayId: ds.day, stopIdx: Math.max(0, stopsFor(day).length - 1), kind: 'hotel', all: false, loading: false };
    osmModal();
    const stop = stopsFor(day)[ui.osm.stopIdx];
    if (stop && !osmCache()[stopKey(stop)] && navigator.onLine) osmLoad();
  },
  osmStop(ds) {
    ui.osm.stopIdx = +ds.i; ui.osm.all = false; osmModal();
    const stop = stopsFor(findDay(ui.osm.dayId))[ui.osm.stopIdx];
    if (stop && !osmCache()[stopKey(stop)] && navigator.onLine) osmLoad();
  },
  osmAll() { ui.osm.all = true; osmModal(); },
  osmRefresh() { osmLoad(); },
  osmSavePlace(ds) {
    const day = findDay(ui.osm.dayId), stop = stopsFor(day)[ui.osm.stopIdx];
    const x = ((osmCache()[stopKey(stop)] || {}).items || []).find((i) => i.id === ds.id);
    if (!x) return;
    if (day.places.some((p) => p.osmId === x.id)) { toast(t('osm_already')); return; }
    day.places.push({ id: uid(), osmId: x.id, name: x.name, type: x.kind, notes: [x.addr, x.phone].filter(Boolean).join(' · '), url: mapsSearch(x.name + ', ' + (x.addr || stop.name)) });
    save(); toast(t('osm_saved_place', { n: findDayIndex(day) + 1 }));
  },
  async osmBulk(ds, el) {
    const stops = allStops();
    el.disabled = true;
    let ok = 0, fail = 0;
    for (let i = 0; i < stops.length; i++) {
      const prog = $('#osm-progress');
      if (prog) prog.textContent = t('osm_bulk_progress', { i: i + 1, n: stops.length, name: stops[i].name });
      try { await fetchOsm(stops[i]); ok++; } catch (e) { fail++; }
      await new Promise((r) => setTimeout(r, 1200)); // be gentle with the free public servers
    }
    toast(t('osm_bulk_done', { ok, fail }), fail ? 'error' : 'ok');
    if (ui.view === 'more') render();
  },
  toggleLang() { S.settings.lang = lang() === 'es' ? 'en' : 'es'; save(); render(); },
  toggleTheme() { S.settings.theme = S.settings.theme === 'sun' ? 'dark' : 'sun'; save(); render(); },
  openRate: rateModal,
  async refreshRate() { const ok = await fetchRate(true); if (ok) { closeModal(); render(); } },
  clearManualRate() { S.settings.manualRate = null; save(); closeModal(); render(); toast(t('rate_using_live')); },
  seg(ds) {
    const v = ds.val;
    if (ds.name === 'osmKind') { ui.osm.kind = v; ui.osm.all = false; osmModal(); return; }
    if (ds.name === 'status') { S.days[ui.dayIdx].status = v; save(); }
    else if (ds.name === 'moreTab') ui.moreTab = v;
    else if (ds.name === 'lang' || ds.name === 'units' || ds.name === 'theme') { S.settings[ds.name] = v; save(); }
    render();
  },
  dayNav(ds) { ui.dayIdx = clamp(ui.dayIdx + +ds.dir, 0, S.days.length - 1); render(); },
  checkin: checkinModal,
  share: shareModal,
  logOdo: odoModal,
  async shareVia(ds) {
    const text = $('#share-text').value;
    if (ds.via === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    else if (ds.via === 'sms') window.location.href = 'sms:?body=' + encodeURIComponent(text);
    else if (ds.via === 'native') { try { await navigator.share({ text }); } catch (e) { /* cancelled */ } }
    else if (ds.via === 'copy') { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) { $('#share-text').select(); } }
  },
  delCheckin(ds) { if (!confirm(t('confirm_delete'))) return; const d = findDay(ds.day); d.checkins = d.checkins.filter((c) => c.id !== ds.id); save(); render(); },
  toggleNote(ds) { const n = findDay(ds.day).tomorrowNotes.find((x) => x.id === ds.id); n.done = !n.done; save(); render(); },
  delNote(ds) { const d = findDay(ds.day); d.tomorrowNotes = d.tomorrowNotes.filter((x) => x.id !== ds.id); save(); render(); },
  addPlace(ds) { placeModal(ds.day); },
  delPlace(ds) { if (!confirm(t('confirm_delete'))) return; const d = findDay(ds.day); d.places = d.places.filter((x) => x.id !== ds.id); save(); render(); },
  editDay(ds) { dayModal(findDay(ds.day)); },
  addDay() { dayModal(null); },
  delDay(ds) {
    const d = findDay(ds.day);
    if (!confirm(t('confirm_delete_day', { route: d.from + ' → ' + d.to }))) return;
    S.days = S.days.filter((x) => x.id !== ds.day); ui.dayIdx = null; save(); render();
  },
  moveDay(ds) {
    const i = S.days.findIndex((x) => x.id === ds.day), j = i + +ds.dir;
    if (j < 0 || j >= S.days.length) return;
    [S.days[i], S.days[j]] = [S.days[j], S.days[i]]; save(); render();
  },
  spendFilter(ds) { ui.spendFilter = ds.val; render(); },
  editOverall: overallModal,
  useSumBudget() { S.budgetOverallUSD = 0; save(); closeModal(); render(); },
  editBudget: budgetModal,
  editEntry(ds) {
    if (ds.src === 'expense') { const e = S.expenses.find((x) => String(x.id) === ds.id); openModal(`<h2>✏️ ${t('edit_expense')}</h2>` + expenseForm(e)); }
    else if (ds.src === 'toll') openModal(tollEditForm(S.tolls.find((x) => x.id === ds.id)));
    else if (ds.src === 'fuel') openModal(`<h2>✏️ ${t('edit_fuel')}</h2>` + fuelForm(S.fuel.find((x) => x.id === ds.id)));
  },
  delEntry(ds) {
    if (!confirm(t('confirm_delete'))) return;
    const key = { expense: 'expenses', toll: 'tolls', fuel: 'fuel' }[ds.src];
    S[key] = S[key].filter((x) => String(x.id) !== ds.id); save(); render(); toast(t('deleted'));
  },
  clearExpenses() {
    if (!confirm(t('confirm_clear_expenses', { n: S.expenses.length }))) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(S));
    S.expenses = []; save(); render(); toast(t('cleared_backup'));
  },
  logExpected(ds) {
    const e = S.expectedTolls.find((x) => x.id === ds.id);
    ui.tollPrefill = { name: e.matchHighway ? '' : e.name, highway: e.highway, amount: num(e.estAmount), currency: e.currency, payment: e.kind === 'bridge' ? 'cash' : 'cash', expectedId: e.id };
    render();
    const card = $('#toll-form-card'); if (card) { card.scrollIntoView({ behavior: 'smooth' }); const f = card.querySelector(e.matchHighway ? '[name=name]' : '[name=amount]'); if (f) f.focus(); }
  },
  skipExpected(ds) { const e = S.expectedTolls.find((x) => x.id === ds.id); e.skipped = !e.skipped; save(); render(); },
  editExpected(ds) { expectedModal(ds.id ? S.expectedTolls.find((x) => x.id === ds.id) : null); },
  delExpected(ds) { if (!confirm(t('confirm_delete'))) return; S.expectedTolls = S.expectedTolls.filter((x) => x.id !== ds.id); save(); render(); },
  toggleDoc(ds) { const d = S.docs.find((x) => x.id === ds.id); d.done = !d.done; save(); render(); },
  delDoc(ds) { if (!confirm(t('confirm_delete'))) return; S.docs = S.docs.filter((x) => x.id !== ds.id); save(); render(); },
  async enableNotify() {
    if (!('Notification' in window)) { toast(t('notify_unsupported'), 'error'); return; }
    if (S.settings.notify) { S.settings.notify = false; save(); render(); return; }
    const p = await Notification.requestPermission();
    S.settings.notify = p === 'granted'; save(); render();
    toast(p === 'granted' ? t('notify_on') : t('notify_blocked'), p === 'granted' ? 'ok' : 'error');
  },
  async install() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); },
  exportJson() {
    download('mexico-trip-planner-' + localDateStr() + '.json', JSON.stringify({ app: 'mexico-trip-planner', exportedAt: new Date().toISOString(), data: S }, null, 2), 'application/json');
  },
  exportCsv(ds) { exportCsv(ds.kind); },
  restoreBackup() {
    if (!confirm(t('confirm_restore'))) return;
    const cur = JSON.stringify(S);
    try { S = upgrade(JSON.parse(localStorage.getItem(BACKUP_KEY))); localStorage.setItem(BACKUP_KEY, cur); save(); render(); toast(t('restored')); } catch (e) { toast(t('import_failed'), 'error'); }
  },
};

// ─── Form submissions ─────────────────────────────────────────────────────────
const fd = (form) => Object.fromEntries(new FormData(form).entries());
function parseCoords(s) {
  const m = /(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/.exec(s || '');
  return m ? [+m[1], +m[2]] : [null, null];
}
/** Keep bilingual seed values unless the user actually changed the text. */
function keepOrText(orig, val) { return tx(orig) === val ? orig : val; }
function keepLines(origArr, val) {
  const newLines = val.split('\n').map((s) => s.trim()).filter(Boolean);
  return newLines.map((l) => { const o = (origArr || []).find((x) => tx(x) === l); return o != null ? o : l; });
}
const forms = {
  async expense(form) {
    const v = fd(form), id = form.dataset.id;
    const amount = num(v.amount);
    if (!amount || amount <= 0) return toast(t('err_amount'), 'error');
    const ts = v.ts || localDateTimeInput();
    const rec = Object.assign({ category: v.category, payment: v.payment, note: v.note.trim(), ts, date: ts.slice(0, 10) }, money(amount, v.currency));
    if (id) {
      const e = S.expenses.find((x) => String(x.id) === id);
      const keepRate = e.amount === amount && e.currency === v.currency;
      Object.assign(e, rec, keepRate ? { rateAtEntry: e.rateAtEntry, usd: e.usd, mxn: e.mxn } : {});
      closeModal();
    } else S.expenses.push(Object.assign({ id: uid() }, rec));
    save(); render(); toast(id ? t('saved') : t('expense_added'));
  },
  async toll(form) {
    const v = fd(form), id = form.dataset.id;
    const amount = num(v.amount);
    if (!amount || amount <= 0) return toast(t('err_amount'), 'error');
    const ts = v.ts || localDateTimeInput();
    const name = v.name.trim();
    const expectedId = v.expectedId || null;
    const probe = { name, highway: v.highway.trim(), date: ts.slice(0, 10), expectedId };
    const exp = S.expectedTolls.find((e) => tollMatches(e, probe));
    const kind = (exp && exp.kind) || (/puente|bridge/i.test(name + ' ' + v.highway) ? 'bridge' : 'toll');
    const rec = Object.assign({ name, highway: v.highway.trim(), payment: v.payment, ts, date: ts.slice(0, 10), expectedId, kind }, money(amount, v.currency));
    if (id) {
      const x = S.tolls.find((e) => e.id === id);
      const keepRate = x.amount === amount && x.currency === v.currency;
      Object.assign(x, rec, keepRate ? { rateAtEntry: x.rateAtEntry, usd: x.usd, mxn: x.mxn } : {});
      closeModal(); save(); render(); toast(t('saved')); return;
    }
    const entry = Object.assign({ id: uid(), lat: null, lng: null }, rec);
    S.tolls.push(entry); ui.tollPrefill = null; save(); render(); toast(t('toll_added'));
    if (v.gps) {
      const pos = await getPosition(8000);
      if (pos) { entry.lat = pos.lat; entry.lng = pos.lng; save(); if (ui.view === 'tolls') render(); }
    }
  },
  async fuel(form) {
    const v = fd(form), id = form.dataset.id;
    const qty = num(v.qty), price = num(v.price);
    if (!qty || !price) return toast(t('err_amount'), 'error');
    const ts = v.ts || localDateTimeInput();
    const amount = Math.round(qty * price * 100) / 100;
    const rec = Object.assign({ location: v.location.trim(), qty, unit: v.unit, price, odometer: num(v.odometer), odoUnit: v.odoUnit || distUnit(), full: !!v.full, payment: v.payment, ts, date: ts.slice(0, 10) }, money(amount, v.currency));
    if (id) {
      const f = S.fuel.find((x) => x.id === id);
      const keepRate = f.amount === amount && f.currency === v.currency;
      Object.assign(f, rec, keepRate ? { rateAtEntry: f.rateAtEntry, usd: f.usd, mxn: f.mxn } : {});
      closeModal();
    } else S.fuel.push(Object.assign({ id: uid() }, rec));
    save(); render(); toast(id ? t('saved') : t('fuel_added', { cost: fmtCur(amount, v.currency) }));
  },
  async checkin(form) {
    const v = fd(form);
    const day = S.days[ui.dayIdx];
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = v.gps ? t('getting_location') : t('save');
    const pos = v.gps ? await getPosition(12000) : null;
    day.checkins.push({ id: uid(), ts: new Date().toISOString(), lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, acc: pos ? pos.acc : null, odometer: num(v.odometer), odoUnit: distUnit(), note: v.note.trim(), status: v.status });
    day.status = v.status;
    save(); closeModal(); render();
    toast(v.gps && !pos ? t('checkin_no_gps') : t('checkin_saved'), v.gps && !pos ? 'error' : 'ok');
  },
  odo(form) {
    const v = num(fd(form).value); if (v == null) return;
    S.odometer.push({ id: uid(), ts: new Date().toISOString(), value: v, unit: distUnit() }); save(); closeModal(); render(); toast(t('saved'));
  },
  addNote(form) {
    const text = fd(form).text.trim(); if (!text) return;
    findDay(form.dataset.day).tomorrowNotes.push({ id: uid(), text, done: false }); save(); render();
  },
  addDoc(form) { const text = fd(form).text.trim(); if (!text) return; S.docs.push({ id: uid(), text, done: false }); save(); render(); },
  place(form) {
    const v = fd(form);
    findDay(form.dataset.day).places.push({ id: uid(), name: v.name.trim(), type: v.type, notes: v.notes.trim(), url: v.url.trim() });
    save(); closeModal(); render(); toast(t('saved'));
  },
  day(form) {
    const v = fd(form), id = form.dataset.day;
    const day = id ? findDay(id) : { id: uid(), status: 'not_started', checkins: [], places: [], tomorrowNotes: [], fuelStops: [], fuelSearch: [], foodSearch: [], overnightSearch: [] };
    const [fla, flo] = parseCoords(v.fromCoords), [tla, tlo] = parseCoords(v.toCoords);
    Object.assign(day, {
      date: v.date, country: v.country, from: v.from.trim(), to: v.to.trim(),
      distanceMi: num(v.distance) != null ? displayToMi(num(v.distance)) : null, distanceNote: v.distanceNote.trim(),
      driveHours: v.driveHours.trim(), start: v.start, arrive: v.arrive, startTz: v.startTz, arriveTz: v.arriveTz,
      route: v.route.trim(), routeVia: v.routeVia.trim(), fromLat: fla, fromLng: flo, toLat: tla, toLng: tlo,
      notes: keepOrText(day.notes, v.notes.trim()), tzNote: keepOrText(day.tzNote, v.tzNote.trim()),
      fuelStops: keepLines(day.fuelStops, v.fuelStops),
      fuelSearch: v.fuelSearch.split('\n').map((s) => s.trim()).filter(Boolean),
      foodSearch: v.foodSearch.split('\n').map((s) => s.trim()).filter(Boolean),
      overnightSearch: v.overnightSearch.split('\n').map((s) => s.trim()).filter(Boolean),
    });
    if (!id) S.days.push(day);
    S.days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    ui.openDays[day.id] = true;
    save(); closeModal(); render(); toast(t('saved'));
  },
  budget(form) {
    const v = fd(form);
    CATS.forEach((c) => {
      let b = S.budget.find((x) => x.cat === c); if (!b) { b = { cat: c }; S.budget.push(b); }
      b.amount = num(v['amt_' + c]) || 0; b.currency = v['cur_' + c]; b.note = keepOrText(b.note, v['note_' + c].trim());
    });
    save(); closeModal(); render(); toast(t('saved'));
  },
  overall(form) {
    const v = fd(form); const a = num(v.amount) || 0;
    S.budgetOverallUSD = toUSD(a, v.currency); save(); closeModal(); render(); toast(t('saved'));
  },
  expected(form) {
    const v = fd(form), id = form.dataset.id;
    const e = id ? S.expectedTolls.find((x) => x.id === id) : { id: uid(), skipped: false };
    Object.assign(e, { name: v.name.trim(), highway: v.highway.trim(), kind: v.kind, estAmount: num(v.estAmount), currency: v.currency, optional: !!v.optional, note: keepOrText(e.note, v.note.trim()) });
    if (!id) S.expectedTolls.push(e);
    save(); closeModal(); render();
  },
  settings(form) {
    const v = fd(form);
    S.settings.travelerName = v.travelerName.trim();
    S.settings.tankGal = num(v.tankGal) || 19.4; S.settings.mpg = num(v.mpg) || 23; S.settings.usWarnMi = num(v.usWarnMi) || 300;
    save(); render(); toast(t('saved'));
  },
  rate(form) {
    const r = num(fd(form).manualRate);
    if (r != null && r <= 0) return toast(t('err_amount'), 'error');
    S.settings.manualRate = r || null; save(); closeModal(); render(); toast(t('saved'));
  },
};

// ─── Export / import ──────────────────────────────────────────────────────────
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function csvCell(v) { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCsv(header, rows) { return '﻿' + [header].concat(rows).map((r) => r.map(csvCell).join(',')).join('\r\n'); }
function exportCsv(kind) {
  const r2 = (n) => (n == null ? '' : Math.round(n * 100) / 100);
  let csv;
  if (kind === 'expenses') {
    csv = toCsv(['date', 'time', 'day', 'category', 'amount', 'currency', 'payment', 'note', 'usd', 'mxn', 'rate_at_entry', 'original_category'],
      S.expenses.slice().sort((a, b) => a.ts.localeCompare(b.ts)).map((e) => [e.date, (e.ts || '').slice(11, 16), dayLabelForDate(e.date), e.category, e.amount, e.currency, e.payment, e.note, r2(e.usd), r2(e.mxn), e.rateAtEntry, e.legacyCategory || '']));
  } else if (kind === 'tolls') {
    csv = toCsv(['date', 'time', 'day', 'name', 'highway', 'kind', 'amount', 'currency', 'payment', 'usd', 'mxn', 'rate_at_entry', 'lat', 'lng'],
      S.tolls.slice().sort((a, b) => a.ts.localeCompare(b.ts)).map((x) => [x.date, x.ts.slice(11, 16), dayLabelForDate(x.date), x.name, x.highway, x.kind, x.amount, x.currency, x.payment, r2(x.usd), r2(x.mxn), x.rateAtEntry, x.lat, x.lng]));
  } else {
    const st = fuelStats();
    csv = toCsv(['date', 'time', 'day', 'location', 'quantity', 'unit', 'price_per_unit', 'currency', 'cost', 'odometer', 'odometer_unit', 'full', 'payment', 'usd', 'mxn', 'mpg', 'km_per_l'],
      S.fuel.slice().sort((a, b) => a.ts.localeCompare(b.ts)).map((f) => { const iv = st.intervals[f.id]; return [f.date, f.ts.slice(11, 16), dayLabelForDate(f.date), f.location, f.qty, f.unit, f.price, f.currency, f.amount, f.odometer, f.odoUnit, f.full ? 'yes' : 'no', f.payment, r2(f.usd), r2(f.mxn), iv ? iv.mpg.toFixed(2) : '', iv ? (iv.mpg * KM_PER_MI / L_PER_GAL).toFixed(2) : '']; }));
  }
  download('mexico-trip-' + kind + '-' + localDateStr() + '.csv', csv, 'text/csv;charset=utf-8');
}
function importFile(input) {
  const file = input.files && input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      // Original tracker export/raw data: merge its expenses instead of replacing everything.
      if (parsed && !parsed.schema && !parsed.data && Array.isArray(parsed.expenses) && 'budgetUSD' in parsed) {
        const n = migrateLegacyInto(S, parsed); save(); render(); toast(t('legacy_imported', { n })); return;
      }
      const data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || !Array.isArray(data.days)) throw new Error('invalid');
      if (!confirm(t('confirm_import'))) return;
      localStorage.setItem(BACKUP_KEY, JSON.stringify(S));
      S = upgrade(data); runSeedUpdates(); save(); ui.dayIdx = null; render(); toast(t('import_ok'));
    } catch (e) { toast(t('import_failed'), 'error'); }
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── Notifications for tomorrow notes ─────────────────────────────────────────
async function checkTomorrowNotify() {
  if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  for (const d of dueTomorrowDays()) {
    if (S.notified[d.id] === d.date) continue;
    const pending = d.tomorrowNotes.filter((n) => !n.done);
    if (!pending.length) continue;
    const title = t('banner_title', { n: S.days.indexOf(d) + 1, date: fmtDate(d.date) });
    const body = pending.slice(0, 4).map((n) => '• ' + tx(n.text)).join('\n');
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) await reg.showNotification(title, { body, tag: 'tomorrow-' + d.id, icon: 'icons/icon-192.png' });
      else new Notification(title, { body });
      S.notified[d.id] = d.date; save();
    } catch (e) { /* ignore */ }
  }
}

// ─── Event wiring ─────────────────────────────────────────────────────────────
document.addEventListener('click', (ev) => {
  const nav = ev.target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav); return; }
  const navGo = ev.target.closest('[data-nav-go]');
  if (navGo) { closeModal(); go(navGo.dataset.navGo); return; }
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) { if (el.tagName !== 'INPUT') ev.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('submit', (ev) => {
  const form = ev.target.closest('[data-form]');
  if (!form) return;
  ev.preventDefault();
  const fn = forms[form.dataset.form];
  if (fn) fn(form);
});
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.change === 'importFile') importFile(el);
  else if (el.dataset.change === 'expCat') {
    const form = el.closest('form');
    const redirect = ['fuel', 'toll', 'bridge'].includes(el.value) && !form.dataset.id;
    form.querySelector('[data-redirect]').classList.toggle('hidden', !redirect);
    form.querySelector('[type=submit]').disabled = redirect;
  } else if (el.dataset.change === 'tollName') {
    const exp = S.expectedTolls.find((e) => e.name.trim().toLowerCase() === el.value.trim().toLowerCase());
    const form = el.closest('form');
    if (exp) {
      if (!form.highway.value) form.highway.value = exp.highway || '';
      if (!form.amount.value && num(exp.estAmount) != null) form.amount.value = exp.estAmount;
      form.currency.value = exp.currency || 'MXN';
    }
  }
});
document.addEventListener('input', (ev) => {
  if (ev.target.dataset.input === 'spendSearch') {
    ui.spendSearch = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const el = document.querySelector('[data-input="spendSearch"]');
    if (el) { el.focus(); el.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('toggle', (ev) => {
  const d = ev.target.closest && ev.target.closest('[data-day-card]');
  if (d && ev.target === d) ui.openDays[d.dataset.dayCard] = d.open;
}, true);
$('#modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });
window.addEventListener('online', () => { renderHeader(); maybeFetchRate(); });
window.addEventListener('offline', renderHeader);
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (ui.view === 'more') render(); });
window.addEventListener('storage', (e) => { if (e.key === STORE_KEY && e.newValue) { try { S = upgrade(JSON.parse(e.newValue)); render(); } catch (x) { /* ignore */ } } });

// ─── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  load();
  render();
  if (ui.notice) { toast(ui.notice); ui.notice = null; }
  maybeFetchRate();
  checkTomorrowNotify();
  setInterval(() => {
    checkTomorrowNotify();
    const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (ui.view === 'today' && !typing && !$('#modal').classList.contains('open')) render();
  }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // When an updated version takes over, reload once so it shows on the first open.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}
boot();
