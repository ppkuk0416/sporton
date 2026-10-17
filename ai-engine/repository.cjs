'use strict';
const { transaction } = require('./db.cjs');

const iso = value => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid timestamp');
    return date.toISOString();
};

function seasonLabel(startsAt) {
    const date = new Date(startsAt);
    const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
    const first = month >= 7 ? year : year - 1;
    return `${first}-${String(first + 1).slice(-2)}`;
}

function ids(db, leagueCode, sourceCode) {
    const league = db.prepare('SELECT id FROM leagues WHERE code=?').get(leagueCode);
    const source = db.prepare('SELECT id,usage_status FROM data_sources WHERE code=?').get(sourceCode);
    if (!league || !source) throw new Error('Unknown league or source');
    if (source.usage_status !== 'enabled') throw new Error(`Source ${sourceCode} is not enabled`);
    return { leagueId: league.id, sourceId: source.id };
}

function ensureSeason(db, leagueId, label) {
    db.prepare(`INSERT INTO seasons(league_id,label,phase) VALUES(?,?,?)
        ON CONFLICT(league_id,label,phase) DO NOTHING`).run(leagueId, label, 'DATA_UNAVAILABLE');
    return db.prepare('SELECT id FROM seasons WHERE league_id=? AND label=? AND phase=?').get(leagueId, label, 'DATA_UNAVAILABLE').id;
}

function ensureTeam(db, leagueId, providerKey, name) {
    db.prepare(`INSERT INTO teams(league_id,provider_key,name) VALUES(?,?,?)
        ON CONFLICT(league_id,provider_key) DO UPDATE SET name=excluded.name`).run(leagueId, String(providerKey), String(name));
    return db.prepare('SELECT id FROM teams WHERE league_id=? AND provider_key=?').get(leagueId, String(providerKey)).id;
}

function upsertGames(db, leagueCode, sourceCode, feed) {
    const { leagueId, sourceId } = ids(db, leagueCode, sourceCode);
    const now = new Date().toISOString();
    let written = 0;
    return transaction(db, () => {
        for (const match of feed.matches || []) {
            const providerGameId = match.providerId || match.id;
            if (match.leagueId !== leagueCode || !providerGameId || !match.isoDate) continue;
            const start = iso(match.isoDate);
            const seasonId = ensureSeason(db, leagueId, seasonLabel(start));
            const homeId = ensureTeam(db, leagueId, match.homeTeamId || match.homeTeam, match.homeTeam);
            const awayId = ensureTeam(db, leagueId, match.awayTeamId || match.awayTeam, match.awayTeam);
            const existing = db.prepare('SELECT * FROM games WHERE source_id=? AND provider_game_id=?').get(sourceId, String(providerGameId));
            const values = {
                league_id: leagueId, season_id: seasonId, source_id: sourceId,
                provider_game_id: String(providerGameId), starts_at: start, status: match.status,
                home_team_id: homeId, away_team_id: awayId,
                home_score: match.homeScore, away_score: match.awayScore,
                period_scores_json: match.periods ? JSON.stringify(match.periods) : null,
                source_collected_at: iso(feed.fetchedAt || now), updated_at: now
            };
            if (!existing) {
                db.prepare(`INSERT INTO games(league_id,season_id,source_id,provider_game_id,starts_at,status,
                    home_team_id,away_team_id,home_score,away_score,period_scores_json,source_collected_at,first_seen_at,updated_at)
                    VALUES(@league_id,@season_id,@source_id,@provider_game_id,@starts_at,@status,@home_team_id,@away_team_id,
                    @home_score,@away_score,@period_scores_json,@source_collected_at,@updated_at,@updated_at)`).run(values);
                written++;
            } else {
                const before = JSON.stringify({ status: existing.status, homeScore: existing.home_score, awayScore: existing.away_score });
                const after = JSON.stringify({ status: values.status, homeScore: values.home_score, awayScore: values.away_score });
                if (before !== after) db.prepare(`INSERT INTO data_revisions(entity_type,entity_id,changed_at,source_id,before_json,after_json,reason)
                    VALUES('game',?,?,?,?,?,'source_refresh')`).run(existing.id, now, sourceId, before, after);
                db.prepare(`UPDATE games SET season_id=@season_id,starts_at=@starts_at,status=@status,home_team_id=@home_team_id,
                    away_team_id=@away_team_id,home_score=@home_score,away_score=@away_score,period_scores_json=@period_scores_json,
                    source_collected_at=@source_collected_at,updated_at=@updated_at WHERE id=@id`).run({
                        season_id:values.season_id,starts_at:values.starts_at,status:values.status,
                        home_team_id:values.home_team_id,away_team_id:values.away_team_id,
                        home_score:values.home_score,away_score:values.away_score,period_scores_json:values.period_scores_json,
                        source_collected_at:values.source_collected_at,updated_at:values.updated_at,id:existing.id
                    });
                written++;
            }
        }
        return written;
    });
}

function completedGames(db, leagueCode, before = '9999-12-31T23:59:59.999Z') {
    return db.prepare(`SELECT g.*,h.name home_team,a.name away_team FROM games g
        JOIN leagues l ON l.id=g.league_id JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id
        WHERE l.code=? AND g.status='finished' AND g.starts_at < ? ORDER BY g.starts_at,g.id`).all(leagueCode, before);
}

function upcomingGames(db, leagueCode, from, to) {
    return db.prepare(`SELECT g.*,h.name home_team,a.name away_team FROM games g
        JOIN leagues l ON l.id=g.league_id JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id
        WHERE l.code=? AND g.status='upcoming' AND g.starts_at>=? AND g.starts_at<? ORDER BY g.starts_at,g.id`).all(leagueCode, from, to);
}

function beginRun(db, type, leagueCode, key) {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM pipeline_runs WHERE idempotency_key=?').get(key);
    if (existing) return existing;
    return db.prepare(`INSERT INTO pipeline_runs(run_type,league_code,status,idempotency_key,started_at)
        VALUES(?,?,'running',?,?) RETURNING *`).get(type, leagueCode || null, key, now);
}

function finishRun(db, id, status, details = {}, error = null) {
    db.prepare(`UPDATE pipeline_runs SET status=?,finished_at=?,records_read=?,records_written=?,details_json=?,error=? WHERE id=?`)
        .run(status, new Date().toISOString(), details.recordsRead || 0, details.recordsWritten || 0, JSON.stringify(details), error, id);
}

module.exports = { seasonLabel, upsertGames, completedGames, upcomingGames, beginRun, finishRun };
