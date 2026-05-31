const db = require('../database/db');
const { getTodayClass, getTodayKey } = require('./time'); // getTodayKey used for log context

// Roll ranges by student quality
const ROLL_RANGES = {
  good:   { min: 4, max: 18 },
  medium: { min: 3, max: 15 },
  bad:    { min: 2, max: 10 },
};

// Money ranges for afterschool by quality
const MONEY_RANGES = {
  good:   { work: { min: 12, max: 20 }, club: { min: 4, max: 8 } },
  medium: { work: { min: 8,  max: 16 }, club: { min: 2, max: 6 } },
  bad:    { work: { min: 4,  max: 10 }, club: { min: 1, max: 4 } },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/**
 * Roll /class for an NPC.
 * Applies a +5 proficiency bonus if today's class matches one of their subjects.
 * @param {object} npc - character row from DB
 * @returns {{ xp: number, proficiencyBonus: number, todayClass: string }}
 */
function rollClass(npc) {
  const quality = npc.student_quality || 'medium';
  const { min, max } = ROLL_RANGES[quality];
  const baseXP = randomInt(min, max);
  const todayClass = getTodayClass();
  const isProficient = npc.subject1 === todayClass || npc.subject2 === todayClass;
  const proficiencyBonus = isProficient ? 5 : 0;
  return { xp: baseXP + proficiencyBonus, proficiencyBonus, todayClass };
}

/**
 * Roll /study for an NPC.
 * @param {object} npc - character row from DB
 * @returns {{ xp: number }}
 */
function rollStudy(npc) {
  const quality = npc.student_quality || 'medium';
  const { min, max } = ROLL_RANGES[quality];
  return { xp: randomInt(min, max) };
}

/**
 * Roll /train for an NPC.
 * @param {object} npc - character row from DB
 * @returns {{ xp: number }}
 */
function rollTrain(npc) {
  const quality = npc.student_quality || 'medium';
  const { min, max } = ROLL_RANGES[quality];
  return { xp: randomInt(min, max) };
}

/**
 * Roll /afterschool for an NPC.
 * @param {object} npc - character row from DB
 * @returns {{ xp: number, money: number }}
 */
function rollAfterschool(npc) {
  const quality = npc.student_quality || 'medium';
  const { min, max } = ROLL_RANGES[quality];
  const xp = randomInt(min, max);
  const isWork = npc.afterschool === 'work';
  const moneyRange = MONEY_RANGES[quality][isWork ? 'work' : 'club'];
  const money = randomFloat(moneyRange.min, moneyRange.max);
  return { xp, money };
}

/**
 * Runs all 4 daily activities for every NPC across all guilds.
 * Updates XP and money in the database and logs a detailed breakdown.
 */
async function performNPCDailyRolls() {
  const todayKey = getTodayKey();

  const npcs = db.prepare(
    'SELECT * FROM characters WHERE is_npc = 1'
  ).all();

  if (!npcs.length) {
    console.log('[NPC Rolls] No NPCs found — skipping daily rolls.');
    return;
  }

  console.log(`[NPC Rolls] Starting daily rolls for ${npcs.length} NPC(s) — ${todayKey}`);

  const updateXPMoney = db.prepare('UPDATE characters SET xp = xp + ?, money = money + ? WHERE id = ?');
  const updateXP     = db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?');

  for (const npc of npcs) {
    const classResult       = rollClass(npc);
    const studyResult       = rollStudy(npc);
    const trainResult       = rollTrain(npc);
    const afterschoolResult = rollAfterschool(npc);

    const totalXP    = classResult.xp + studyResult.xp + trainResult.xp + afterschoolResult.xp;
    const totalMoney = afterschoolResult.money;

    // Apply all XP gains and money in two statements
    updateXPMoney.run(afterschoolResult.xp, totalMoney, npc.id);
    updateXP.run(classResult.xp + studyResult.xp + trainResult.xp, npc.id);

    console.log(
      `[NPC Rolls] ${npc.name} (${npc.student_quality}) — ` +
      `Class: +${classResult.xp} XP${classResult.proficiencyBonus ? ` (incl. +5 prof bonus for ${classResult.todayClass})` : ''} | ` +
      `Study: +${studyResult.xp} XP | ` +
      `Train: +${trainResult.xp} XP | ` +
      `After-School: +${afterschoolResult.xp} XP, +$${afterschoolResult.money.toFixed(2)} | ` +
      `Day Total: +${totalXP} XP, +$${totalMoney.toFixed(2)}`
    );
  }

  console.log(`[NPC Rolls] Daily rolls complete for ${npcs.length} NPC(s).`);
}

module.exports = { rollClass, rollStudy, rollTrain, rollAfterschool, performNPCDailyRolls };
