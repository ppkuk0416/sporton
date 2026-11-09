'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../sports-core.js'),tables=require('../football-standings.js');
const data=require('../server/team-data.cjs');
const {writeJsonAtomic}=require('../server/snapshot-store.cjs');
const {collectTables}=require('../scripts/collect-standings.cjs');
const raw=require('./fixtures/domestic/202610106016490113.json');
const fixture=()=>core.normalizeNaver({success:true,result:{games:[raw.game.result.game]}},core.LEAGUES.find(league=>league.id==='kbl'))[0];
const snapshot=(match=fixture(),at='2026-10-10T12:00:00Z')=>({version:1,from:match.rawDate,to:match.rawDate,feeds:[{leagueId:match.leagueId,state:'ok',fetchedAt:at,matches:[match]}]});
const table=()=>({version:1,leagueId:'kleague',source:'네이버 스포츠',fetchedAt:'2026-10-10T12:00:00Z',state:'ok',groups:[{name:'전체 순위',season:'2026',entries:[{teamId:'09',name:'서울',rank:1,played:33,won:20,drawn:7,lost:6,gf:61,ga:29,gd:32,pts:67,logo:''}]}]});
async function directory(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'sporton-data-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));for(const name of ['domestic','overseas','standings'])await fs.mkdir(path.join(root,name));return root;}

test('records reject mixed seasons, duplicate identities and inconsistent totals without guessing points deductions',()=>{
    const valid=table();assert.ok(tables.inspect(valid,'kleague',{requireIdentity:true}).valid);
    for(const change of [value=>value.groups[0].season='',value=>value.groups.push({...structuredClone(value.groups[0]),season:'2025'}),value=>value.groups[0].entries.push({...value.groups[0].entries[0]}),value=>value.groups[0].entries[0].won=21,value=>value.groups[0].entries[0].gd=33,value=>value.groups[0].entries[0].lost=-1]){
        const changed=structuredClone(valid);change(changed);assert.equal(tables.inspect(changed,'kleague',{requireIdentity:true}).valid,false);
    }
    valid.groups[0].entries[0].pts=64;assert.ok(tables.validate(valid,'kleague')); // A provider may apply a points penalty.
    valid.groups[0].entries[0].teamId=null;
    assert.equal(tables.inspect(valid,'kleague').identityVerified,false);
    assert.equal(tables.validate(valid,'kleague',{requireIdentity:true}),false);
    assert.equal(tables.validate({...valid,groups:[null]},'kleague'),false);
    assert.equal(tables.espn({children:[{standings:{season:2026,entries:[{team:{id:'1',name:'Team'},stats:[]}]}}]})[0].entries[0].rank,null);
});

test('match publication blocks wrong dates, missing IDs, duplicate games and scheduled scores',()=>{
    const value=snapshot();assert.equal(data.inspectSnapshot(value).length,0);
    assert.notEqual(data.identity('kbl','10'),data.identity('kleague','10'));
    for(const change of [value=>value.feeds[0].matches[0].rawDate='2026-10-11',value=>value.feeds[0].matches[0].homeTeamId=null,value=>value.feeds[0].matches.push(value.feeds[0].matches[0]),value=>{value.feeds[0].matches[0].status='upcoming';value.feeds[0].matches[0].homeScore=0;}]){
        const changed=structuredClone(value);change(changed);assert.throws(()=>data.assertSnapshot(changed),/validation failed/);
    }
    const game=structuredClone(raw.game.result.game);delete game.homeTeamCode;
    assert.equal(core.normalizeNaver({success:true,result:{games:[game]}},core.LEAGUES.find(league=>league.id==='kbl'))[0].homeTeamId,null);
});

test('live collectors reject missing team IDs instead of returning a healthy feed',async()=>{
    const {collect}=require('../server/domestic.cjs');
    const game=structuredClone(raw.game.result.game);delete game.homeTeamCode;
    const result=await collect('2026-10-10','2026-10-10',async()=>({ok:true,json:async()=>({success:true,result:{games:[game],gameTotalCount:1}})}));
    assert.equal(result.feeds.find(feed=>feed.leagueId==='kbl').state,'error');
    const {collectLeague}=require('../server/overseas.cjs');
    const event={id:'bad-id-test',date:'2026-08-03T01:00:00Z',status:{type:{state:'pre'}},competitions:[{competitors:[{homeAway:'home',team:{displayName:'Home'}},{homeAway:'away',team:{displayName:'Away'}}]}]};
    const feed=await collectLeague('nba','2026-08-03',async()=>({ok:true,json:async()=>({events:[event]})}));
    assert.equal(feed.state,'error');assert.equal(feed.matches.length,0);assert.deepEqual(feed.errorCodes,['invalid-payload']);
});

test('team sync preserves source evidence, revisions and season records; repeated sync is stable',async t=>{
    const root=await directory(t),match=fixture();match.homeLogoUrl='https://sports-phinf.pstatic.net/team/kbl/default/60.png';
    const target=path.join(root,'domestic',match.rawDate+'.json');await writeJsonAtomic(target,snapshot(match));
    await writeJsonAtomic(path.join(root,'standings','kleague.json'),table());
    const first=await data.sync(root);assert.equal(first.changed,true);assert.equal(first.catalog.records.length,1);
    assert.equal(first.catalog.records[0].season,'2026');assert.equal(first.catalog.records[0].played,33);
    const team=first.catalog.teams.find(team=>team.key==='naver:kbl:60');assert.ok(team.source.sha256);assert.equal(team.logo.assetStatus,'not-checked');
    assert.equal((await data.sync(root)).changed,false);
    match.homeTeam='부산 KCC 이지스';match.homeLogoUrl+='?revision=2';
    await writeJsonAtomic(target,snapshot(match,'2026-10-11T12:00:00Z'));
    const next=await data.sync(root);
    const updated=next.catalog.teams.find(team=>team.key==='naver:kbl:60');
    assert.ok(updated.aliases.includes('부산 KCC'));assert.ok(updated.aliases.includes('부산 KCC 이지스'));assert.equal(updated.revisions.length,1);
    assert.equal(updated.revisions[0].name,'부산 KCC');assert.equal((await data.audit(root)).ok,true);
    const wrongRecord=structuredClone(next.catalog);wrongRecord.records[0].won=999;
    await writeJsonAtomic(path.join(root,'teams','catalog.json'),wrongRecord);assert.equal((await data.audit(root)).ok,false);
    await writeJsonAtomic(path.join(root,'teams','catalog.json'),next.catalog);
    const tampered=structuredClone(next.catalog);tampered.teams.find(team=>team.key==='naver:kbl:60').logo.url='https://example.com/wrong-team.png';
    await writeJsonAtomic(path.join(root,'teams','catalog.json'),tampered);
    assert.equal((await data.audit(root)).ok,false);await assert.rejects(data.sync(root),/integrity failed/);
    await writeJsonAtomic(path.join(root,'teams','catalog.json'),next.catalog);
    const lastLogo=match.homeLogoUrl;match.homeLogoUrl='';await writeJsonAtomic(target,snapshot(match,'2026-10-12T12:00:00Z'));
    const retained=await data.sync(root),profile=retained.catalog.teams.find(team=>team.key==='naver:kbl:60');
    assert.equal(profile.logo.url,lastLogo);assert.equal(profile.logo.observedAt,'2026-10-11T12:00:00.000Z');
    const retainedReport=await data.audit(root);assert.equal(retainedReport.ok,true);assert.ok(retainedReport.issues.some(issue=>issue.code==='ARCHIVED_LOGO_EVIDENCE'));
});

test('invalid source data cannot replace the existing catalog',async t=>{
    const root=await directory(t),value=snapshot(),file=path.join(root,'domestic',value.from+'.json');
    await writeJsonAtomic(file,value);await data.sync(root);
    const target=path.join(root,'teams','catalog.json'),before=await fs.readFile(target,'utf8');
    value.feeds[0].matches[0].awayTeamId=value.feeds[0].matches[0].homeTeamId;await writeJsonAtomic(file,value);
    await assert.rejects(data.sync(root),/sync blocked/);assert.equal(await fs.readFile(target,'utf8'),before);
});

test('failed standings validation preserves the last record and original collection time',async t=>{
    const root=await directory(t),folder=path.join(root,'standings'),before=table(),target=path.join(folder,'kleague.json');await writeJsonAtomic(target,before);
    const invalid=table();invalid.groups[0].entries[0].played=999;
    const results=await collectTables(folder,async id=>{if(id==='kleague')return invalid;throw Error('unavailable');});
    const after=JSON.parse(await fs.readFile(target));assert.equal(after.state,'stale');assert.equal(after.fetchedAt,before.fetchedAt);assert.equal(after.groups[0].entries[0].played,33);
    assert.equal(results.find(result=>result.id==='kleague').state,'error');assert.ok(after.lastAttemptAt);
    assert.equal((await fs.readdir(folder)).some(name=>name.endsWith('.tmp')),false);
});
