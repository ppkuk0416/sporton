'use strict';
const C = require('../sports-core.js');
const rawCache = new Map(), rawPending = new Map(), feedCache = new Map();
async function raw(league, date, fetcher = fetch) {
    const key = league.id + ':' + date;
    const old = rawCache.get(key);
    if (old && Date.now() - old.at < 4000) return old.data;
    if (rawPending.has(key)) return rawPending.get(key);
    const task = (async () => {
        const url = 'https://site.api.espn.com/apis/site/v2/sports/' + league.path + '/scoreboard?dates=' + date.replaceAll('-', '') + '&limit=100';
        const res = await fetcher(url, { signal: AbortSignal.timeout(9000), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('ESPN HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data.events)) throw new Error('Invalid ESPN response');
        rawCache.set(key, { at: Date.now(), data });
        if (rawCache.size > 256) rawCache.delete(rawCache.keys().next().value);
        return data;
    })().finally(() => rawPending.delete(key));
    rawPending.set(key, task);
    return task;
}
async function collectLeague(leagueId, date, fetcher = fetch) {
    const league = C.LEAGUES.find(l => l.id === leagueId && l.region === 'world');
    if (!league || !C.validDate(date)) throw new Error('Invalid ESPN league/date');
    const key = leagueId + ':' + date;
    const old = feedCache.get(key);
    const results = await Promise.allSettled([C.shiftDate(date, -1), date].map(day => raw(league, day, fetcher)));
    const good = results.filter(r => r.status === 'fulfilled');
    if (!good.length) {
        if (old) return { ...old, state: 'stale' };
        return { leagueId, name: league.name, state: 'error', matches: [], fetchedAt: new Date().toISOString() };
    }
    const events = new Map();
    good.forEach(r => r.value.events.forEach(ev => events.set(ev.id, ev)));
    const matches = C.normalizeESPN({ events: [...events.values()] }, league).filter(m => m.rawDate === date);
    const feed = { leagueId, name: league.name, state: good.length === 2 ? 'ok' : 'stale', matches, fetchedAt: new Date().toISOString() };
    if (good.length === 2) {
        feedCache.set(key, feed);
        if (feedCache.size > 128) feedCache.delete(feedCache.keys().next().value);
    }
    return feed;
}
module.exports = { collectLeague };
