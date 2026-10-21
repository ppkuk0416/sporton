'use strict';
const crypto = require('node:crypto');
const { completedGames, upcomingGames } = require('./repository.cjs');
const Model = require('./model.cjs');

const rounded = value => value == null ? null : Math.round(value * 10000) / 10000;

function trainLeague(db, leagueCode, config) {
    const league = db.prepare('SELECT id FROM leagues WHERE code=?').get(leagueCode);
    if (!league) throw new Error('Unsupported league');
    const games = completedGames(db, leagueCode);
    const current = db.prepare('SELECT * FROM model_versions WHERE league_id=? AND is_active=1').get(league.id);
    if (current && games.at(-1)?.starts_at <= current.trained_through)
        return { state:'skipped',reason:'NO_NEW_COMPLETED_GAMES',gameCount:games.length,version:current.version };
    const startedAt = new Date().toISOString();
    const run = db.prepare(`INSERT INTO training_runs(league_id,algorithm,status,train_from,train_to,game_count,started_at)
        VALUES(?,?,'running',?,?,?,?) RETURNING *`).get(league.id, 'elo-score-distribution-v1', games[0]?.starts_at || null, games.at(-1)?.starts_at || null, games.length, startedAt);
    if (games.length < config.minTrainGames) {
        const message = `Need ${config.minTrainGames} completed games; found ${games.length}`;
        db.prepare("UPDATE training_runs SET status='skipped',finished_at=?,error=? WHERE id=?").run(new Date().toISOString(), message, run.id);
        return { state: 'DATA_UNAVAILABLE', reason: 'INSUFFICIENT_LEAGUE_HISTORY', gameCount: games.length, required: config.minTrainGames };
    }
    const backtest = Model.walkForward(games, { minimum: Math.max(20, Math.floor(games.length*.5)), minTeamGames: config.minTeamGames });
    const artifact = Model.fitElo(games);
    const finishedAt = new Date().toISOString();
    db.prepare("UPDATE training_runs SET status='succeeded',finished_at=?,metrics_json=? WHERE id=?")
        .run(finishedAt, JSON.stringify(backtest.metrics), run.id);
    const version = `${leagueCode}-elo-${finishedAt.replace(/[-:.TZ]/g,'').slice(0,14)}-${crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex').slice(0,8)}`;
    const active = db.prepare('SELECT * FROM model_versions WHERE league_id=? AND is_active=1').get(league.id);
    const activeMetrics = active?.metrics_json ? JSON.parse(active.metrics_json) : null;
    const promote = backtest.metrics.sampleCount >= 20 && Number.isFinite(backtest.metrics.brierScore)
        && (!active || !Number.isFinite(activeMetrics?.brierScore) || backtest.metrics.brierScore < activeMetrics.brierScore);
    if (promote && active) db.prepare('UPDATE model_versions SET is_active=0,retired_at=? WHERE id=?').run(finishedAt, active.id);
    const model = db.prepare(`INSERT INTO model_versions(league_id,training_run_id,version,algorithm,artifact_json,metrics_json,
        trained_through,created_at,deployed_at,is_active) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING *`)
        .get(league.id, run.id, version, artifact.algorithm, JSON.stringify(artifact), JSON.stringify(backtest.metrics), games.at(-1).starts_at, finishedAt, promote ? finishedAt : null, promote ? 1 : 0);
    return { state: 'ok', modelId: model.id, version, promoted: promote, gameCount: games.length, metrics: backtest.metrics };
}

function latestMarket(db, gameId, before) {
    const rows = db.prepare(`SELECT * FROM odds_snapshots WHERE game_id=? AND captured_at<=? ORDER BY captured_at DESC,id DESC`).all(gameId,before);
    return rows.length ? rows : null;
}

function marketAssessment(rows, prediction, threshold) {
    if (!rows) return { status: 'PASS', edge: null, recommendation: null, reasons: ['MARKET_DATA_UNAVAILABLE'] };
    const moneyline = rows.filter(row=>row.market==='moneyline');
    const home = moneyline.find(row=>row.side==='home'), away = moneyline.find(row=>row.side==='away');
    if (!home?.decimal_price || !away?.decimal_price) return { status:'PASS',edge:null,recommendation:null,reasons:['MONEYLINE_DATA_UNAVAILABLE'] };
    const rawHome = 1/home.decimal_price, rawAway = 1/away.decimal_price, marketHome = rawHome/(rawHome+rawAway);
    const edge = prediction.homeWinProbability-marketHome;
    if (Math.abs(edge) < threshold) return { status:'PASS',edge,recommendation:null,reasons:['EDGE_BELOW_THRESHOLD'] };
    return { status:'RECOMMEND',edge,recommendation:edge>0?'HOME_MONEYLINE':'AWAY_MONEYLINE',reasons:[] };
}

