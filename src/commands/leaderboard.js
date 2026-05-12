const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setLeaderboardMessage, getLeaderboardMessage } = require('../database');
const { buildLeaderboardContent } = require('../utils/leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Set the channel where the live leaderboard is posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to post the leaderboard in')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!channel.isTextBased()) {
      return interaction.editReply('❌ Please select a text channel.');
    }

    const content = buildLeaderboardContent(interaction.guild);

    try {
      const existing = getLeaderboardMessage(guildId);

      if (existing) {
        try {
          const oldChannel = await interaction.guild.channels.fetch(existing.channel_id);
          const oldMessage = await oldChannel.messages.fetch(existing.message_id);
          await oldMessage.delete();
        } catch {
        }
      }

      const msg = await channel.send({ content });
      setLeaderboardMessage(guildId, channel.id, msg.id);

      await interaction.editReply(
        `✅ Leaderboard set in ${channel}. It will update automatically every minute.`
      );
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Failed to post leaderboard. Make sure I have permission to send messages in that channel.');
    }
  },
};
