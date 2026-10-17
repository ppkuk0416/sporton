#!/usr/bin/env node
'use strict';
const core = require('../sports-core.js');
const fs = require('node:fs/promises');
const path = require('node:path');
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
        if(command==='export') {
            const date=args.date||today,output=path.resolve(String(args.output||'data/ai/snapshot.json'));
            const leagueRows=db.prepare(`SELECT l.code,l.name,
                (SELECT count(*) FROM games g WHERE g.league_id=l.id) game_count,
                (SELECT count(*) FROM games g WHERE g.league_id=l.id AND g.status='finished') completed_games,
                (SELECT version FROM model_versions m WHERE m.league_id=l.id AND m.is_active=1) active_model,
                (SELECT trained_through FROM model_versions m WHERE m.league_id=l.id AND m.is_active=1) trained_through
                FROM leagues l ORDER BY l.code`).all();
            const sources=db.prepare('SELECT code,name,source_class,usage_status,last_checked_at FROM data_sources ORDER BY code').all();
            const latestRun=db.prepare(`SELECT run_type,league_code,status,started_at,finished_at,records_read,records_written,error
                FROM pipeline_runs ORDER BY id DESC LIMIT 1`).get()||null;
            const performanceRows=db.prepare(`SELECT l.code league,m.version model_version,count(r.id) sample_count,
                avg(r.home_win_correct) accuracy,avg(r.score_mae) score_mae
                FROM model_versions m JOIN leagues l ON l.id=m.league_id LEFT JOIN predictions p ON p.model_version_id=m.id
                LEFT JOIN prediction_results r ON r.prediction_id=p.id GROUP BY m.id ORDER BY m.created_at DESC`).all();
            const predictionRows=(league)=>db.prepare(`SELECT p.id,l.code league,g.starts_at,h.name home_team,a.name away_team,p.generated_at,p.status,
                p.home_win_probability,p.away_win_probability,p.expected_home_score,p.expected_away_score,p.expected_margin,p.fair_spread,
                p.expected_total,p.fair_total,p.edge,p.recommendation,p.risk_factors_json,p.data_confidence,m.version model_version,
                g.status game_status,g.home_score,g.away_score,r.home_win_correct,r.score_mae
                FROM predictions p JOIN games g ON g.id=p.game_id JOIN leagues l ON l.id=g.league_id
                JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id
                JOIN model_versions m ON m.id=p.model_version_id LEFT JOIN prediction_results r ON r.prediction_id=p.id
                WHERE l.code=? AND substr(datetime(g.starts_at,'+9 hours'),1,10)=? ORDER BY g.starts_at,p.generated_at`).all(league,date)
                .map(row=>({...row,risk_factors:JSON.parse(row.risk_factors_json),risk_factors_json:undefined}));
            const generatedAt=new Date().toISOString(),payload={version:1,generatedAt,date,
                status:{state:'ok',generatedAt,leagues:leagueRows,sources,latestRun,policy:{realDataOnly:true,predictionsImmutable:true,postStartOfficialPrediction:false,missingValue:'DATA_UNAVAILABLE'}},
                performance:{state:performanceRows.some(row=>row.sample_count)?'ok':'DATA_UNAVAILABLE',models:performanceRows},predictions:{}};
            for(const league of ['kbl','nba']){const rows=predictionRows(league);payload.predictions[league]={state:rows.length?'ok':'DATA_UNAVAILABLE',league,date,predictions:rows};}
            await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(payload,null,2)+'\n');
            return {state:'ok',output,date,generatedAt};
        }
        if(command==='daily') {
            const result={collect:{},score:null,train:{},predict:{}};
            for(const league of leagueCodes) result.collect[league]=await Pipeline.collectLeagueRange(db,league,shift(today,-1),shift(today,1));
            if(leagueCodes.includes('nba'))result.odds=await Pipeline.collectMarkets(db,config);
            result.score=Service.scoreFinished(db);
            for(const league of leagueCodes){result.train[league]=Service.trainLeague(db,league,config);result.predict[league]=Service.predictDate(db,league,today,config);}
            return result;
        }
        return {usage:'node ai-engine/cli.cjs <migrate|collect|train|predict|score|backtest|daily|export> [--league kbl,nba] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--date YYYY-MM-DD] [--output path]'};
    } finally { db.close(); }
}

if(require.main===module) main().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(JSON.stringify({state:'failed',error:error.message}));process.exitCode=1;});
module.exports={main,options};
