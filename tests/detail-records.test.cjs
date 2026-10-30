'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../sports-core.js'),D=require('../score-details.js');
const L=id=>C.LEAGUES.find(l=>l.id===id);
const domestic=require('./fixtures/domestic-players.json');
const games={kbo:require('./fixtures/domestic/20261010LGLT02026.json').game,kbl:require('./fixtures/domestic/202610106016490113.json').game,kleague:require('./fixtures/domestic/202610100904184.json').game,wkovo:require('./fixtures/domestic/20261011824F2.json').game};
test('domestic supplied player records retain group, home/away, source strings and empty data',()=>{
 for(const id of Object.keys(games)){const result=D.naver(games[id],domestic[id],L(id));assert.ok(result.players.some(x=>x.side==='home'));assert.ok(result.players.some(x=>x.side==='away'));assert.ok(result.players.every(x=>x.columns.length===x.entries[0].values.length));}
 const x=D.naver(games.kbo,domestic.kbo,L('kbo'));assert.ok(x.players.some(p=>p.title==='타자'));assert.ok(x.players.some(p=>p.title==='투수'));assert.equal(D.naver(games.kbo,null,L('kbo')).players.length,0);
 const soccer=D.naver(games.kleague,domestic.kleague,L('kleague'));assert.ok(soccer.events.some(e=>e.type==='corner'));
 assert.equal(D.eventType('goalKick'),'goal-kick');assert.equal(D.eventType('ownGoal'),'own-goal');
});
test('real ESPN team and player box scores retain team identities and displayed values',()=>{
 for(const id of ['nba','mlb','epl','nhl','nfl']){const raw=require('./fixtures/espn-details/'+id+'.json');const d=D.espn(raw,L(id==='epl'?'eng.1':id),raw.header.id);assert.ok(d.stats.length>0,id);if(id!=='epl')assert.ok(d.players.length>0,id);assert.ok(d.stats.every(x=>x.home!==null||x.away!==null));assert.ok(d.players.every(x=>x.columns.length===x.entries[0].values.length));}
 const raw=require('./fixtures/espn-details/epl.json'),result=D.espn(raw,L('eng.1'),raw.header.id);assert.ok(result.events.some(e=>e.text));assert.ok(result.stats.some(s=>s.label==='슈팅'));
 const baseball=require('./fixtures/espn-details/mlb.json'),mlb=D.espn(baseball,L('mlb'),baseball.header.id);assert.ok(mlb.players.some(g=>g.title==='타자'));assert.ok(mlb.players.some(g=>g.title==='투수'));
 const nba=require('./fixtures/espn-details/nba.json'),basketball=D.espn(nba,L('nba'),nba.header.id);assert.deepEqual(basketball.stats.find(s=>s.label==='야투율 (%)'),{label:'야투율 (%)',away:'44',home:'44'});assert.deepEqual(basketball.stats.find(s=>s.label==='야투'),{label:'야투',away:'38-87',home:'42-95'});
});
test('upcoming games never label season box scores as match records',()=>{
 const raw=structuredClone(require('./fixtures/espn-details/epl.json'));raw.header.competitions[0].status.type.state='pre';raw.header.competitions[0].status.type.completed=false;
 const d=D.espn(raw,L('eng.1'),raw.header.id);assert.equal(d.match.status,'upcoming');assert.deepEqual(d.stats,[]);assert.deepEqual(d.players,[]);assert.deepEqual(d.events,[]);
 const game=structuredClone(games.kbo);game.result.game.statusCode='BEFORE';const n=D.naver(game,domestic.kbo,L('kbo'));assert.deepEqual(n.players,[]);assert.deepEqual(n.events,[]);
});
