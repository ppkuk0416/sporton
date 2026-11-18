'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const O = require('../odds-core.js');
const C = require('../sports-core.js');
const odds = require('../server/odds.cjs');
const fixture = JSON.parse(fs.readFileSync(__dirname + '/fixtures/odds/the-odds-api-epl.json', 'utf8'));

const espnEvent = (id, date, home, away, state = 'pre') => ({ id, date, status: { type: { state } }, competitions: [{ competitors: [
    { homeAway: 'home', team: { id: id + '1', displayName: home }, score: '0' }, { homeAway: 'away', team: { id: id + '2', displayName: away }, score: '0' }] }] });
const scoreboard = { events: [
    espnEvent('401879233', '2026-11-21T12:30Z', 'Manchester City', 'Fulham'),
    espnEvent('401879238', '2026-11-21T14:00Z', 'AFC Bournemouth', 'Nottingham Forest'),
    espnEvent('401879299', '2026-11-21T11:00Z', 'Arsenal', 'Chelsea', 'post')
] };
function stub(prices = fixture, calls = []) {
    return async url => {
        const u = new URL(url); calls.push(u);
        if (u.hostname === 'site.api.espn.com') return Response.json(u.pathname.includes('/eng.1/') ? scoreboard : { events: [] });
        if (u.hostname === 'api.the-odds-api.com') return u.pathname.includes('soccer_epl') ? Response.json(prices) : Response.json([]);
        throw new Error('unexpected ' + url);
    };
}

test('major leagues are the European top five plus the Champions League and filter as one group', () => {
    assert.deepEqual(C.MAJOR_LEAGUE_IDS, ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'uefa.champions']);
    const base = { rawDate: '2026-11-21', region: 'world', sport: 'soccer', status: 'upcoming', isoDate: '2026-11-21T12:00Z', homeTeam: 'A', awayTeam: 'B' };
    const matches = [{ ...base, id: '1', leagueId: 'eng.1', league: 'EPL' }, { ...base, id: '2', leagueId: 'uefa.champions', league: '챔피언스리그' }, { ...base, id: '3', leagueId: 'kleague', league: 'K리그1', region: 'kr' }];
    assert.deepEqual(C.filterMatches(matches, { leagueId: C.MAJOR_LEAGUE }).map(m => m.id).sort(), ['1', '2']);
    assert.equal(C.isMajor(matches[2]), false);
});

test('provider events normalise to 1X2 by team name, prefer the 2.5 total and drop unrequested bookmakers', () => {
    const [city, bournemouth] = O.normalizeTheOddsApi(fixture);
    assert.deepEqual(city.books.map(b => b.key), ['pinnacle', 'williamhill', 'betfair_ex_eu']);
    assert.deepEqual(city.books[0].h2h, { home: { price: 1.42 }, draw: { price: 5.1 }, away: { price: 7.4 } });
    assert.deepEqual(city.books[0].totals, { point: 2.5, over: { price: 1.55 }, under: { price: 2.52 } });
    assert.equal(city.books[1].totals, null);
    assert.equal(bournemouth.books.length, 1, 'a book without a draw price has no 1X2 row');
});

test('best price highlights every bookmaker sharing the maximum; trend reads the previous price', () => {
    const books = O.normalizeTheOddsApi(fixture)[0].books;
    const top = O.best(books, 'h2h');
    assert.deepEqual(top.away, { price: 7.4, books: ['pinnacle', 'betfair_ex_eu'] });
    assert.deepEqual(top.home, { price: 1.44, books: ['williamhill'] });
    assert.equal(O.best([], 'h2h').home, null);
    assert.equal(O.trend({ price: 2.1, previous: 2.0 }), 'up');
    assert.equal(O.trend({ price: 1.9, previous: 2.0 }), 'down');
    assert.equal(O.trend({ price: 2.0, previous: null }), '');
});

