const { Pool } = require('pg');
const { DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT } = require('./env');

const pool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASSWORD,
  port: DB_PORT,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL');

    await client.query("ALTER TABLE groups ADD COLUMN IF NOT EXISTS name VARCHAR(100);");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS text_it TEXT;");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS ui_type VARCHAR(20) DEFAULT 'text';");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_targeted BOOLEAN DEFAULT false;");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS injected_text TEXT;");
    await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS injected_text_it TEXT;");
    await client.query("ALTER TABLE answers ADD COLUMN IF NOT EXISTS group_id INTEGER;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_targeted_at TIMESTAMP;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;");
    await client.query("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;");
    await client.query("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS last_answered_date DATE;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        subscription JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        group_id INTEGER,
        question_id INTEGER,
        answer_text TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    try {
      await client.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN (SELECT constraint_name FROM information_schema.table_constraints
                    WHERE table_name = 'answers' AND constraint_type = 'UNIQUE') LOOP
            EXECUTE 'ALTER TABLE answers DROP CONSTRAINT ' || quote_ident(r.constraint_name);
          END LOOP;
        END $$;
      `);
      await client.query(
        "ALTER TABLE answers ADD CONSTRAINT answers_user_id_group_id_question_id_key UNIQUE (user_id, group_id, question_id)"
      );
    } catch (e) {
      console.error("Constraint patch failed:", e);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_chat (
        id VARCHAR(50) PRIMARY KEY,
        group_id INTEGER,
        user_id INTEGER,
        name TEXT,
        avatar_url TEXT,
        avatar_text TEXT,
        type VARCHAR(20),
        text TEXT,
        media_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS answers_archive (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name TEXT,
        group_id INTEGER,
        question_id INTEGER,
        question_text TEXT,
        question_text_it TEXT,
        question_date DATE,
        answer_text TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suggested_questions (
        id SERIAL PRIMARY KEY,
        user_name TEXT,
        question_text TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const activeCheck = await client.query("SELECT id FROM questions WHERE is_active = true");
    if (activeCheck.rows.length === 0) {
      console.log("No active question found. Activating one...");
      await client.query(`
        UPDATE questions SET is_active = true, used_date = CURRENT_DATE
        WHERE id = (SELECT id FROM questions WHERE used_date IS NULL ORDER BY RANDOM() LIMIT 1)
      `);
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };