import { neon } from '@neondatabase/serverless';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const sql = neon(process.env.DATABASE_URL);

  // Auto-create table on first use (idempotent)
  await sql`
    CREATE TABLE IF NOT EXISTS daily_recomposition_log (
      id                        SERIAL PRIMARY KEY,
      log_date                  DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
      water_liters              DECIMAL(3,1) DEFAULT 0,
      shilajit_taken            BOOLEAN DEFAULT FALSE,
      creatine_taken            BOOLEAN DEFAULT FALSE,
      isabgul_taken             BOOLEAN DEFAULT FALSE,
      acv_taken                 BOOLEAN DEFAULT FALSE,
      multivitamin_taken        BOOLEAN DEFAULT FALSE,
      omega3_taken              BOOLEAN DEFAULT FALSE,
      whey_protein_taken        BOOLEAN DEFAULT FALSE,
      breakfast_logged          BOOLEAN DEFAULT FALSE,
      lunch_logged              BOOLEAN DEFAULT FALSE,
      afternoon_snack_logged    BOOLEAN DEFAULT FALSE,
      dinner_logged             BOOLEAN DEFAULT FALSE,
      scheduled_workout_completed   BOOLEAN DEFAULT FALSE,
      post_dinner_walk_completed    BOOLEAN DEFAULT FALSE,
      kegels_completed              BOOLEAN DEFAULT FALSE,
      glute_bridges_completed       BOOLEAN DEFAULT FALSE,
      morning_meditation_completed  BOOLEAN DEFAULT FALSE,
      night_meditation_completed    BOOLEAN DEFAULT FALSE,
      doorway_stretches_done        BOOLEAN DEFAULT FALSE,
      rule_50_10_followed           BOOLEAN DEFAULT FALSE,
      hydration_cutoff_followed     BOOLEAN DEFAULT FALSE,
      screen_curfew_followed        BOOLEAN DEFAULT FALSE,
      sleep_logged                  BOOLEAN DEFAULT FALSE
    )
  `;

  if (event.httpMethod === 'GET') {
    try {
      if (event.queryStringParameters && event.queryStringParameters.history === 'true') {
        const result = await sql`SELECT * FROM daily_recomposition_log ORDER BY log_date DESC`;
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
      }

      const result = await sql`SELECT * FROM daily_recomposition_log WHERE log_date = CURRENT_DATE`;
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result.length ? result[0] : {}) };
    } catch (error) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const d = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO daily_recomposition_log (
          log_date, water_liters, shilajit_taken, creatine_taken, isabgul_taken, acv_taken,
          multivitamin_taken, omega3_taken, whey_protein_taken, breakfast_logged, lunch_logged,
          afternoon_snack_logged, dinner_logged, scheduled_workout_completed, post_dinner_walk_completed,
          kegels_completed, glute_bridges_completed, morning_meditation_completed, night_meditation_completed,
          doorway_stretches_done, rule_50_10_followed,
          hydration_cutoff_followed, screen_curfew_followed, sleep_logged
        ) VALUES (
          CURRENT_DATE, ${d.water_liters || 0}, ${d.shilajit_taken || false}, ${d.creatine_taken || false},
          ${d.isabgul_taken || false}, ${d.acv_taken || false}, ${d.multivitamin_taken || false},
          ${d.omega3_taken || false}, ${d.whey_protein_taken || false}, ${d.breakfast_logged || false},
          ${d.lunch_logged || false}, ${d.afternoon_snack_logged || false}, ${d.dinner_logged || false},
          ${d.scheduled_workout_completed || false}, ${d.post_dinner_walk_completed || false},
          ${d.kegels_completed || false}, ${d.glute_bridges_completed || false},
          ${d.morning_meditation_completed || false}, ${d.night_meditation_completed || false},
          ${d.doorway_stretches_done || false}, ${d.rule_50_10_followed || false},
          ${d.hydration_cutoff_followed || false}, ${d.screen_curfew_followed || false}, ${d.sleep_logged || false}
        )
        ON CONFLICT (log_date) DO UPDATE SET
          water_liters = EXCLUDED.water_liters, shilajit_taken = EXCLUDED.shilajit_taken,
          creatine_taken = EXCLUDED.creatine_taken, isabgul_taken = EXCLUDED.isabgul_taken,
          acv_taken = EXCLUDED.acv_taken, multivitamin_taken = EXCLUDED.multivitamin_taken,
          omega3_taken = EXCLUDED.omega3_taken, whey_protein_taken = EXCLUDED.whey_protein_taken,
          breakfast_logged = EXCLUDED.breakfast_logged, lunch_logged = EXCLUDED.lunch_logged,
          afternoon_snack_logged = EXCLUDED.afternoon_snack_logged, dinner_logged = EXCLUDED.dinner_logged,
          scheduled_workout_completed = EXCLUDED.scheduled_workout_completed,
          post_dinner_walk_completed = EXCLUDED.post_dinner_walk_completed,
          kegels_completed = EXCLUDED.kegels_completed, glute_bridges_completed = EXCLUDED.glute_bridges_completed,
          morning_meditation_completed = EXCLUDED.morning_meditation_completed,
          night_meditation_completed = EXCLUDED.night_meditation_completed,
          doorway_stretches_done = EXCLUDED.doorway_stretches_done,
          rule_50_10_followed = EXCLUDED.rule_50_10_followed,
          hydration_cutoff_followed = EXCLUDED.hydration_cutoff_followed,
          screen_curfew_followed = EXCLUDED.screen_curfew_followed,
          sleep_logged = EXCLUDED.sleep_logged
        RETURNING *;
      `;
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result[0]) };
    } catch (error) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
};
