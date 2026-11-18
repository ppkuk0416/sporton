'use strict';
// 1X2 and totals odds from The Odds API (https://the-odds-api.com), matched to SPORTON's ESPN fixtures.
// Disabled unless ODDS_API_KEY is set; the key never leaves the server.
const C = require('../sports-core.js');
const O = require('../odds-core.js');
const { collectLeague } = require('./overseas.cjs');

const cache = new Map(), pending = new Map(), movement = new Map();
function settings(env = process.env) {
    const bookmakers = String(env.ODDS_BOOKMAKERS || O.DEFAULT_BOOKMAKERS.join(',')).split(',').map(s => s.trim()).filter(s => /^[a-z0-9_]{2,40}$/.test(s)).slice(0, 10);
    const ttl = Number.parseInt(env.ODDS_CACHE_SECONDS || '600', 10);
    return { key: String(env.ODDS_API_KEY || '').trim(), bookmakers: bookmakers.length ? bookmakers : O.DEFAULT_BOOKMAKERS, ttlMs: Math.max(60, Number.isFinite(ttl) ? ttl : 600) * 1000 };
}
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
function oddsUrl(sportKey, date, config) {
    const start = Date.parse(date + 'T00:00:00+09:00');
    const url = new URL('https://api.the-odds-api.com/v4/sports/' + sportKey + '/odds');
    url.search = new URLSearchParams({ apiKey: config.key, bookmakers: config.bookmakers.join(','), markets: 'h2h,totals', oddsFormat: 'decimal', dateFormat: 'iso',
        commenceTimeFrom: iso(start - 3 * 3600000), commenceTimeTo: iso(start + 27 * 3600000) }).toString();
    return url;
}
async function leagueOdds(leagueId, date, config, fetcher) {
    const fixtures = (await collectLeague(leagueId, date, fetcher)).matches.filter(O.applies);
    if (!fixtures.length) return { leagueId, events: {}, matched: 0, fixtures: 0 };
    const res = await fetcher(oddsUrl(O.SPORT_KEYS[leagueId], date, config), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('odds upstream ' + res.status);
    const events = O.normalizeTheOddsApi(await res.json(), config.bookmakers);
    const out = {};
    for (const match of fixtures) {
        const event = O.findEvent(match, events);
        if (!event || !event.books.length) continue;
        out[match.id] = { leagueId, books: O.track(movement, leagueId + ':' + match.id, event.books) };
    }
    return { leagueId, events: out, matched: Object.keys(out).length, fixtures: fixtures.length };
}
async function getOdds(date, options = {}) {
    if (!C.validDate(date)) throw new Error('Invalid date');
    const config = settings(options.env), fetcher = options.fetcher || fetch;
    const base = { version: 1, source: 'The Odds API', date, bookmakers: config.bookmakers.map(key => ({ key, name: O.bookName(key) })) };
    if (!config.key) return { ...base, state: 'unconfigured', fetchedAt: null, events: {} };
    const cached = cache.get(date);
    if (cached && Date.now() - cached.at < config.ttlMs) return cached.value;
    if (pending.has(date)) return pending.get(date);
    const task = (async () => {
        const results = await Promise.allSettled(Object.keys(O.SPORT_KEYS).map(id => leagueOdds(id, date, config, fetcher)));
        const good = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (!good.length) {
            // Keep the last good board for an outage instead of blanking every price.
            if (cached) return { ...cached.value, state: 'stale' };
            return { ...base, state: 'error', fetchedAt: null, events: {} };
        }
        const value = { ...base, state: good.length === results.length ? 'ok' : 'partial', fetchedAt: new Date().toISOString(), events: Object.assign({}, ...good.map(r => r.events)),
            coverage: { fixtures: good.reduce((n, r) => n + r.fixtures, 0), matched: good.reduce((n, r) => n + r.matched, 0), failedLeagues: results.length - good.length } };
        cache.set(date, { at: Date.now(), value });
        if (cache.size > 16) cache.delete(cache.keys().next().value);
        return value;
    })().finally(() => pending.delete(date));
    pending.set(date, task);
    return task;
}
module.exports = { getOdds, oddsUrl, settings, _reset: () => { cache.clear(); pending.clear(); movement.clear(); } };
