const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { performWeeklyReset } = require('../utils/weeklyReset');
const { updateAllLeaderboards } = require('../utils/leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-week')
    .setDescription('Manually reset the weekly leaderboard and award bonus XP to top 3')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: ['Ephemeral'] });

    try {
      await performWeeklyReset(interaction.client);
      await updateAllLeaderboards(interaction.client);

      const embed = new EmbedBuilder()
        .setTitle('🌸 Weekly Reset Complete')
        .setColor(0x00ff00)
        .setDescription('XP reset and bonus awarded to top 3 characters.')
        .addFields({ name: 'Status', value: '✅ Leaderboards updated' });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Reset Week Error]', err);
      return interaction.editReply({
        content: `❌ Failed to reset week: ${err.message}`,
      });
    }
  },
};

