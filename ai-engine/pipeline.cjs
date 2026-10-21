'use strict';
const core = require('../sports-core.js');
const { getScores } = require('../server/domestic.cjs');
const { collectLeague } = require('../server/overseas.cjs');
const { upsertGames, beginRun, finishRun } = require('./repository.cjs');
const { collectNbaOdds } = require('./providers/odds-api.cjs');

function dates(from,to) {
    if (!core.validDate(from) || !core.validDate(to) || to<from) throw new Error('Invalid date range');
    const result=[]; for(let date=from;date<=to;date=core.shiftDate(date,1)) result.push(date);
    if(result.length>8) throw new Error('Maximum collection range is 8 days');
    return result;
}

function bucket(now = new Date()) { return new Date(Math.floor(now.getTime()/300000)*300000).toISOString(); }

async function collectLeagueRange(db,leagueCode,from,to) {
    const key=`collect:${leagueCode}:${from}:${to}:${bucket()}`,run=beginRun(db,'collect',leagueCode,key);
    if(run.status!=='running') return {state:run.status==='succeeded'?'skipped':run.status,reason:'IDEMPOTENT_REPLAY',runId:run.id};
    try {
        let feeds=[];
        if(leagueCode==='kbl') {
            const response=await getScores(from,to),feed=response.feeds.find(item=>item.leagueId==='kbl');
            if(feed) feeds=[feed];
        } else if(leagueCode==='nba') feeds=await Promise.all(dates(from,to).map(date=>collectLeague('nba',date)));
        else throw new Error('Unsupported league');
        const readable=feeds.filter(feed=>feed.state==='ok');
        let written=0,read=0;
        for(const feed of readable){read+=(feed.matches||[]).length;written+=upsertGames(db,leagueCode,leagueCode==='kbl'?'naver_sports':'espn_scoreboard',feed);}
        const state=feeds.length&&readable.length===feeds.length?'succeeded':readable.length?'partial':'failed';
        const details={recordsRead:read,recordsWritten:written,feeds:feeds.map(feed=>({state:feed.state,fetchedAt:feed.fetchedAt,count:feed.matches?.length||0}))};
        finishRun(db,run.id,state,details,state==='failed'?'All upstream feeds failed':null);
        return {state,runId:run.id,...details};
    } catch(error) { finishRun(db,run.id,'failed',{},error.message); throw error; }
}

async function collectMarkets(db,config) {
    const run=beginRun(db,'odds','nba',`odds:nba:${bucket()}`);
    if(run.status!=='running') return {state:'skipped',reason:'IDEMPOTENT_REPLAY',runId:run.id};
    try { const result=await collectNbaOdds(db,config); finishRun(db,run.id,result.state==='ok'?'succeeded':'skipped',{recordsWritten:result.written||0,...result}); return result; }
    catch(error){finishRun(db,run.id,'failed',{},error.message);throw error;}
}

function assertCollections(results) {
    for(const [league,result] of Object.entries(results)) {
        if(!['succeeded','skipped'].includes(result.state))throw new Error(`${league}: collection ${result.state}; keep the last verified public snapshot`);
    }
}

module.exports={collectLeagueRange,collectMarkets,dates,bucket,assertCollections};
