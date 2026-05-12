const { getXpBoard, getRichBoard } = require('../database');
const { getOhioTimeString, getClassOfDay, getWeekdayName } = require('./time');

function buildLeaderboard(guild) {
  const xp   = getXpBoard(guild.id, 10);
  const rich = getRichBoard(guild.id, 10);

  const rank = i => i === 0 ? '**1.**' : i === 1 ? '**2.**' : i === 2 ? '**3.**' : `${i + 1}.`;

  const xpLines = xp.length
    ? xp.map((r, i) => `${rank(i)}  ${r.name}  —  ${r.xp} XP`).join('\n')
    : '*No heroes enrolled yet.*';

  const richLines = rich.length
    ? rich.map((r, i) => `${rank(i)}  ${r.name}  —  $${parseFloat(r.money).toFixed(2)}`).join('\n')
    : '*No heroes enrolled yet.*';

  const now       = getOhioTimeString();
  const weekday   = getWeekdayName();
  const classDay  = getClassOfDay();

  return [
    `# 🌸  Hero Academy Leaderboard`,
    ``,
    `🌸  **Ohio Time**    ${now}`,
    `🌸  **Today**           ${weekday}`,
    `🌸  **Class**             ${classDay}`,
    ``,
    `────────────────────────────────`,
    `### 🌸  Hero Rankings  ( XP )`,
    ``,
    xpLines,
    ``,
    `────────────────────────────────`,
    `### 🌸  Wealthiest Heroes`,
    ``,
    richLines,
    ``,
    `────────────────────────────────`,
    `-# Last updated: ${now}`,
  ].join('\n');
}

module.exports = { buildLeaderboard };
