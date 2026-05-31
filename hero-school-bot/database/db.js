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

  CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    character_id INTEGER NOT NULL,
    quality TEXT NOT NULL CHECK(quality IN ('good', 'medium', 'bad')),
    UNIQUE(guild_id, character_id),
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
  );
`);

module.exports = db;
