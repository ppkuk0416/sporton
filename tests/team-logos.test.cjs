'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const logos = require('../team-logos.js');
const core = require('../sports-core.js');
const details = require('../score-details.js');

test('provider artwork keeps each league and home/away team identity intact', () => {
    for (const id of ['nba','mlb','epl','nhl','nfl']) {
        const raw = JSON.parse(fs.readFileSync('tests/fixtures/espn-details/' + id + '.json'));
        const league = core.LEAGUES.find(league => league.id === (id === 'epl' ? 'eng.1' : id));
        const match = details.espn(raw, league, raw.header.id).match;
        assert.ok(match.homeLogoUrl && match.awayLogoUrl, id);
        assert.notEqual(match.homeLogoUrl, match.awayLogoUrl, match.id);
        for (const side of ['home', 'away']) {
            assert.equal(logos.url(match, side), match[side + 'LogoUrl']);
            assert.ok(logos.html(match, side).includes('src="' + match[side + 'LogoUrl'] + '"'));
        }
    }
});

test('missing emblems use only registered league-scoped artwork, never guessed paths', () => {
    const registered=[['kleague','09'],['kleague','04'],['kbl','60'],['kbl','16']].map(([leagueId,teamId])=>({key:'naver:'+leagueId+':'+teamId,provider:'naver',leagueId,teamId,logo:{url:'https://sports-phinf.pstatic.net/team/'+leagueId+'/default/'+teamId+'.png'}}));
    logos.setCatalog({version:1,teams:registered});
    const raw=JSON.parse(fs.readFileSync('tests/fixtures/domestic/202610100904184.json'));
    const match=details.naver(raw.game,raw.record,core.LEAGUES.find(league=>league.id===raw.league)).match;
    assert.equal(logos.url(match,'home'),'https://sports-phinf.pstatic.net/team/kleague/default/09.png');
    assert.equal(logos.url({...match,homeTeamId:'99999'},'home'),'');
    assert.equal(logos.url({...match,leagueId:'kbl'},'home'),'');
    assert.throws(()=>logos.setCatalog({version:1,teams:[...registered,registered[0]]}),/Invalid team identity/);
    assert.throws(()=>logos.setCatalog({version:1,teams:[{...registered[0],key:'naver:kbl:09'}]}),/Invalid team identity/);
});

test('missing and unsafe artwork never becomes an invented team logo or executable URL', () => {
    for (const source of ['', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.com/team.png', 'https://user:password@example.com/team.png']) {
        const match = {homeTeam:'팀 이름',homeLogoUrl:source};
        assert.equal(logos.url(match, 'home'), '');
        assert.doesNotMatch(logos.html(match, 'home'), /<img|src=/);
    }
    assert.equal(logos.url({homeLogoUrl:'https://example.com/home.png'}, 'away'), '');
    assert.equal(logos.url({homeLogoUrl:'https://example.com/home.png'}, 'invalid'), '');
});
