/**
 * NPC daily roll ranges by student tier and activity.
 *
 * Design goals:
 *  - Good students are competitive but not guaranteed to beat active players.
 *  - Medium students are wild cards — sometimes great, sometimes poor.
 *  - Bad students are at a real disadvantage and rarely threaten the top.
 *  - Wider ranges introduce variance so players can catch up or pull ahead.
 *
 * Player reference (all commands): 5–20 XP base per activity.
 * A fully active player doing all 4 activities earns 20–80 XP/day (plus
 * proficiency bonuses on /class). NPCs are tuned to stay competitive but
 * beatable by a consistently active player.
 */

/**
 * Returns a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random float between min and max (inclusive), rounded to 2 dp.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rollMoney(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// ---------------------------------------------------------------------------
// Good students — solid performers, slightly below the player ceiling
// /class, /study, /train: 4–18 XP
// /afterschool work: $6–18  |  club: $1–6
// ---------------------------------------------------------------------------
const GOOD = {
  class:       () => roll(4, 18),
  study:       () => roll(4, 18),
  train:       () => roll(4, 18),
  afterschool: {
    xp:   () => roll(4, 18),
    work: () => rollMoney(6, 18),
    club: () => rollMoney(1, 6),
  },
};

// ---------------------------------------------------------------------------
// Medium students — unpredictable wild cards, biased low
// /class, /study, /train: 3–15 XP
// /afterschool work: $4–14  |  club: $1–5
// ---------------------------------------------------------------------------
const MEDIUM = {
  class:       () => roll(3, 15),
  study:       () => roll(3, 15),
  train:       () => roll(3, 15),
  afterschool: {
    xp:   () => roll(3, 15),
    work: () => rollMoney(4, 14),
    club: () => rollMoney(1, 5),
  },
};

// ---------------------------------------------------------------------------
// Bad students — struggling, rarely competitive
// /class, /study, /train: 2–10 XP
// /afterschool work: $2–8  |  club: $1–3
// ---------------------------------------------------------------------------
const BAD = {
  class:       () => roll(2, 10),
  study:       () => roll(2, 10),
  train:       () => roll(2, 10),
  afterschool: {
    xp:   () => roll(2, 10),
    work: () => rollMoney(2, 8),
    club: () => rollMoney(1, 3),
  },
};

module.exports = { GOOD, MEDIUM, BAD };
