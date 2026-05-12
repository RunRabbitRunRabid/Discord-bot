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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    class1 TEXT NOT NULL,
    class2 TEXT NOT NULL,
    activity TEXT NOT NULL,
    money REAL NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(guild_id, user_id, name)
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    character_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    last_used TEXT NOT NULL,
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(guild_id, character_id, action)
  );

  CREATE TABLE IF NOT EXISTS leaderboard_messages (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL
  );
`);

function getCharacter(guildId, userId, name) {
  return db.prepare(
    'SELECT * FROM characters WHERE guild_id = ? AND user_id = ? AND name = ? COLLATE NOCASE'
  ).get(guildId, userId, name);
}

function getCharacterById(id) {
  return db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
}

function getUserCharacters(guildId, userId) {
  return db.prepare(
    'SELECT * FROM characters WHERE guild_id = ? AND user_id = ? ORDER BY name'
  ).all(guildId, userId);
}

function createCharacter(guildId, userId, name, class1, class2, activity, money) {
  const stmt = db.prepare(
    'INSERT INTO characters (guild_id, user_id, name, class1, class2, activity, money) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(guildId, userId, name, class1, class2, activity, money);
}

function updateCharacter(id, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  db.prepare(`UPDATE characters SET ${setClause} WHERE id = ?`).run(...values, id);
}

function renameCharacter(guildId, userId, oldName, newName) {
  return db.prepare(
    'UPDATE characters SET name = ? WHERE guild_id = ? AND user_id = ? AND name = ? COLLATE NOCASE'
  ).run(newName, guildId, userId, oldName);
}

function deleteCharacter(guildId, userId, name) {
  return db.prepare(
    'DELETE FROM characters WHERE guild_id = ? AND user_id = ? AND name = ? COLLATE NOCASE'
  ).run(guildId, userId, name);
}

function todayOhio() {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function getCooldown(guildId, characterId, action) {
  return db.prepare(
    'SELECT last_used FROM cooldowns WHERE guild_id = ? AND character_id = ? AND action = ?'
  ).get(guildId, characterId, action);
}

function setCooldown(guildId, characterId, action) {
  db.prepare(
    `INSERT INTO cooldowns (guild_id, character_id, action, last_used)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, character_id, action) DO UPDATE SET last_used = excluded.last_used`
  ).run(guildId, characterId, action, todayOhio());
}

function isOnCooldown(guildId, characterId, action) {
  const row = getCooldown(guildId, characterId, action);
  if (!row) return false;
  return row.last_used === todayOhio();
}

function resetAllCooldowns(guildId) {
  db.prepare(
    `DELETE FROM cooldowns WHERE guild_id IN (
       SELECT DISTINCT guild_id FROM characters WHERE guild_id = ?
     )`
  ).run(guildId);
}

function resetAllCooldownsGlobal() {
  db.prepare('DELETE FROM cooldowns').run();
}

function getLeaderboardMessage(guildId) {
  return db.prepare('SELECT * FROM leaderboard_messages WHERE guild_id = ?').get(guildId);
}

function setLeaderboardMessage(guildId, channelId, messageId) {
  db.prepare(
    `INSERT INTO leaderboard_messages (guild_id, channel_id, message_id)
     VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, message_id = excluded.message_id`
  ).run(guildId, channelId, messageId);
}

function getXpLeaderboard(guildId, limit = 10) {
  return db.prepare(
    'SELECT user_id, name, xp FROM characters WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'
  ).all(guildId, limit);
}

function getRichLeaderboard(guildId, limit = 10) {
  return db.prepare(
    'SELECT user_id, name, money FROM characters WHERE guild_id = ? ORDER BY money DESC LIMIT ?'
  ).all(guildId, limit);
}

function getAllGuildIds() {
  return db.prepare('SELECT DISTINCT guild_id FROM characters').all().map(r => r.guild_id);
}

module.exports = {
  db,
  getCharacter,
  getCharacterById,
  getUserCharacters,
  createCharacter,
  updateCharacter,
  renameCharacter,
  deleteCharacter,
  isOnCooldown,
  setCooldown,
  resetAllCooldowns,
  resetAllCooldownsGlobal,
  getLeaderboardMessage,
  setLeaderboardMessage,
  getXpLeaderboard,
  getRichLeaderboard,
  getAllGuildIds,
  todayOhio,
};
