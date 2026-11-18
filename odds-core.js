/* Shared, dependency-free 1X2 / totals odds helpers for the server adapter, the browser and tests.
   Response shape (GET /api/odds?date=YYYY-MM-DD):
   { version:1, state:'ok'|'demo'|'unconfigured'|'error', source, date, fetchedAt, bookmakers:[{key,name}],
     events:{ [matchId]: { leagueId, books:[{ key, name, updatedAt,
       h2h:{ home:{price,previous}, draw:{price,previous}, away:{price,previous} } | null,
       totals:{ point, over:{price,previous}, under:{price,previous} } | null }] } } } */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SportonOddsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    // The Odds API sport keys for the leagues SPORTON shows odds for.
    const SPORT_KEYS = { 'eng.1': 'soccer_epl', 'esp.1': 'soccer_spain_la_liga', 'ger.1': 'soccer_germany_bundesliga', 'ita.1': 'soccer_italy_serie_a', 'fra.1': 'soccer_france_ligue_one', 'uefa.champions': 'soccer_uefa_champs_league' };
    const BOOKMAKER_NAMES = { pinnacle: 'Pinnacle', williamhill: 'William Hill', betfair_ex_eu: 'Betfair', betfair_ex_uk: 'Betfair', bet365: 'Bet365', unibet_eu: 'Unibet', marathonbet: 'Marathonbet', onexbet: '1xBet', betsson: 'Betsson', sport888: '888sport' };
    const DEFAULT_BOOKMAKERS = ['pinnacle', 'williamhill', 'betfair_ex_eu'];
    const OUTCOMES = { h2h: ['home', 'draw', 'away'], totals: ['over', 'under'] };
    const TRADABLE = new Set(['upcoming', 'live', 'delayed']);

    const price = value => { const n = Number(value); return Number.isFinite(n) && n > 1 && n < 1000 ? Math.round(n * 100) / 100 : null; };
    const bookName = key => BOOKMAKER_NAMES[key] || String(key || '');
    const applies = match => !!match && Object.prototype.hasOwnProperty.call(SPORT_KEYS, match.leagueId) && TRADABLE.has(match.status);

    // Team names differ between ESPN and odds providers ("Brighton & Hove Albion" / "Brighton and Hove Albion").
    const ALIASES = { internazionale: 'inter', 'inter milan': 'inter', 'athletic bilbao': 'athletic club', 'paris sg': 'paris saint germain', psg: 'paris saint germain', 'bayern munchen': 'bayern munich', 'manchester utd': 'manchester united', 'man united': 'manchester united', 'man city': 'manchester city', 'spurs': 'tottenham hotspur', 'tottenham': 'tottenham hotspur', 'wolves': 'wolverhampton wanderers', 'nottm forest': 'nottingham forest', 'koln': 'fc koln', '1 fc koln': 'fc koln', 'borussia mgladbach': 'borussia monchengladbach' };
    function normalizeTeam(name) {
        let value = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(fc|afc|cf|sc|ac|ssc|as|ud|cd|rc|ogc|vfb|vfl|tsg|sv)\b/g, ' ').replace(/\s+/g, ' ').trim();
        if (ALIASES[value]) value = ALIASES[value];
        return value.replace(/\bfc\b/g, '').replace(/\s+/g, ' ').trim();
    }
    function sameTeam(a, b) {
        const x = normalizeTeam(a), y = normalizeTeam(b);
        if (!x || !y) return false;
        if (x === y) return true;
        const shorter = x.length < y.length ? x : y, longer = shorter === x ? y : x;
        return shorter.length >= 5 && (' ' + longer + ' ').includes(' ' + shorter + ' ');
    }
    // Only a confident identity attaches odds: both teams and kick-off within 3 hours.
    function findEvent(match, events) {
        const kickoff = Date.parse(match.isoDate);
        if (!Number.isFinite(kickoff)) return null;
        const hits = events.filter(ev => Math.abs(Date.parse(ev.commenceTime) - kickoff) <= 3 * 3600000 && sameTeam(ev.homeTeam, match.homeTeam) && sameTeam(ev.awayTeam, match.awayTeam));
        return hits.length === 1 ? hits[0] : null;
    }

    // The Odds API v4 /odds response -> provider-neutral events.
    function normalizeTheOddsApi(data, allowed = DEFAULT_BOOKMAKERS) {
        if (!Array.isArray(data)) throw new Error('Invalid odds payload');
        return data.filter(ev => ev && ev.home_team && ev.away_team && Number.isFinite(Date.parse(ev.commence_time))).map(ev => ({
            id: String(ev.id), homeTeam: String(ev.home_team), awayTeam: String(ev.away_team), commenceTime: ev.commence_time,
            books: (Array.isArray(ev.bookmakers) ? ev.bookmakers : []).filter(b => allowed.includes(b.key)).map(b => {
                const market = key => (Array.isArray(b.markets) ? b.markets : []).find(m => m.key === key);
                const h2h = market('h2h'), totals = market('totals');
                const outcome = (m, predicate) => (Array.isArray(m?.outcomes) ? m.outcomes : []).find(predicate);
                let totalLine = null;
                if (totals) {
                    // Prefer the 2.5 line; otherwise the first line offered with both sides.
                    const points = [...new Set(totals.outcomes.map(o => Number(o.point)).filter(Number.isFinite))].sort((a, b) => Math.abs(a - 2.5) - Math.abs(b - 2.5));
                    for (const point of points) {
                        const over = price(outcome(totals, o => o.name === 'Over' && Number(o.point) === point)?.price), under = price(outcome(totals, o => o.name === 'Under' && Number(o.point) === point)?.price);
                        if (over && under) { totalLine = { point, over: { price: over }, under: { price: under } }; break; }
                    }
                }
                const side = name => price(outcome(h2h, o => o.name === name)?.price);
                const home = side(ev.home_team), draw = side('Draw'), away = side(ev.away_team);
                return { key: b.key, name: b.title || bookName(b.key), updatedAt: b.last_update || h2h?.last_update || null,
                    h2h: home && draw && away ? { home: { price: home }, draw: { price: draw }, away: { price: away } } : null, totals: totalLine };
            }).filter(b => b.h2h || b.totals)
        }));
    }

    // Highest price per outcome. Ties are all highlighted.
    function best(books, market) {
        const result = {};
        for (const outcome of OUTCOMES[market]) {
            const prices = books.map(b => b?.[market]?.[outcome]?.price).filter(p => p != null);
            if (!prices.length) { result[outcome] = null; continue; }
            const top = Math.max(...prices);
            result[outcome] = { price: top, books: books.filter(b => b?.[market]?.[outcome]?.price === top).map(b => b.key) };
        }
        return result;
    }
    const trend = entry => entry && entry.previous != null && entry.price != null && entry.previous !== entry.price ? (entry.price > entry.previous ? 'up' : 'down') : '';

    // Remembers the last distinct price so the API can report the movement ("previous").
    function track(store, matchId, books, now = Date.now(), windowMs = 2 * 3600000) {
        for (const book of books) for (const market of ['h2h', 'totals']) {
            if (!book[market]) continue;
            for (const outcome of OUTCOMES[market]) {
                const entry = book[market][outcome]; if (!entry) continue;
                const key = [matchId, book.key, market, market === 'totals' ? book.totals.point : '', outcome].join('|');
                const seen = store.get(key);
                if (!seen) store.set(key, { price: entry.price, previous: null, changedAt: 0 });
                else if (seen.price !== entry.price) store.set(key, { price: entry.price, previous: seen.price, changedAt: now });
                const current = store.get(key);
                entry.previous = current.previous != null && now - current.changedAt <= windowMs ? current.previous : null;
            }
        }
        if (store.size > 20000) for (const key of [...store.keys()].slice(0, 5000)) store.delete(key);
        return books;
    }

    // Deterministic DEMO prices for layout work only. Never shown without the explicit demo flag.
    function demoBooks(match, keys = DEFAULT_BOOKMAKERS) {
        let seed = 0; for (const ch of String(match.leagueId) + ':' + String(match.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        if (random() < 0.12) return []; // some fixtures are not priced yet
        const pHome = 0.25 + random() * 0.4, pDraw = 0.22 + random() * 0.08, pAway = Math.max(0.08, 1 - pHome - pDraw);
        const pOver = 0.42 + random() * 0.18;
        const quote = (p, margin) => price(1 / (p * (1 + margin)) * (0.98 + random() * 0.04));
        const moved = value => random() < 0.3 ? price(value + (random() < 0.5 ? -1 : 1) * (0.05 + Math.round(random() * 15) / 100)) : null;
        return keys.map((key, index) => {
            if (index === keys.length - 1 && random() < 0.25) return { key, name: bookName(key), updatedAt: null, h2h: null, totals: null };
            const margin = key === 'pinnacle' ? 0.025 : 0.05 + random() * 0.03;
            const h2h = { home: { price: quote(pHome, margin) }, draw: { price: quote(pDraw, margin) }, away: { price: quote(pAway, margin) } };
            const totals = { point: 2.5, over: { price: quote(pOver, margin) }, under: { price: quote(1 - pOver, margin) } };
            for (const entry of [h2h.home, h2h.draw, h2h.away, totals.over, totals.under]) entry.previous = moved(entry.price);
            return { key, name: bookName(key), updatedAt: new Date(Date.parse(match.isoDate) - 3600000 * (2 + index)).toISOString(), h2h, totals };
        });
    }

    return { SPORT_KEYS, BOOKMAKER_NAMES, DEFAULT_BOOKMAKERS, OUTCOMES, applies, bookName, price, normalizeTeam, sameTeam, findEvent, normalizeTheOddsApi, best, trend, track, demoBooks };
});
