'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const core = require('../sports-core.js');
const standings = require('../football-standings.js');
const { writeJsonAtomic } = require('./snapshot-store.cjs');
const leagues = new Map(core.LEAGUES.map(league => [league.id,league]));
const hash = value => createHash('sha256').update(value).digest('hex');
const provider = league => league.source === 'naver' ? 'naver' : 'espn';
const identity = (leagueId, id) => {
    const league = leagues.get(leagueId);
    return league && typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? provider(league) + ':' + leagueId + ':' + id : null;
};

function inspectSnapshot(data, {now=Date.now()}={}) {
    const issues=[];
    const issue=(code,detail)=>issues.push({severity:'error',code,detail});
    if(data?.version!==1||!core.validDate(data?.from)||data.from!==data.to||!Array.isArray(data.feeds))return [{severity:'error',code:'INVALID_SNAPSHOT',detail:'Expected one KST day and a feed list'}];
    const seenLeagues=new Set();
    for(const feed of data.feeds){
        if(!feed||!leagues.has(feed.leagueId)||seenLeagues.has(feed.leagueId)){issue('INVALID_FEED','Unknown or duplicate league');continue;}
        seenLeagues.add(feed.leagueId);
        if(!['ok','stale','error'].includes(feed.state)||!Array.isArray(feed.matches)){issue('INVALID_FEED',feed.leagueId);continue;}
        const fetched=Date.parse(feed.fetchedAt);
        if(feed.state!=='error'&&(!Number.isFinite(fetched)||fetched>now+300000))issue('INVALID_TIMESTAMP',feed.leagueId);
        const seenGames=new Set();
        for(const match of feed.matches){
            if(!match||typeof match.id!=='string'||!match.id||match.leagueId!==feed.leagueId||match.rawDate!==data.from){issue('MATCH_SCOPE_MISMATCH',feed.leagueId);continue;}
            if(seenGames.has(match.id))issue('DUPLICATE_MATCH',match.id);seenGames.add(match.id);
            if(!identity(match.leagueId,match.homeTeamId)||!identity(match.leagueId,match.awayTeamId)||match.homeTeamId===match.awayTeamId)issue('INVALID_TEAM_ID',match.id);
            if(typeof match.homeTeam!=='string'||!match.homeTeam.trim()||typeof match.awayTeam!=='string'||!match.awayTeam.trim())issue('MISSING_TEAM_NAME',match.id);
            const league=leagues.get(feed.leagueId);if(match.region!==league.region||match.sport!==league.sport)issue('MATCH_REGISTRY_MISMATCH',match.id);
            if(!Object.hasOwn(core.LABELS,match.status))issue('INVALID_MATCH_STATE',match.id);
            if(!Number.isFinite(Date.parse(match.isoDate))||core.kstDate(match.isoDate)!==match.rawDate)issue('MATCH_DATE_MISMATCH',match.id);
            for(const side of ['home','away']){
                const value=match[side+'Score'];
                if(value!==null&&(!Number.isInteger(value)||value<0))issue('INVALID_SCORE',match.id);
                if(match.status==='upcoming'&&value!==null||match.status==='finished'&&value===null)issue('SCORE_STATE_MISMATCH',match.id);
                const logo=match[side+'LogoUrl'];
                if(logo&&(!core.safeUrl(logo)||new URL(logo).username||new URL(logo).password))issue('UNSAFE_LOGO',match.id);
            }
        }
    }
    return issues;
}
function assertSnapshot(data,options){const issues=inspectSnapshot(data,options);if(issues.length)throw Error('Snapshot validation failed: '+issues.map(issue=>issue.code).join(', '));return data;}
function inspectFeed(feed,from,to=from){
    if(!core.validDate(from)||!core.validDate(to)||to<from||Date.parse(to)-Date.parse(from)>7*86400000||!Array.isArray(feed?.matches))return [{severity:'error',code:'INVALID_FEED_RANGE',detail:feed?.leagueId}];
    const issues=[],days=new Set([from]);
    for(const match of feed.matches){if(!core.validDate(match?.rawDate)||match.rawDate<from||match.rawDate>to)issues.push({severity:'error',code:'MATCH_DATE_MISMATCH',detail:match?.id});else days.add(match.rawDate);}
    for(const date of days)issues.push(...inspectSnapshot({version:1,from:date,to:date,feeds:[{...feed,matches:feed.matches.filter(match=>match.rawDate===date)}]}));
    return issues;
}

