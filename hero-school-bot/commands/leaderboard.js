const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { updateLeaderboard } = require('../utils/leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Set the channel where the live leaderboard is posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('The channel to post the leaderboard in').setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '🌸 Please select a text channel.' });
    }

    db.prepare(`
      INSERT INTO leaderboard_channels (guild_id, channel_id, message_id)
      VALUES (?, ?, NULL)
      ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, message_id = NULL
    `).run(guildId, channel.id);

    await interaction.reply({ content: `🌸 Leaderboard channel set to ${channel}! Posting now...` });
    await updateLeaderboard(interaction.client, guildId);
  },
};
