const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { getWeekKey, getTodayKey } = require('../utils/time');
const { updateAllLeaderboards } = require('../utils/leaderboard');

const BONUS_XP = 10;
const BONUS_SLOTS = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-week')
    .setDescription('Manually reset the weekly leaderboard and award bonus XP to top 3')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: ['Ephemeral'] });

    try {
      const client = interaction.client;
      const guildId = interaction.guildId;
      const weekKey = getWeekKey();
      const todayKey = getTodayKey();

      // Get top 3 characters before reset
      const top = db.prepare(
        'SELECT id, name, xp FROM characters WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'
      ).all(guildId, BONUS_SLOTS);

      // Reset XP to 0
      db.prepare('UPDATE characters SET xp = 0 WHERE guild_id = ?').run(guildId);

      // Clear daily cooldowns so people can roll fresh
      db.prepare('DELETE FROM cooldowns WHERE guild_id = ? AND used_on = ?').run(guildId, todayKey);

      // Award bonus and record reset (force replace if already exists this week)
      const insertReset = db.prepare(`
        INSERT INTO weekly_resets (guild_id, character_id, reset_week, got_bonus, bonus_xp)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(guild_id, character_id, reset_week) DO UPDATE SET got_bonus = 1, bonus_xp = ?
      `);

      for (const char of top) {
        db.prepare('UPDATE characters SET xp = ? WHERE id = ?').run(BONUS_XP, char.id);
        insertReset.run(guildId, char.id, weekKey, BONUS_XP, BONUS_XP);
      }

      await updateAllLeaderboards(client);

      const topNames = top.map(c => `**${c.name}**`).join(', ') || 'None';

      const embed = new EmbedBuilder()
        .setTitle('🌸 Weekly Reset Complete')
        .setColor(0x00ff00)
        .setDescription('XP reset, bonus awarded, and daily cooldowns cleared.')
        .addFields(
          { name: 'Top 3 Bonus Recipients', value: topNames, inline: false },
          { name: 'Bonus Amount', value: `+${BONUS_XP} XP each`, inline: true },
          { name: 'Cooldowns', value: 'Cleared — everyone can roll again', inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Reset Week Error]', err);
      return interaction.editReply({
        content: `❌ Failed to reset week: ${err.message}`,
      });
    }
  },
};