async function readSources(directory){
    const files=[];
    for(const kind of ['domestic','overseas','standings']){
        const folder=path.join(directory,kind);
        for(const name of (await fs.readdir(folder)).filter(name=>name.endsWith('.json')).sort()){
            const text=await fs.readFile(path.join(folder,name),'utf8');
            let data;try{data=JSON.parse(text);}catch{data=null;}
            files.push({kind,file:kind+'/'+name,sha256:hash(text),data});
        }
    }
    return files;
}
function inspectSources(files,{now=Date.now()}={}){
    const issues=[],counts={snapshots:0,matches:0,standingsEntries:0,recordsWithTeamId:0};
    for(const file of files){
        let checks;
        if(file.kind==='standings'){
            const id=path.basename(file.file,'.json');
            checks=standings.inspect(file.data,id,{now}).issues;
            if(leagues.get(id)?.sport!=='soccer')checks.push({severity:'error',code:'UNKNOWN_STANDINGS_LEAGUE',detail:id});
            for(const group of Array.isArray(file.data?.groups)?file.data.groups:[])for(const row of Array.isArray(group?.entries)?group.entries:[]){counts.standingsEntries++;if(identity(id,row?.teamId))counts.recordsWithTeamId++;}
        }else{
            counts.snapshots++;checks=inspectSnapshot(file.data,{now});
            if((Array.isArray(file.data?.feeds)?file.data.feeds:[]).some(feed=>leagues.get(feed?.leagueId)?.region!==(file.kind==='domestic'?'kr':'world')))checks.push({severity:'error',code:'SOURCE_NAMESPACE_MISMATCH',detail:file.file});
            if(file.data?.from!==path.basename(file.file,'.json'))checks.push({severity:'error',code:'SNAPSHOT_FILENAME_MISMATCH',detail:file.file});
            for(const feed of Array.isArray(file.data?.feeds)?file.data.feeds:[])counts.matches+=Array.isArray(feed?.matches)?feed.matches.length:0;
        }
        issues.push(...checks.map(issue=>({...issue,file:file.file})));
        const stamp=file.kind==='standings'?Date.parse(file.data?.fetchedAt):Math.min(...(Array.isArray(file.data?.feeds)?file.data.feeds:[]).filter(feed=>feed?.state!=='error').map(feed=>Date.parse(feed?.fetchedAt)));
        if(Number.isFinite(stamp)&&now-stamp>15*60000)issues.push({severity:'warning',code:'STALE_SOURCE',file:file.file,detail:'Original collection time retained; this is not a live-data verification'});
    }
    return {checkedAt:new Date().toISOString(),ok:!issues.some(issue=>issue.severity==='error'),identityComplete:counts.recordsWithTeamId===counts.standingsEntries,externalAccuracyVerified:false,counts,issues};
}
function inspectCatalog(value,sources){
    const issues=[],issue=(code,detail)=>issues.push({severity:'error',code,detail,file:'teams/catalog.json'});
    if(value?.version!==1||!Array.isArray(value.teams)||!Array.isArray(value.records))return [{severity:'error',code:'INVALID_CATALOG',file:'teams/catalog.json',detail:'Invalid catalog format'}];
    const expectedFiles=sources.map(({file,sha256})=>({file,sha256}));
    if(value.sourceDigest!==hash(JSON.stringify({contract:2,sourceFiles:expectedFiles})))issue('CATALOG_OUTDATED','Regenerate from the current source snapshots');
    const byFile=new Map(sources.map(source=>[source.file,source])),keys=new Set();
    for(const team of value.teams){
        if(!team||team.key!==identity(team.leagueId,team.teamId)||keys.has(team.key)){issue('INVALID_CATALOG_IDENTITY',team?.key);continue;}
        keys.add(team.key);
        if(!team.source?.file||!/^[a-f0-9]{64}$/.test(team.source?.sha256||'')||!Number.isFinite(Date.parse(team.source?.fetchedAt))){issue('MISSING_CATALOG_EVIDENCE',team.key);continue;}
        if(team.provider!==provider(leagues.get(team.leagueId)))issue('INVALID_CATALOG_PROVIDER',team.key);
        if(team.logo?.url&&!core.safeUrl(team.logo.url))issue('UNSAFE_CATALOG_LOGO',team.key);
        const source=byFile.get(team.source?.file);if(!source)continue;
        if(source.sha256!==team.source.sha256){issues.push({severity:'warning',code:'ARCHIVED_TEAM_EVIDENCE',detail:team.key,file:'teams/catalog.json'});continue;}
        const observations=[];
        if(source.kind==='standings')for(const group of source.data?.groups||[])for(const row of group.entries||[]){if(identity(source.data.leagueId,row.teamId)===team.key)observations.push({name:row.name,logo:row.logo||''});}
        else for(const feed of source.data?.feeds||[])for(const match of feed.matches||[])for(const side of ['home','away'])if(identity(match.leagueId,match[side+'TeamId'])===team.key)observations.push({name:match[side+'Team'],logo:match[side+'LogoUrl']||''});
        if(!observations.some(observation=>observation.name===team.name))issue('CATALOG_EVIDENCE_MISMATCH',team.key);
        const logoSource=byFile.get(team.logo?.source?.file||team.source.file);
        if(team.logo?.url&&logoSource?.sha256===(team.logo.source?.sha256||team.source.sha256)){
            const urls=[];
            if(logoSource.kind==='standings')for(const group of logoSource.data?.groups||[])for(const row of group.entries||[]){if(identity(logoSource.data.leagueId,row.teamId)===team.key)urls.push(row.logo||'');}
            else for(const feed of logoSource.data?.feeds||[])for(const match of feed.matches||[])for(const side of ['home','away'])if(identity(match.leagueId,match[side+'TeamId'])===team.key)urls.push(match[side+'LogoUrl']||'');
            if(!urls.includes(team.logo.url))issue('CATALOG_EVIDENCE_MISMATCH',team.key);
        }else if(team.logo?.url)issues.push({severity:'warning',code:'ARCHIVED_LOGO_EVIDENCE',detail:team.key,file:'teams/catalog.json'});
    }
    const records=new Set();
    for(const record of value.records){
        if(!record||typeof record!=='object'){issue('INVALID_CATALOG_RECORD','Invalid record');continue;}
        if(!keys.has(record.teamKey)||records.has(record.key)||typeof record.season!=='string'||!record.season||record.key!==[record.teamKey,record.season,record.groupId||record.group].join(':'))issue('INVALID_CATALOG_RECORD',record.key);records.add(record.key);
        const source=byFile.get(record.source?.file);
        const row=source?.data?.groups?.filter(group=>group.season===record.season&&(group.groupId||group.name)===(record.groupId||record.group)).flatMap(group=>group.entries).find(row=>identity(record.leagueId,row.teamId)===record.teamKey);
        const fields={rank:'rank',played:'played',won:'won',drawn:'drawn',lost:'lost',goalsFor:'gf',goalsAgainst:'ga',goalDifference:'gd',points:'pts'};
        if(!row||record.source.sha256!==source.sha256||Object.entries(fields).some(([key,raw])=>record[key]!== (row[raw]??null)))issue('CATALOG_RECORD_MISMATCH',record.key);
    }
    return issues;
}
async function audit(directory){
    const sources=await readSources(directory),report=inspectSources(sources);
    if(report.ok)try{const catalog=JSON.parse(await fs.readFile(path.join(directory,'teams','catalog.json'),'utf8'));report.issues.push(...inspectCatalog(catalog,sources));}catch(error){if(error.code!=='ENOENT')throw error;}
    report.ok=!report.issues.some(issue=>issue.severity==='error');return {...report,sources:sources.map(({file,sha256})=>({file,sha256}))};
}

