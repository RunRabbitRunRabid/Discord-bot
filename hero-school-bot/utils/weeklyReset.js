const db = require('../database/db');
const { getWeekKey } = require('./time');

const BONUS_XP = 10;
const BONUS_SLOTS = 3;

/**
 * Performs the weekly XP reset for every guild the bot is in:
 *  1. Records the top BONUS_SLOTS characters by XP.
 *  2. Resets all character XP to 0.
 *  3. Awards BONUS_XP to the top characters as a head-start.
 *  4. Writes a row to weekly_resets for each bonus recipient.
 *
 * Money is intentionally untouched.
 */
async function performWeeklyReset(client) {
  const weekKey = getWeekKey();

  for (const guild of client.guilds.cache.values()) {
    const guildId = guild.id;

    // Snapshot top characters before the wipe
    const top = db.prepare(
      'SELECT id, name, xp FROM characters WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'
    ).all(guildId, BONUS_SLOTS);

    // Reset every character's XP to 0
    db.prepare('UPDATE characters SET xp = 0 WHERE guild_id = ?').run(guildId);

    // Award bonus XP and record the reset for each top character
    const insertReset = db.prepare(`
      INSERT OR IGNORE INTO weekly_resets (guild_id, character_id, reset_week, got_bonus, bonus_xp)
      VALUES (?, ?, ?, 1, ?)
    `);

    for (const char of top) {
      db.prepare('UPDATE characters SET xp = ? WHERE id = ?').run(BONUS_XP, char.id);
      insertReset.run(guildId, char.id, weekKey, BONUS_XP);
    }

    console.log(
      `[Weekly Reset] Guild ${guildId} (${guild.name}): XP reset complete. ` +
      `Top ${top.length} character(s) received ${BONUS_XP} XP head start — week ${weekKey}.`
    );
  }
}

module.exports = { performWeeklyReset };
