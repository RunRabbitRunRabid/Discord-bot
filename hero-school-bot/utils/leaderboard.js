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

  const xpTop = db.prepare(`
    SELECT
      c.name,
      c.xp,
      c.money,
      c.is_npc,
      COALESCE(qp.points, 0) as quicktime_points,
      (c.xp + COALESCE(qp.points, 0)) as total_points
    FROM characters c
    LEFT JOIN quicktime_points qp ON qp.guild_id = ? AND qp.character_id = c.id
    WHERE c.guild_id = ?
    ORDER BY total_points DESC
    LIMIT 10
  `).all(guildId, guildId);

  const wealthTop = db.prepare(
    'SELECT name, xp, money, is_npc FROM characters WHERE guild_id = ? ORDER BY money DESC LIMIT 10'
  ).all(guildId);

  const todayClass = getTodayClass();
  const todayDay = getTodayDayName();
  const currentTime = getFormattedTime();

  const heroLines = xpTop.length
    ? xpTop.map((c, i) => {
        const total = c.total_points;
        const breakdown = c.quicktime_points > 0
          ? ` *(${c.xp} XP + ${c.quicktime_points} QuickTime)*`
          : ` *(${c.xp} XP)*`;
        return `\`${String(i + 1).padStart(2, '0')}.\` **${c.is_npc ? '🤖 ' : ''}${c.name}** — ${total} pts${breakdown}`;
      }).join('\n')
    : '*No characters yet.*';

  const wealthLines = wealthTop.length
    ? wealthTop.map((c, i) => `\`${String(i + 1).padStart(2, '0')}.\` **${c.is_npc ? '🤖 ' : ''}${c.name}** — $${Number(c.money).toFixed(2)}`).join('\n')
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
        name: '⚡ Hero Leaderboard (Total Points)',
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
    .setFooter({ text: 'Points = XP + QuickTime events • Updated live • Hero School Academy' })
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
