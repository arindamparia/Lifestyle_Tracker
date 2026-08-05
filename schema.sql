-- ==============================================================================
-- Cloudflare D1 (SQLite) Schema for DailyAlign
-- ==============================================================================

CREATE TABLE IF NOT EXISTS daily_recomposition_log (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date                      TEXT UNIQUE NOT NULL DEFAULT (CURRENT_DATE),
  water_liters                  REAL DEFAULT 0,
  shilajit_taken                INTEGER DEFAULT 0,
  creatine_taken                INTEGER DEFAULT 0,
  isabgul_taken                 INTEGER DEFAULT 0,
  acv_taken                     INTEGER DEFAULT 0,
  multivitamin_taken            INTEGER DEFAULT 0,
  omega3_taken                  INTEGER DEFAULT 0,
  whey_protein_taken            INTEGER DEFAULT 0,
  breakfast_logged              INTEGER DEFAULT 0,
  lunch_logged                  INTEGER DEFAULT 0,
  afternoon_snack_logged        INTEGER DEFAULT 0,
  dinner_logged                 INTEGER DEFAULT 0,
  scheduled_workout_completed   INTEGER DEFAULT 0,
  post_dinner_walk_completed    INTEGER DEFAULT 0,
  kegels_completed              INTEGER DEFAULT 0,
  glute_bridges_completed       INTEGER DEFAULT 0,
  morning_meditation_completed  INTEGER DEFAULT 0,
  night_meditation_completed    INTEGER DEFAULT 0,
  doorway_stretches_done        INTEGER DEFAULT 0,
  rule_50_10_followed           INTEGER DEFAULT 0,
  hydration_cutoff_followed     INTEGER DEFAULT 0,
  screen_curfew_followed        INTEGER DEFAULT 0,
  sleep_logged                  INTEGER DEFAULT 0,
  book_name                     TEXT DEFAULT NULL,
  book_finished                 INTEGER DEFAULT 0,
  ashwagandha_taken             INTEGER DEFAULT 0,
  weight_kg                     REAL DEFAULT NULL,
  bathing_completed             INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_daily_log_date ON daily_recomposition_log(log_date);

CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT UNIQUE NOT NULL,
  started_date  TEXT NOT NULL,
  finished_date TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_books_started ON books(started_date);

CREATE TABLE IF NOT EXISTS weekly_grocery (
  week_start     TEXT PRIMARY KEY,
  checked_items  TEXT NOT NULL DEFAULT '[]',
  updated_at     TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS passkeys (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id TEXT UNIQUE NOT NULL,
  public_key    TEXT NOT NULL,
  algorithm     INTEGER NOT NULL DEFAULT -7,
  counter       INTEGER NOT NULL DEFAULT 0,
  device_name   TEXT DEFAULT 'Passkey Device',
  created_at    TEXT DEFAULT (CURRENT_TIMESTAMP),
  last_used_at  TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_passkeys_cred ON passkeys(credential_id);

CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge   TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);

