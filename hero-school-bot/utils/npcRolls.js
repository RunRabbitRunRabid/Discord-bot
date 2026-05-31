const db = require('../database/db');

/**
 * Returns a rolled XP value based on the NPC's student quality.
 *
 *  good   — Fair roll, same range as players: 1–100 (uniform).
 *  medium — Biased toward lower values via double-random, but high rolls
 *           are still possible. Range: 1–100.
 *  bad    — Heavily limited: 1–50 (uniform within that ceiling).
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number} XP amount (integer, minimum 1)
 */
function rollXPByQuality(quality) {
  switch (quality) {
    case 'good':
      // Uniform 1–100, identical to a player roll.
      return Math.floor(Math.random() * 100) + 1;

    case 'medium':
      // Double-random biases the distribution toward lower values while
      // still allowing the occasional high roll (the curve peaks near 0
      // and tapers off toward 100).
      return Math.max(1, Math.floor(Math.random() * Math.random() * 100) + 1);

    case 'bad':
      // Hard ceiling of 50 — bad students rarely break through.
      return Math.floor(Math.random() * 50) + 1;

    default:
      // Fallback: treat unknown quality as medium.
      return Math.max(1, Math.floor(Math.random() * Math.random() * 100) + 1);
  }
}

/**
 * Performs daily XP rolls for every NPC in every guild the bot is in.
 * Called once per day by the 6 AM ET cron job in ready.js.
 *
 * @param {import('discord.js').Client} client
 */
async function performNPCDailyRolls(client) {
  const npcs = db.prepare(
    'SELECT id, guild_id, name, student_quality, xp FROM characters WHERE is_npc = 1'
  ).all();

  if (!npcs.length) {
    console.log('[NPC Rolls] No NPCs registered — skipping.');
    return;
  }

  const updateXP = db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?');

  const updateMany = db.transaction((rolls) => {
    for (const { id, xp } of rolls) {
      updateXP.run(xp, id);
    }
  });

  const rolls = npcs.map(npc => {
    const gained = rollXPByQuality(npc.student_quality);
    console.log(
      `[NPC Rolls] ${npc.name} (guild ${npc.guild_id}, quality: ${npc.student_quality}) ` +
      `rolled ${gained} XP (total after: ${npc.xp + gained})`
    );
    return { id: npc.id, xp: gained };
  });

  updateMany(rolls);

  console.log(`[NPC Rolls] Daily rolls complete — ${rolls.length} NPC(s) updated.`);
}

module.exports = { rollXPByQuality, performNPCDailyRolls };
