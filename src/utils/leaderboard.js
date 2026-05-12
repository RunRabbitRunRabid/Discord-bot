const { getXpLeaderboard, getRichLeaderboard } = require('../database');
const { getOhioTimeString, getClassOfDay, getWeekdayName } = require('./time');

function buildLeaderboardContent(guild) {
  const xpRows = getXpLeaderboard(guild.id, 10);
  const richRows = getRichLeaderboard(guild.id, 10);

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

  const xpLines = xpRows.length
    ? xpRows.map((r, i) => `${medal(i)} **${r.name}** — ${r.xp} XP`).join('\n')
    : '_No heroes yet._';

  const richLines = richRows.length
    ? richRows.map((r, i) => `${medal(i)} **${r.name}** — $${parseFloat(r.money).toFixed(2)}`).join('\n')
    : '_No heroes yet._';

  const now = getOhioTimeString();
  const weekday = getWeekdayName();
  const classToday = getClassOfDay();

  return [
    `## 🏫 Hero Academy Leaderboard`,
    ``,
    `🕐 **Ohio Time:** ${now}`,
    `📅 **Today:** ${weekday}`,
    `📚 **Class of the Day:** ${classToday}`,
    ``,
    `─────────────────────────`,
    `### ⚡ Hero Leaderboard (XP)`,
    xpLines,
    ``,
    `─────────────────────────`,
    `### 💰 Richest Heroes`,
    richLines,
    ``,
    `─────────────────────────`,
    `*Updates automatically. Last refreshed: ${now}*`,
  ].join('\n');
}

module.exports = { buildLeaderboardContent };
