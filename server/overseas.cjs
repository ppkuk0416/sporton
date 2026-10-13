'use strict';
const C = require('../sports-core.js');
const rawCache = new Map(), rawPending = new Map(), feedCache = new Map();
async function raw(league, date, fetcher = fetch) {
    const key = league.id + ':' + date;
    const old = rawCache.get(key);
    if (old && Date.now() - old.at < 4000) return old.value;
    if (rawPending.has(key)) return rawPending.get(key);
    const task = (async () => {
        const url = 'https://site.api.espn.com/apis/site/v2/sports/' + league.path + '/scoreboard?dates=' + date.replaceAll('-', '') + '&limit=100';
        const res = await fetcher(url, { signal: AbortSignal.timeout(9000), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('ESPN HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data.events)) throw new Error('Invalid ESPN response');
        const value={data,fetchedAt:new Date().toISOString()};
        rawCache.set(key, { at: Date.now(), value });
        if (rawCache.size > 256) rawCache.delete(rawCache.keys().next().value);
        return value;
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
    good.forEach(r => r.value.data.events.forEach(ev => events.set(ev.id, ev)));
    const matches = C.normalizeESPN({ events: [...events.values()] }, league).filter(m => m.rawDate === date);
    const feed = { leagueId, name: league.name, state: good.length === 2 ? 'ok' : 'stale', matches, fetchedAt: new Date(Math.min(...good.map(r=>Date.parse(r.value.fetchedAt)))).toISOString() };
    if (good.length === 2) {
        feedCache.set(key, feed);
        if (feedCache.size > 128) feedCache.delete(feedCache.keys().next().value);
    }
    return feed;
}

// A bulk query has one deadline shared by every league, not one timeout per batch.
async function collectLeagues(leagueIds, date, options = {}) {
    const fetcher = options.fetcher || fetch;
    const budget = AbortSignal.timeout(options.budgetMs || 6000);
    const results = new Array(leagueIds.length);
    let next = 0;
    const unavailable = id => {
        const old = feedCache.get(id + ':' + date);
        return old ? {...old, state:'stale'} : {leagueId:id,name:C.LEAGUES.find(l=>l.id===id)?.name,state:'error',matches:[],fetchedAt:null};
    };
    await Promise.all(Array.from({length:Math.min(options.concurrency || 2, leagueIds.length)}, async () => {
        while (next < leagueIds.length) {
            const i = next++, id = leagueIds[i];
            if (budget.aborted) { results[i] = unavailable(id); continue; }
            let onAbort;
            const expired = new Promise(resolve => { onAbort = () => resolve(unavailable(id)); budget.addEventListener('abort',onAbort,{once:true}); });
            const boundedFetch = (url, init = {}) => fetcher(url,{...init,signal:AbortSignal.any([budget,init.signal].filter(Boolean))});
            try { results[i] = await Promise.race([collectLeague(id,date,boundedFetch),expired]); }
            catch { results[i] = unavailable(id); }
            finally { budget.removeEventListener('abort',onAbort); }
        }
    }));
    return results;
}

module.exports = { collectLeague, collectLeagues };
