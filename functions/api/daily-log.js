import crypto from 'crypto';
import { triggerPusherEvent } from './_pusher.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-socket-id',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const SCHEMA_INIT_SQL = `
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
CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT UNIQUE NOT NULL,
  started_date  TEXT NOT NULL,
  finished_date TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE IF NOT EXISTS weekly_grocery (
  week_start     TEXT PRIMARY KEY,
  checked_items  TEXT NOT NULL DEFAULT '[]',
  updated_at     TEXT DEFAULT (CURRENT_TIMESTAMP)
);
`;

function verifyToken(token, rawSecret) {
  const secret = (rawSecret || '').replace(/^["']|["']$/g, '').trim();
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now();
  } catch { return false; }
}

function formatLogRow(row) {
  if (!row) return null;
  return {
    ...row,
    shilajit_taken: Boolean(row.shilajit_taken),
    creatine_taken: Boolean(row.creatine_taken),
    isabgul_taken: Boolean(row.isabgul_taken),
    acv_taken: Boolean(row.acv_taken),
    multivitamin_taken: Boolean(row.multivitamin_taken),
    omega3_taken: Boolean(row.omega3_taken),
    whey_protein_taken: Boolean(row.whey_protein_taken),
    breakfast_logged: Boolean(row.breakfast_logged),
    lunch_logged: Boolean(row.lunch_logged),
    afternoon_snack_logged: Boolean(row.afternoon_snack_logged),
    dinner_logged: Boolean(row.dinner_logged),
    scheduled_workout_completed: Boolean(row.scheduled_workout_completed),
    post_dinner_walk_completed: Boolean(row.post_dinner_walk_completed),
    kegels_completed: Boolean(row.kegels_completed),
    glute_bridges_completed: Boolean(row.glute_bridges_completed),
    morning_meditation_completed: Boolean(row.morning_meditation_completed),
    night_meditation_completed: Boolean(row.night_meditation_completed),
    doorway_stretches_done: Boolean(row.doorway_stretches_done),
    rule_50_10_followed: Boolean(row.rule_50_10_followed),
    hydration_cutoff_followed: Boolean(row.hydration_cutoff_followed),
    screen_curfew_followed: Boolean(row.screen_curfew_followed),
    sleep_logged: Boolean(row.sleep_logged),
    book_finished: Boolean(row.book_finished),
    ashwagandha_taken: Boolean(row.ashwagandha_taken),
    bathing_completed: Boolean(row.bathing_completed),
    water_liters: row.water_liters != null ? Number(row.water_liters) : 0,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
  };
}

let dbInitialized = false;
async function ensureDb(db) {
  if (!dbInitialized) {
    try {
      await db.exec(SCHEMA_INIT_SQL);
      dbInitialized = true;
    } catch {
      // Ignore if tables exist
    }
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Verify auth token
  const auth = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token, env.APP_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({
        error: 'Cloudflare D1 Database binding (env.DB) is missing. Please go to Cloudflare Dashboard > Workers & Pages > dailyalign > Settings > Functions > D1 database bindings and bind "DB" to "dailyalign-db", then redeploy.',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  await ensureDb(db);

  const url = new URL(request.url);

  if (method === 'GET') {
    try {
      const searchParams = url.searchParams;

      // ?grocery=YYYY-MM-DD — return checked items array for that week
      const grocery = searchParams.get('grocery');
      if (grocery) {
        const row = await db.prepare("SELECT checked_items FROM weekly_grocery WHERE week_start = ?").bind(grocery).first();
        let items = [];
        if (row && row.checked_items) {
          try { items = JSON.parse(row.checked_items); } catch { items = []; }
        }
        return new Response(JSON.stringify(items), { status: 200, headers: CORS_HEADERS });
      }

      // ?books=true — return list of book titles
      const books = searchParams.get('books');
      if (books === 'true') {
        const { results } = await db.prepare("SELECT title FROM books ORDER BY started_date ASC, created_at ASC").all();
        return new Response(JSON.stringify((results || []).map(r => r.title)), { status: 200, headers: CORS_HEADERS });
      }

      // ?books=all — return full book records
      if (books === 'all') {
        const { results } = await db.prepare("SELECT title, started_date, finished_date FROM books ORDER BY started_date ASC").all();
        return new Response(JSON.stringify(results || []), { status: 200, headers: CORS_HEADERS });
      }

      // ?history=true — return historical daily logs
      const history = searchParams.get('history');
      if (history === 'true') {
        const since = searchParams.get('since');
        const query = since
          ? db.prepare("SELECT * FROM daily_recomposition_log WHERE log_date > ? ORDER BY log_date DESC").bind(since)
          : db.prepare("SELECT * FROM daily_recomposition_log ORDER BY log_date DESC");
        const { results } = await query.all();
        const formatted = (results || []).map(formatLogRow);
        return new Response(JSON.stringify(formatted), { status: 200, headers: CORS_HEADERS });
      }

      // ?date=YYYY-MM-DD (or current date)
      const date = searchParams.get('date');
      const query = date
        ? db.prepare("SELECT * FROM daily_recomposition_log WHERE log_date = ?").bind(date)
        : db.prepare("SELECT * FROM daily_recomposition_log WHERE log_date = DATE('now')");
      const row = await query.first();
      return new Response(JSON.stringify(row ? formatLogRow(row) : {}), { status: 200, headers: CORS_HEADERS });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
    }
  }

  if (method === 'POST') {
    try {
      const d = await request.json().catch(() => ({}));

      // ── Grocery checklist upsert ──────────────────────────────────────────
      if (d.grocery_week && Array.isArray(d.grocery_checked)) {
        const jsonChecked = JSON.stringify(d.grocery_checked);
        await db.prepare(`
          INSERT INTO weekly_grocery (week_start, checked_items, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(week_start) DO UPDATE SET
            checked_items = excluded.checked_items,
            updated_at = datetime('now')
        `).bind(d.grocery_week, jsonChecked).run();

        if (env.PUSHER_APP_ID && env.PUSHER_KEY && env.PUSHER_SECRET && env.PUSHER_CLUSTER) {
          const socketId = request.headers.get('x-socket-id') || request.headers.get('X-Socket-ID') || null;
          await triggerPusherEvent({
            appId: env.PUSHER_APP_ID,
            key: env.PUSHER_KEY,
            secret: env.PUSHER_SECRET,
            cluster: env.PUSHER_CLUSTER,
            channel: 'dailyalign-channel',
            event: 'grocery_updated',
            data: {
              week_start: d.grocery_week,
              checked_items: d.grocery_checked,
            },
            socketId,
          });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
      }

      // ── Daily log upsert ──────────────────────────────────────────────────
      const logDate = d.log_date || new Date().toISOString().split('T')[0];

      const upsertStmt = db.prepare(`
        INSERT INTO daily_recomposition_log (
          log_date, water_liters, shilajit_taken, creatine_taken, isabgul_taken, acv_taken,
          multivitamin_taken, omega3_taken, whey_protein_taken, breakfast_logged, lunch_logged,
          afternoon_snack_logged, dinner_logged, scheduled_workout_completed, post_dinner_walk_completed,
          kegels_completed, glute_bridges_completed, morning_meditation_completed, night_meditation_completed,
          doorway_stretches_done, rule_50_10_followed, hydration_cutoff_followed, screen_curfew_followed,
          sleep_logged, book_name, book_finished, ashwagandha_taken, weight_kg, bathing_completed
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(log_date) DO UPDATE SET
          water_liters = excluded.water_liters,
          shilajit_taken = excluded.shilajit_taken,
          creatine_taken = excluded.creatine_taken,
          isabgul_taken = excluded.isabgul_taken,
          acv_taken = excluded.acv_taken,
          multivitamin_taken = excluded.multivitamin_taken,
          omega3_taken = excluded.omega3_taken,
          whey_protein_taken = excluded.whey_protein_taken,
          breakfast_logged = excluded.breakfast_logged,
          lunch_logged = excluded.lunch_logged,
          afternoon_snack_logged = excluded.afternoon_snack_logged,
          dinner_logged = excluded.dinner_logged,
          scheduled_workout_completed = excluded.scheduled_workout_completed,
          post_dinner_walk_completed = excluded.post_dinner_walk_completed,
          kegels_completed = excluded.kegels_completed,
          glute_bridges_completed = excluded.glute_bridges_completed,
          morning_meditation_completed = excluded.morning_meditation_completed,
          night_meditation_completed = excluded.night_meditation_completed,
          doorway_stretches_done = excluded.doorway_stretches_done,
          rule_50_10_followed = excluded.rule_50_10_followed,
          hydration_cutoff_followed = excluded.hydration_cutoff_followed,
          screen_curfew_followed = excluded.screen_curfew_followed,
          sleep_logged = excluded.sleep_logged,
          book_name = excluded.book_name,
          book_finished = excluded.book_finished,
          ashwagandha_taken = excluded.ashwagandha_taken,
          weight_kg = excluded.weight_kg,
          bathing_completed = excluded.bathing_completed
        RETURNING *;
      `).bind(
        logDate,
        d.water_liters != null ? Number(d.water_liters) : 0,
        d.shilajit_taken ? 1 : 0,
        d.creatine_taken ? 1 : 0,
        d.isabgul_taken ? 1 : 0,
        d.acv_taken ? 1 : 0,
        d.multivitamin_taken ? 1 : 0,
        d.omega3_taken ? 1 : 0,
        d.whey_protein_taken ? 1 : 0,
        d.breakfast_logged ? 1 : 0,
        d.lunch_logged ? 1 : 0,
        d.afternoon_snack_logged ? 1 : 0,
        d.dinner_logged ? 1 : 0,
        d.scheduled_workout_completed ? 1 : 0,
        d.post_dinner_walk_completed ? 1 : 0,
        d.kegels_completed ? 1 : 0,
        d.glute_bridges_completed ? 1 : 0,
        d.morning_meditation_completed ? 1 : 0,
        d.night_meditation_completed ? 1 : 0,
        d.doorway_stretches_done ? 1 : 0,
        d.rule_50_10_followed ? 1 : 0,
        d.hydration_cutoff_followed ? 1 : 0,
        d.screen_curfew_followed ? 1 : 0,
        d.sleep_logged ? 1 : 0,
        d.book_name ? d.book_name.trim() : null,
        d.book_finished ? 1 : 0,
        d.ashwagandha_taken ? 1 : 0,
        d.weight_kg != null ? Number(d.weight_kg) : null,
        d.bathing_completed ? 1 : 0
      );

      let savedRow = await upsertStmt.first();
      if (!savedRow) {
        savedRow = await db.prepare("SELECT * FROM daily_recomposition_log WHERE log_date = ?").bind(logDate).first();
      }

      // Sync books table
      if (d.book_name && d.book_name.trim()) {
        const title = d.book_name.trim();
        await db.prepare(`
          INSERT INTO books (title, started_date)
          VALUES (?, ?)
          ON CONFLICT(title) DO NOTHING
        `).bind(title, logDate).run();

        if (d.book_finished) {
          await db.prepare(`
            UPDATE books SET finished_date = ?
            WHERE title = ? AND finished_date IS NULL
          `).bind(logDate, title).run();
        } else {
          await db.prepare(`
            UPDATE books SET finished_date = NULL WHERE title = ?
          `).bind(title).run();
        }
      }

      const formatted = formatLogRow(savedRow);

      if (env.PUSHER_APP_ID && env.PUSHER_KEY && env.PUSHER_SECRET && env.PUSHER_CLUSTER) {
        const socketId = request.headers.get('x-socket-id') || request.headers.get('X-Socket-ID') || null;
        await triggerPusherEvent({
          appId: env.PUSHER_APP_ID,
          key: env.PUSHER_KEY,
          secret: env.PUSHER_SECRET,
          cluster: env.PUSHER_CLUSTER,
          channel: 'dailyalign-channel',
          event: 'daily_log_updated',
          data: { row: formatted },
          socketId,
        });
      }

      return new Response(JSON.stringify(formatted), { status: 200, headers: CORS_HEADERS });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}
