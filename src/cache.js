// Centralized module-level cache — survives tab switches (component unmount/remount)
// but resets on full page reload. Both DailyTracker and HistoryLog share this module.

// "Effective date" treats before-5-AM as still belonging to the previous calendar day.
// Formatted in LOCAL time (not UTC) to match the user's clock.
export function getEffectiveDate() {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const _todayKey = getEffectiveDate; // alias for internal use

// Today's log — set by DailyTracker on every save
const _daily = { date: null, data: null };

// History rows keyed by YYYY-MM-DD (excludes today — that always comes from _daily)
const _historyDays = {};

// Tracks which effective date _historyDays was last populated for.
// When the effective date advances past 5 AM, _historyDays is stale and must be purged.
let _cacheDate = null;

// ── Daily (today) ─────────────────────────────────────────────────────────────

export function setTodayLog(data) {
  const key = _todayKey();
  _daily.date = key;
  _daily.data = data;
  // Mirror into history map so HistoryLog sees today's live data immediately
  _historyDays[key] = { ...data, log_date: key };
}

export function getTodayLog() {
  return _daily.date === _todayKey() ? _daily.data : null;
}

// ── History (past + today mirror) ─────────────────────────────────────────────

/** Merge an array of DB rows into the history map (keyed by log_date). */
export function mergeHistoryRows(rows) {
  const today = _todayKey();
  if (_cacheDate !== today) {
    // Effective date has advanced — purge all stale entries before merging fresh data
    for (const k of Object.keys(_historyDays)) delete _historyDays[k];
    _cacheDate = today;
  }
  for (const row of rows) {
    // Neon returns DATE columns as UTC ISO strings offset by the DB session timezone.
    // e.g. "2026-03-28" (IST) → "2026-03-27T18:30:00.000Z". Use LOCAL date parts to get the
    // correct YYYY-MM-DD key (matches what the user's browser clock shows).
    const d = row.log_date ? new Date(row.log_date) : null;
    if (!d || isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    _historyDays[key] = { ...row, log_date: key };
  }
}

/**
 * Return history as a descending-date array.
 * Today's entry always comes from _daily (live) so changes are reflected instantly.
 */
export function getHistoryAsArray() {
  const today = _todayKey();
  const map = { ..._historyDays };

  // Overlay today from live daily cache if available
  if (_daily.date === today && _daily.data) {
    map[today] = { ..._daily.data, log_date: today };
  }

  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a)) // descending
    .map(k => map[k]);
}

/**
 * Returns the latest date we have cached that is NOT today,
 * or null if we have no history yet.
 * Used as the `since` param — the backend returns rows AFTER this date.
 */
export function getLatestHistoryDate() {
  const today = _todayKey();
  const keys = Object.keys(_historyDays).filter(k => k !== today).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/** True if we have any past-day rows in cache (not counting today). */
export function hasHistoryCache() {
  const today = _todayKey();
  if (_cacheDate !== today) return false; // stale — force a full re-fetch
  return Object.keys(_historyDays).some(k => k !== today);
}

/** Wipe all in-memory cache — forces a full DB re-fetch on next component mount. */
export function clearAllCache() {
  _daily.date = null;
  _daily.data = null;
  _cacheDate = null;
  for (const k of Object.keys(_historyDays)) delete _historyDays[k];
}
