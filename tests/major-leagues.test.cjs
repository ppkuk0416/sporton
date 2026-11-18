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

test('major leagues lead an unfiltered list in their own section; a league filter keeps one list', () => {
    const at = (id, leagueId, iso) => ({ id, leagueId, isoDate: iso });
    const list = [at('k', 'kleague', '2026-11-22T05:00Z'), at('e', 'eng.1', '2026-11-22T15:00Z'), at('l', 'esp.1', '2026-11-22T12:00Z')];
    const sections = C.majorSections(list, '');
    assert.deepEqual(sections.map(s => s.id), ['major', 'rest']);
    assert.deepEqual(sections[0].matches.map(m => m.id).sort(), ['e', 'l']);
    assert.deepEqual(C.majorSections(list, 'eng.1').map(s => s.id), ['all'], 'an explicit league shows one list');
    assert.deepEqual(C.majorSections(list.filter(m => C.isMajor(m)), '').map(s => s.id), ['all'], 'no split when every match is major');
    assert.deepEqual(C.majorSections([], '').map(s => s.matches.length), [0]);
});

test('legacy links (PWA shortcuts, sitemap, old hashes) map onto the status filter', () => {
    assert.equal(C.legacyRoute('?view=live', ''), 'status=live');
    assert.equal(C.legacyRoute('?view=myteam&date=2026-11-22', ''), 'date=2026-11-22&status=myteams');
    assert.equal(C.legacyRoute('', '#upcoming'), 'status=upcoming');
    assert.equal(C.legacyRoute('?status=finished', '#live'), 'status=finished', 'an explicit status wins');
    assert.equal(C.legacyRoute('?view=community', ''), '', 'retired views fall back to the plain list');
    assert.equal(C.legacyRoute('?date=2026-11-22', ''), null, 'current URLs are untouched');
    const manifest = JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'));
    for (const shortcut of manifest.shortcuts) assert.match(shortcut.url, /^\/\?status=(live|myteams)$/);
    assert.doesNotMatch(require('node:fs').readFileSync('sitemap.xml', 'utf8'), /view=/);
});
