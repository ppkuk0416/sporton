#!/usr/bin/env node
'use strict';
const core = require('../sports-core.js');
const { loadConfig } = require('./config.cjs');
const { openDatabase } = require('./db.cjs');
const Pipeline = require('./pipeline.cjs');
const Service = require('./service.cjs');

function options(values) {
    const result={};
    for(let index=0;index<values.length;index++) if(values[index].startsWith('--')) {
        const [key,inline]=values[index].slice(2).split('=',2); result[key]=inline ?? (!values[index+1]?.startsWith('--')?values[++index]:true);
    }
    return result;
}
const shift=(date,days)=>core.shiftDate(date,days);

async function main(argv=process.argv.slice(2)) {
    const command=argv[0]||'help',args=options(argv.slice(1)),config=loadConfig(),db=openDatabase(config.dbPath);
    try {
        const today=core.kstDate(),leagueCodes=String(args.league||'kbl,nba').split(',').filter(code=>['kbl','nba'].includes(code));
        if(command==='migrate') return {state:'ok',database:config.dbPath,schemaVersion:db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version};
        if(command==='collect') {
            const from=args.from||today,to=args.to||from,results={};
            for(const league of leagueCodes) results[league]=await Pipeline.collectLeagueRange(db,league,from,to);
            if(leagueCodes.includes('nba')) results.odds=await Pipeline.collectMarkets(db,config);
            return results;
        }
        if(command==='train') { const result={};for(const league of leagueCodes)result[league]=Service.trainLeague(db,league,config);return result; }
        if(command==='predict') { const date=args.date||today,result={};for(const league of leagueCodes)result[league]=Service.predictDate(db,league,date,config);return result; }
        if(command==='score') return Service.scoreFinished(db);
        if(command==='backtest') { const result={};for(const league of leagueCodes)result[league]=Service.backtestLeague(db,league,config);return result; }
        if(command==='daily') {
            const result={collect:{},score:null,train:{},predict:{}};
            for(const league of leagueCodes) result.collect[league]=await Pipeline.collectLeagueRange(db,league,shift(today,-1),shift(today,1));
            if(leagueCodes.includes('nba'))result.odds=await Pipeline.collectMarkets(db,config);
            result.score=Service.scoreFinished(db);
            for(const league of leagueCodes){result.train[league]=Service.trainLeague(db,league,config);result.predict[league]=Service.predictDate(db,league,today,config);}
            return result;
        }
        return {usage:'node ai-engine/cli.cjs <migrate|collect|train|predict|score|backtest|daily> [--league kbl,nba] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--date YYYY-MM-DD]'};
    } finally { db.close(); }
}

if(require.main===module) main().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(JSON.stringify({state:'failed',error:error.message}));process.exitCode=1;});
module.exports={main,options};
