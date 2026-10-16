'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const sourceRegistry = require('./source-registry.json');

function transaction(db, work) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
}

function seed(db) {
    const source = db.prepare(`INSERT INTO data_sources
        (code,name,base_url,source_class,usage_status,terms_url,last_checked_at,notes)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(code) DO UPDATE SET name=excluded.name,base_url=excluded.base_url,
        source_class=excluded.source_class,usage_status=excluded.usage_status,
        terms_url=excluded.terms_url,last_checked_at=excluded.last_checked_at,notes=excluded.notes`);
    for (const item of sourceRegistry) source.run(item.code, item.name, item.baseUrl, item.sourceClass,
        item.usageStatus, item.termsUrl, item.lastCheckedAt, item.notes);
    const league = db.prepare(`INSERT INTO leagues(code,name,timezone) VALUES(?,?,?)
        ON CONFLICT(code) DO UPDATE SET name=excluded.name,timezone=excluded.timezone`);
    league.run('kbl', 'KBL', 'Asia/Seoul');
    league.run('nba', 'NBA', 'America/New_York');

    const kblId = db.prepare("SELECT id FROM leagues WHERE code='kbl'").get().id;
    db.prepare(`INSERT INTO seasons(league_id,label,starts_on,ends_on,phase) VALUES(?,?,?,?,?)
        ON CONFLICT(league_id,label,phase) DO UPDATE SET starts_on=excluded.starts_on,ends_on=excluded.ends_on`)
        .run(kblId, '2026-27', '2026-10-01', '2027-06-30', 'regular');
    const seasonId = db.prepare("SELECT id FROM seasons WHERE league_id=? AND label='2026-27' AND phase='regular'").get(kblId).id;
    const ruleSourceId = db.prepare("SELECT id FROM data_sources WHERE code='kbl_official_rules'").get().id;
    db.prepare(`INSERT INTO season_rules(season_id,rule_code,rule_value_json,source_id,verified_at)
        VALUES(?,?,?,?,?) ON CONFLICT(season_id,rule_code) DO UPDATE SET
        rule_value_json=excluded.rule_value_json,source_id=excluded.source_id,verified_at=excluded.verified_at`)
        .run(seasonId, 'foreign_players_on_court_by_quarter', JSON.stringify({ q1: 1, q2: 2, q3: 2, q4: 1 }), ruleSourceId, '2026-10-17T00:00:00Z');
}

function migrate(db) {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    const current = db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations').get().version;
    const files = fs.readdirSync(path.join(__dirname, 'migrations')).filter(name => /^\d+_.*\.sql$/.test(name)).sort();
    transaction(db, () => {
        for (const file of files) {
            const version = Number(file.split('_')[0]);
            if (version <= current) continue;
            db.exec(fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8'));
            db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)').run(version, new Date().toISOString());
        }
        seed(db);
    });
}

function openDatabase(dbPath, options = {}) {
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    if (options.migrate !== false) migrate(db);
    return db;
}

module.exports = { openDatabase, migrate, transaction };
