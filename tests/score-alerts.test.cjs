const {test}=require('node:test');const assert=require('node:assert/strict');const {observe}=require('../score-alerts.js');
const entry=(homeScore,options={})=>({fresh:true,match:{id:'1',leagueId:'nba',rawDate:'2026-10-13',homeScore,awayScore:10,status:'live',...options}});
test('first observation, enable and identical polls do not alert; new scores emit once',()=>{
let r=observe(new Map(),[entry(20)]);assert.equal(r.events.length,0);
r=observe(r.next,[entry(22)]);assert.equal(r.events.length,1);
r=observe(r.next,[entry(22)]);assert.equal(r.events.length,0);
r=observe(r.next,[entry(25)],false);assert.equal(r.next.size,0);assert.equal(r.events.length,0);
r=observe(r.next,[entry(25)]);assert.equal(r.events.length,0);
});
test('stale, offline or absent feeds clear baseline; recovery is silent',()=>{
let r=observe(new Map(),[entry(20)]);
r=observe(r.next,[{...entry(25),fresh:false}]);assert.equal(r.next.size,0);assert.equal(r.events.length,0);
r=observe(r.next,[entry(30)]);assert.equal(r.events.length,0);
r=observe(r.next,[]);r=observe(r.next,[entry(40)]);assert.equal(r.events.length,0);
});
test('start/end and score corrections distinguish events; null scores ignored',()=>{
let r=observe(new Map(),[entry(0,{status:'upcoming'})]);r=observe(r.next,[entry(0)]);assert.equal(r.events[0].kind,'start');
r=observe(r.next,[entry(10)]);r=observe(r.next,[entry(9)]);assert.equal(r.events[0].correction,true);
r=observe(r.next,[entry(9,{status:'finished'})]);assert.equal(r.events[0].kind,'end');
assert.equal(observe(r.next,[entry(null)]).events.length,0);
});
test('league and date IDs do not collide',()=>{
const r=observe(new Map(),[entry(1),entry(2,{leagueId:'kbl'}),entry(3,{rawDate:'2026-10-14'})]);assert.equal(r.next.size,3);
});
test('throttled background observation gap rebaselines rather than catch-up alert',()=>{
let r=observe(new Map(),[{...entry(10),observedAt:1000}]);
r=observe(r.next,[{...entry(30),observedAt:31000}]);assert.equal(r.events.length,0);
r=observe(r.next,[{...entry(32),observedAt:36000}]);assert.equal(r.events.length,1);
});
test('unknown scheduled scores still permit observed start event without fabricating scores',()=>{
let r=observe(new Map(),[entry(null,{awayScore:null,status:'upcoming'})]);
r=observe(r.next,[entry(0,{awayScore:0,status:'live'})]);assert.equal(r.events[0].kind,'start');
});
