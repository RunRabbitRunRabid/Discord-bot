const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'bot.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT    NOT NULL,
    user_id    TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    prof1      TEXT    NOT NULL,
    prof2      TEXT    NOT NULL,
    activity   TEXT    NOT NULL,
    money      REAL    NOT NULL DEFAULT 0,
    xp         INTEGER NOT NULL DEFAULT 0,
    UNIQUE(guild_id, user_id, name)
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    character_id INTEGER NOT NULL,
    action       TEXT    NOT NULL,
    used_date    TEXT    NOT NULL,
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(guild_id, character_id, action)
  );

  CREATE TABLE IF NOT EXISTS leaderboard_messages (
    guild_id   TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL
  );
`);

function today() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  ).toLocaleDateString('en-US');
}

/* ── Characters ─────────────────────────────────────────── */

function getChar(guildId, userId, name) {
  return db.prepare(
    'SELECT * FROM characters WHERE guild_id=? AND user_id=? AND name=? COLLATE NOCASE'
  ).get(guildId, userId, name);
}

function getUserChars(guildId, userId) {
  return db.prepare(
    'SELECT * FROM characters WHERE guild_id=? AND user_id=? ORDER BY name'
  ).all(guildId, userId);
}

function createChar(guildId, userId, name, prof1, prof2, activity, money) {
  return db.prepare(
    `INSERT INTO characters (guild_id,user_id,name,prof1,prof2,activity,money)
     VALUES (?,?,?,?,?,?,?)`
  ).run(guildId, userId, name, prof1, prof2, activity, money);
}

function updateChar(id, fields) {
  const keys = Object.keys(fields);
  const sql  = `UPDATE characters SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`;
  db.prepare(sql).run(...keys.map(k => fields[k]), id);
}

function renameChar(guildId, userId, oldName, newName) {
  return db.prepare(
    'UPDATE characters SET name=? WHERE guild_id=? AND user_id=? AND name=? COLLATE NOCASE'
  ).run(newName, guildId, userId, oldName);
}

function deleteChar(guildId, userId, name) {
  return db.prepare(
    'DELETE FROM characters WHERE guild_id=? AND user_id=? AND name=? COLLATE NOCASE'
  ).run(guildId, userId, name);
}

/* ── Cooldowns ───────────────────────────────────────────── */

function isOnCooldown(guildId, charId, action) {
  const row = db.prepare(
    'SELECT used_date FROM cooldowns WHERE guild_id=? AND character_id=? AND action=?'
  ).get(guildId, charId, action);
  return row ? row.used_date === today() : false;
}

function setCooldown(guildId, charId, action) {
  db.prepare(
    `INSERT INTO cooldowns (guild_id,character_id,action,used_date) VALUES (?,?,?,?)
     ON CONFLICT(guild_id,character_id,action) DO UPDATE SET used_date=excluded.used_date`
  ).run(guildId, charId, action, today());
}

function resetAllCooldowns() {
  db.prepare('DELETE FROM cooldowns').run();
}

/* ── Leaderboard ─────────────────────────────────────────── */

function getLeaderboardMsg(guildId) {
  return db.prepare('SELECT * FROM leaderboard_messages WHERE guild_id=?').get(guildId);
}

function setLeaderboardMsg(guildId, channelId, messageId) {
  db.prepare(
    `INSERT INTO leaderboard_messages (guild_id,channel_id,message_id) VALUES (?,?,?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id=excluded.channel_id, message_id=excluded.message_id`
  ).run(guildId, channelId, messageId);
}

function getXpBoard(guildId, limit = 10) {
  return db.prepare(
    'SELECT name,xp FROM characters WHERE guild_id=? ORDER BY xp DESC LIMIT ?'
  ).all(guildId, limit);
}

function getRichBoard(guildId, limit = 10) {
  return db.prepare(
    'SELECT name,money FROM characters WHERE guild_id=? ORDER BY money DESC LIMIT ?'
  ).all(guildId, limit);
}

module.exports = {
  getChar, getUserChars, createChar, updateChar, renameChar, deleteChar,
  isOnCooldown, setCooldown, resetAllCooldowns,
  getLeaderboardMsg, setLeaderboardMsg, getXpBoard, getRichBoard,
};
