'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../sports-core.js');

test('major leagues are the European top five plus the Champions League and filter as one group', () => {
    assert.deepEqual(C.MAJOR_LEAGUE_IDS, ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'uefa.champions']);
    const base = { rawDate: '2026-11-21', region: 'world', sport: 'soccer', status: 'upcoming', isoDate: '2026-11-21T12:00Z', homeTeam: 'A', awayTeam: 'B' };
    const matches = [{ ...base, id: '1', leagueId: 'eng.1', league: 'EPL' }, { ...base, id: '2', leagueId: 'uefa.champions', league: '챔피언스리그' }, { ...base, id: '3', leagueId: 'kleague', league: 'K리그1', region: 'kr' }];
    assert.deepEqual(C.filterMatches(matches, { leagueId: C.MAJOR_LEAGUE }).map(m => m.id).sort(), ['1', '2']);
    assert.equal(C.isMajor(matches[2]), false);
});
