const db = require('../database/db');
const { getTodayClass } = require('./time');

// ---------------------------------------------------------------------------
// Quality-aware roll helpers
// ---------------------------------------------------------------------------

/**
 * Roll an integer in [min, max] with no bias (mirrors the player commands).
 */
function rollFlat(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Roll biased toward the lower end of [min, max] using a double-random
 * technique: the raw value is pulled from [0, range) via r1*r2, then
 * shifted up by min.
 */
function rollBiasedLow(min, max) {
  const range = max - min;
  return Math.floor(Math.random() * Math.random() * (range + 1)) + min;
}

/**
 * Simulate /class for an NPC.
 *
 * Good   → flat 5-20 XP + 5 if proficient  (identical to player)
 * Medium → biased-low 5-20 XP + 5 if proficient
 * Bad    → flat 3-12 XP + 5 if proficient
 *
 * @param {'good'|'medium'|'bad'} quality
 * @param {boolean} isProficient
 * @returns {{ baseXP: number, bonusXP: number, totalXP: number }}
 */
function rollClassXP(quality, isProficient) {
  let baseXP;
  if (quality === 'good') {
    baseXP = rollFlat(5, 20);
  } else if (quality === 'medium') {
    baseXP = rollBiasedLow(5, 20);
  } else {
    baseXP = rollFlat(3, 12);
  }
  const bonusXP = isProficient ? 5 : 0;
  return { baseXP, bonusXP, totalXP: baseXP + bonusXP };
}

/**
 * Simulate /study for an NPC.
 *
 * Good   → flat 5-20 XP
 * Medium → biased-low 5-20 XP
 * Bad    → flat 3-12 XP
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number}
 */
function rollStudyXP(quality) {
  if (quality === 'good')   return rollFlat(5, 20);
  if (quality === 'medium') return rollBiasedLow(5, 20);
  return rollFlat(3, 12);
}

/**
 * Simulate /train for an NPC.
 *
 * Good   → flat 5-20 XP
 * Medium → biased-low 5-20 XP
 * Bad    → flat 3-12 XP
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number}
 */
function rollTrainXP(quality) {
  if (quality === 'good')   return rollFlat(5, 20);
  if (quality === 'medium') return rollBiasedLow(5, 20);
  return rollFlat(3, 12);
}

/**
 * Simulate /afterschool XP for an NPC.
 *
 * Good   → flat 5-20 XP
 * Medium → biased-low 5-20 XP
 * Bad    → flat 3-12 XP
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number}
 */
function rollAfterSchoolXP(quality) {
  if (quality === 'good')   return rollFlat(5, 20);
  if (quality === 'medium') return rollBiasedLow(5, 20);
  return rollFlat(3, 12);
}

/**
 * Simulate /afterschool money for an NPC.
 *
 * Work ranges  — Good: $8-20 | Medium: biased-low $8-20 | Bad: $4-10
 * Club ranges  — Good: $2-8  | Medium: biased-low $2-8  | Bad: $1-4
 *
 * @param {'good'|'medium'|'bad'} quality
 * @param {boolean} isWork
 * @returns {number}  rounded to 2 decimal places
 */
function rollAfterSchoolMoney(quality, isWork) {
  let amount;
  if (isWork) {
    if (quality === 'good') {
      amount = Math.random() * (20 - 8) + 8;
    } else if (quality === 'medium') {
      amount = Math.random() * Math.random() * (20 - 8) + 8;
    } else {
      amount = Math.random() * (10 - 4) + 4;
    }
  } else {
    if (quality === 'good') {
      amount = Math.random() * (8 - 2) + 2;
    } else if (quality === 'medium') {
      amount = Math.random() * Math.random() * (8 - 2) + 2;
    } else {
      amount = Math.random() * (4 - 1) + 1;
    }
  }
  return parseFloat(amount.toFixed(2));
}

// ---------------------------------------------------------------------------
// Daily roll runner
// ---------------------------------------------------------------------------

/**
 * Performs simulated daily activity rolls for every NPC registered in the
 * npcs table.  For each NPC the bot simulates all four activities:
 *   /class, /study, /train, /afterschool
 * and applies the combined XP and money gains directly to the character row.
 *
 * Called by the 6 AM ET cron job in events/ready.js.
 */
async function performNPCDailyRolls() {
  const todayClass = getTodayClass();

  // Fetch every NPC joined with its character data
  const npcs = db.prepare(`
    SELECT n.id AS npc_id, n.quality,
           c.id AS char_id, c.name, c.guild_id,
           c.subject1, c.subject2, c.afterschool,
           c.xp, c.money
    FROM npcs n
    JOIN characters c ON c.id = n.character_id
  `).all();

  if (npcs.length === 0) {
    console.log('[NPC Rolls] No NPCs registered — skipping daily rolls.');
    return;
  }

  const updateChar = db.prepare(
    'UPDATE characters SET xp = xp + ?, money = money + ? WHERE id = ?'
  );

  // Wrap all updates in a single transaction for performance
  const runAll = db.transaction(() => {
    for (const npc of npcs) {
      const { quality, char_id, name, subject1, subject2, afterschool } = npc;

      // /class
      const isProficient = subject1 === todayClass || subject2 === todayClass;
      const classResult  = rollClassXP(quality, isProficient);

      // /study
      const studyXP = rollStudyXP(quality);

      // /train
      const trainXP = rollTrainXP(quality);

      // /afterschool
      const isWork        = afterschool === 'work';
      const afterXP       = rollAfterSchoolXP(quality);
      const afterMoney    = rollAfterSchoolMoney(quality, isWork);

      const totalXP    = classResult.totalXP + studyXP + trainXP + afterXP;
      const totalMoney = afterMoney;

      updateChar.run(totalXP, totalMoney, char_id);

      console.log(
        `[NPC Rolls] ${name} (${quality}) | ` +
        `class: ${classResult.baseXP}+${classResult.bonusXP}=${classResult.totalXP} XP` +
        `${isProficient ? ` (proficient in ${todayClass})` : ''} | ` +
        `study: +${studyXP} XP | ` +
        `train: +${trainXP} XP | ` +
        `afterschool (${isWork ? 'work' : 'club'}): +${afterXP} XP, +$${afterMoney.toFixed(2)} | ` +
        `total: +${totalXP} XP, +$${totalMoney.toFixed(2)}`
      );
    }
  });

  runAll();

  console.log(`[NPC Rolls] Daily rolls complete for ${npcs.length} NPC(s).`);
}

module.exports = {
  rollClassXP,
  rollStudyXP,
  rollTrainXP,
  rollAfterSchoolXP,
  rollAfterSchoolMoney,
  performNPCDailyRolls,
};
