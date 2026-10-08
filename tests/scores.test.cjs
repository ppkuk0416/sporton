'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../sports-core.js');
const { collect, sourceUrl } = require('../server/domestic.cjs');
const kbo = core.LEAGUES.find(l => l.id === 'kbo');
const envelope = game => ({ success: true, result: { games: [game], gameTotalCount: 1 } });
const game = { gameId: '20250501KTOB02025', categoryId: 'kbo', gameDate: '2025-05-01', gameDateTime: '2025-05-01T18:30:00', homeTeamName: '두산', awayTeamName: 'KT', homeTeamScore: 0, awayTeamScore: 0, statusCode: 'BEFORE' };
test('KST dates include midnight and year rollover', () => {
    assert.equal(core.kstDate('2025-12-31T16:00:00Z'), '2026-01-01');
    assert.equal(core.kstDate('2025-05-01T14:59:00Z'), '2025-05-01');
    assert.equal(core.kstDate('2025-05-01T15:00:00Z'), '2025-05-02');
    assert.equal(core.shiftDate('2026-01-01', -1), '2025-12-31');
    assert.equal(core.validDate('2025-02-30'), false);
    assert.equal(core.validDate('2024-02-29'), true);
});
test('scheduled games have no fake 0-0 score and KST start time', () => {
    const m = core.normalizeNaver(envelope(game), kbo)[0];
    assert.equal(m.status, 'upcoming');
    assert.equal(m.homeScore, null);
    assert.equal(m.isoDate, '2025-05-01T18:30:00+09:00');
    assert.equal(m.sourceUrl, 'https://m.sports.naver.com/game/20250501KTOB02025/relay');
});
test('live 0-0 stays zero, cancel/suspend take priority, unknown states stay unknown', () => {
    const parse = changes => core.normalizeNaver(envelope({ ...game, ...changes }), kbo)[0];
    assert.equal(parse({ statusCode: 'STARTED' }).homeScore, 0);
    assert.equal(parse({ statusCode: 'STARTED' }).status, 'live');
    assert.equal(parse({ statusCode: 'BEFORE', cancel: true }).status, 'cancelled');
    assert.equal(parse({ statusCode: 'PLAY', suspended: true }).status, 'suspended');
    assert.equal(parse({ statusCode: 'NEW_CODE' }).status, 'unknown');
    assert.equal(parse({ statusCode: 'RESULT', homeTeamScore: null }).homeScore, null);
});
test('bad source payloads fail, unrelated categories and blank teams are dropped', () => {
    assert.throws(() => core.normalizeNaver({ result: { games: [] } }, kbo));
    assert.equal(core.normalizeNaver(envelope({ ...game, categoryId: 'mlb' }), kbo).length, 0);
    assert.equal(core.normalizeNaver(envelope({ ...game, homeTeamName: '' }), kbo).length, 0);
    assert.equal(core.safeUrl('javascript:alert(1)'), '');
});
test('ESPN game dates are KST, cancelled is not final, scheduled scores are hidden', () => {
    const nba = core.LEAGUES.find(l => l.id === 'nba');
    const ev = { id: '1', date: '2025-05-01T23:00:00Z', status: { type: { state: 'pre' } }, competitions: [{ competitors: [{ homeAway: 'home', team: { displayName: 'A' }, score: '0' }, { homeAway: 'away', team: { displayName: 'B' }, score: '0' }] }] };
    const parse = name => core.normalizeESPN({ events: [{ ...ev, status: { type: { name, state: 'pre' } } }] }, nba)[0];
    assert.equal(parse('STATUS_SCHEDULED').rawDate, '2025-05-02');
    assert.equal(parse('STATUS_SCHEDULED').homeScore, null);
    assert.equal(parse('STATUS_POSTPONED').status, 'postponed');
    assert.equal(parse('STATUS_CANCELED').status, 'cancelled');
});
test('search, date, sport, domestic and favorites filters compose', () => {
    const kr = core.normalizeNaver(envelope(game), kbo)[0];
    const world = { ...kr, id: 'world', league: 'MLB', region: 'world', status: 'live' };
    assert.equal(core.filterMatches([kr, world], { region: 'kr', query: '두산', date: '2025-05-01' }).length, 1);
    assert.equal(core.filterMatches([kr], { sport: 'soccer' }).length, 0);
    assert.equal(core.filterMatches([kr, world], { status: 'favorites', favorites: new Set([kr.id]) })[0].id, kr.id);
    assert.equal(core.filterMatches([kr, world])[0].id, 'world');
});
test('collector distinguishes empty schedule and an upstream failure', async () => {
    const response = await collect('2025-05-01', '2025-05-01', async url => {
        if (url.searchParams.get('categoryId') === 'kbo') return { ok: true, json: async () => ({ success: true, result: { games: [], gameTotalCount: 0 } }) };
        return { ok: false, status: 503 };
    });
    assert.equal(response.feeds.find(f => f.leagueId === 'kbo').state, 'ok');
    assert.equal(response.feeds.find(f => f.leagueId === 'kleague').state, 'error');
    assert.equal(sourceUrl(kbo, '2025-05-01', '2025-05-01').hostname, 'api-gw.sports.naver.com');
    await assert.rejects(collect('../etc/passwd', '2025-05-01'));
    await assert.rejects(collect('2025-05-01', '2025-06-01'));
});
test('oversized source pages are explicit errors instead of silently losing games', async () => {
    const response = await collect('2025-05-01', '2025-05-01', async () => ({ ok: true, json: async () => ({ success: true, result: { games: [], gameTotalCount: 101 } }) }));
    assert.ok(response.feeds.every(f => f.state === 'error'));
});

test('ESPN collector merges UTC days into one KST day and marks partial failures', async () => {
    const { collectLeague } = require('../server/overseas.cjs');
    const ev = { id: '42', date: '2025-05-01T01:00:00Z', status: { type: { state: 'post', completed: true } }, competitions: [{ competitors: [{ homeAway: 'home', team: { displayName: 'A' }, score: '100' }, { homeAway: 'away', team: { displayName: 'B' }, score: '99' }] }] };
    const result = await collectLeague('nba', '2025-05-01', async url => ({ ok: true, json: async () => ({ events: [ev] }) }));
    assert.equal(result.state, 'ok');
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].rawDate, '2025-05-01');
    await assert.rejects(collectLeague('https://evil.example', '2025-05-01'));
});

