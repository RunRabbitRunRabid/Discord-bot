const db = require('../database/db');

/**
 * Apply or refresh a luck modifier on a character.
 * Replaces any existing luck modifier.
 * @param {number} characterId - Character ID
 * @param {string} type - 'good' or 'bad'
 * @returns {object} The applied modifier with expires_at timestamp
 */
function applyLuck(characterId, type) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (24 * 60 * 60); // 1 in-game day (24 hours)

  // Delete any existing luck modifier for this character
  db.prepare('DELETE FROM luck_modifiers WHERE character_id = ?').run(characterId);

  // Apply the new modifier
  db.prepare(
    'INSERT INTO luck_modifiers (character_id, modifier_type, applied_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(characterId, type, now, expiresAt);

  return { modifier_type: type, applied_at: now, expires_at: expiresAt };
}

/**
 * Remove any active luck modifier from a character.
 * @param {number} characterId - Character ID
 * @returns {boolean} True if a modifier was removed, false if none existed
 */
function clearLuck(characterId) {
  const result = db.prepare('DELETE FROM luck_modifiers WHERE character_id = ?').run(characterId);
  return result.changes > 0;
}

/**
 * Get the active luck modifier for a character (if any).
 * Automatically clears expired modifiers.
 * @param {number} characterId - Character ID
 * @returns {object|null} The luck modifier or null if none active
 */
function getLuck(characterId) {
  const now = Math.floor(Date.now() / 1000);

  // Clean up expired modifiers
  db.prepare('DELETE FROM luck_modifiers WHERE character_id = ? AND expires_at <= ?').run(characterId, now);

  // Get the active modifier (if any)
  const luck = db.prepare('SELECT * FROM luck_modifiers WHERE character_id = ?').get(characterId);
  return luck || null;
}

/**
 * Apply a luck modifier to the roll.
 * If Good Luck is active, returns a value between 12–20.
 * If Bad Luck is active, returns a value between 1–9.
 * If no modifier is active, returns the original roll.
 * @param {number} roll - The original roll value
 * @param {object|null} luck - The luck modifier object or null
 * @returns {number} The modified roll
 */
function applyLuckToRoll(roll, luck) {
  if (!luck) return roll;

  if (luck.modifier_type === 'good') {
    return Math.floor(Math.random() * (20 - 12 + 1)) + 12; // 12–20
  } else if (luck.modifier_type === 'bad') {
    return Math.floor(Math.random() * (9 - 1 + 1)) + 1; // 1–9
  }

  return roll;
}

module.exports = {
  applyLuck,
  clearLuck,
  getLuck,
  applyLuckToRoll,
};