async function sync(directory){
    const sources=await readSources(directory),report=inspectSources(sources);
    if(!report.ok)throw Error('Team data sync blocked: '+report.issues.filter(issue=>issue.severity==='error').map(issue=>issue.file+':'+issue.code).join(', '));
    const target=path.join(directory,'teams','catalog.json');
    let previous;try{previous=JSON.parse(await fs.readFile(target,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(previous&&(previous.version!==1||!Array.isArray(previous.teams)))throw Error('Existing team catalog is invalid; preserve it for investigation');
    const sourceFiles=sources.map(({file,sha256})=>({file,sha256})),sourceDigest=hash(JSON.stringify({contract:2,sourceFiles}));
    if(previous?.sourceDigest===sourceDigest){const issues=inspectCatalog(previous,sources).filter(issue=>issue.severity==='error');if(issues.length)throw Error('Existing catalog integrity failed: '+issues.map(issue=>issue.code).join(', '));return {changed:false,catalog:previous,report};}
    const teams=new Map((previous?.teams||[]).map(team=>[team.key,structuredClone(team)]));
    const observe=(leagueId,id,name,logo,source,at,sourceUrl)=>{
        const key=identity(leagueId,id);if(!key)return null;
        const league=leagues.get(leagueId),stamp=new Date(at).toISOString();
        let team=teams.get(key);
        if(!team){team={key,provider:provider(league),leagueId,teamId:id,name,aliases:[],firstObservedAt:stamp,lastObservedAt:stamp,logo:{url:'',assetStatus:'not-checked',verifiedAt:null},revisions:[]};teams.set(key,team);}
        team.aliases=[...new Set([...team.aliases,name])].sort();
        if(stamp<team.firstObservedAt)team.firstObservedAt=stamp;
        if(stamp<team.lastObservedAt)return key;
        if(team.source&&(team.name!==name||logo&&team.logo.url!==logo))team.revisions.push({observedAt:team.lastObservedAt,name:team.name,logoUrl:team.logo.url,source:team.source});
        team.revisions=team.revisions.slice(-20);team.name=name;team.lastObservedAt=stamp;
        team.source={file:source.file,sha256:source.sha256,fetchedAt:stamp,url:core.safeUrl(sourceUrl)};
        if(logo)team.logo={url:logo,observedAt:stamp,source:{...team.source},assetStatus:'not-checked',verifiedAt:null};
        return key;
    };
    const records=[];
    for(const source of sources){
        if(source.kind==='standings'){
            const leagueId=source.data.leagueId;
            for(const group of source.data.groups)for(const row of group.entries){
                const key=observe(leagueId,row.teamId,row.name,row.logo,source,source.data.fetchedAt,source.data.sourceUrl);
                if(!key)continue;
                records.push({key:[key,group.season,group.groupId||group.name].join(':'),teamKey:key,leagueId,season:group.season,group:group.name,groupId:group.groupId||null,rank:row.rank??null,played:row.played??null,won:row.won??null,drawn:row.drawn??null,lost:row.lost??null,goalsFor:row.gf??null,goalsAgainst:row.ga??null,goalDifference:row.gd??null,points:row.pts??null,fetchedAt:source.data.fetchedAt,state:source.data.state||'unknown',validation:'schema-validated',source:{file:source.file,sha256:source.sha256,url:core.safeUrl(source.data.sourceUrl)}});
            }
        }else for(const feed of source.data.feeds)for(const match of feed.matches)for(const side of ['home','away'])observe(match.leagueId,match[side+'TeamId'],match[side+'Team'],match[side+'LogoUrl'],source,feed.fetchedAt,match.sourceUrl);
    }
    const catalog={version:1,generatedAt:new Date().toISOString(),sourceDigest,sourceFiles,teams:[...teams.values()].sort((a,b)=>a.key.localeCompare(b.key)),records,recordCoverage:{available:report.counts.standingsEntries,linked:records.length,pendingIdentity:report.counts.standingsEntries-records.length},validation:{scope:'schema-and-team-identity',recordsIdentityComplete:report.identityComplete,externalAccuracyVerified:false,logoAssetsVerified:false}};
    await writeJsonAtomic(target,catalog);
    return {changed:true,catalog,report};
}
module.exports={identity,inspectSnapshot,assertSnapshot,inspectFeed,inspectSources,inspectCatalog,readSources,audit,sync};
