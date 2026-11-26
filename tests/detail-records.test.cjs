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

test('football detail: scorers, goal facts, own-goal credit, substitutions and lineups come from provider fields',()=>{
 const raw=require('./fixtures/espn-details/soccer-synthetic.json'),L=id=>C.LEAGUES.find(l=>l.id===id);
 const d=D.espn(raw,L('uefa.champions'),raw.header.id);
 assert.deepEqual(d.goals.map(g=>[g.side,g.clock,g.player]),[['away',"12'",'Away Striker'],['away',"20'",'Away Winger'],['away',"45'+2'",'Home Back'],['home',"70'",'Home Forward']]);
 assert.equal(d.goalsVerified,true);
 assert.equal(d.goals[0].penalty,true);assert.equal(d.goals[0].assist,null);
 assert.deepEqual([d.goals[1].method,d.goals[1].situation,d.goals[1].assist],['헤더','코너킥 상황','Away Mid']);
 assert.equal(d.goals[2].ownGoal,true);assert.equal(d.goals[3].method,'왼발 슛');
 const sub=d.events.find(e=>e.type==='sub');assert.deepEqual([sub.player,sub.playerOut,sub.injury],['Away Sub','Away Striker',true]);
 assert.ok(!d.events.some(e=>!e.type),'kickoff/halftime are not events');
 assert.deepEqual(d.events.map(e=>e.clock),["12'","15'","20'","45'+2'","60'","70'","88'"]);
 assert.deepEqual(d.stats.map(s=>s.label),['점유율 (%)','슈팅','유효 슈팅','패스 시도']);
 const away=d.lineups.find(l=>l.side==='away');assert.equal(away.formation,'4-3-3');assert.equal(away.starters.length,3);assert.equal(away.bench[0].subbedIn,true);
 const homeTable=d.players.find(p=>p.side==='home');assert.ok(!homeTable.entries.some(e=>e.name==='Home Unused'),'unused substitutes have no record row');
 assert.ok(!homeTable.columns.includes('도움'),'columns without any provider value are omitted');
 assert.deepEqual(d.info,{venue:'Test Stadium',city:'Test City',attendance:31250,referee:'Test Referee'});
});
test('football detail: header goals fill partial keyEvents, and inconsistent goal lists are flagged, not repaired',()=>{
 const L=id=>C.LEAGUES.find(l=>l.id===id),epl=require('./fixtures/espn-details/epl.json');
 const d=D.espn(epl,L('eng.1'),epl.header.id);
 assert.deepEqual(d.goals.map(g=>[g.player,g.assist]),[['William Osula','Jacob Murphy'],['Harvey Barnes','Amar Dedic']]);assert.equal(d.goalsVerified,true);
 const raw=structuredClone(require('./fixtures/espn-details/soccer-synthetic.json'));
 raw.keyEvents=raw.keyEvents.filter(e=>!/^own/.test(e.type.type));
 const partial=D.espn(raw,L('uefa.champions'),raw.header.id);assert.equal(partial.goals.length,3);assert.equal(partial.goalsVerified,false);
 raw.header.competitions[0].status.type.state='pre';raw.header.competitions[0].status.type.completed=false;
 const pre=D.espn(raw,L('uefa.champions'),raw.header.id);assert.deepEqual(pre.goals,[]);assert.deepEqual(pre.lineups,[]);assert.deepEqual(pre.events,[]);
});
test('K League goal events expose the scorer name without the event word',()=>{
 const C2=require('../sports-core.js');
 const g={success:true,result:{game:{gameId:'20250501KTOB02025',categoryId:'kleague',gameDate:'2025-05-01',gameDateTime:'2025-05-01 18:30:00',statusCode:'RESULT',homeTeamName:'울산',awayTeamName:'전북',homeTeamCode:'U',awayTeamCode:'J',homeTeamScore:0,awayTeamScore:1}}};
 const x=D.naver(g,{success:true,result:{recordData:{timeline:[{side:'away',eventType:'goal',time:"3'",text:'신상은 골'}]}}},C2.LEAGUES.find(l=>l.id==='kleague'));
 assert.deepEqual(x.goals.map(g=>[g.side,g.player,g.clock]),[['away','신상은',"3'"]]);assert.equal(x.goalsVerified,true);
});
