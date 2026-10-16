'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {openDatabase}=require('../ai-engine/db.cjs');
const {upsertGames}=require('../ai-engine/repository.cjs');
const {trainLeague,predictDate,scoreFinished,marketAssessment}=require('../ai-engine/service.cjs');
const {walkForward}=require('../ai-engine/model.cjs');

function feed(count=60){
    const teams=Array.from({length:6},(_,index)=>({id:'t'+index,name:'Team '+index}));
    const matches=[];
    for(let index=0;index<count;index++){
        const home=teams[index%teams.length],away=teams[(index+1+(index%3))%teams.length];
        matches.push({id:'g'+index,providerId:'g'+index,leagueId:'kbl',isoDate:new Date(Date.UTC(2026,0,1+index,10)).toISOString(),status:'finished',
            homeTeamId:home.id,homeTeam:home.name,awayTeamId:away.id,awayTeam:away.name,homeScore:88+(index%11),awayScore:81+(index%7)});
    }
    matches.push({id:'future',providerId:'future',leagueId:'kbl',isoDate:'2026-10-20T10:00:00.000Z',status:'upcoming',
        homeTeamId:'t0',homeTeam:'Team 0',awayTeamId:'t1',awayTeam:'Team 1',homeScore:null,awayScore:null});
    return {state:'ok',fetchedAt:'2026-10-19T00:00:00.000Z',matches};
}

test('AI schema contains required entities, source gates and season-specific KBL rule',()=>{
    const db=openDatabase(':memory:');
    const required=['leagues','seasons','teams','players','games','team_game_stats','player_game_stats','lineups','injuries','odds_snapshots','feature_snapshots','model_versions','training_runs','predictions','prediction_results','backtest_runs','pipeline_runs'];
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
    required.forEach(name=>assert.ok(tables.has(name),name));
    assert.equal(db.prepare("SELECT usage_status FROM data_sources WHERE code='nba_official_stats'").get().usage_status,'approval_required');
    const rule=JSON.parse(db.prepare("SELECT rule_value_json FROM season_rules WHERE rule_code='foreign_players_on_court_by_quarter'").get().rule_value_json);
    assert.deepEqual(rule,{q1:1,q2:2,q3:2,q4:1});db.close();
});

test('game ingestion is idempotent and records source corrections',()=>{
    const db=openDatabase(':memory:'),first=feed(1);assert.equal(upsertGames(db,'kbl','naver_sports',first),2);
    assert.equal(upsertGames(db,'kbl','naver_sports',first),2);assert.equal(db.prepare('SELECT count(*) n FROM games').get().n,2);
    first.matches[0].homeScore=101;upsertGames(db,'kbl','naver_sports',first);
    assert.equal(db.prepare('SELECT count(*) n FROM data_revisions').get().n,1);db.close();
});

test('walk-forward training produces pregame predictions and immutable PASS records without market or injury data',()=>{
    const db=openDatabase(':memory:');upsertGames(db,'kbl','naver_sports',feed());
    const config={minTrainGames:40,minTeamGames:3,edgeThreshold:.04};
    const trained=trainLeague(db,'kbl',config);assert.equal(trained.state,'ok');assert.equal(trained.promoted,true);assert.ok(trained.metrics.sampleCount>0);
    const predicted=predictDate(db,'kbl','2026-10-20',config,new Date('2026-10-19T00:00:00.000Z'));
    assert.equal(predicted.created,1);assert.equal(predicted.recommended,0);assert.equal(predicted.passed,1);
    const row=db.prepare('SELECT * FROM predictions').get();assert.equal(row.status,'PASS');assert.ok(Math.abs(row.home_win_probability+row.away_win_probability-1)<1e-6);
    assert.ok(JSON.parse(row.risk_factors_json).includes('INJURY_DATA_UNAVAILABLE'));
    const game=db.prepare("SELECT * FROM games WHERE provider_game_id='future'").get();assert.ok(row.generated_at<game.starts_at);
    assert.throws(()=>db.prepare("UPDATE predictions SET status='RECOMMEND' WHERE id=?").run(row.id),/immutable/);
    db.prepare("UPDATE games SET status='finished',home_score=95,away_score=90 WHERE id=?").run(game.id);
    assert.equal(scoreFinished(db).scored,1);assert.equal(db.prepare('SELECT count(*) n FROM prediction_results').get().n,1);db.close();
});

test('market assessment removes vig and enforces the edge threshold',()=>{
    const rows=[{market:'moneyline',side:'home',decimal_price:2},{market:'moneyline',side:'away',decimal_price:2}];
    assert.equal(marketAssessment(rows,{homeWinProbability:.52},.04).status,'PASS');
    const recommendation=marketAssessment(rows,{homeWinProbability:.6},.04);assert.equal(recommendation.status,'RECOMMEND');assert.equal(recommendation.recommendation,'HOME_MONEYLINE');
    assert.equal(marketAssessment(null,{homeWinProbability:.8},.04).status,'PASS');
});

test('walk-forward validation never trains on the game being evaluated',()=>{
    const games=feed(30).matches.filter(game=>game.status==='finished').map((game,index)=>({
        ...game,home_team_id:Number(game.homeTeamId.slice(1))+1,away_team_id:Number(game.awayTeamId.slice(1))+1,
        home_score:game.homeScore,away_score:game.awayScore,starts_at:game.isoDate,index
    }));
    const result=walkForward(games,{minimum:20,minTeamGames:3});assert.ok(result.rows.length>0);
    assert.equal(result.rows[0].startsAt,games[20].starts_at);
});
