PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_sources (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT,
  source_class TEXT NOT NULL CHECK(source_class IN ('official','licensed','public_web','manual_verified')),
  usage_status TEXT NOT NULL CHECK(usage_status IN ('enabled','credentials_required','approval_required','disabled')),
  terms_url TEXT,
  last_checked_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK(code IN ('kbl','nba')),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  label TEXT NOT NULL,
  starts_on TEXT,
  ends_on TEXT,
  phase TEXT NOT NULL DEFAULT 'DATA_UNAVAILABLE',
  UNIQUE(league_id, label, phase)
);

CREATE TABLE IF NOT EXISTS season_rules (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  rule_code TEXT NOT NULL,
  rule_value_json TEXT NOT NULL CHECK(json_valid(rule_value_json)),
  source_id INTEGER REFERENCES data_sources(id),
  verified_at TEXT,
  UNIQUE(season_id, rule_code)
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  provider_key TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  UNIQUE(league_id, provider_key)
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  provider_key TEXT NOT NULL,
  name TEXT NOT NULL,
  nationality TEXT,
  is_foreign_player INTEGER CHECK(is_foreign_player IN (0,1) OR is_foreign_player IS NULL),
  UNIQUE(league_id, provider_key)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  season_id INTEGER REFERENCES seasons(id),
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  provider_game_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('upcoming','live','finished','postponed','cancelled','suspended','delayed','unknown')),
  competition_phase TEXT NOT NULL DEFAULT 'DATA_UNAVAILABLE',
  home_team_id INTEGER NOT NULL REFERENCES teams(id),
  away_team_id INTEGER NOT NULL REFERENCES teams(id),
  venue TEXT,
  home_score INTEGER CHECK(home_score >= 0 OR home_score IS NULL),
  away_score INTEGER CHECK(away_score >= 0 OR away_score IS NULL),
  period_scores_json TEXT CHECK(period_scores_json IS NULL OR json_valid(period_scores_json)),
  overtime_count INTEGER CHECK(overtime_count >= 0 OR overtime_count IS NULL),
  source_collected_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_id, provider_game_id),
  CHECK(home_team_id <> away_team_id),
  CHECK(status <> 'finished' OR (home_score IS NOT NULL AND away_score IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_games_league_start ON games(league_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_games_status_start ON games(status, starts_at);

CREATE TABLE IF NOT EXISTS team_game_stats (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  is_home INTEGER NOT NULL CHECK(is_home IN (0,1)),
  minutes REAL,
  possessions REAL,
  ortg REAL, drtg REAL, netrtg REAL, pace REAL,
  efg_pct REAL, ts_pct REAL, three_pct REAL, three_par REAL, two_pct REAL, ftr REAL,
  oreb_pct REAL, dreb_pct REAL, tov_pct REAL, ast_pct REAL,
  paint_points INTEGER, fast_break_points INTEGER, second_chance_points INTEGER, bench_points INTEGER,
  stats_json TEXT CHECK(stats_json IS NULL OR json_valid(stats_json)),
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  collected_at TEXT NOT NULL,
  UNIQUE(game_id, team_id, source_id)
);

CREATE TABLE IF NOT EXISTS player_game_stats (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  availability TEXT,
  started INTEGER CHECK(started IN (0,1) OR started IS NULL),
  minutes REAL, points INTEGER, rebounds INTEGER, assists INTEGER, turnovers INTEGER,
  usage_pct REAL, true_shooting_pct REAL, on_off_netrtg REAL,
  stats_json TEXT CHECK(stats_json IS NULL OR json_valid(stats_json)),
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  collected_at TEXT NOT NULL,
  UNIQUE(game_id, player_id, source_id)
);

CREATE TABLE IF NOT EXISTS lineups (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  period INTEGER,
  player_ids_json TEXT NOT NULL CHECK(json_valid(player_ids_json)),
  minutes REAL, possessions REAL, netrtg REAL,
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  collected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS injuries (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  game_id INTEGER REFERENCES games(id),
  status TEXT NOT NULL,
  reason TEXT,
  reported_at TEXT NOT NULL,
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  collected_at TEXT NOT NULL,
  UNIQUE(player_id, game_id, reported_at, source_id)
);

CREATE TABLE IF NOT EXISTS odds_snapshots (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  bookmaker TEXT NOT NULL,
  market TEXT NOT NULL CHECK(market IN ('moneyline','spread','total','first_half_spread','first_half_total','q1_spread','q1_total','q2_spread','q2_total','q3_spread','q3_total','q4_spread','q4_total')),
  side TEXT NOT NULL,
  line REAL,
  decimal_price REAL CHECK(decimal_price > 1.0 OR decimal_price IS NULL),
  captured_at TEXT NOT NULL,
  is_closing INTEGER NOT NULL DEFAULT 0 CHECK(is_closing IN (0,1)),
  raw_json TEXT CHECK(raw_json IS NULL OR json_valid(raw_json)),
  UNIQUE(game_id, source_id, bookmaker, market, side, captured_at)
);

CREATE TABLE IF NOT EXISTS feature_snapshots (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  generated_at TEXT NOT NULL,
  cutoff_at TEXT NOT NULL,
  feature_set_version TEXT NOT NULL,
  features_json TEXT NOT NULL CHECK(json_valid(features_json)),
  completeness REAL NOT NULL CHECK(completeness BETWEEN 0 AND 1),
  UNIQUE(game_id, cutoff_at, feature_set_version),
  CHECK(generated_at <= cutoff_at)
);

CREATE TABLE IF NOT EXISTS training_runs (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  algorithm TEXT NOT NULL,
  status TEXT NOT NULL,
  train_from TEXT,
  train_to TEXT,
  validation_from TEXT,
  validation_to TEXT,
  game_count INTEGER NOT NULL DEFAULT 0,
  metrics_json TEXT CHECK(metrics_json IS NULL OR json_valid(metrics_json)),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS model_versions (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  training_run_id INTEGER REFERENCES training_runs(id),
  version TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  artifact_json TEXT NOT NULL CHECK(json_valid(artifact_json)),
  metrics_json TEXT CHECK(metrics_json IS NULL OR json_valid(metrics_json)),
  trained_through TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deployed_at TEXT,
  retired_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  UNIQUE(league_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_model_per_league ON model_versions(league_id) WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  model_version_id INTEGER NOT NULL REFERENCES model_versions(id),
  feature_snapshot_id INTEGER NOT NULL REFERENCES feature_snapshots(id),
  generated_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RECOMMEND','PASS')),
  home_win_probability REAL NOT NULL CHECK(home_win_probability BETWEEN 0 AND 1),
  away_win_probability REAL NOT NULL CHECK(away_win_probability BETWEEN 0 AND 1),
  expected_home_score REAL,
  expected_away_score REAL,
  expected_margin REAL,
  fair_spread REAL,
  expected_total REAL,
  fair_total REAL,
  market_snapshot_id INTEGER REFERENCES odds_snapshots(id),
  edge REAL,
  recommendation TEXT,
  rationale_json TEXT NOT NULL CHECK(json_valid(rationale_json)),
  risk_factors_json TEXT NOT NULL CHECK(json_valid(risk_factors_json)),
  data_confidence TEXT NOT NULL CHECK(data_confidence IN ('HIGH','MEDIUM','LOW','DATA_UNAVAILABLE')),
  UNIQUE(game_id, model_version_id, generated_at),
  CHECK(abs((home_win_probability + away_win_probability) - 1.0) < 0.000001)
);

CREATE TRIGGER IF NOT EXISTS predictions_no_update BEFORE UPDATE ON predictions
BEGIN SELECT RAISE(ABORT, 'predictions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS predictions_no_delete BEFORE DELETE ON predictions
BEGIN SELECT RAISE(ABORT, 'predictions are immutable'); END;

CREATE TABLE IF NOT EXISTS prediction_results (
  id INTEGER PRIMARY KEY,
  prediction_id INTEGER NOT NULL UNIQUE REFERENCES predictions(id),
  scored_at TEXT NOT NULL,
  home_win_correct INTEGER CHECK(home_win_correct IN (0,1)),
  score_mae REAL,
  spread_result TEXT CHECK(spread_result IN ('HIT','MISS','PUSH','NOT_GRADED') OR spread_result IS NULL),
  total_result TEXT CHECK(total_result IN ('HIT','MISS','PUSH','NOT_GRADED') OR total_result IS NULL),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  analysis_json TEXT NOT NULL CHECK(json_valid(analysis_json))
);

CREATE TABLE IF NOT EXISTS backtest_runs (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  algorithm TEXT NOT NULL,
  feature_set_version TEXT NOT NULL,
  train_from TEXT, test_from TEXT, test_to TEXT,
  sample_count INTEGER NOT NULL,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  metrics_json TEXT NOT NULL CHECK(json_valid(metrics_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY,
  run_type TEXT NOT NULL,
  league_code TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','succeeded','partial','failed','skipped')),
  idempotency_key TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_written INTEGER NOT NULL DEFAULT 0,
  details_json TEXT CHECK(details_json IS NULL OR json_valid(details_json)),
  error TEXT
);

CREATE TABLE IF NOT EXISTS data_revisions (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  changed_at TEXT NOT NULL,
  source_id INTEGER REFERENCES data_sources(id),
  before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK(json_valid(after_json)),
  reason TEXT NOT NULL
);
