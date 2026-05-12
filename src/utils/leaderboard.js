const { getXpLeaderboard, getRichLeaderboard } = require('../database');
const { getOhioTimeString, getClassOfDay, getWeekdayName } = require('./time');

function buildLeaderboardContent(guild) {
  const xpRows = getXpLeaderboard(guild.id, 10);
  const richRows = getRichLeaderboard(guild.id, 10);

  const rank = (i) => {
    if (i === 0) return '**1.**';
    if (i === 1) return '**2.**';
    if (i === 2) return '**3.**';
    return `${i + 1}.`;
  };

  const xpLines = xpRows.length
    ? xpRows.map((r, i) => `${rank(i)}  ${r.name}  —  ${r.xp} XP`).join('\n')
    : '*No heroes enrolled yet.*';

  const richLines = richRows.length
    ? richRows.map((r, i) => `${rank(i)}  ${r.name}  —  $${parseFloat(r.money).toFixed(2)}`).join('\n')
    : '*No heroes enrolled yet.*';

  const now = getOhioTimeString();
  const weekday = getWeekdayName();
  const classToday = getClassOfDay();

  return [
    `# 🌸  Hero Academy Leaderboard`,
    ``,
    `🌸  **Ohio Time**   ${now}`,
    `🌸  **Today**          ${weekday}`,
    `🌸  **Class**            ${classToday}`,
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

module.exports = { buildLeaderboardContent };