test('fixture matching needs both teams and a close kick-off; names tolerate provider spelling', () => {
    const events = O.normalizeTheOddsApi(fixture);
    assert.ok(O.sameTeam('AFC Bournemouth', 'Bournemouth'));
    assert.ok(O.sameTeam('Brighton & Hove Albion', 'Brighton and Hove Albion'));
    assert.ok(O.sameTeam('Internazionale', 'Inter Milan'));
    assert.ok(O.sameTeam('Atlético Madrid', 'Atletico Madrid'));
    assert.ok(!O.sameTeam('Manchester City', 'Manchester United'));
    const match = { homeTeam: 'Manchester City', awayTeam: 'Fulham', isoDate: '2026-11-21T12:30Z' };
    assert.equal(O.findEvent(match, events)?.homeTeam, 'Manchester City');
    assert.equal(O.findEvent({ ...match, isoDate: '2026-11-22T12:30Z' }, events), null, 'a different day is a different fixture');
    assert.equal(O.findEvent({ ...match, homeTeam: 'Fulham', awayTeam: 'Manchester City' }, events), null, 'home/away must agree');
});

test('movement tracking reports the previous distinct price inside the window only', () => {
    const store = new Map(), books = () => [{ key: 'pinnacle', h2h: { home: { price: 2.0 }, draw: { price: 3.4 }, away: { price: 3.8 } }, totals: null }];
    O.track(store, 'm', books(), 0);
    const moved = books(); moved[0].h2h.home.price = 2.1;
    O.track(store, 'm', moved, 1000);
    assert.equal(moved[0].h2h.home.previous, 2.0);
    assert.equal(moved[0].h2h.draw.previous, null);
    const later = books(); later[0].h2h.home.price = 2.1;
    O.track(store, 'm', later, 1000 + 3 * 3600000);
    assert.equal(later[0].h2h.home.previous, null, 'old movement expires');
});

test('demo prices are deterministic, realistic and only for priced leagues', () => {
    const match = { id: '401879233', leagueId: 'eng.1', status: 'upcoming', isoDate: '2026-11-21T12:30Z' };
    assert.deepEqual(O.demoBooks(match), O.demoBooks(match));
    for (const book of O.demoBooks(match).filter(b => b.h2h)) {
        const overround = 1 / book.h2h.home.price + 1 / book.h2h.draw.price + 1 / book.h2h.away.price;
        assert.ok(overround > 0.98 && overround < 1.15, 'bookmaker margin stays plausible: ' + overround);
    }
    assert.ok(O.applies(match));
    assert.ok(!O.applies({ ...match, status: 'finished' }));
    assert.ok(!O.applies({ ...match, leagueId: 'kleague' }));
});

test('server adapter is off without a key and never calls the provider', async () => {
    odds._reset(); const calls = [];
    const value = await odds.getOdds('2026-11-21', { env: {}, fetcher: stub(fixture, calls) });
    assert.equal(value.state, 'unconfigured');
    assert.deepEqual(value.events, {});
    assert.equal(calls.length, 0);
});

test('server adapter attaches odds to matched ESPN fixtures only and keeps the key out of the response', async () => {
    odds._reset(); const calls = [];
    const env = { ODDS_API_KEY: 'test-key-123', ODDS_BOOKMAKERS: 'pinnacle,williamhill,betfair_ex_eu' };
    const value = await odds.getOdds('2026-11-21', { env, fetcher: stub(fixture, calls) });
    assert.equal(value.state, 'ok');
    assert.deepEqual(Object.keys(value.events).sort(), ['401879233', '401879238']);
    assert.equal(value.events['401879233'].books.length, 3);
    assert.equal(value.events['401879299'], undefined, 'finished fixtures carry no odds');
    assert.deepEqual(value.coverage, { fixtures: 2, matched: 2, failedLeagues: 0 });
    assert.ok(!JSON.stringify(value).includes('test-key-123'));
    const request = calls.find(u => u.hostname === 'api.the-odds-api.com' && u.pathname.includes('soccer_epl'));
    assert.equal(request.searchParams.get('markets'), 'h2h,totals');
    assert.equal(request.searchParams.get('bookmakers'), 'pinnacle,williamhill,betfair_ex_eu');
    assert.equal(request.searchParams.get('oddsFormat'), 'decimal');
});

test('server adapter reports provider failure as an error and does not invent prices', async () => {
    odds._reset();
    const failing = async url => new URL(url).hostname === 'api.the-odds-api.com' ? new Response('{}', { status: 401 }) : stub()(url);
    const value = await odds.getOdds('2026-11-21', { env: { ODDS_API_KEY: 'k' }, fetcher: failing });
    assert.equal(value.state, 'partial', 'leagues without fixtures succeed; the priced league failed');
    assert.equal(value.coverage.failedLeagues, 1);
    assert.deepEqual(value.events, {});
});
