const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getTodayClass, getTodayDayName, getFormattedTime } = require('./time');

async function updateLeaderboard(client, guildId) {
  const row = db.prepare('SELECT channel_id, message_id FROM leaderboard_channels WHERE guild_id = ?').get(guildId);
  if (!row) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(row.channel_id);
  if (!channel) return;

  const xpTop = db.prepare(
    'SELECT name, xp, money FROM characters WHERE guild_id = ? ORDER BY xp DESC LIMIT 10'
  ).all(guildId);

  const wealthTop = db.prepare(
    'SELECT name, xp, money FROM characters WHERE guild_id = ? ORDER BY money DESC LIMIT 10'
  ).all(guildId);

  const todayClass = getTodayClass();
  const todayDay = getTodayDayName();
  const currentTime = getFormattedTime();

  const heroLines = xpTop.length
    ? xpTop.map((c, i) => `\`${String(i + 1).padStart(2, '0')}.\` **${c.name}** — ${c.xp} XP`).join('\n')
    : '*No characters yet.*';

  const wealthLines = wealthTop.length
    ? wealthTop.map((c, i) => `\`${String(i + 1).padStart(2, '0')}.\` **${c.name}** — $${Number(c.money).toFixed(2)}`).join('\n')
    : '*No characters yet.*';

  const embed = new EmbedBuilder()
    .setTitle('🌸 Hero School — Live Rankings')
    .setColor(0xff9ec8)
    .addFields(
      {
        name: '📅 Current Schedule',
        value: `**${todayDay}** — ${todayClass}\n🕐 ${currentTime}`,
        inline: false,
      },
      {
        name: '⚡ Hero Leaderboard (XP)',
        value: heroLines,
        inline: true,
      },
      {
        name: '💰 Wealth Leaderboard',
        value: wealthLines,
        inline: true,
      },
      {
        name: '🔄 Weekly XP Reset',
        value: 'Resets every **Monday at midnight ET**\n🏆 Top 3 earn a **10 XP head start**',
        inline: false,
      }
    )
    .setFooter({ text: 'Updated live • Hero School Academy' })
    .setTimestamp();

  try {
    if (row.message_id) {
      const msg = await channel.messages.fetch(row.message_id).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        return;
      }
    }
    const sent = await channel.send({ embeds: [embed] });
    db.prepare('UPDATE leaderboard_channels SET message_id = ? WHERE guild_id = ?').run(sent.id, guildId);
  } catch (err) {
    console.error(`[Leaderboard] Failed to update for guild ${guildId}:`, err.message);
  }
}

async function updateAllLeaderboards(client) {
  const rows = db.prepare('SELECT guild_id FROM leaderboard_channels').all();
  for (const row of rows) {
    await updateLeaderboard(client, row.guild_id);
  }
}

module.exports = { updateLeaderboard, updateAllLeaderboards };