function predictDate(db, leagueCode, date, config, now = new Date()) {
    const league = db.prepare('SELECT id FROM leagues WHERE code=?').get(leagueCode);
    const modelRow = league && db.prepare('SELECT * FROM model_versions WHERE league_id=? AND is_active=1').get(league.id);
    if (!modelRow) return { state:'DATA_UNAVAILABLE',reason:'NO_ACTIVE_MODEL',created:0 };
    const startMs = Date.parse(date+'T00:00:00+09:00');
    const from = new Date(startMs).toISOString(), to = new Date(startMs+86400000).toISOString();
    const games = upcomingGames(db, leagueCode, from, to);
    const artifact = JSON.parse(modelRow.artifact_json), generatedAt = now.toISOString();
    let created = 0, passed = 0, recommended = 0;
    for (const game of games) {
        if (generatedAt >= game.starts_at) continue;
        if (db.prepare('SELECT id FROM predictions WHERE game_id=? AND model_version_id=?').get(game.id,modelRow.id)) continue;
        const output = Model.predict(artifact, game, config.minTeamGames);
        if (output.state !== 'ok') { passed++; continue; }
        const completeness = 0.45; // verified score history only; injuries, lineups and advanced stats are unavailable.
        const snapshot = db.prepare(`INSERT INTO feature_snapshots(game_id,league_id,generated_at,cutoff_at,feature_set_version,features_json,completeness)
            VALUES(?,?,?,?,?,?,?) RETURNING id`).get(game.id,league.id,generatedAt,generatedAt,'elo-score-v1',JSON.stringify(output.features),completeness);
        const assessment = marketAssessment(latestMarket(db,game.id,generatedAt),output,config.edgeThreshold);
        const injuryMissing = true;
        if (injuryMissing) { assessment.status='PASS'; assessment.recommendation=null; assessment.reasons.push('INJURY_DATA_UNAVAILABLE'); }
        const risks = [...new Set([...assessment.reasons,'ADVANCED_STATS_UNAVAILABLE','LINEUP_DATA_UNAVAILABLE'])];
        db.prepare(`INSERT INTO predictions(game_id,model_version_id,feature_snapshot_id,generated_at,status,
            home_win_probability,away_win_probability,expected_home_score,expected_away_score,expected_margin,fair_spread,
            expected_total,fair_total,market_snapshot_id,edge,recommendation,rationale_json,risk_factors_json,data_confidence)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(game.id,modelRow.id,snapshot.id,generatedAt,assessment.status,
            rounded(output.homeWinProbability),rounded(output.awayWinProbability),rounded(output.expectedHomeScore),rounded(output.expectedAwayScore),
            rounded(output.expectedMargin),rounded(output.fairSpread),rounded(output.expectedTotal),rounded(output.fairTotal),null,
            rounded(assessment.edge),assessment.recommendation,JSON.stringify({algorithm:artifact.algorithm,featureCutoff:generatedAt}),
            JSON.stringify(risks),'LOW');
        created++; assessment.status==='RECOMMEND' ? recommended++ : passed++;
    }
    return { state:'ok',games:games.length,created,recommended,passed };
}

function scoreFinished(db) {
    const predictions = db.prepare(`SELECT p.*,g.home_score,g.away_score,g.status,g.starts_at FROM predictions p
        JOIN games g ON g.id=p.game_id LEFT JOIN prediction_results r ON r.prediction_id=p.id
        WHERE r.id IS NULL AND g.status='finished' AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL`).all();
    let scored = 0;
    for (const row of predictions) {
        if (row.generated_at >= row.starts_at) continue;
        const actualHomeWin = row.home_score > row.away_score;
        const correct = (row.home_win_probability >= .5) === actualHomeWin ? 1 : 0;
        const scoreMae = (Math.abs(row.expected_home_score-row.home_score)+Math.abs(row.expected_away_score-row.away_score))/2;
        db.prepare(`INSERT INTO prediction_results(prediction_id,scored_at,home_win_correct,score_mae,spread_result,total_result,result_json,analysis_json)
            VALUES(?,?,?,?,?,?,?,?)`).run(row.id,new Date().toISOString(),correct,rounded(scoreMae),'NOT_GRADED','NOT_GRADED',
            JSON.stringify({homeScore:row.home_score,awayScore:row.away_score}),
            JSON.stringify({marketGrading:'DATA_UNAVAILABLE',singleGameWeightChange:false}));
        scored++;
    }
    return { state:'ok',scored };
}

function backtestLeague(db, leagueCode, config) {
    const league = db.prepare('SELECT id FROM leagues WHERE code=?').get(leagueCode);
    const games = completedGames(db,leagueCode);
    const result = Model.walkForward(games,{minimum:config.minTrainGames,minTeamGames:config.minTeamGames});
    db.prepare(`INSERT INTO backtest_runs(league_id,algorithm,feature_set_version,train_from,test_from,test_to,sample_count,metrics_json,created_at)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(league.id,'elo-score-distribution-v1','elo-score-v1',games[0]?.starts_at||null,
        games[config.minTrainGames]?.starts_at||null,games.at(-1)?.starts_at||null,result.metrics.sampleCount,JSON.stringify(result.metrics),new Date().toISOString());
    return { state:result.metrics.sampleCount?'ok':'DATA_UNAVAILABLE',gameCount:games.length,metrics:result.metrics };
}

module.exports = { trainLeague, predictDate, scoreFinished, backtestLeague, marketAssessment };
