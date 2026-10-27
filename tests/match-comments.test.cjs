'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../match-comments.js'),{LEAGUES}=require('../sports-core.js');
test('match identity combines validated league and provider ID, rejecting malformed IDs',()=>{
  assert.equal(M.matchKey({leagueId:'nba',providerId:'401234567'},LEAGUES),'nba__401234567');
  assert.equal(M.matchKey({leagueId:'kbo',providerId:'20261027HHOB'},LEAGUES),'kbo__20261027HHOB');
  assert.notEqual(M.matchKey({leagueId:'kbo',providerId:'20261027HHOB'},LEAGUES),M.matchKey({leagueId:'kbl',providerId:'20261027HHOB'},LEAGUES));
  for(const match of [{leagueId:'nba',providerId:'../secret'},{leagueId:'unknown',providerId:'401234567'},{leagueId:'nba',providerId:'abc'},{}])assert.equal(M.matchKey(match,LEAGUES),null);
});
test('input is bounded and cannot be blank',()=>{
  assert.deepEqual(M.validateInput(' 이름 ',' 안녕 '),{nickname:'이름',text:'안녕'});
  assert.ok(M.validateInput(' ', 'hello').error);assert.ok(M.validateInput('x',' ').error);
  assert.ok(M.validateInput('a'.repeat(21),'x').error);assert.ok(M.validateInput('x','a'.repeat(201)).error);
  assert.equal(M.LIMIT,50);assert.equal(M.COOLDOWN_MS,5000);
});
