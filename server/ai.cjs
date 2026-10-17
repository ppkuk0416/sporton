'use strict';
const core = require('../sports-core.js');
const { loadConfig } = require('../ai-engine/config.cjs');
const { openDatabase } = require('../ai-engine/db.cjs');
let database;
function db() { return database ||= openDatabase(loadConfig().dbPath); }

function status() {
    const database=db();
    const leagues=database.prepare(`SELECT l.code,l.name,
        (SELECT count(*) FROM games g WHERE g.league_id=l.id) game_count,
        (SELECT count(*) FROM games g WHERE g.league_id=l.id AND g.status='finished') completed_games,
        (SELECT version FROM model_versions m WHERE m.league_id=l.id AND m.is_active=1) active_model,
        (SELECT trained_through FROM model_versions m WHERE m.league_id=l.id AND m.is_active=1) trained_through
        FROM leagues l ORDER BY l.code`).all();
    const sources=database.prepare(`SELECT code,name,source_class,usage_status,last_checked_at FROM data_sources ORDER BY code`).all();
    const latestRun=database.prepare(`SELECT run_type,league_code,status,started_at,finished_at,records_read,records_written,error
        FROM pipeline_runs ORDER BY id DESC LIMIT 1`).get()||null;
    return {state:'ok',generatedAt:new Date().toISOString(),leagues,sources,latestRun,
        policy:{realDataOnly:true,predictionsImmutable:true,postStartOfficialPrediction:false,missingValue:'DATA_UNAVAILABLE'}};
}

function predictions(leagueCode,date) {
    const database=db();
    const rows=database.prepare(`SELECT p.id,l.code league,g.starts_at,h.name home_team,a.name away_team,p.generated_at,p.status,
        p.home_win_probability,p.away_win_probability,p.expected_home_score,p.expected_away_score,p.expected_margin,p.fair_spread,
        p.expected_total,p.fair_total,p.edge,p.recommendation,p.risk_factors_json,p.data_confidence,m.version model_version,
        g.status game_status,g.home_score,g.away_score,r.home_win_correct,r.score_mae
        FROM predictions p JOIN games g ON g.id=p.game_id JOIN leagues l ON l.id=g.league_id
        JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id
        JOIN model_versions m ON m.id=p.model_version_id LEFT JOIN prediction_results r ON r.prediction_id=p.id
        WHERE l.code=? AND substr(datetime(g.starts_at,'+9 hours'),1,10)=? ORDER BY g.starts_at,p.generated_at`).all(leagueCode,date);
    return {state:rows.length?'ok':'DATA_UNAVAILABLE',league:leagueCode,date,predictions:rows.map(row=>({...row,risk_factors:JSON.parse(row.risk_factors_json),risk_factors_json:undefined}))};
}

function performance() {
    const rows=db().prepare(`SELECT l.code league,m.version model_version,count(r.id) sample_count,
        avg(r.home_win_correct) accuracy,avg(r.score_mae) score_mae
        FROM model_versions m JOIN leagues l ON l.id=m.league_id LEFT JOIN predictions p ON p.model_version_id=m.id
        LEFT JOIN prediction_results r ON r.prediction_id=p.id GROUP BY m.id ORDER BY m.created_at DESC`).all();
    return {state:rows.some(row=>row.sample_count)?'ok':'DATA_UNAVAILABLE',models:rows};
}

function snapshot(date = core.kstDate()) {
    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        date,
        status: status(),
        performance: performance(),
        predictions: {
            kbl: predictions('kbl', date),
            nba: predictions('nba', date)
        }
    };
}

function close() { if(database){database.close();database=null;} }
module.exports={status,predictions,performance,snapshot,close};
