'use strict';
const core = require('../sports-core.js');
const domestic = core.LEAGUES.filter(l => l.source === 'naver');
const inflight = new Map();
const cache = new Map();
function sourceUrl(league, from, to) {
    const url = new URL('https://api-gw.sports.naver.com/schedule/games');
    url.search = new URLSearchParams({ fields: 'basic', sectionId: league.section, categoryId: league.id, fromDate: from, toDate: to, size: '100' }).toString();
    return url;
}
async function collect(from, to, fetcher = fetch) {
    if (!core.validDate(from) || !core.validDate(to) || to < from || (Date.parse(to) - Date.parse(from)) > 7 * 86400000) throw new Error('Invalid date range (max 8 days)');
    const feeds = await Promise.all(domestic.map(async league => {
        const fetchedAt = new Date().toISOString();
        try {
            const res = await fetcher(sourceUrl(league, from, to), {
                headers: { Accept: 'application/json', Referer: 'https://m.sports.naver.com/' },
                signal: AbortSignal.timeout(9000)
            });
            if (!res.ok) throw new Error('upstream ' + res.status);
            const data = await res.json();
            const matches = core.normalizeNaver(data, league);
            if (Number(data.result.gameTotalCount) > data.result.games.length) throw new Error('응답 경기 수 제한 초과');
            return { leagueId: league.id, name: league.name, state: 'ok', fetchedAt, matches };
        } catch (error) {
            return { leagueId: league.id, name: league.name, state: 'error', fetchedAt, matches: [], error: '데이터 공급 연결 실패' };
        }
    }));
    return { version: 1, source: '네이버 스포츠', generatedAt: new Date().toISOString(), from, to, feeds };
}
async function getScores(from, to) {
    const key = from + ':' + to;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < 4000) return cached.value;
    if (inflight.has(key)) return inflight.get(key);
    const promise = collect(from, to).then(value => {
        // Keep the last good league payload for brief outages; timestamps remain original.
        if (cached) value.feeds = value.feeds.map(feed => {
            const old = cached.value.feeds.find(f => f.leagueId === feed.leagueId && ['ok', 'stale'].includes(f.state));
            return feed.state === 'error' && old && Date.now() - Date.parse(old.fetchedAt) < 15 * 60000
                ? { ...old, state: 'stale', error: feed.error } : feed;
        });
        cache.set(key, { at: Date.now(), value });
        if (cache.size > 32) cache.delete(cache.keys().next().value);
        return value;
    }).finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
}
module.exports = { collect, getScores, sourceUrl };
