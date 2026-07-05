const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = '/app/hero-school-bot/data/heroschool.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

console.log(`[Database] Using database at: ${dbPath}`);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subject1 TEXT NOT NULL,
    subject2 TEXT NOT NULL,
    afterschool TEXT NOT NULL CHECK(afterschool IN ('club', 'work')),
    money REAL NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    is_npc BOOLEAN NOT NULL DEFAULT 0,
    student_quality TEXT CHECK(student_quality IN ('good', 'medium', 'bad')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(guild_id, name)
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    character_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    used_on TEXT NOT NULL,
    UNIQUE(guild_id, character_id, command, used_on),
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leaderboard_channels (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS weekly_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    character_id INTEGER NOT NULL,
    reset_week TEXT NOT NULL,
    got_bonus BOOLEAN DEFAULT 0,
    bonus_xp INTEGER DEFAULT 0,
    reset_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(guild_id, character_id, reset_week),
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

`);

// Drop and recreate quicktime tables with correct schema
try {
  db.exec('DROP TABLE IF EXISTS quicktime_participants');
  db.exec('DROP TABLE IF EXISTS quicktime_events');
  db.exec('DROP TABLE IF EXISTS quicktime_points');
  db.exec('DROP TABLE IF EXISTS quicktime_config');
  console.log('[Database] Dropped old quicktime tables for schema migration');
} catch (err) {
  console.error('[Database] Error dropping tables:', err.message);
}

// Recreate with correct schema
db.exec(`
  CREATE TABLE IF NOT EXISTS quicktime_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quicktime_events (
    event_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT,
    is_cooperative BOOLEAN DEFAULT 0,
    participants_needed INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    message_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS quicktime_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    character_id INTEGER NOT NULL,
    character_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    FOREIGN KEY(event_id) REFERENCES quicktime_events(event_id) ON DELETE CASCADE
  );
`);

// Migrate existing databases: add NPC columns if they don't exist yet
const existingCols = db.pragma('table_info(characters)').map(c => c.name);
if (!existingCols.includes('is_npc')) {
  db.exec('ALTER TABLE characters ADD COLUMN is_npc BOOLEAN NOT NULL DEFAULT 0');
  console.log('[Database] Migrated: added is_npc column to characters');
}
if (!existingCols.includes('student_quality')) {
  db.exec("ALTER TABLE characters ADD COLUMN student_quality TEXT CHECK(student_quality IN ('good', 'medium', 'bad'))");
  console.log('[Database] Migrated: added student_quality column to characters');
}

module.exports = db;
