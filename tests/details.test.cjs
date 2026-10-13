const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../sports-core.js'),D=require('../score-details.js'),API=require('../server/details.cjs');
const league=id=>C.LEAGUES.find(l=>l.id===id);
const game=(id='kbo')=>({success:true,result:{games:[],game:{gameId:'20250501KTOB02025',categoryId:id,gameDate:'2025-05-01',gameDateTime:'2025-05-01 18:30:00',statusCode:'RESULT',homeTeamName:'두산',awayTeamName:'KT',homeTeamCode:'OB',awayTeamCode:'KT',homeTeamScore:3,awayTeamScore:3}}});
test('KBO inning records preserve zero and missing values; identity and category are enforced',()=>{
 const x=D.naver(game(),{success:true,result:{recordData:{scoreBoard:{inn:{home:[0,0,0,1,0,2],away:[1,0,0,0,0,null]}}}}},league('kbo'));
 assert.equal(x.periods.home[0],0);assert.equal(x.periods.away[5],null);assert.equal(x.match.homeTeamId,'OB');
 assert.throws(()=>D.naver(game('kbl'),null,league('kbo')));
});
test('KBL future quarters and scheduled totals are never fabricated',()=>{
 const g=game('kbl');g.result.game.statusCode='STARTED';
 const r={success:true,result:{recordData:{currentHalf:'Q2',homeQ1Score:10,homeQ2Score:9,homeQ3Score:0,homeQ4Score:0,awayQ1Score:12,awayQ2Score:8,awayQ3Score:0,awayQ4Score:0,homeScore:19,awayScore:20}}};
 const x=D.naver(g,r,league('kbl'));assert.deepEqual(x.periods.home,[10,9,null,null]);
 g.result.game.statusCode='BEFORE';const y=D.naver(g,r,league('kbl'));assert.equal(y.periods,null);assert.equal(y.match.homeScore,null);
});
test('football goals, own goals and dismissals remain distinct and retain team identity',()=>{
 assert.equal(D.eventType('ownGoal'),'own-goal');assert.equal(D.eventType('secondYellow'),'red');
 const x=D.naver(game('kleague'),{success:true,result:{recordData:{timeline:[{side:'away',eventType:'goal',time:"3'",text:'신상은 골'},{side:'home',eventType:'red',time:"80'",text:'퇴장'}]}}},league('kleague'));
 assert.equal(x.events[0].side,'away');assert.equal(x.events[1].type,'red');assert.equal(x.events[0].clock,"3'");
});
test('favorite teams match across dates using league-scoped IDs; age can only worsen freshness',()=>{
 const m=C.normalizeNaver({success:true,result:{games:[game().result.game]}},league('kbo'))[0];
 assert.equal(C.filterMatches([m],{status:'myteams',favoriteTeams:new Set(['kbo:OB'])}).length,1);
 assert.equal(C.filterMatches([m],{status:'myteams',favoriteTeams:new Set(['kbl:OB'])}).length,0);
 const f={state:'ok',mode:'poll',fetchedAt:'2026-10-08T00:00:00Z',matches:[{status:'live'}]};assert.equal(C.feedState(f,Date.parse(f.fetchedAt)+21000),'stale');assert.equal(C.feedState({...f,state:'stale'},Date.parse(f.fetchedAt)),'stale');
});
test('detail requests reject unknown leagues and URL/path injection',()=>{
 assert.ok(API.validRequest('nba','401914123'));assert.ok(API.validRequest('kbo','20250501KTOB02025'));
 for(const id of ['../secrets','https://evil.example','401?event=1','x'])assert.equal(API.validRequest('nba',id),false);
 assert.equal(API.validRequest('bad','401914123'),false);
});

test('confirmed domestic records expose source-provided team statistics and volleyball sets',()=>{
 const fixtures=['20261010LGLT02026','202610106016490113','202610100904184','20261011824F2'].map(id=>require('./fixtures/domestic/'+id+'.json'));
 const [baseball,basketball,soccer,volleyball]=fixtures.map(f=>D.naver(f.game,f.record,league(f.league)));
 assert.deepEqual(baseball.stats.find(s=>s.label==='안타'),{label:'안타',home:10,away:12});
 assert.deepEqual(baseball.stats.find(s=>s.label==='실책'),{label:'실책',home:0,away:1});
 assert.deepEqual(basketball.stats.find(s=>s.label==='리바운드'),{label:'리바운드',home:43,away:42});
 assert.ok(soccer.stats.some(s=>s.label==='코너킥'&&s.away===4));
 assert.deepEqual(volleyball.periods.home,[25,23,16,25,null]);
 assert.deepEqual(volleyball.periods.away,[18,25,25,27,null]);
 assert.equal(volleyball.periods.homeTotal,1);assert.equal(volleyball.periods.awayTotal,3);
 assert.deepEqual(volleyball.stats.find(s=>s.label==='서브 득점'),{label:'서브 득점',home:7,away:6});
});

test('domestic basic records survive optional record outage without inventing statistics',()=>{
 const f=require('./fixtures/domestic/202610106016490113.json');
 const d=D.naver(f.game,null,league('kbl'));
 assert.deepEqual(d.periods.home,[15,21,26,17,null]);assert.equal(d.recordAvailable,false);assert.deepEqual(d.stats,[]);
 const v=structuredClone(require('./fixtures/domestic/20261011824F2.json'));
 v.game.result.game.statusCode='STARTED';v.game.result.game.currentSet='2';
 v.game.result.game.currentScoreBySet[1]={set:2,homeScore:0,awayScore:0};
 const live=D.naver(v.game,null,league('wkovo'));
 assert.deepEqual(live.periods.home,[25,0,null,null,null]);
 delete v.game.result.game.currentSet;
 const unknown=D.naver(v.game,null,league('wkovo'));
 assert.equal(unknown.periods.home[1],null);assert.equal(unknown.periods.away[1],null);
 v.game.result.game.statusCode='BEFORE';
 const upcoming=D.naver(v.game,v.record,league('wkovo'));assert.equal(upcoming.periods,null);assert.deepEqual(upcoming.stats,[]);
});
