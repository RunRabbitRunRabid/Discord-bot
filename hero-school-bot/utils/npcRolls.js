/**
 * NPC Roll Tables
 *
 * Three tiers of NPC students, each with their own roll ranges per activity.
 * Ranges are intentionally lower/more variable than the player ceiling (5–20)
 * so active players can realistically compete and win.
 *
 * Proficiency bonus (+5 XP) still applies to /class rolls when the NPC's
 * subject matches today's class — same rule as players.
 *
 * Daily XP estimates (all 4 activities, no proficiency):
 *   good   — ~44–50 XP + money
 *   medium — ~36–42 XP + money
 *   bad    — ~24–30 XP + money
 *
 * Player doing all 4 activities: 20–80 XP/day (average ~40–50 XP)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a random integer between min and max (inclusive). */
function rollInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns a random float between min and max, rounded to 2 decimal places. */
function rollMoney(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// ---------------------------------------------------------------------------
// Roll tables
// Each tier exposes: class, study, train, afterschoolXP, work, club
// ---------------------------------------------------------------------------

const ROLLS = {
  /**
   * Good students — competitive but beatable.
   * Average ~11 XP per activity, ~$12 for afterschool work.
   */
  good: {
    class:         () => rollInt(4, 18),
    study:         () => rollInt(4, 18),
    train:         () => rollInt(4, 18),
    afterschoolXP: () => rollInt(4, 18),
    work:          () => rollMoney(6, 18),
    club:          () => rollMoney(1, 6),
  },

  /**
   * Medium students — unpredictable wild cards.
   * Average ~9 XP per activity, ~$9 for afterschool work.
   */
  medium: {
    class:         () => rollInt(3, 15),
    study:         () => rollInt(3, 15),
    train:         () => rollInt(3, 15),
    afterschoolXP: () => rollInt(3, 15),
    work:          () => rollMoney(4, 14),
    club:          () => rollMoney(1, 5),
  },

  /**
   * Bad students — clearly struggling.
   * Average ~6 XP per activity, ~$5 for afterschool work.
   */
  bad: {
    class:         () => rollInt(2, 10),
    study:         () => rollInt(2, 10),
    train:         () => rollInt(2, 10),
    afterschoolXP: () => rollInt(2, 10),
    work:          () => rollMoney(2, 8),
    club:          () => rollMoney(1, 3),
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Roll XP for /class.
 * Proficiency bonus (+5) is added when isProficient is true.
 *
 * @param {'good'|'medium'|'bad'} quality
 * @param {boolean} [isProficient=false]
 * @returns {{ baseXP: number, bonusXP: number, totalXP: number }}
 */
function rollClass(quality, isProficient = false) {
  const tier = ROLLS[quality] ?? ROLLS.medium;
  const baseXP = tier.class();
  const bonusXP = isProficient ? 5 : 0;
  return { baseXP, bonusXP, totalXP: baseXP + bonusXP };
}

/**
 * Roll XP for /study.
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number}
 */
function rollStudy(quality) {
  const tier = ROLLS[quality] ?? ROLLS.medium;
  return tier.study();
}

/**
 * Roll XP for /train.
 *
 * @param {'good'|'medium'|'bad'} quality
 * @returns {number}
 */
function rollTrain(quality) {
  const tier = ROLLS[quality] ?? ROLLS.medium;
  return tier.train();
}

/**
 * Roll XP and money for /afterschool.
 *
 * @param {'good'|'medium'|'bad'} quality
 * @param {'work'|'club'} afterschoolType
 * @returns {{ xp: number, money: number }}
 */
function rollAfterschool(quality, afterschoolType) {
  const tier = ROLLS[quality] ?? ROLLS.medium;
  const xp = tier.afterschoolXP();
  const money = afterschoolType === 'work' ? tier.work() : tier.club();
  return { xp, money };
}

module.exports = { rollClass, rollStudy, rollTrain, rollAfterschool };
